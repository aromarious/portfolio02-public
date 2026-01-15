import type {
  BotConfig,
  BotConfigDetailed,
  BrowserFingerprint,
  SecurityCheck,
  SecurityContext,
  SecurityEngineOptions,
  SecurityRule,
  Severity,
} from '../types'

// 設定を正規化（シンプルモード or 詳細モードを統一形式に変換）
function normalizeBotConfig(config: BotConfig | undefined): BotConfigDetailed {
  if (!config) {
    return { blockSeverity: 'HIGH' }
  }
  if (typeof config === 'string') {
    return { blockSeverity: config }
  }
  return config
}

// severity比較でブロック判定
function shouldBlock(severity: Severity, threshold: Severity): boolean {
  const levels: Record<Severity, number> = { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 }
  return levels[severity] >= levels[threshold]
}

// ブラウザフィンガープリント分析関数
function analyzeBrowserFingerprint(userAgent: string): BrowserFingerprint {
  // Safari検出
  if (userAgent.includes('Safari/') && userAgent.includes('Version/')) {
    const versionMatch = userAgent.match(/Version\/([0-9.]+)/)
    return {
      isLegitimate: true,
      confidence: 0.95,
      browserName: 'Safari',
      browserVersion: versionMatch?.[1] || 'unknown',
      platform: userAgent.includes('Macintosh')
        ? 'macOS'
        : userAgent.includes('iPhone')
          ? 'iOS'
          : 'unknown',
      isMobile: userAgent.includes('iPhone') || userAgent.includes('iPad'),
    }
  }

  // Chrome検出
  if (userAgent.includes('Chrome/') && !userAgent.includes('Edg/')) {
    const versionMatch = userAgent.match(/Chrome\/([0-9.]+)/)
    return {
      isLegitimate: true,
      confidence: 0.9,
      browserName: 'Chrome',
      browserVersion: versionMatch?.[1] || 'unknown',
      platform: userAgent.includes('Windows')
        ? 'Windows'
        : userAgent.includes('Macintosh')
          ? 'macOS'
          : userAgent.includes('Linux')
            ? 'Linux'
            : 'unknown',
      isMobile: userAgent.includes('Mobile'),
    }
  }

  // Firefox検出
  if (userAgent.includes('Firefox/')) {
    const versionMatch = userAgent.match(/Firefox\/([0-9.]+)/)
    return {
      isLegitimate: true,
      confidence: 0.9,
      browserName: 'Firefox',
      browserVersion: versionMatch?.[1] || 'unknown',
      platform: userAgent.includes('Windows')
        ? 'Windows'
        : userAgent.includes('Macintosh')
          ? 'macOS'
          : userAgent.includes('Linux')
            ? 'Linux'
            : 'unknown',
      isMobile: userAgent.includes('Mobile'),
    }
  }

  // Edge検出
  if (userAgent.includes('Edg/')) {
    const versionMatch = userAgent.match(/Edg\/([0-9.]+)/)
    return {
      isLegitimate: true,
      confidence: 0.9,
      browserName: 'Edge',
      browserVersion: versionMatch?.[1] || 'unknown',
      platform: 'Windows',
      isMobile: userAgent.includes('Mobile'),
    }
  }

  // 不明または疑わしいUser-Agent
  return {
    isLegitimate: false,
    confidence: 0.1,
    browserName: 'unknown',
    browserVersion: 'unknown',
    platform: 'unknown',
    isMobile: false,
  }
}

