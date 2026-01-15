# エッジセキュリティ実装仕様書

## 実装概要

Next.js 15 Middlewareを使用したエッジセキュリティシステムの詳細実装仕様。

## ファイル構成

```
apps/nextjs/
├── src/
│   ├── lib/security/
│   │   ├── core.ts              # SecurityEngine
│   │   ├── types.ts             # 型定義
│   │   ├── config.ts            # 設定ファクトリー
│   │   ├── logger.ts            # ログ・監視
│   │   └── rules/               # セキュリティルール
│   │       ├── rate-limit.ts    # レート制限
│   │       ├── bot-protection.ts # Bot検出
│   │       ├── auth-failure.ts   # 認証失敗監視
│   │       └── index.ts          # ルール統合
│   ├── middleware.ts            # Next.js Middleware
│   ├── security.config.ts       # 宣言的設定
│   └── env.ts                   # 環境変数（更新）
├── scripts/
│   └── security-monitor.ts      # CLI監視ツール
└── next.config.js               # セキュリティヘッダー（更新）
```

## 型定義

### 核心型定義（types.ts）

```typescript
export type SecurityMode = 'LIVE' | 'DRY_RUN'

export interface SecurityRule {
  name: string
  mode: SecurityMode
  execute: (req: NextRequest) => Promise<SecurityResult>
  matcher?: (req: NextRequest) => boolean
  skip?: (req: NextRequest) => boolean
  priority?: number
}

export interface SecurityResult {
  allow: boolean
  reason?: string
  rule?: string
  metadata?: Record<string, any>
}

export interface SecurityConfig {
  mode: SecurityMode
  rules: SecurityRule[]
  logging?: {
    level: 'debug' | 'info' | 'warn' | 'error'
    targets: ('console' | 'file' | 'vercel' | 'slack')[]
    dryRunLogs: boolean
  }
  redis?: {
    url: string
    token: string
  }
}

export interface RateLimitOptions {
  name: string
  window: string
  max: number
  keyGenerator: (req: NextRequest) => string
  matcher?: (req: NextRequest) => boolean
  skip?: (req: NextRequest) => boolean
  mode?: SecurityMode
}

export interface BotProtectionOptions {
  mode?: SecurityMode
  rules: ('empty-user-agent' | 'known-bot-patterns' | 'no-accept-language')[]
  allowList?: string[]
  blockList?: string[]
}

export interface AuthFailureProtectionOptions {
  maxAttempts: number
  windowMs: number
  blockDurationMs: number
  matcher?: (req: NextRequest) => boolean
  mode?: SecurityMode
}
```

## 核心実装

### SecurityEngine（core.ts）

```typescript
import { NextRequest, NextResponse } from 'next/server'

import { SecurityLogger } from './logger'
import { SecurityConfig, SecurityResult, SecurityRule } from './types'

export class SecurityEngine {
  private logger: SecurityLogger

  constructor(private config: SecurityConfig) {
    this.logger = new SecurityLogger(config.logging)
  }

  async protect(req: NextRequest): Promise<SecurityResult | NextResponse> {
    const results: SecurityResult[] = []

    // 優先度順でルールをソート
    const sortedRules = this.config.rules.sort((a, b) => (a.priority || 0) - (b.priority || 0))

    for (const rule of sortedRules) {
      try {
        // マッチャーチェック
        if (rule.matcher && !rule.matcher(req)) continue
        if (rule.skip && rule.skip(req)) continue

        const result = await rule.execute(req)
        results.push(result)

        // ログ出力
        await this.logger.log(rule.name, result, req)

        // DRY_RUNの場合はログのみ、実際にはブロックしない
        if (rule.mode === 'DRY_RUN') {
          continue
        }

        // LIVEモードで拒否された場合は即座に停止
        if (rule.mode === 'LIVE' && !result.allow) {
          return new NextResponse(result.reason || 'Forbidden', {
            status: result.metadata?.status || 403,
            headers: {
              'X-Security-Rule': rule.name,
              'X-Security-Reason': result.reason || 'Security policy violation',
            },
          })
        }
      } catch (error) {
        // ルール実行エラー時の処理
        await this.logger.error(rule.name, error, req)

        // セキュリティルールのエラーは通すが、警告を出す
        if (rule.mode === 'LIVE') {
          console.warn(`Security rule ${rule.name} failed:`, error)
        }
      }
    }

    return {
      allow: true,
      metadata: {
        checkedRules: results.length,
        results: results.map((r) => ({ rule: r.rule, allow: r.allow })),
      },
    }
  }
}
```

