import type { NextRequest } from 'next/server'

import type {
  DenyCacheConfig,
  DenyCacheEntry,
  DenyCacheManager,
  RedisKeys,
  SecurityCheck,
  SecurityConfig,
  SecurityContext,
  SecurityDecision,
  SecurityDecisionReason,
  SecurityEngineOptions,
  SecurityEvent,
  SecurityEvidence,
  SecurityLogger,
  SecurityMetrics,
  SecurityResult,
  SecurityRule,
  SecurityRuleSet,
  WaitUntilCallback,
} from './types'
// Note: getSecurityConfig is now passed from the calling application
import { createRedisAdapter } from './redis-adapter'
import { authFailureRule } from './rules/auth-failure'
import { botDetectionRules } from './rules/bot-detection'
// 🚀 セキュリティルール（静的importでコールドスタート時に1度だけ読み込み）
import { rateLimitRule } from './rules/rate-limit'
import { createSecurityDecision } from './types'

// グローバルキャッシュ（Function間で永続化）
declare global {
  var __SECURITY_DENY_CACHE__: Map<string, DenyCacheEntry> | undefined
}

/**
 * インメモリDENY専用キャッシュマネージャー - 高速攻撃者ブロック
 * 攻撃者のリクエストのみメモリキャッシュし、正常リクエストは毎回フル判定
 * Edge Runtime対応、ネットワーク通信なしで< 1msでのブロック実現
 */
class DenyCacheManagerImpl implements DenyCacheManager {
  private config: DenyCacheConfig
  private logger: SecurityLogger
  // グローバルインメモリキャッシュ（Function間共有）
  private memoryCache: Map<string, DenyCacheEntry>

  constructor(
    redis: SecurityEngineOptions['redis'], // 使用しないが互換性のため保持
    logger: SecurityLogger,
    config?: Partial<DenyCacheConfig>
  ) {
    this.logger = logger
    this.config = {
      ttl: {
        rateLimit: 5 * 60 * 1000, // 5分間（窓明けまで）
        bot: 10 * 60 * 1000, // 10分間（行動パターン継続想定）
        authFailure: 30 * 60 * 1000, // 30分間（ブルートフォース抑制）
        ddos: 60 * 60 * 1000, // 1時間（攻撃継続抑制）
      },
      keyStrategy: 'ip_path',
      ...config,
    }

    // グローバルキャッシュを初期化または再利用
    if (!global.__SECURITY_DENY_CACHE__) {
      global.__SECURITY_DENY_CACHE__ = new Map<string, DenyCacheEntry>()
      this.logger.debug('🏗️ Global DENY cache initialized')
    }
    this.memoryCache = global.__SECURITY_DENY_CACHE__
  }

  async checkCache(context: SecurityContext): Promise<DenyCacheEntry | null> {
    try {
      // すべてのセキュリティ理由に対してインメモリキャッシュをチェック
      const reasons: SecurityDecisionReason[] = ['RATE_LIMIT', 'BOT', 'AUTH_FAILURE', 'DDOS']

      for (const reason of reasons) {
        const cacheKey = this.generateCacheKey(context, reason)
        const cached = this.memoryCache.get(cacheKey)

        if (cached) {
          // TTL期限切れチェック
          if (cached.until > Date.now()) {
            this.logger.info(
              `🚫 DENY cache HIT (global): ${reason} for ${context.ip} (cached until ${new Date(cached.until).toISOString()})`
            )
            return cached
          }
          // 期限切れエントリを削除
          this.logger.debug(`🧹 DENY cache expired (global): ${reason} for ${context.ip}`)
          this.memoryCache.delete(cacheKey)
        }
      }

      this.logger.debug(
        `✅ DENY cache MISS (global): No cached deny for ${context.ip}:${context.path}`
      )

      return null
    } catch (error) {
      this.logger.error('DENY memory cache check failed', { error })
      return null
    }
  }

  async storeCache(
    context: SecurityContext,
    reason: SecurityDecisionReason,
    evidence: SecurityEvidence
  ): Promise<void> {
    try {
      const cacheKey = this.generateCacheKey(context, reason)
      const ttl = this.getTTL(reason)
      const now = Date.now()

      const entry: DenyCacheEntry = {
        reason,
        until: now + ttl,
        evidence,
        ip: context.ip,
        path: context.path,
        createdAt: now,
      }

      // インメモリキャッシュに保存（瞬時完了、ネットワーク通信なし）
      this.memoryCache.set(cacheKey, entry)

      this.logger.info(
        `🛡️ DENY cached (global): ${reason} for ${context.ip} (TTL: ${ttl}ms, until: ${new Date(entry.until).toISOString()})`
      )
    } catch (error) {
      this.logger.error('DENY memory cache store failed', { error })
    }
  }

