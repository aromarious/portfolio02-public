import type { SecurityCheck, SecurityContext, SecurityEngineOptions, SecurityRule } from '../types'

export const ddosDetectionRule: SecurityRule = {
  name: 'ddos-detection',
  description: 'Detect potential DDoS attacks based on request patterns',
  priority: 90,
  enabled: true,
  async check(
    context: SecurityContext,
    options: SecurityEngineOptions
  ): Promise<SecurityCheck | null> {
    const { config, redis, redisCache } = options
    const { ddos } = config

    if (!ddos) {
      return null
    }

    const key = `security:ddos:${context.ip}`
    const now = Date.now()
    const windowStart = now - ddos.windowMs

    try {
      // DDoS detection using pipeline
      const count = await redis.ddosPipeline(
        key,
        now,
        now.toString(),
        Math.ceil(ddos.windowMs / 1000),
        windowStart,
        now
      )

      if (count > ddos.threshold) {
        const severity = getSeverity(count, ddos.threshold)

        return {
          type: 'DDOS_PROTECTION',
          severity,
          blocked: true,
          reason: `Potential DDoS attack detected: ${count} requests in ${ddos.windowMs}ms`,
          ruleId: 'ddos-detection',
          conclusion: 'DENY',
          details: {
            requests: count,
            threshold: ddos.threshold,
            windowMs: ddos.windowMs,
            severity: severity.toLowerCase(),
            multiplier: Math.round((count / ddos.threshold) * 100) / 100,
          },
        }
      }

      return null
    } catch (error) {
      options.logger.error('DDoS detection failed', {
        error: error instanceof Error ? error.message : String(error),
        ip: context.ip,
        rule: 'ddos-detection',
      })
      return null
    }
  },
}

export const ddosGlobalRule: SecurityRule = {
  name: 'ddos-global-detection',
  description: 'Detect global DDoS attacks across all IPs',
  priority: 85,
  enabled: true,
  async check(
    context: SecurityContext,
    options: SecurityEngineOptions
  ): Promise<SecurityCheck | null> {
    const { config, redis, redisCache } = options
    const { ddos } = config

    if (!ddos) {
      return null
    }

    const key = 'security:ddos:global'
    const now = Date.now()
    const windowStart = now - ddos.windowMs

    try {
      // Global DDoS detection using pipeline
      const count = await redis.ddosPipeline(
        key,
        now,
        `${now}-${context.ip}`,
        Math.ceil(ddos.windowMs / 1000),
        windowStart,
        now
      )
      const globalThreshold = ddos.threshold * 10

      if (count > globalThreshold) {
        const severity = getSeverity(count, globalThreshold)

        return {
          type: 'DDOS_PROTECTION',
          severity,
          blocked: true,
          reason: `Global DDoS attack detected: ${count} requests across all IPs in ${ddos.windowMs}ms`,
          ruleId: 'ddos-global-detection',
          conclusion: 'DENY',
          details: {
            globalRequests: count,
            globalThreshold,
            windowMs: ddos.windowMs,
            severity: severity.toLowerCase(),
            multiplier: Math.round((count / globalThreshold) * 100) / 100,
            detectionScope: 'global',
          },
        }
      }

      return null
    } catch (error) {
      options.logger.error('Global DDoS detection failed', {
        error: error instanceof Error ? error.message : String(error),
        ip: context.ip,
        rule: 'ddos-global-detection',
      })
      return null
    }
  },
}

export const ddosPathRule: SecurityRule = {
  name: 'ddos-path-detection',
  description: 'Detect DDoS attacks targeting specific paths',
  priority: 80,
  enabled: true,
  async check(
    context: SecurityContext,
    options: SecurityEngineOptions
  ): Promise<SecurityCheck | null> {
    const { config, redis } = options
    const { ddos } = config

    if (!ddos) {
      return null
    }

    const normalizedPath = normalizePath(context.path)
    const key = `security:ddos:path:${normalizedPath}`
    const now = Date.now()
    const windowStart = now - ddos.windowMs

    try {
      // Path-based DDoS detection using pipeline
      const count = await redis.ddosPipeline(
        key,
        now,
        `${now}-${context.ip}`,
        Math.ceil(ddos.windowMs / 1000),
        windowStart,
        now
      )
      const pathThreshold = ddos.threshold * 5

      if (count > pathThreshold) {
        const severity = getSeverity(count, pathThreshold)

        return {
          type: 'DDOS_PROTECTION',
          severity,
          blocked: true,
          reason: `Path-specific DDoS attack detected: ${count} requests to ${normalizedPath} in ${ddos.windowMs}ms`,
          ruleId: 'ddos-path-detection',
          conclusion: 'DENY',
          details: {
            pathRequests: count,
            pathThreshold,
            targetPath: normalizedPath,
            windowMs: ddos.windowMs,
            severity: severity.toLowerCase(),
            multiplier: Math.round((count / pathThreshold) * 100) / 100,
            detectionScope: 'path',
          },
        }
      }

      return null
    } catch (error) {
      options.logger.error('Path DDoS detection failed', {
        error: error instanceof Error ? error.message : String(error),
        ip: context.ip,
        path: context.path,
        rule: 'ddos-path-detection',
      })
      return null
    }
  },
}

