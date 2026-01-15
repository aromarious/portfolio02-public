export type SecurityMode = 'DRY_RUN' | 'LIVE'

// Severity levels for security checks
export type Severity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

// Bot detection config - simple mode (just severity) or detailed mode
export interface BotConfigDetailed {
  blockSeverity: Severity
  honeypot?: { fieldName: string }
  userAgent?: { suspicious: string[] }
  timing?: { minMs: number; maxMs: number }
}
export type BotConfig = Severity | BotConfigDetailed

// Arcjet style decision types
export type SecurityDecisionReason = 'RATE_LIMIT' | 'BOT' | 'AUTH_FAILURE' | 'DDOS' | 'ALLOWED'

export interface SecurityDecision {
  // Arcjet-like API
  isDenied(): boolean
  isAllowed(): boolean

  // Reason checking methods
  reason: {
    isRateLimit(): boolean
    isBot(): boolean
    isAuthFailure(): boolean
    isDdos(): boolean
  }

  // Internal data (compatible with existing)
  allowed: boolean
  checks: SecurityCheck[]
  metadata: {
    processingTime: number
    ruleCount: number
    cacheHit: boolean
  }
}

export interface SecurityConfig {
  mode: SecurityMode
  rateLimit: {
    default: {
      windowMs: number
      max: number
    }
    paths: Record<
      string,
      {
        windowMs: number
        max: number
      }
    >
  }
  authFailure: {
    paths: Record<
      string,
      {
        maxAttempts: number
        lockoutDuration: number
      }
    >
  }
  bot?: BotConfig
  ddos?: {
    threshold: number
    windowMs: number
  }
  logging: {
    level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR'
    slack?: {
      webhook: string
      levels: Array<'DEBUG' | 'INFO' | 'WARN' | 'ERROR'>
    }
  }
}

export interface SecurityContext {
  ip: string
  userAgent: string
  path: string
  method: string
  timestamp: number
  headers: Record<string, string>
  geo?: {
    country?: string
    region?: string
    city?: string
  }
}

export interface SecurityCheck {
  type: 'RATE_LIMIT' | 'AUTH_FAILURE' | 'BOT_DETECTION' | 'DDOS_PROTECTION'
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  blocked: boolean
  reason: string
  details?: Record<string, unknown>
  ruleId: string
  conclusion: 'ALLOW' | 'DENY'
  evidence?: SecurityEvidence
}

export interface SecurityEvidence {
  // Bot Detection Evidence
  userAgent?: {
    value: string
    suspicious: boolean
    patterns: string[]
    browserFingerprint?: BrowserFingerprint
  }

  // Rate Limit Evidence
  rateLimit?: {
    current: number
    limit: number
    window: number
    remaining: number
    resetTime: number
    key: string
  }

  // Auth Failure Evidence
  authFailure?: {
    attempts: number
    maxAttempts: number
    lockoutRemaining: number
    path: string
  }

  // DDoS Evidence
  ddos?: {
    requestCount: number
    threshold: number
    timeWindow: number
    pattern: 'burst' | 'sustained' | 'distributed'
    requestsPerSecond?: number
  }

  // IP & Geo Evidence
  ip?: {
    address: string
    country?: string
    region?: string
    asn?: number
    asnOrg?: string
    isHosting?: boolean
    isVpn?: boolean
    isProxy?: boolean
    reputation?: 'clean' | 'suspicious' | 'malicious'
  }
}

export interface BrowserFingerprint {
  isLegitimate: boolean
  confidence: number
  browserName?: string
  browserVersion?: string
  platform?: string
  isMobile?: boolean
}

export interface SecurityCheckOptions {
  level?: 'basic' | 'full'
}

export interface SecurityResult {
  allowed: boolean
  checks: SecurityCheck[]
  metadata: {
    processingTime: number
    ruleCount: number
    cacheHit: boolean
  }
}

// Factory function for creating Arcjet-style decisions
export function createSecurityDecision(result: SecurityResult): SecurityDecision {
  const blockedChecks = result.checks.filter((check) => check.blocked)
  const denied = !result.allowed

  // Determine primary reason for denial
  let primaryReason: SecurityDecisionReason = 'ALLOWED'
  if (denied && blockedChecks.length > 0) {
    const firstBlockedCheck = blockedChecks[0]
    if (firstBlockedCheck) {
      switch (firstBlockedCheck.type) {
        case 'RATE_LIMIT':
          primaryReason = 'RATE_LIMIT'
          break
        case 'BOT_DETECTION':
          primaryReason = 'BOT'
          break
        case 'AUTH_FAILURE':
          primaryReason = 'AUTH_FAILURE'
          break
        case 'DDOS_PROTECTION':
          primaryReason = 'DDOS'
          break
      }
    }
  }

  return {
    isDenied: () => denied,
    isAllowed: () => !denied,

    reason: {
      isRateLimit: () => primaryReason === 'RATE_LIMIT',
      isBot: () => primaryReason === 'BOT',
      isAuthFailure: () => primaryReason === 'AUTH_FAILURE',
      isDdos: () => primaryReason === 'DDOS',
    },

    // Pass through existing data for compatibility
    allowed: result.allowed,
    checks: result.checks,
    metadata: result.metadata,
  }
}

export interface RateLimitInfo {
  key: string
  windowMs: number
  max: number
  current: number
  remaining: number
  resetTime: number
}