  generateCacheKey(context: SecurityContext, reason: SecurityDecisionReason): string {
    switch (this.config.keyStrategy) {
      case 'ip':
        return `security:deny:${reason.toLowerCase()}:${context.ip}`
      case 'ip_path':
        return `security:deny:${reason.toLowerCase()}:${context.ip}:${encodeURIComponent(context.path)}`
      case 'ip_path_useragent': {
        const uaHash = Buffer.from(context.userAgent).toString('base64').substring(0, 8)
        return `security:deny:${reason.toLowerCase()}:${context.ip}:${encodeURIComponent(context.path)}:${uaHash}`
      }
      default:
        return `security:deny:${reason.toLowerCase()}:${context.ip}:${encodeURIComponent(context.path)}`
    }
  }

  getTTL(reason: SecurityDecisionReason): number {
    switch (reason) {
      case 'RATE_LIMIT':
        return this.config.ttl.rateLimit
      case 'BOT':
        return this.config.ttl.bot
      case 'AUTH_FAILURE':
        return this.config.ttl.authFailure
      case 'DDOS':
        return this.config.ttl.ddos
      default:
        return this.config.ttl.bot // デフォルト
    }
  }

  async cleanupExpired(): Promise<number> {
    const now = Date.now()
    let cleanedCount = 0

    try {
      // インメモリキャッシュの期限切れエントリを一括削除
      for (const [key, entry] of this.memoryCache.entries()) {
        if (entry.until <= now) {
          this.memoryCache.delete(key)
          cleanedCount++
        }
      }

      if (cleanedCount > 0) {
        this.logger.debug(`🧹 Cleaned up ${cleanedCount} expired DENY cache entries (global)`)
      }

      return cleanedCount
    } catch (error) {
      this.logger.error('DENY memory cache cleanup failed', { error })
      return 0
    }
  }
}

export class SecurityEngine {
  private config: SecurityConfig
  private logger: SecurityLogger
  private redis: SecurityEngineOptions['redis']
  private rules: SecurityRuleSet
  private denyCache: DenyCacheManager

  constructor(options: SecurityEngineOptions) {
    this.config = options.config
    this.logger = options.logger
    this.redis = options.redis
    this.rules = {
      rateLimit: [],
      authFailure: [],
      botDetection: [],
      ddosProtection: [],
    }
    this.denyCache = new DenyCacheManagerImpl(this.redis, this.logger)
  }

  /**
   * NextRequestから直接セキュリティチェックを実行
   * middlewareから呼び出される静的メソッド
   */
  public static async protect(
    request: NextRequest,
    config: SecurityConfig,
    waitUntil?: WaitUntilCallback
  ): Promise<SecurityDecision> {
    try {
      // 環境判定
      const isVercel = !!process.env.VERCEL
      if (!isVercel) {
        return createSecurityDecision({
          allowed: true,
          checks: [],
          metadata: {
            processingTime: 0,
            ruleCount: 0,
            cacheHit: false,
          },
        })
      }

      // Redis接続とSecurityEngine初期化
      const redisUrl = process.env.KV_REST_API_URL || ''
      const redisToken = process.env.KV_REST_API_TOKEN || ''

      const redis = createRedisAdapter(redisUrl, redisToken)

      const logger: SecurityLogger = {
        debug: (message: string, data?: unknown) => console.log(`🔍 ${message}`, data || ''),
        info: (message: string, data?: unknown) => console.log(`ℹ️ ${message}`, data || ''),
        warn: (message: string, data?: unknown) => console.warn(`⚠️ ${message}`, data),
        error: (message: string, data?: unknown) => console.error(`❌ ${message}`, data),
      }

      const securityEngine = new SecurityEngine({
        redis,
        config,
        logger,
      })

      // セキュリティルールを動的に追加
      securityEngine.loadSecurityRules()

      // リクエストからコンテキストを抽出
      const context = SecurityEngine.extractContext(request)

      // セキュリティチェック実行（waitUntilコールバック付き）
      const result = await securityEngine.checkSecurity(context, waitUntil)
      return createSecurityDecision(result)
    } catch (error) {
      console.error('❌ SecurityEngine.protect failed:', error)

      // fail-open: エラーでもリクエストを通す
      return createSecurityDecision({
        allowed: true,
        checks: [],
        metadata: {
          processingTime: 0,
          ruleCount: 0,
          cacheHit: false,
        },
      })
    }
  }