### レート制限実装（rules/rate-limit.ts）

```typescript
import { NextRequest } from 'next/server'

import { RateLimitOptions, SecurityResult, SecurityRule } from '../types'

export function rateLimit(options: RateLimitOptions): SecurityRule {
  return {
    name: options.name,
    mode: options.mode || 'LIVE',
    matcher: options.matcher,
    skip: options.skip,
    priority: 3, // Redis操作なので優先度低め
    execute: async (req: NextRequest): Promise<SecurityResult> => {
      const key = options.keyGenerator(req)
      const windowMs = parseTimeWindow(options.window)

      try {
        const result = await checkRateLimit(key, windowMs, options.max)

        return {
          allow: result.success,
          reason: result.success
            ? undefined
            : `Rate limit exceeded: ${options.max} requests per ${options.window}`,
          rule: options.name,
          metadata: {
            key: key.substring(0, 8) + '...',
            remaining: result.remaining,
            resetTime: result.resetTime,
            limit: options.max,
            window: options.window,
          },
        }
      } catch (error) {
        // Redis接続エラー時は通す（可用性優先）
        return {
          allow: true,
          reason: 'Rate limit service unavailable',
          rule: options.name,
          metadata: { error: 'redis_unavailable' },
        }
      }
    },
  }
}

async function checkRateLimit(key: string, windowMs: number, max: number) {
  const redis = getRedisClient()
  const now = Date.now()
  const windowStart = now - windowMs

  // Sliding window log algorithm
  const pipeline = redis.pipeline()

  // 古いエントリを削除
  pipeline.zremrangebyscore(key, 0, windowStart)

  // 現在のリクエストを追加
  pipeline.zadd(key, now, `${now}-${Math.random()}`)

  // 現在の数を取得
  pipeline.zcard(key)

  // TTL設定
  pipeline.expire(key, Math.ceil(windowMs / 1000))

  const results = await pipeline.exec()
  const currentCount = results[2][1] as number

  return {
    success: currentCount <= max,
    remaining: Math.max(0, max - currentCount),
    resetTime: now + windowMs,
    current: currentCount,
  }
}

function parseTimeWindow(window: string): number {
  const match = window.match(/^(\d+)([smhd])$/)
  if (!match) throw new Error(`Invalid time window format: ${window}`)

  const value = parseInt(match[1])
  const unit = match[2]

  switch (unit) {
    case 's':
      return value * 1000
    case 'm':
      return value * 60 * 1000
    case 'h':
      return value * 60 * 60 * 1000
    case 'd':
      return value * 24 * 60 * 60 * 1000
    default:
      throw new Error(`Invalid time unit: ${unit}`)
  }
}
```

### Bot検出実装（rules/bot-protection.ts）