export const honeypotRule: SecurityRule = {
  name: 'honeypot-detection',
  description: 'Detect bots using honeypot fields',
  priority: 95,
  enabled: true,
  async check(
    context: SecurityContext,
    options: SecurityEngineOptions
  ): Promise<SecurityCheck | null> {
    const { config } = options
    const botConfig = normalizeBotConfig(config.bot)

    if (!botConfig.honeypot) {
      return null
    }

    const honeypotField = context.headers[`x-honeypot-${botConfig.honeypot.fieldName}`]

    if (honeypotField && honeypotField.trim() !== '') {
      const severity = 'HIGH' as const
      return {
        type: 'BOT_DETECTION',
        severity,
        blocked: shouldBlock(severity, botConfig.blockSeverity),
        reason: 'Honeypot field filled - likely bot behavior',
        ruleId: 'honeypot-detection',
        conclusion: shouldBlock(severity, botConfig.blockSeverity) ? 'DENY' : 'ALLOW',
        details: {
          honeypotField: botConfig.honeypot.fieldName,
          honeypotValue: honeypotField.substring(0, 50),
          detectionMethod: 'honeypot',
        },
      }
    }

    return null
  },
}

export const userAgentRule: SecurityRule = {
  name: 'user-agent-detection',
  description: 'Detect bots based on suspicious user agents',
  priority: 85,
  enabled: true,
  async check(
    context: SecurityContext,
    options: SecurityEngineOptions
  ): Promise<SecurityCheck | null> {
    const { config } = options
    const botConfig = normalizeBotConfig(config.bot)

    const userAgent = context.userAgent.toLowerCase()
    const originalUserAgent = context.userAgent

    // ブラウザフィンガープリント分析
    const browserFingerprint = analyzeBrowserFingerprint(originalUserAgent)

    // 正常なブラウザのUser-Agentをホワイトリスト
    const legitBrowsers = [
      'mozilla/5.0', // 標準的なブラウザ
      'chrome/',
      'safari/',
      'firefox/',
      'edge/',
      'opera/',
      'webkit/',
      'applewebkit/',
    ]

    const isLegitBrowser = legitBrowsers.some((pattern) => userAgent.includes(pattern))

    // 正常なブラウザの場合でも詳細ログを記録（デバッグ用）
    if (isLegitBrowser && browserFingerprint.isLegitimate) {
      console.log(
        `✅ Legitimate browser detected: ${browserFingerprint.browserName} ${browserFingerprint.browserVersion}`
      )
      return {
        type: 'BOT_DETECTION',
        severity: 'LOW',
        blocked: false,
        reason: 'Legitimate browser detected',
        ruleId: 'user-agent-detection',
        conclusion: 'ALLOW',
        evidence: {
          userAgent: {
            value: originalUserAgent,
            suspicious: false,
            patterns: [],
            browserFingerprint,
          },
        },
      }
    }

    if (!userAgent || userAgent.length < 10) {
      const severity = 'MEDIUM' as const
      const blocked = shouldBlock(severity, botConfig.blockSeverity)
      return {
        type: 'BOT_DETECTION',
        severity,
        blocked,
        reason: 'Missing or suspiciously short user agent',
        ruleId: 'user-agent-detection',
        conclusion: blocked ? 'DENY' : 'ALLOW',
        evidence: {
          userAgent: {
            value: originalUserAgent,
            suspicious: true,
            patterns: ['short-user-agent'],
            browserFingerprint,
          },
        },
        details: {
          userAgent: originalUserAgent,
          userAgentLength: originalUserAgent.length,
          detectionMethod: 'user-agent-length',
        },
      }
    }

    // デフォルトの疑わしいパターン（設定がない場合のフォールバック）
    const defaultSuspiciousPatterns = [
      'scraper',
      'wget',
      'curl',
      'python-requests',
      'headless',
      'phantom',
      'selenium',
    ]
    const suspiciousPatterns = botConfig.userAgent?.suspicious ?? defaultSuspiciousPatterns

    for (const pattern of suspiciousPatterns) {
      if (userAgent.includes(pattern.toLowerCase())) {
        const severity = 'MEDIUM' as const
        const blocked = shouldBlock(severity, botConfig.blockSeverity)
        return {
          type: 'BOT_DETECTION',
          severity,
          blocked,
          reason: `Suspicious user agent pattern detected: ${pattern}`,
          ruleId: 'user-agent-detection',
          conclusion: blocked ? 'DENY' : 'ALLOW',
          details: {
            userAgent: context.userAgent,
            suspiciousPattern: pattern,
            detectionMethod: 'user-agent-pattern',
          },
        }
      }
    }

    return null
  },
}