  /**
   * NextRequestからSecurityContextを抽出
   */
  private static extractContext(request: NextRequest): SecurityContext {
    const path = request.nextUrl.pathname
    const method = request.method

    // IP アドレス取得（ヘッダーベースで信頼性重視）
    const forwardedFor = request.headers.get('x-forwarded-for')
    const realIp = request.headers.get('x-real-ip')
    const ip = forwardedFor?.split(',')[0]?.trim() || realIp || '127.0.0.1'

    // User-Agent取得
    const userAgent = request.headers.get('user-agent') || 'unknown'

    // ヘッダー情報を取得
    const headers: Record<string, string> = {}
    request.headers.forEach((value, key) => {
      headers[key] = value
    })

    return {
      ip,
      path,
      method,
      userAgent,
      timestamp: Date.now(),
      headers,
    }
  }

  /**
   * 🚀 セキュリティルールを追加
   * 静的importしたルールをエンジンに登録
   */
  private loadSecurityRules(): void {
    this.addRule('rateLimit', rateLimitRule)
    this.addRule('authFailure', authFailureRule)
    for (const rule of botDetectionRules) {
      this.addRule('botDetection', rule)
    }
  }

  public addRule(category: keyof SecurityRuleSet, rule: SecurityRule): void {
    this.rules[category].push(rule)
    this.rules[category].sort((a, b) => b.priority - a.priority)
  }

  /**
   * バックグラウンドタスクの実行スケジューラー
   * waitUntilが利用可能ならVercel Function保証、そうでなければfire-and-forget
   */
  private scheduleBackgroundTask(
    task: () => Promise<void>,
    taskName: string,
    waitUntil?: WaitUntilCallback
  ): void {
    const backgroundPromise = task().catch((error) => {
      this.logger.error(`Background task failed: ${taskName}`, { error })
    })

    if (waitUntil) {
      // Vercel環境: waitUntilでバックグラウンド処理保証
      waitUntil(backgroundPromise)
    } else {
      // ローカル環境: 従来のfire-and-forget方式
      // backgroundPromiseは既にcatchでエラーハンドリング済み
    }
  }

  public async checkRateLimit(context: SecurityContext): Promise<SecurityCheck | null> {
    const rules = this.rules.rateLimit.filter((rule) => rule.enabled)

    for (const rule of rules) {
      try {
        const check = await rule.check(context, {
          config: this.config,
          logger: this.logger,
          redis: this.redis,
        })

        if (check?.blocked) {
          await this.logSecurityEvent(context, check)
          return check
        }
      } catch (error) {
        this.logger.error(`Rate limit rule ${rule.name} failed`, {
          error: error instanceof Error ? error.message : String(error),
          rule: rule.name,
          context: this.sanitizeContext(context),
        })
      }
    }

    return null
  }