export const ddosMethodRule: SecurityRule = {
  name: 'ddos-method-detection',
  description: 'Detect DDoS attacks using specific HTTP methods',
  priority: 75,
  enabled: true,
  async check(
    context: SecurityContext,
    options: SecurityEngineOptions
  ): Promise<SecurityCheck | null> {
    const { config, redis } = options
    const { ddos } = config

    if (!ddos) {
      return null
    }

    const key = `security:ddos:method:${context.method}:${context.ip}`
    const now = Date.now()
    const windowStart = now - ddos.windowMs

    try {
      // Method-based DDoS detection using pipeline
      const count = await redis.ddosPipeline(
        key,
        now,
        now.toString(),
        Math.ceil(ddos.windowMs / 1000),
        windowStart,
        now
      )
      const methodThreshold = getMethodThreshold(context.method, ddos.threshold)

      if (count > methodThreshold) {
        const severity = getSeverity(count, methodThreshold)

        return {
          type: 'DDOS_PROTECTION',
          severity,
          blocked: true,
          reason: `Method-specific DDoS attack detected: ${count} ${context.method} requests in ${ddos.windowMs}ms`,
          ruleId: 'ddos-method-detection',
          conclusion: 'DENY',
          details: {
            methodRequests: count,
            methodThreshold,
            method: context.method,
            windowMs: ddos.windowMs,
            severity: severity.toLowerCase(),
            multiplier: Math.round((count / methodThreshold) * 100) / 100,
            detectionScope: 'method',
          },
        }
      }

      return null
    } catch (error) {
      options.logger.error('Method DDoS detection failed', {
        error: error instanceof Error ? error.message : String(error),
        ip: context.ip,
        method: context.method,
        rule: 'ddos-method-detection',
      })
      return null
    }
  },
}

export const ddosCleanupRule: SecurityRule = {
  name: 'ddos-cleanup',
  description: 'Clean up expired DDoS tracking data',
  priority: 10,
  enabled: true,
  async check(
    context: SecurityContext,
    options: SecurityEngineOptions
  ): Promise<SecurityCheck | null> {
    const { config, redis } = options
    const { ddos } = config

    if (!ddos) {
      return null
    }

    const now = Date.now()
    const cleanupBefore = now - ddos.windowMs * 2

    try {
      const keys = [
        `security:ddos:${context.ip}`,
        'security:ddos:global',
        `security:ddos:path:${normalizePath(context.path)}`,
        `security:ddos:method:${context.method}:${context.ip}`,
      ]

      for (const key of keys) {
        const existingData = await redis.zcount(key, 0, cleanupBefore)
        if (existingData > 0) {
          await redis.zadd(key, cleanupBefore, 'cleanup-marker')
          const removeCount = await redis.zcount(key, 0, cleanupBefore - 1)
          if (removeCount > 0) {
            options.logger.debug(`Cleaned up ${removeCount} expired DDoS entries from ${key}`)
          }
        }
      }

      return null
    } catch (error) {
      options.logger.error('DDoS cleanup failed', {
        error: error instanceof Error ? error.message : String(error),
        ip: context.ip,
        rule: 'ddos-cleanup',
      })
      return null
    }
  },
}

function getSeverity(count: number, threshold: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
  const ratio = count / threshold
  if (ratio >= 10) return 'CRITICAL'
  if (ratio >= 5) return 'HIGH'
  if (ratio >= 2) return 'MEDIUM'
  return 'LOW'
}

function normalizePath(path: string): string {
  return path.replace(/\/+/g, '/').replace(/\/$/, '') || '/'
}

function getMethodThreshold(method: string, baseThreshold: number): number {
  switch (method.toUpperCase()) {
    case 'POST':
    case 'PUT':
    case 'PATCH':
    case 'DELETE':
      return Math.floor(baseThreshold * 0.5)
    case 'GET':
    case 'HEAD':
      return baseThreshold
    default:
      return Math.floor(baseThreshold * 0.3)
  }
}

export const ddosProtectionRules = [
  ddosDetectionRule,
  ddosGlobalRule,
  ddosPathRule,
  ddosMethodRule,
  ddosCleanupRule,
]