```typescript
import { NextRequest } from 'next/server'

import { BotProtectionOptions, SecurityResult, SecurityRule } from '../types'

export function botProtection(options: BotProtectionOptions): SecurityRule {
  return {
    name: 'bot-protection',
    mode: options.mode || 'LIVE',
    priority: 1, // 軽量なので優先度高め
    execute: async (req: NextRequest): Promise<SecurityResult> => {
      const userAgent = req.headers.get('User-Agent') || ''
      const acceptLanguage = req.headers.get('Accept-Language') || ''

      // 空User-Agent チェック
      if (options.rules.includes('empty-user-agent')) {
        if (!userAgent.trim()) {
          return {
            allow: false,
            reason: 'Empty User-Agent header',
            rule: 'bot-protection',
            metadata: { check: 'empty-user-agent' },
          }
        }
      }

      // 既知Bot名チェック
      if (options.rules.includes('known-bot-patterns')) {
        const botPatterns = options.blockList || [
          'bot',
          'crawler',
          'spider',
          'scraper',
          'wget',
          'curl',
          'python-requests',
          'php',
          'go-http-client',
          'java',
          'scrapy',
          'selenium',
          'phantomjs',
          'headless',
        ]

        const allowPatterns = options.allowList || [
          'googlebot',
          'bingbot',
          'slackbot',
          'twitterbot',
          'facebookexternalhit',
        ]

        const userAgentLower = userAgent.toLowerCase()

        // 許可リストチェック
        const isAllowed = allowPatterns.some((pattern) =>
          userAgentLower.includes(pattern.toLowerCase())
        )

        if (!isAllowed) {
          const isBot = botPatterns.some((pattern) =>
            userAgentLower.includes(pattern.toLowerCase())
          )

          if (isBot) {
            return {
              allow: false,
              reason: 'Known bot pattern detected',
              rule: 'bot-protection',
              metadata: {
                check: 'known-bot-patterns',
                userAgent: userAgent.substring(0, 50) + '...',
              },
            }
          }
        }
      }

      // Accept-Language未設定チェック
      if (options.rules.includes('no-accept-language')) {
        if (!acceptLanguage.trim()) {
          return {
            allow: false,
            reason: 'Missing Accept-Language header',
            rule: 'bot-protection',
            metadata: { check: 'no-accept-language' },
          }
        }
      }

      return {
        allow: true,
        rule: 'bot-protection',
        metadata: {
          checks: options.rules,
          userAgent: userAgent.substring(0, 50) + '...',
        },
      }
    },
  }
}
```

### 認証失敗監視実装（rules/auth-failure.ts）

```typescript
import { NextRequest } from 'next/server'

import { AuthFailureProtectionOptions, SecurityResult, SecurityRule } from '../types'

export function authFailureProtection(options: AuthFailureProtectionOptions): SecurityRule {
  return {
    name: 'auth-failure-protection',
    mode: options.mode || 'LIVE',
    matcher: options.matcher,
    priority: 4, // 認証パス限定なので優先度低め
    execute: async (req: NextRequest): Promise<SecurityResult> => {
      const clientIP = getClientIP(req)
      const key = `auth_fail:${clientIP}`

      try {
        const failCount = await getAuthFailureCount(key)

        if (failCount >= options.maxAttempts) {
          return {
            allow: false,
            reason: `Authentication failure limit exceeded: ${options.maxAttempts} attempts`,
            rule: 'auth-failure-protection',
            metadata: {
              failCount,
              maxAttempts: options.maxAttempts,
              blockDuration: options.blockDurationMs,
              ip: clientIP.substring(0, 8) + '...',
            },
          }
        }

        return {
          allow: true,
          rule: 'auth-failure-protection',
          metadata: {
            failCount,
            maxAttempts: options.maxAttempts,
            remaining: options.maxAttempts - failCount,
          },
        }
      } catch (error) {
        // Redis接続エラー時は通す
        return {
          allow: true,
          reason: 'Auth failure service unavailable',
          rule: 'auth-failure-protection',
          metadata: { error: 'redis_unavailable' },
        }
      }
    },
  }
}

async function getAuthFailureCount(key: string): Promise<number> {
  const redis = getRedisClient()
  const count = await redis.get(key)
  return count ? parseInt(count) : 0
}

export async function recordAuthFailure(
  clientIP: string,
  windowMs: number,
  blockDurationMs: number
) {
  const redis = getRedisClient()
  const key = `auth_fail:${clientIP}`

  const pipeline = redis.pipeline()
  pipeline.incr(key)
  pipeline.expire(key, Math.ceil(blockDurationMs / 1000))

  await pipeline.exec()
}

function getClientIP(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for')
  const realIP = req.headers.get('x-real-ip')

  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }

  if (realIP) {
    return realIP
  }

  return req.ip || 'unknown'
}
```

