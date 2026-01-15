import type { SecurityCheck, SecurityContext, SecurityEngineOptions, SecurityRule } from '../types'

export const authFailureRule: SecurityRule = {
  name: 'auth-failure-tracking',
  description: 'Track authentication failures and temporary lockouts',
  priority: 80,
  enabled: true,
  async check(
    context: SecurityContext,
    options: SecurityEngineOptions
  ): Promise<SecurityCheck | null> {
    const { config, redis, redisCache } = options

    // パス別認証失敗設定を確認
    const matchedPath = Object.keys(config.authFailure.paths)
      .filter((path) => context.path.startsWith(path))
      .sort((a, b) => b.length - a.length)[0] // 最も長いパスを選択

    if (!matchedPath) {
      return null // 設定されたパスでない場合はチェックしない
    }

    const authConfig = config.authFailure.paths[matchedPath]
    if (!authConfig) {
      return null
    }

    const key = `security:authfail:${context.ip}`
    const now = Date.now()

    try {
      const cachedValue = redisCache?.has(key) ? redisCache.get(key) : undefined
      const failureData = cachedValue !== undefined ? cachedValue : await redis.get(key)

      if (failureData) {
        const { attempts, lockoutUntil } = JSON.parse(failureData)

        if (lockoutUntil && now < lockoutUntil) {
          return {
            type: 'AUTH_FAILURE',
            severity: 'HIGH',
            blocked: true,
            reason: `IP temporarily locked due to ${attempts} failed authentication attempts (${matchedPath})`,
            ruleId: 'auth-failure-tracking',
            conclusion: 'DENY',
            details: {
              attempts,
              lockoutUntil,
              remainingLockoutMs: lockoutUntil - now,
              path: matchedPath,
              maxAttempts: authConfig.maxAttempts,
            },
          }
        }
      }

      return null
    } catch (error) {
      options.logger.error('Auth failure check failed', {
        error: error instanceof Error ? error.message : String(error),
        ip: context.ip,
        path: context.path,
        rule: 'auth-failure-tracking',
      })
      return null
    }
  },
}

export const authFailurePostProcessRule: SecurityRule = {
  name: 'auth-failure-post-process',
  description: 'Process authentication failures after they occur',
  priority: 70,
  enabled: true,
  async check(
    context: SecurityContext,
    options: SecurityEngineOptions
  ): Promise<SecurityCheck | null> {
    const { config, redis, redisCache } = options

    // パス別認証失敗設定を確認（POSTのみ）
    const matchedPath = Object.keys(config.authFailure.paths)
      .filter((path) => context.path.startsWith(path))
      .sort((a, b) => b.length - a.length)[0] // 最も長いパスを選択

    if (!matchedPath || context.method !== 'POST') {
      return null // 設定されたパスでない、またはPOST以外はチェックしない
    }

    const authConfig = config.authFailure.paths[matchedPath]
    if (!authConfig) {
      return null
    }

    const key = `security:authfail:${context.ip}`
    const now = Date.now()

    try {
      const cachedValue = redisCache?.has(key) ? redisCache.get(key) : undefined
      const failureData = cachedValue !== undefined ? cachedValue : await redis.get(key)
      let attempts = 0

      if (failureData) {
        const data = JSON.parse(failureData)
        attempts = data.attempts || 0
      }

      const newAttempts = attempts + 1
      const shouldLockout = newAttempts >= authConfig.maxAttempts
      const lockoutUntil = shouldLockout ? now + authConfig.lockoutDuration : undefined

      const newData = {
        attempts: newAttempts,
        lastFailure: now,
        lockoutUntil,
      }

      redis.setAsync(key, JSON.stringify(newData), Math.ceil(authConfig.lockoutDuration / 1000))

      if (shouldLockout) {
        return {
          type: 'AUTH_FAILURE',
          severity: 'CRITICAL',
          blocked: true,
          reason: `IP locked after ${newAttempts} failed authentication attempts`,
          ruleId: 'auth-failure-post-process',
          conclusion: 'DENY',
          details: {
            attempts: newAttempts,
            maxAttempts: authConfig.maxAttempts,
            lockoutUntil,
            lockoutDuration: authConfig.lockoutDuration,
          },
        }
      }

      if (newAttempts > 1) {
        return {
          type: 'AUTH_FAILURE',
          severity: 'MEDIUM',
          blocked: false,
          reason: `Multiple authentication failures detected: ${newAttempts}/${authConfig.maxAttempts}`,
          ruleId: 'auth-failure-post-process',
          conclusion: 'ALLOW',
          details: {
            attempts: newAttempts,
            maxAttempts: authConfig.maxAttempts,
            warning: true,
          },
        }
      }

      return null
    } catch (error) {
      options.logger.error('Auth failure post-process failed', {
        error: error instanceof Error ? error.message : String(error),
        ip: context.ip,
        path: context.path,
        rule: 'auth-failure-post-process',
      })
      return null
    }
  },
}

export const authFailureCleanupRule: SecurityRule = {
  name: 'auth-failure-cleanup',
  description: 'Clean up expired authentication failure records',
  priority: 10,
  enabled: true,
  async check(
    context: SecurityContext,
    options: SecurityEngineOptions
  ): Promise<SecurityCheck | null> {
    const { redis, redisCache } = options
    const key = `security:authfail:${context.ip}`
    const now = Date.now()

    try {
      const cachedValue = redisCache?.has(key) ? redisCache.get(key) : undefined
      const failureData = cachedValue !== undefined ? cachedValue : await redis.get(key)

      if (failureData) {
        const { lockoutUntil } = JSON.parse(failureData)

        if (lockoutUntil && now > lockoutUntil) {
          await redis.del(key)
          options.logger.info('Auth failure lockout expired and cleaned up', {
            ip: context.ip,
            lockoutUntil,
          })
        }
      }

      return null
    } catch (error) {
      options.logger.error('Auth failure cleanup failed', {
        error: error instanceof Error ? error.message : String(error),
        ip: context.ip,
        rule: 'auth-failure-cleanup',
      })
      return null
    }
  },
}

export const authFailureRules = [
  authFailureRule,
  authFailurePostProcessRule,
  authFailureCleanupRule,
]