  public async checkSecurity(
    context: SecurityContext,
    waitUntil?: WaitUntilCallback
  ): Promise<SecurityResult> {
    const startTime = Date.now()
    const checks: SecurityCheck[] = []

    try {
      // DENY専用キャッシュチェック（Arcjetベストプラクティス）
      const cachedDeny = await this.denyCache.checkCache(context)
      if (cachedDeny) {
        // キャッシュヒットの場合、即座にDENY返却
        const deniedCheck: SecurityCheck = {
          type: this.mapReasonToCheckType(cachedDeny.reason),
          severity: 'HIGH',
          blocked: true,
          reason: `Cached DENY: ${cachedDeny.reason}`,
          details: {
            cacheHit: true,
            originalEvidence: cachedDeny.evidence,
            cachedUntil: new Date(cachedDeny.until).toISOString(),
          },
          ruleId: `deny-cache-${cachedDeny.reason.toLowerCase()}`,
          conclusion: 'DENY',
          evidence: cachedDeny.evidence,
        }

        return {
          allowed: false,
          checks: [deniedCheck],
          metadata: {
            processingTime: Date.now() - startTime,
            ruleCount: 0,
            cacheHit: true,
          },
        }
      }

      const allRules = [
        ...this.rules.rateLimit,
        ...this.rules.authFailure,
        ...this.rules.botDetection,
        ...this.rules.ddosProtection,
      ]

      const enabledRules = allRules.filter((rule) => rule?.enabled)

      // IP関連の全Redisキーを事前に一括取得
      const matchedPath = Object.keys(this.config.rateLimit.paths)
        .filter((path) => context.path.startsWith(path))
        .sort((a, b) => b.length - a.length)[0]
      const limitType = matchedPath ? `path:${matchedPath}` : 'default'
      const rateLimitKey = `security:ratelimit:${limitType}:${context.ip}`

      const ipKeys = [
        `security:timing:${context.ip}`,
        `security:behavior:${context.ip}`,
        `security:fingerprint:${context.ip}`,
        `security:fingerprint:${context.ip}:count`,
        rateLimitKey,
        `security:authfail:${context.ip}`,
      ]

      const batchValues = await this.redis.mget(...ipKeys)

      // キーと値のマップを作成
      const redisCache = new Map<string, string | null>()
      ipKeys.forEach((key, index) => {
        redisCache.set(key, batchValues[index] ?? null)
      })

      for (const rule of enabledRules) {
        try {
          const check = await rule.check(context, {
            config: this.config,
            logger: this.logger,
            redis: this.redis,
            redisCache: redisCache, // キャッシュを渡す
          })

          if (check) {
            checks.push(check)

            if (check.blocked) {
              await this.logSecurityEvent(context, check)

              // DENYの場合、キャッシュに保存（waitUntilまたは従来方式）
              const reason = this.mapCheckTypeToReason(check.type)
              if (reason !== 'ALLOWED' && check.evidence) {
                const evidence = check.evidence // TypeScript型推論のため変数に代入
                this.scheduleBackgroundTask(
                  () => this.denyCache.storeCache(context, reason, evidence),
                  'deny cache store',
                  waitUntil
                )
              }

              if (this.config.mode === 'LIVE') {
                break
              }
            }
          }
        } catch (error) {
          this.logger.error(`Security rule ${rule.name} failed`, {
            error: error instanceof Error ? error.message : String(error),
            rule: rule.name,
            context: this.sanitizeContext(context),
          })
        }
      }

      const allowed = this.config.mode === 'DRY_RUN' || !checks.some((check) => check.blocked)
      const processingTime = Date.now() - startTime

      // メトリクス更新を実行（waitUntilまたは従来方式）
      this.scheduleBackgroundTask(
        () => this.updateMetrics(checks, allowed),
        'metrics update',
        waitUntil
      )

      return {
        allowed,
        checks,
        metadata: {
          processingTime,
          ruleCount: enabledRules.length,
          cacheHit: false,
        },
      }
    } catch (error) {
      this.logger.error('Security check failed', {
        error: error instanceof Error ? error.message : String(error),
        context: this.sanitizeContext(context),
      })

      return {
        allowed: true,
        checks: [],
        metadata: {
          processingTime: Date.now() - startTime,
          ruleCount: 0,
          cacheHit: false,
        },
      }
    }
  }

  private async logSecurityEvent(context: SecurityContext, check: SecurityCheck): Promise<void> {
    const event: SecurityEvent = {
      id: this.generateEventId(),
      timestamp: Date.now(),
      type: check.type,
      severity: check.severity,
      ip: context.ip,
      userAgent: context.userAgent,
      path: context.path,
      method: context.method,
      blocked: check.blocked,
      reason: check.reason,
      details: check.details ?? {},
      geo: context.geo,
    }

    try {
      const eventKey = this.getRedisKeys().securityEvent(event.id)
      await this.redis.set(eventKey, JSON.stringify(event), 86400)

      const eventListKey = 'security:events'
      await this.redis.lpush(eventListKey, event.id)
      await this.redis.expire(eventListKey, 86400)

      if (this.config.logging.slack?.levels.includes(mapSeverityToLogLevel(check.severity))) {
        await this.sendSlackNotification(event)
      }

      this.logger.info('Security event logged', {
        eventId: event.id,
        type: event.type,
        severity: event.severity,
        blocked: event.blocked,
      })
    } catch (error) {
      this.logger.error('Failed to log security event', {
        error: error instanceof Error ? error.message : String(error),
        event: this.sanitizeEvent(event),
      })
    }
  }