## 設定ファクトリー実装

### 設定ファクトリー（config.ts）

```typescript
import { authFailureProtection, botProtection, rateLimit } from './rules'
import { SecurityConfig } from './types'

export function createSecurityConfig(
  config: Partial<SecurityConfig> & {
    mode: SecurityMode
  }
): SecurityConfig {
  const defaultConfig: SecurityConfig = {
    mode: config.mode,
    rules: [],
    logging: {
      level: 'info',
      targets: ['console'],
      dryRunLogs: true,
    },
  }

  return {
    ...defaultConfig,
    ...config,
    logging: {
      ...defaultConfig.logging,
      ...config.logging,
    },
  }
}

export { rateLimit, botProtection, authFailureProtection }
```

## 環境変数設定

### 環境変数追加（env.ts）

```typescript
// 既存の環境変数に追加
export const env = createEnv({
  server: {
    // 既存の環境変数...

    // セキュリティ設定
    SECURITY_MODE: z.enum(['LIVE', 'DRY_RUN']).default('DRY_RUN'),
    SECURITY_LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
    SECURITY_API_TOKEN: z.string().optional(),

    // Redis設定
    KV_REST_API_URL: z.string().optional(),
    KV_REST_API_TOKEN: z.string().optional(),

    // Slack設定
    SLACK_SECURITY_WEBHOOK: z.string().optional(),
  },
  client: {
    // 既存のクライアント環境変数...
  },
  runtimeEnv: {
    // 既存の環境変数...

    // セキュリティ設定
    SECURITY_MODE: process.env.SECURITY_MODE,
    SECURITY_LOG_LEVEL: process.env.SECURITY_LOG_LEVEL,
    SECURITY_API_TOKEN: process.env.SECURITY_API_TOKEN,

    // Redis設定
    KV_REST_API_URL: process.env.KV_REST_API_URL,
    KV_REST_API_TOKEN: process.env.KV_REST_API_TOKEN,

    // Slack設定
    SLACK_SECURITY_WEBHOOK: process.env.SLACK_SECURITY_WEBHOOK,
  },
})
```

## Next.js Middleware実装

### メイン実装（middleware.ts）

```typescript
import { NextRequest, NextResponse } from 'next/server'

import { SecurityEngine } from './lib/security/core'
import { securityConfig } from './security.config'

const security = new SecurityEngine(securityConfig)

export async function middleware(request: NextRequest) {
  try {
    const result = await security.protect(request)

    // NextResponseが返された場合（ブロック）
    if (result instanceof NextResponse) {
      return result
    }

    // 通常の処理継続
    return NextResponse.next()
  } catch (error) {
    // セキュリティシステムのエラー時は通す（可用性優先）
    console.error('Security middleware error:', error)
    return NextResponse.next()
  }
}

export const config = {
  matcher: [
    // セキュリティチェック対象
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

### 宣言的設定（security.config.ts）

```typescript
import { env } from './env'
import {
  authFailureProtection,
  botProtection,
  createSecurityConfig,
  rateLimit,
} from './lib/security/config'

function getClientIP(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for')
  const realIP = req.headers.get('x-real-ip')

  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }

  if (realIP) {
    return realIP
  }

  return req.ip || 'unknown'
}

function isStaticResource(req: NextRequest): boolean {
  const { pathname } = req.nextUrl
  return (
    pathname.startsWith('/_next/static') ||
    pathname.startsWith('/_next/image') ||
    pathname.includes('favicon') ||
    /\.(svg|png|jpg|jpeg|gif|webp)$/.test(pathname)
  )
}

