import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { SecurityConfig, SecurityContext, SecurityEngineOptions } from '../types'
import {
  authFailureCleanupRule,
  authFailurePostProcessRule,
  authFailureRule,
} from '../rules/auth-failure'

describe('Auth Failure Rules Coverage Improvement Tests', () => {
  let mockRedis: any
  let mockRedisCache: any
  let mockLogger: any
  let mockConfig: any

  beforeEach(() => {
    mockRedis = {
      get: vi.fn(),
      set: vi.fn(),
      del: vi.fn(),
      setAsync: vi.fn(),
    }

    mockRedisCache = {
      has: vi.fn(),
      get: vi.fn(),
    }

    mockLogger = {
      info: vi.fn(),
      error: vi.fn(),
    }

    mockConfig = {
      mode: 'DRY_RUN',
      rateLimit: { enabled: true },
      bot: { enabled: true },
      authFailure: {
        enabled: true,
        paths: {
          '/api/auth/login': {
            maxAttempts: 3,
            lockoutDuration: 300000, // 5 minutes
          },
          '/api/auth/admin': {
            maxAttempts: 2,
            lockoutDuration: 600000, // 10 minutes
          },
        },
      },
      logging: { enabled: true },
    }
  })

  describe('authFailureRule - Detection Logic', () => {
    it('should return null when no path config matches', async () => {
      const context: SecurityContext = {
        ip: '192.168.1.1',
        path: '/unprotected/path',
        method: 'POST',
        userAgent: 'test-agent',
        headers: {},
        timestamp: Date.now(),
      }

      const options: SecurityEngineOptions = {
        config: mockConfig,
        redis: mockRedis,
        redisCache: mockRedisCache,
        logger: mockLogger,
      }

      const result = await authFailureRule.check(context, options)
      expect(result).toBeNull()
    })

    it('should return null when auth config is missing for matched path', async () => {
      const configWithMissingPath: SecurityConfig = {
        mode: 'DRY_RUN' as const,
        rateLimit: {
          default: { windowMs: 60000, max: 100 },
          paths: {},
        },
        authFailure: {
          paths: {
            '/api/auth/login': undefined as any, // Missing config for testing
          },
        },
        logging: {
          level: 'INFO' as const,
        },
      }

      const context: SecurityContext = {
        ip: '192.168.1.1',
        path: '/api/auth/login',
        method: 'POST',
        userAgent: 'test-agent',
        headers: {},
        timestamp: Date.now(),
      }

      const options: SecurityEngineOptions = {
        config: configWithMissingPath,
        redis: mockRedis,
        redisCache: mockRedisCache,
        logger: mockLogger,
      }

      const result = await authFailureRule.check(context, options)
      expect(result).toBeNull()
    })

    it('should detect lockout when IP is temporarily locked', async () => {
      const now = Date.now()
      const lockoutUntil = now + 300000 // 5 minutes from now
      const failureData = JSON.stringify({
        attempts: 3,
        lockoutUntil,
      })

      mockRedis.get.mockResolvedValue(failureData)
      mockRedisCache.has.mockReturnValue(false)

      const context: SecurityContext = {
        ip: '192.168.1.1',
        path: '/api/auth/login',
        method: 'POST',
        userAgent: 'test-agent',
        headers: {},
        timestamp: now,
      }

      const options: SecurityEngineOptions = {
        config: mockConfig,
        redis: mockRedis,
        redisCache: mockRedisCache,
        logger: mockLogger,
      }

      const result = await authFailureRule.check(context, options)
      expect(result).not.toBeNull()
      expect(result?.type).toBe('AUTH_FAILURE')
      expect(result?.blocked).toBe(true)
      expect(result?.conclusion).toBe('DENY')
      expect(result?.details?.attempts).toBe(3)
    })

    it('should use cached data when available', async () => {
      const now = Date.now()
      const lockoutUntil = now + 300000
      const failureData = JSON.stringify({
        attempts: 2,
        lockoutUntil,
      })

      mockRedisCache.has.mockReturnValue(true)
      mockRedisCache.get.mockReturnValue(failureData)

      const context: SecurityContext = {
        ip: '192.168.1.1',
        path: '/api/auth/login',
        method: 'POST',
        userAgent: 'test-agent',
        headers: {},
        timestamp: now,
      }

      const options: SecurityEngineOptions = {
        config: mockConfig,
        redis: mockRedis,
        redisCache: mockRedisCache,
        logger: mockLogger,
      }

      await authFailureRule.check(context, options)
      expect(mockRedisCache.get).toHaveBeenCalled()
      expect(mockRedis.get).not.toHaveBeenCalled()
    })

    it('should handle JSON parsing errors gracefully', async () => {
      mockRedis.get.mockResolvedValue('invalid-json')
      mockRedisCache.has.mockReturnValue(false)

      const context: SecurityContext = {
        ip: '192.168.1.1',
        path: '/api/auth/login',
        method: 'POST',
        userAgent: 'test-agent',
        headers: {},
        timestamp: Date.now(),
      }

      const options: SecurityEngineOptions = {
        config: mockConfig,
        redis: mockRedis,
        redisCache: mockRedisCache,
        logger: mockLogger,
      }

      const result = await authFailureRule.check(context, options)
      expect(result).toBeNull()
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Auth failure check failed',
        expect.objectContaining({
          ip: '192.168.1.1',
          path: '/api/auth/login',
          rule: 'auth-failure-tracking',
        })
      )
    })

    it('should handle Redis connection errors', async () => {
      mockRedis.get.mockRejectedValue(new Error('Redis connection failed'))
      mockRedisCache.has.mockReturnValue(false)

      const context: SecurityContext = {
        ip: '192.168.1.1',
        path: '/api/auth/login',
        method: 'POST',
        userAgent: 'test-agent',
        headers: {},
        timestamp: Date.now(),
      }

      const options: SecurityEngineOptions = {
        config: mockConfig,
        redis: mockRedis,
        redisCache: mockRedisCache,
        logger: mockLogger,
      }

      const result = await authFailureRule.check(context, options)
      expect(result).toBeNull()
      expect(mockLogger.error).toHaveBeenCalled()
    })
  })

  describe('authFailurePostProcessRule - Failure Processing', () => {
    it('should return null for non-POST requests', async () => {
      const context: SecurityContext = {
        ip: '192.168.1.1',
        path: '/api/auth/login',
        method: 'GET',
        userAgent: 'test-agent',
        headers: {},
        timestamp: Date.now(),
      }

      const options: SecurityEngineOptions = {
        config: mockConfig,
        redis: mockRedis,
        redisCache: mockRedisCache,
        logger: mockLogger,
      }

      const result = await authFailurePostProcessRule.check(context, options)
      expect(result).toBeNull()
    })

    it('should track first authentication failure', async () => {
      mockRedis.get.mockResolvedValue(null) // No previous failures
      mockRedisCache.has.mockReturnValue(false)

      const context: SecurityContext = {
        ip: '192.168.1.1',
        path: '/api/auth/login',
        method: 'POST',
        userAgent: 'test-agent',
        headers: {},
        timestamp: Date.now(),
      }

      const options: SecurityEngineOptions = {
        config: mockConfig,
        redis: mockRedis,
        redisCache: mockRedisCache,
        logger: mockLogger,
      }

      const result = await authFailurePostProcessRule.check(context, options)
      expect(result).toBeNull() // First failure doesn't trigger alert
      expect(mockRedis.setAsync).toHaveBeenCalled()
    })

    it('should warn on multiple failures before lockout', async () => {
      const existingFailure = JSON.stringify({
        attempts: 1,
        lastFailure: Date.now() - 60000,
      })

      mockRedis.get.mockResolvedValue(existingFailure)
      mockRedisCache.has.mockReturnValue(false)

      const context: SecurityContext = {
        ip: '192.168.1.1',
        path: '/api/auth/login',
        method: 'POST',
        userAgent: 'test-agent',
        headers: {},
        timestamp: Date.now(),
      }

      const options: SecurityEngineOptions = {
        config: mockConfig,
        redis: mockRedis,
        redisCache: mockRedisCache,
        logger: mockLogger,
      }

      const result = await authFailurePostProcessRule.check(context, options)
      expect(result).not.toBeNull()
      expect(result?.type).toBe('AUTH_FAILURE')
      expect(result?.severity).toBe('MEDIUM')
      expect(result?.blocked).toBe(false)
      expect(result?.conclusion).toBe('ALLOW')
      expect(result?.details?.attempts).toBe(2)
      expect(result?.details?.warning).toBe(true)
    })

    it('should trigger lockout on max attempts reached', async () => {
      const existingFailure = JSON.stringify({
        attempts: 2, // One more will hit the limit of 3
        lastFailure: Date.now() - 60000,
      })

      mockRedis.get.mockResolvedValue(existingFailure)
      mockRedisCache.has.mockReturnValue(false)

      const context: SecurityContext = {
        ip: '192.168.1.1',
        path: '/api/auth/login',
        method: 'POST',
        userAgent: 'test-agent',
        headers: {},
        timestamp: Date.now(),
      }

      const options: SecurityEngineOptions = {
        config: mockConfig,
        redis: mockRedis,
        redisCache: mockRedisCache,
        logger: mockLogger,
      }

      const result = await authFailurePostProcessRule.check(context, options)
      expect(result).not.toBeNull()
      expect(result?.type).toBe('AUTH_FAILURE')
      expect(result?.severity).toBe('CRITICAL')
      expect(result?.blocked).toBe(true)
      expect(result?.conclusion).toBe('DENY')
      expect(result?.details?.attempts).toBe(3)
      expect(result?.details?.lockoutUntil).toBeDefined()
    })

    it('should handle different path configurations', async () => {
      const context: SecurityContext = {
        ip: '192.168.1.1',
        path: '/api/auth/admin', // Different path with stricter limits
        method: 'POST',
        userAgent: 'test-agent',
        headers: {},
        timestamp: Date.now(),
      }

      const existingFailure = JSON.stringify({
        attempts: 1, // Only need 1 more for admin path (limit: 2)
        lastFailure: Date.now() - 60000,
      })

      mockRedis.get.mockResolvedValue(existingFailure)
      mockRedisCache.has.mockReturnValue(false)

      const options: SecurityEngineOptions = {
        config: mockConfig,
        redis: mockRedis,
        redisCache: mockRedisCache,
        logger: mockLogger,
      }

      const result = await authFailurePostProcessRule.check(context, options)
      expect(result?.details?.maxAttempts).toBe(2)
      expect(result?.details?.lockoutDuration).toBe(600000)
    })

    it('should handle post-processing errors gracefully', async () => {
      mockRedis.get.mockRejectedValue(new Error('Redis error'))
      mockRedisCache.has.mockReturnValue(false)

      const context: SecurityContext = {
        ip: '192.168.1.1',
        path: '/api/auth/login',
        method: 'POST',
        userAgent: 'test-agent',
        headers: {},
        timestamp: Date.now(),
      }

      const options: SecurityEngineOptions = {
        config: mockConfig,
        redis: mockRedis,
        redisCache: mockRedisCache,
        logger: mockLogger,
      }

      const result = await authFailurePostProcessRule.check(context, options)
      expect(result).toBeNull()
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Auth failure post-process failed',
        expect.any(Object)
      )
    })
  })

  describe('authFailureCleanupRule - Cleanup Logic', () => {
    it('should clean up expired lockout records', async () => {
      const now = Date.now()
      const expiredLockout = JSON.stringify({
        attempts: 3,
        lockoutUntil: now - 60000, // Expired 1 minute ago
      })

      mockRedis.get.mockResolvedValue(expiredLockout)
      mockRedisCache.has.mockReturnValue(false)

      const context: SecurityContext = {
        ip: '192.168.1.1',
        path: '/api/auth/login',
        method: 'POST',
        userAgent: 'test-agent',
        headers: {},
        timestamp: now,
      }

      const options: SecurityEngineOptions = {
        config: mockConfig,
        redis: mockRedis,
        redisCache: mockRedisCache,
        logger: mockLogger,
      }

      const result = await authFailureCleanupRule.check(context, options)
      expect(result).toBeNull()
      expect(mockRedis.del).toHaveBeenCalledWith('security:authfail:192.168.1.1')
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Auth failure lockout expired and cleaned up',
        expect.objectContaining({
          ip: '192.168.1.1',
        })
      )
    })

    it('should not clean up active lockouts', async () => {
      const now = Date.now()
      const activeLockout = JSON.stringify({
        attempts: 3,
        lockoutUntil: now + 300000, // Still active
      })

      mockRedis.get.mockResolvedValue(activeLockout)
      mockRedisCache.has.mockReturnValue(false)

      const context: SecurityContext = {
        ip: '192.168.1.1',
        path: '/api/auth/login',
        method: 'POST',
        userAgent: 'test-agent',
        headers: {},
        timestamp: now,
      }

      const options: SecurityEngineOptions = {
        config: mockConfig,
        redis: mockRedis,
        redisCache: mockRedisCache,
        logger: mockLogger,
      }

      const result = await authFailureCleanupRule.check(context, options)
      expect(result).toBeNull()
      expect(mockRedis.del).not.toHaveBeenCalled()
    })

    it('should handle cleanup errors gracefully', async () => {
      mockRedis.get.mockRejectedValue(new Error('Redis cleanup error'))
      mockRedisCache.has.mockReturnValue(false)

      const context: SecurityContext = {
        ip: '192.168.1.1',
        path: '/api/auth/login',
        method: 'POST',
        userAgent: 'test-agent',
        headers: {},
        timestamp: Date.now(),
      }

      const options: SecurityEngineOptions = {
        config: mockConfig,
        redis: mockRedis,
        redisCache: mockRedisCache,
        logger: mockLogger,
      }

      const result = await authFailureCleanupRule.check(context, options)
      expect(result).toBeNull()
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Auth failure cleanup failed',
        expect.any(Object)
      )
    })

    it('should handle missing failure data gracefully', async () => {
      mockRedis.get.mockResolvedValue(null)
      mockRedisCache.has.mockReturnValue(false)

      const context: SecurityContext = {
        ip: '192.168.1.1',
        path: '/api/auth/login',
        method: 'POST',
        userAgent: 'test-agent',
        headers: {},
        timestamp: Date.now(),
      }

      const options: SecurityEngineOptions = {
        config: mockConfig,
        redis: mockRedis,
        redisCache: mockRedisCache,
        logger: mockLogger,
      }

      const result = await authFailureCleanupRule.check(context, options)
      expect(result).toBeNull()
      expect(mockRedis.del).not.toHaveBeenCalled()
    })
  })
})