  private async updateMetrics(checks: SecurityCheck[], allowed: boolean): Promise<void> {
    try {
      const metricsKey = this.getRedisKeys().securityMetrics()
      const now = Date.now()

      const metrics: SecurityMetrics = {
        totalRequests: 1,
        blockedRequests: allowed ? 0 : 1,
        rateLimitHits: checks.filter((c) => c.type === 'RATE_LIMIT').length,
        authFailures: checks.filter((c) => c.type === 'AUTH_FAILURE').length,
        botDetections: checks.filter((c) => c.type === 'BOT_DETECTION').length,
        ddosAttempts: checks.filter((c) => c.type === 'DDOS_PROTECTION').length,
        lastUpdated: now,
      }

      // まず現在値を一括取得
      const currentMetrics = await this.redis.hgetall(metricsKey)

      // 新しい値を計算
      const updatedMetrics: Record<string, string> = {}

      for (const [key, value] of Object.entries(metrics)) {
        if (key === 'lastUpdated') {
          updatedMetrics[key] = value.toString()
        } else if (typeof value === 'number') {
          const currentValue = Number.parseInt(currentMetrics?.[key] ?? '0')
          updatedMetrics[key] = (currentValue + value).toString()
        }
      }

      // バッチで一括更新 - 同期実行
      await this.redis.hset(metricsKey, updatedMetrics)

      // TTL設定 - 同期実行
      await this.redis.expire(metricsKey, 86400)
    } catch (error) {
      this.logger.error('Failed to update security metrics', {
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  private async sendSlackNotification(event: SecurityEvent): Promise<void> {
    try {
      const webhookUrl = process.env.SLACK_SECURITY_WEBHOOK
      if (!webhookUrl) {
        this.logger.warn('Slack webhook URL not configured')
        return
      }

      const payload = {
        text: `🚨 Security Alert: ${event.type}`,
        attachments: [
          {
            color: this.getSlackColor(event.severity),
            fields: [
              {
                title: 'Severity',
                value: event.severity,
                short: true,
              },
              {
                title: 'IP Address',
                value: event.ip,
                short: true,
              },
              {
                title: 'Path',
                value: event.path,
                short: true,
              },
              {
                title: 'Method',
                value: event.method,
                short: true,
              },
              {
                title: 'Reason',
                value: event.reason,
                short: false,
              },
              {
                title: 'Blocked',
                value: event.blocked ? 'Yes' : 'No',
                short: true,
              },
              {
                title: 'Timestamp',
                value: new Date(event.timestamp).toISOString(),
                short: true,
              },
            ],
          },
        ],
      }

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        throw new Error(`Slack notification failed: ${response.status}`)
      }

      this.logger.debug('Slack notification sent', { eventId: event.id })
    } catch (error) {
      this.logger.error('Failed to send Slack notification', {
        error: error instanceof Error ? error.message : String(error),
        eventId: event.id,
      })
    }
  }

  private getSlackColor(severity: SecurityCheck['severity']): string {
    switch (severity) {
      case 'CRITICAL':
        return 'danger'
      case 'HIGH':
        return 'warning'
      case 'MEDIUM':
        return 'good'
      case 'LOW':
        return '#36a64f'
      default:
        return 'good'
    }
  }

  private generateEventId(): string {
    return `sec_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
  }

  private getRedisKeys(): RedisKeys {
    return {
      rateLimit: (type: string, identifier: string) => `security:ratelimit:${type}:${identifier}`,
      authFailure: (ip: string) => `security:authfail:${ip}`,
      botDetection: (ip: string) => `security:bot:${ip}`,
      ddos: (ip: string) => `security:ddos:${ip}`,
      securityEvent: (id: string) => `security:event:${id}`,
      securityMetrics: () => 'security:metrics',
      securityStats: (period: string) => `security:stats:${period}`,
    }
  }

  private sanitizeContext(context: SecurityContext): Partial<SecurityContext> {
    return {
      ip: context.ip,
      path: context.path,
      method: context.method,
      timestamp: context.timestamp,
      userAgent: context.userAgent.substring(0, 100),
    }
  }

  private sanitizeEvent(event: SecurityEvent): Partial<SecurityEvent> {
    return {
      id: event.id,
      type: event.type,
      severity: event.severity,
      ip: event.ip,
      path: event.path,
      method: event.method,
      blocked: event.blocked,
      reason: event.reason,
      timestamp: event.timestamp,
    }
  }

  public async getMetrics(): Promise<SecurityMetrics> {
    try {
      const metricsKey = this.getRedisKeys().securityMetrics()
      const rawMetrics = await this.redis.hgetall(metricsKey)

      return {
        totalRequests: Number.parseInt(rawMetrics.totalRequests ?? '0'),
        blockedRequests: Number.parseInt(rawMetrics.blockedRequests ?? '0'),
        rateLimitHits: Number.parseInt(rawMetrics.rateLimitHits ?? '0'),
        authFailures: Number.parseInt(rawMetrics.authFailures ?? '0'),
        botDetections: Number.parseInt(rawMetrics.botDetections ?? '0'),
        ddosAttempts: Number.parseInt(rawMetrics.ddosAttempts ?? '0'),
        lastUpdated: Number.parseInt(rawMetrics.lastUpdated ?? '0'),
      }
    } catch (error) {
      this.logger.error('Failed to get security metrics', {
        error: error instanceof Error ? error.message : String(error),
      })

      return {
        totalRequests: 0,
        blockedRequests: 0,
        rateLimitHits: 0,
        authFailures: 0,
        botDetections: 0,
        ddosAttempts: 0,
        lastUpdated: 0,
      }
    }
  }

  public async getRecentEvents(limit = 10): Promise<SecurityEvent[]> {
    try {
      const eventListKey = 'security:events'
      const eventIds = await this.redis.lrange(eventListKey, 0, limit - 1)

      const events: SecurityEvent[] = []
      for (const eventId of eventIds) {
        const eventKey = this.getRedisKeys().securityEvent(eventId)
        const eventData = await this.redis.get(eventKey)
        if (eventData) {
          events.push(JSON.parse(eventData))
        }
      }

      return events
    } catch (error) {
      this.logger.error('Failed to get recent events', {
        error: error instanceof Error ? error.message : String(error),
      })
      return []
    }
  }

  /**
   * SecurityDecisionReasonをSecurityCheck typeにマッピング
   */
  private mapReasonToCheckType(reason: SecurityDecisionReason): SecurityCheck['type'] {
    switch (reason) {
      case 'RATE_LIMIT':
        return 'RATE_LIMIT'
      case 'BOT':
        return 'BOT_DETECTION'
      case 'AUTH_FAILURE':
        return 'AUTH_FAILURE'
      case 'DDOS':
        return 'DDOS_PROTECTION'
      default:
        return 'BOT_DETECTION' // デフォルト
    }
  }

  /**
   * SecurityCheck typeをSecurityDecisionReasonにマッピング
   */
  private mapCheckTypeToReason(type: SecurityCheck['type']): SecurityDecisionReason {
    switch (type) {
      case 'RATE_LIMIT':
        return 'RATE_LIMIT'
      case 'BOT_DETECTION':
        return 'BOT'
      case 'AUTH_FAILURE':
        return 'AUTH_FAILURE'
      case 'DDOS_PROTECTION':
        return 'DDOS'
      default:
        return 'BOT' // デフォルト
    }
  }
}

function mapSeverityToLogLevel(
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
): 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' {
  switch (severity) {
    case 'LOW':
      return 'DEBUG'
    case 'MEDIUM':
      return 'INFO'
    case 'HIGH':
      return 'WARN'
    case 'CRITICAL':
      return 'ERROR'
    default:
      return 'INFO'
  }
}

export function createSecurityLogger(level: SecurityConfig['logging']['level']): SecurityLogger {
  const shouldLog = (logLevel: SecurityConfig['logging']['level']) => {
    const levels = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 }
    return levels[logLevel] >= levels[level]
  }

  return {
    debug: (message: string, data?: Record<string, unknown>) => {
      if (shouldLog('DEBUG')) {
        console.debug(`[SECURITY:DEBUG] ${message}`, data ? JSON.stringify(data) : '')
      }
    },
    info: (message: string, data?: Record<string, unknown>) => {
      if (shouldLog('INFO')) {
        console.info(`[SECURITY:INFO] ${message}`, data ? JSON.stringify(data) : '')
      }
    },
    warn: (message: string, data?: Record<string, unknown>) => {
      if (shouldLog('WARN')) {
        console.warn(`[SECURITY:WARN] ${message}`, data ? JSON.stringify(data) : '')
      }
    },
    error: (message: string, data?: Record<string, unknown>) => {
      if (shouldLog('ERROR')) {
        console.error(`[SECURITY:ERROR] ${message}`, data ? JSON.stringify(data) : '')
      }
    },
  }
}