export const securityConfig = createSecurityConfig({
  mode: env.SECURITY_MODE,
  rules: [
    // レート制限ルール
    rateLimit({
      name: 'general',
      window: '1m',
      max: 100,
      keyGenerator: (req) => `rate_limit:general:${getClientIP(req)}`,
      skip: (req) => isStaticResource(req),
    }),

    rateLimit({
      name: 'auth',
      window: '1m',
      max: 10,
      keyGenerator: (req) => `rate_limit:auth:${getClientIP(req)}`,
      matcher: (req) => req.nextUrl.pathname.startsWith('/api/auth'),
    }),

    rateLimit({
      name: 'api',
      window: '1m',
      max: 50,
      keyGenerator: (req) => `rate_limit:api:${getClientIP(req)}`,
      matcher: (req) =>
        req.nextUrl.pathname.startsWith('/api') && !req.nextUrl.pathname.startsWith('/api/auth'),
    }),

    // Bot検出ルール
    botProtection({
      mode: env.SECURITY_MODE,
      rules: ['empty-user-agent', 'known-bot-patterns', 'no-accept-language'],
      allowList: ['googlebot', 'bingbot', 'slackbot', 'twitterbot'],
    }),

    // 認証失敗監視
    authFailureProtection({
      maxAttempts: 5,
      windowMs: 60000,
      blockDurationMs: 300000,
      matcher: (req) => req.nextUrl.pathname.startsWith('/api/auth'),
    }),
  ],
  logging: {
    level: env.SECURITY_LOG_LEVEL,
    targets: env.NODE_ENV === 'development' ? ['console', 'file'] : ['vercel', 'slack'],
    dryRunLogs: true,
  },
  redis: env.KV_REST_API_URL
    ? {
        url: env.KV_REST_API_URL,
        token: env.KV_REST_API_TOKEN!,
      }
    : undefined,
})
```

## セキュリティヘッダー設定

### Next.js設定更新（next.config.js）

```javascript
// 既存の設定に追加
const config = {
  // 既存の設定...

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // Content Security Policy
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://vitals.vercel-analytics.com",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https: blob:",
              "font-src 'self' data:",
              "connect-src 'self' https://vitals.vercel-analytics.com",
              "frame-src 'none'",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'none'",
              'upgrade-insecure-requests',
            ].join('; '),
          },
          // HTTP Strict Transport Security
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload',
          },
          // X-Frame-Options
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          // X-Content-Type-Options
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          // X-XSS-Protection
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          // Referrer-Policy
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          // Permissions-Policy
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
          },
        ],
      },
    ]
  },
}
```

## 必要な依存関係

### package.json更新

```json
{
  "dependencies": {
    "@upstash/redis": "^1.25.0"
  },
  "scripts": {
    "security:watch": "tsx scripts/security-monitor.ts",
    "security:stats": "tsx scripts/security-stats.ts",
    "security:test": "tsx scripts/security-test.ts"
  }
}
```

## 実装手順

1. **型定義作成**: types.ts
2. **核心エンジン実装**: core.ts
3. **セキュリティルール実装**: rules/\*.ts
4. **設定ファクトリー**: config.ts
5. **環境変数設定**: env.ts更新
6. **Middleware実装**: middleware.ts
7. **宣言的設定**: security.config.ts
8. **セキュリティヘッダー**: next.config.js更新
9. **依存関係追加**: package.json更新
10. **CLIツール**: scripts/security-\*.ts

## テスト計画

1. **単体テスト**: 各ルールの動作確認
2. **統合テスト**: SecurityEngineの動作確認
3. **負荷テスト**: 大量リクエスト時の性能確認
4. **セキュリティテスト**: 実際の攻撃パターンでの検証
5. **DRY_RUN検証**: 本番データでの動作確認
