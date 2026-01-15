import type { SecurityCheck, SecurityContext, SecurityEngineOptions, SecurityRule } from '../types'

export const rateLimitRule: SecurityRule = {
  name: 'path-based-rate-limit',
  description: 'Path-based rate limiting for all requests',
  priority: 100,
  enabled: true,
  async check(
    context: SecurityContext,
    options: SecurityEngineOptions
  ): Promise<SecurityCheck | null> {
    const { config, redis } = options
    const { rateLimit } = config

    // パス別制限を確認（最も長いマッチを優先）
    const matchedPath = Object.keys(rateLimit.paths)
      .filter((path) => context.path.startsWith(path))
      .sort((a, b) => b.length - a.length)[0] // 最も長いパスを選択

    const limitConfig = matchedPath
      ? (rateLimit.paths[matchedPath] ?? rateLimit.default)
      : rateLimit.default

    const limitType = matchedPath ? `path:${matchedPath}` : 'default'
    const key = `security:ratelimit:${limitType}:${context.ip}`
    const now = Date.now()
    const windowStart = now - limitConfig.windowMs

    console.log(`📊 Rate limit check: ${key} (limit: ${limitConfig.max}/${limitConfig.windowMs}ms)`)

    try {
      // Rate limit sliding window implementation - 非同期格納パターン
      const redisStart = Date.now()

      // 判定用: 現在のカウントのみ取得
      const count = await redis.zcount(key, windowStart, now)
      console.log(`🔍 Rate limit Redis operations: ${Date.now() - redisStart}ms`)

      // 格納用: 非同期で実行（レスポンスを待たない）
      redis.zaddAsync(key, now, now.toString())
      redis.expireAsync(key, Math.ceil(limitConfig.windowMs / 1000))

      console.log(`📈 Rate limit count: ${count}/${limitConfig.max}`)

      if (count > limitConfig.max) {
        const resetTime = now + limitConfig.windowMs
        return {
          type: 'RATE_LIMIT',
          severity: 'MEDIUM',
          blocked: true,
          reason: `Rate limit exceeded: ${count}/${limitConfig.max} requests in ${limitConfig.windowMs}ms`,
          ruleId: 'path-based-rate-limit',
          conclusion: 'DENY',
          evidence: {
            rateLimit: {
              current: count,
              limit: limitConfig.max,
              window: limitConfig.windowMs,
              remaining: 0,
              resetTime,
              key,
            },
          },
          details: {
            limit: limitConfig.max,
            window: limitConfig.windowMs,
            count,
            key,
          },
        }
      }

      return null
    } catch (error) {
      console.log(
        '⚠️ Redis error in rate limit - fail-open mode:',
        error instanceof Error ? error.message : String(error)
      )
      // fail-open: Redis問題時はリクエストを通す
      return null
    }
  },
}

export const rateLimitRules = [rateLimitRule]