export const timingRule: SecurityRule = {
  name: 'timing-analysis',
  description: 'Detect bots based on request timing patterns',
  priority: 75,
  enabled: true,
  async check(
    context: SecurityContext,
    options: SecurityEngineOptions
  ): Promise<SecurityCheck | null> {
    const { config, redis, redisCache } = options
    const botConfig = normalizeBotConfig(config.bot)

    // デフォルトのタイミング設定
    const timing = botConfig.timing ?? { minMs: 100, maxMs: 300000 }

    const key = `security:timing:${context.ip}`
    const now = Date.now()

    try {
      // キャッシュから取得、なければRedisから取得
      const cachedValue = redisCache?.has(key) ? redisCache.get(key) : undefined
      console.log(`🔍 Redis Cache check ${key}: ${cachedValue !== undefined ? 'HIT' : 'MISS'}`)
      const lastRequestTime = cachedValue !== undefined ? cachedValue : await redis.get(key)

      if (lastRequestTime) {
        const timeDiff = now - Number.parseInt(lastRequestTime)

        if (timeDiff < timing.minMs) {
          const severity = 'HIGH' as const
          const blocked = shouldBlock(severity, botConfig.blockSeverity)
          return {
            type: 'BOT_DETECTION',
            severity,
            blocked,
            reason: `Request timing too fast: ${timeDiff}ms (minimum: ${timing.minMs}ms)`,
            ruleId: 'timing-analysis',
            conclusion: blocked ? 'DENY' : 'ALLOW',
            details: {
              timingMs: timeDiff,
              minAllowedMs: timing.minMs,
              maxAllowedMs: timing.maxMs,
              detectionMethod: 'timing-too-fast',
            },
          }
        }
      }

      // タイミングデータ更新（同期実行）
      await redis.set(key, now.toString(), 300)
      return null
    } catch (error) {
      options.logger.error('Timing analysis failed', {
        error: error instanceof Error ? error.message : String(error),
        ip: context.ip,
        rule: 'timing-analysis',
      })
      return null
    }
  },
}

export const behaviorRule: SecurityRule = {
  name: 'behavior-analysis',
  description: 'Detect bots based on behavioral patterns',
  priority: 65,
  enabled: true,
  async check(
    context: SecurityContext,
    options: SecurityEngineOptions
  ): Promise<SecurityCheck | null> {
    const { config, redis, redisCache } = options
    const botConfig = normalizeBotConfig(config.bot)
    const key = `security:behavior:${context.ip}`
    const now = Date.now()

    try {
      // キャッシュから取得、なければRedisから取得
      const cachedValue = redisCache?.has(key) ? redisCache.get(key) : undefined
      console.log(`🔍 Redis Cache check ${key}: ${cachedValue !== undefined ? 'HIT' : 'MISS'}`)
      const behaviorData = cachedValue !== undefined ? cachedValue : await redis.get(key)
      let requests = 0
      let paths = new Set<string>()
      let methods = new Set<string>()
      let startTime = now

      if (behaviorData) {
        const data = JSON.parse(behaviorData)
        requests = data.requests || 0
        paths = new Set(data.paths || [])
        methods = new Set(data.methods || [])
        startTime = data.startTime || now
      }

      requests++
      paths.add(context.path)
      methods.add(context.method)

      const newData = {
        requests,
        paths: Array.from(paths),
        methods: Array.from(methods),
        startTime,
        lastRequest: now,
      }

      // 行動パターンデータ更新（同期実行）
      await redis.set(key, JSON.stringify(newData), 3600)

      const duration = now - startTime
      const requestsPerMinute = (requests / duration) * 60000

      // 最初のリクエストから十分な時間が経過していない場合はスキップ
      if (duration < 5000) {
        // 5秒未満の場合は判定しない
        return null
      }

      // 最低10回以上のリクエストがあった場合のみ頻度チェック
      if (requests >= 10 && requestsPerMinute > 60) {
        const severity = 'HIGH' as const
        const blocked = shouldBlock(severity, botConfig.blockSeverity)
        return {
          type: 'BOT_DETECTION',
          severity,
          blocked,
          reason: `High request frequency: ${requestsPerMinute.toFixed(1)} requests per minute`,
          ruleId: 'behavior-analysis',
          conclusion: blocked ? 'DENY' : 'ALLOW',
          details: {
            requests,
            duration,
            requestsPerMinute: requestsPerMinute.toFixed(1),
            uniquePaths: paths.size,
            uniqueMethods: methods.size,
            detectionMethod: 'behavior-frequency',
          },
        }
      }

      if (requests > 50 && paths.size === 1) {
        const severity = 'MEDIUM' as const
        const blocked = shouldBlock(severity, botConfig.blockSeverity)
        return {
          type: 'BOT_DETECTION',
          severity,
          blocked,
          reason: `Repetitive behavior: ${requests} requests to same path`,
          ruleId: 'behavior-analysis',
          conclusion: blocked ? 'DENY' : 'ALLOW',
          details: {
            requests,
            uniquePaths: paths.size,
            path: context.path,
            detectionMethod: 'behavior-repetitive',
          },
        }
      }

      return null
    } catch (error) {
      options.logger.error('Behavior analysis failed', {
        error: error instanceof Error ? error.message : String(error),
        ip: context.ip,
        rule: 'behavior-analysis',
      })
      return null
    }
  },
}