export interface AuthFailureInfo {
  ip: string
  attempts: number
  lockoutUntil?: number
  lastAttempt: number
}

export interface BotDetectionInfo {
  score: number
  indicators: string[]
  confidence: 'LOW' | 'MEDIUM' | 'HIGH'
}

export interface DDosInfo {
  requests: number
  threshold: number
  windowMs: number
  severity: 'LOW' | 'MEDIUM' | 'HIGH'
}

export interface SecurityEvent {
  id: string
  timestamp: number
  type: SecurityCheck['type']
  severity: SecurityCheck['severity']
  ip: string
  userAgent: string
  path: string
  method: string
  blocked: boolean
  reason: string
  details: Record<string, unknown>
  geo?: SecurityContext['geo']
}

export interface SecurityMetrics {
  totalRequests: number
  blockedRequests: number
  rateLimitHits: number
  authFailures: number
  botDetections: number
  ddosAttempts: number
  lastUpdated: number
}

export interface SecurityStats {
  period: string
  metrics: SecurityMetrics
  topBlockedIps: Array<{ ip: string; count: number }>
  topBlockedPaths: Array<{ path: string; count: number }>
  securityEvents: SecurityEvent[]
}

export interface RedisKeys {
  rateLimit: (type: string, identifier: string) => string
  authFailure: (ip: string) => string
  botDetection: (ip: string) => string
  ddos: (ip: string) => string
  securityEvent: (id: string) => string
  securityMetrics: () => string
  securityStats: (period: string) => string
}

export interface SecurityLogger {
  debug: (message: string, data?: Record<string, unknown>) => void
  info: (message: string, data?: Record<string, unknown>) => void
  warn: (message: string, data?: Record<string, unknown>) => void
  error: (message: string, data?: Record<string, unknown>) => void
}

export interface SecurityMiddlewareResponse {
  headers?: Record<string, string>
  redirect?: string
  status?: number
  body?: string
}

export type WaitUntilCallback = (promise: Promise<void>) => void

export interface SecurityEngineOptions {
  config: SecurityConfig
  logger: SecurityLogger
  redis: {
    get: (key: string) => Promise<string | null>
    set: (key: string, value: string, ttl?: number) => Promise<void>
    setAsync: (key: string, value: string, ttl?: number) => void
    increment: (key: string, ttl?: number) => Promise<number>
    zadd: (key: string, score: number, member: string) => Promise<number>
    zaddAsync: (key: string, score: number, member: string) => void
    zcount: (key: string, min: number, max: number) => Promise<number>
    lpush: (key: string, ...values: string[]) => Promise<number>
    lrange: (key: string, start: number, stop: number) => Promise<string[]>
    hset: (
      key: string,
      fieldOrFields: string | Record<string, string>,
      value?: string
    ) => Promise<void>
    hsetAsync: (key: string, fieldOrFields: string | Record<string, string>, value?: string) => void
    hget: (key: string, field: string) => Promise<string | null>
    hgetall: (key: string) => Promise<Record<string, string>>
    expire: (key: string, seconds: number) => Promise<void>
    expireAsync: (key: string, seconds: number) => void
    del: (key: string) => Promise<number>
    mget: (...keys: string[]) => Promise<(string | null)[]>
    mset: (keyValues: Record<string, string>) => Promise<void>
    rateLimitPipeline: (
      key: string,
      score: number,
      member: string,
      ttlSeconds: number,
      rangeMin: number,
      rangeMax: number
    ) => Promise<number>
    ddosPipeline: (
      key: string,
      score: number,
      member: string,
      ttlSeconds: number,
      rangeMin: number,
      rangeMax: number
    ) => Promise<number>
  }
  redisCache?: Map<string, string | null> // バッチ取得したキャッシュ
}

export interface SecurityRule {
  name: string
  description: string
  priority: number
  enabled: boolean
  check: (context: SecurityContext, options: SecurityEngineOptions) => Promise<SecurityCheck | null>
}

export interface SecurityRuleSet {
  rateLimit: SecurityRule[]
  authFailure: SecurityRule[]
  botDetection: SecurityRule[]
  ddosProtection: SecurityRule[]
}

// DENY専用キャッシュシステム - Arcjetベストプラクティス
export interface DenyCacheEntry {
  reason: SecurityDecisionReason
  until: number // Unix timestamp when cache expires
  evidence: SecurityEvidence
  ip: string
  path: string
  createdAt: number
}

export interface DenyCacheConfig {
  // TTL settings per security rule type (in milliseconds)
  ttl: {
    rateLimit: number // 5分間（窓明けまで）
    bot: number // 10分間（行動パターン継続想定）
    authFailure: number // 30分間（ブルートフォース抑制）
    ddos: number // 1時間（攻撃継続抑制）
  }
  // Cache key generation strategy
  keyStrategy: 'ip' | 'ip_path' | 'ip_path_useragent'
}

export interface DenyCacheManager {
  // Check if request should be denied based on cache
  checkCache(context: SecurityContext): Promise<DenyCacheEntry | null>

  // Store DENY decision in cache
  storeCache(
    context: SecurityContext,
    reason: SecurityDecisionReason,
    evidence: SecurityEvidence
  ): Promise<void>

  // Generate cache key for request+reason combination
  generateCacheKey(context: SecurityContext, reason: SecurityDecisionReason): string

  // Get TTL for specific security reason
  getTTL(reason: SecurityDecisionReason): number

  // Clear expired cache entries
  cleanupExpired(): Promise<number>
}