export const fingerprinting: SecurityRule = {
  name: 'fingerprinting-detection',
  description: 'Detect bots based on request fingerprinting',
  priority: 55,
  enabled: true,
  async check(
    context: SecurityContext,
    options: SecurityEngineOptions
  ): Promise<SecurityCheck | null> {
    const { config, redis, redisCache } = options
    const botConfig = normalizeBotConfig(config.bot)
    const key = `security:fingerprint:${context.ip}`

    try {
      const fingerprint = {
        userAgent: context.userAgent,
        acceptLanguage: context.headers['accept-language'] || '',
        acceptEncoding: context.headers['accept-encoding'] || '',
        connection: context.headers.connection || '',
        cacheControl: context.headers['cache-control'] || '',
      }

      const fingerprintHash = JSON.stringify(fingerprint)
      // キャッシュから取得、なければRedisから取得
      const cachedValue = redisCache?.has(key) ? redisCache.get(key) : undefined
      console.log(`🔍 Redis Cache check ${key}: ${cachedValue !== undefined ? 'HIT' : 'MISS'}`)
      const existingFingerprint = cachedValue !== undefined ? cachedValue : await redis.get(key)

      if (existingFingerprint && existingFingerprint === fingerprintHash) {
        const countKey = `${key}:count`
        const count = await redis.increment(countKey, 3600)

        if (count > 500) {
          const severity = 'MEDIUM' as const
          const blocked = shouldBlock(severity, botConfig.blockSeverity)
          return {
            type: 'BOT_DETECTION',
            severity,
            blocked,
            reason: `Identical fingerprint used ${count} times`,
            ruleId: 'fingerprinting-detection',
            conclusion: blocked ? 'DENY' : 'ALLOW',
            details: {
              fingerprintCount: count,
              fingerprint: fingerprint,
              detectionMethod: 'fingerprint-identical',
            },
          }
        }
      } else {
        // フィンガープリントデータ更新（同期実行）
        await redis.set(key, fingerprintHash, 3600)
      }

      return null
    } catch (error) {
      options.logger.error('Fingerprinting detection failed', {
        error: error instanceof Error ? error.message : String(error),
        ip: context.ip,
        rule: 'fingerprinting-detection',
      })
      return null
    }
  },
}

export const botDetectionRules = [
  honeypotRule,
  userAgentRule,
  timingRule,
  behaviorRule,
  fingerprinting,
]
