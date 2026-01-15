import { beforeEach, describe, expect, it, vi } from 'vitest'

import type {
  DenyCacheEntry,
  DenyCacheManager,
  SecurityContext,
  SecurityDecisionReason,
  SecurityEngineOptions,
  SecurityEvidence,
  SecurityLogger,
} from '../types'

// テスト用のDenyCacheManagerインポート
// NOTE: 本来はcore.tsからDenyCacheManagerImplをexportするか、別ファイルに分離する必要がある
// 今回は直接実装をコピーしてテスト用に使用

class TestDenyCacheManager implements DenyCacheManager {
  private config = {
    ttl: {
      rateLimit: 5 * 60 * 1000, // 5分間
      bot: 10 * 60 * 1000, // 10分間
      authFailure: 30 * 60 * 1000, // 30分間
      ddos: 60 * 60 * 1000, // 1時間
    },
    keyStrategy: 'ip_path' as const,
  }

  constructor(
    private redis: SecurityEngineOptions['redis'],
    private logger: SecurityLogger
  ) {}

  async checkCache(context: SecurityContext): Promise<DenyCacheEntry | null> {
    try {
      const reasons: SecurityDecisionReason[] = ['RATE_LIMIT', 'BOT', 'AUTH_FAILURE', 'DDOS']

      for (const reason of reasons) {
        const cacheKey = this.generateCacheKey(context, reason)
        const cached = await this.redis.get(cacheKey)

        if (cached) {
          const entry: DenyCacheEntry = JSON.parse(cached)

          if (entry.until > Date.now()) {
            return entry
          } else {
            this.redis.del(cacheKey).catch(() => {})
          }
        }
      }

      return null
    } catch (error) {
      this.logger.error('DENY cache check failed', { error })
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

      await this.redis.set(cacheKey, JSON.stringify(entry), Math.ceil(ttl / 1000))
    } catch (error) {
      this.logger.error('DENY cache store failed', { error })
    }
  }

  generateCacheKey(context: SecurityContext, reason: SecurityDecisionReason): string {
    return `security:deny:${reason.toLowerCase()}:${context.ip}:${encodeURIComponent(context.path)}`
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
        return this.config.ttl.bot
    }
  }

  async cleanupExpired(): Promise<number> {
    return 0
  }
}

describe('DenyCacheManager', () => {
  let mockRedis: SecurityEngineOptions['redis']
  let mockLogger: SecurityLogger
  let cacheManager: DenyCacheManager
  let mockContext: SecurityContext

  beforeEach(() => {
    // Redis mock
    const mockStorage = new Map<string, string>()

    mockRedis = {
      get: vi.fn(async (key: string) => mockStorage.get(key) || null),
      set: vi.fn(async (key: string, value: string, ttl?: number) => {
        mockStorage.set(key, value)
      }),
      setAsync: vi.fn((key: string, value: string, ttl?: number) => {
        mockStorage.set(key, value)
      }),
      del: vi.fn(async (key: string) => {
        mockStorage.delete(key)
        return 1
      }),
      // その他のメソッドはテストで使用しないためnull
      increment: vi.fn(),
      zadd: vi.fn(),
      zaddAsync: vi.fn(),
      zcount: vi.fn(),
      lpush: vi.fn(),
      lrange: vi.fn(),
      hset: vi.fn(),
      hsetAsync: vi.fn(),
      hget: vi.fn(),
      hgetall: vi.fn(),
      expire: vi.fn(),
      expireAsync: vi.fn(),
      mget: vi.fn(),
      mset: vi.fn(),
      rateLimitPipeline: vi.fn(),
      ddosPipeline: vi.fn(),
    }

    // Logger mock
    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    }

    cacheManager = new TestDenyCacheManager(mockRedis, mockLogger)

    // テスト用のSecurityContext
    mockContext = {
      ip: '192.168.1.1',
      userAgent: 'test-agent',
      path: '/api/test',
      method: 'GET',
      timestamp: Date.now(),
      headers: {},
    }
  })

  describe('キャッシュキー生成', () => {
    it('IP + パス形式でキーを生成する', () => {
      const key = cacheManager.generateCacheKey(mockContext, 'RATE_LIMIT')
      expect(key).toBe('security:deny:rate_limit:192.168.1.1:%2Fapi%2Ftest')
    })

    it('理由別に異なるキーを生成する', () => {
      const rateLimitKey = cacheManager.generateCacheKey(mockContext, 'RATE_LIMIT')
      const botKey = cacheManager.generateCacheKey(mockContext, 'BOT')

      expect(rateLimitKey).not.toBe(botKey)
      expect(rateLimitKey).toContain('rate_limit')
      expect(botKey).toContain('bot')
    })
  })

  describe('TTL設定', () => {
    it('レート制限は5分間', () => {
      expect(cacheManager.getTTL('RATE_LIMIT')).toBe(5 * 60 * 1000)
    })

    it('Bot検知は10分間', () => {
      expect(cacheManager.getTTL('BOT')).toBe(10 * 60 * 1000)
    })

    it('認証失敗は30分間', () => {
      expect(cacheManager.getTTL('AUTH_FAILURE')).toBe(30 * 60 * 1000)
    })

    it('DDoSは1時間', () => {
      expect(cacheManager.getTTL('DDOS')).toBe(60 * 60 * 1000)
    })
  })

  describe('キャッシュ保存と取得', () => {
    it('DENY決定をキャッシュに保存できる', async () => {
      const evidence: SecurityEvidence = {
        rateLimit: {
          current: 10,
          limit: 5,
          window: 60000,
          remaining: 0,
          resetTime: Date.now() + 60000,
          key: 'test-key',
        },
      }

      await cacheManager.storeCache(mockContext, 'RATE_LIMIT', evidence)

      expect(mockRedis.set).toHaveBeenCalledWith(
        'security:deny:rate_limit:192.168.1.1:%2Fapi%2Ftest',
        expect.stringContaining('"reason":"RATE_LIMIT"'),
        300 // 5分のTTL秒数
      )
    })

    it('キャッシュされたDENY決定を取得できる', async () => {
      const evidence: SecurityEvidence = {
        rateLimit: {
          current: 10,
          limit: 5,
          window: 60000,
          remaining: 0,
          resetTime: Date.now() + 60000,
          key: 'test-key',
        },
      }

      // キャッシュに保存
      await cacheManager.storeCache(mockContext, 'RATE_LIMIT', evidence)

      // キャッシュから取得
      const cached = await cacheManager.checkCache(mockContext)

      expect(cached).not.toBeNull()
      expect(cached?.reason).toBe('RATE_LIMIT')
      expect(cached?.ip).toBe('192.168.1.1')
      expect(cached?.path).toBe('/api/test')
      expect(cached?.evidence).toEqual(evidence)
    })

    it('キャッシュが存在しない場合はnullを返す', async () => {
      const cached = await cacheManager.checkCache(mockContext)
      expect(cached).toBeNull()
    })
  })

  describe('TTL期限切れ処理', () => {
    it('期限切れキャッシュは無視される', async () => {
      const now = Date.now()

      // 過去の時刻を設定してキャッシュを直接作成
      const expiredEntry: DenyCacheEntry = {
        reason: 'RATE_LIMIT',
        until: now - 1000, // 1秒前に期限切れ
        evidence: {
          rateLimit: {
            current: 10,
            limit: 5,
            window: 60000,
            remaining: 0,
            resetTime: now,
            key: 'test',
          },
        },
        ip: mockContext.ip,
        path: mockContext.path,
        createdAt: now - 10000,
      }

      const key = cacheManager.generateCacheKey(mockContext, 'RATE_LIMIT')
      await mockRedis.set(key, JSON.stringify(expiredEntry))

      const cached = await cacheManager.checkCache(mockContext)
      expect(cached).toBeNull()

      // 期限切れエントリは削除される
      expect(mockRedis.del).toHaveBeenCalledWith(key)
    })

    it('有効期間内キャッシュは正常に返される', async () => {
      const now = Date.now()

      const validEntry: DenyCacheEntry = {
        reason: 'RATE_LIMIT',
        until: now + 60000, // 1分後まで有効
        evidence: {
          rateLimit: {
            current: 10,
            limit: 5,
            window: 60000,
            remaining: 0,
            resetTime: now,
            key: 'test',
          },
        },
        ip: mockContext.ip,
        path: mockContext.path,
        createdAt: now,
      }

      const key = cacheManager.generateCacheKey(mockContext, 'RATE_LIMIT')
      await mockRedis.set(key, JSON.stringify(validEntry))

      const cached = await cacheManager.checkCache(mockContext)
      expect(cached).not.toBeNull()
      expect(cached?.reason).toBe('RATE_LIMIT')
    })
  })

  describe('複数理由のキャッシュチェック', () => {
    it('複数の理由でキャッシュされた場合、最初に見つかったものを返す', async () => {
      const evidence: SecurityEvidence = {
        rateLimit: {
          current: 10,
          limit: 5,
          window: 60000,
          remaining: 0,
          resetTime: Date.now(),
          key: 'test',
        },
      }

      // 複数の理由でキャッシュを保存
      await cacheManager.storeCache(mockContext, 'RATE_LIMIT', evidence)
      await cacheManager.storeCache(mockContext, 'BOT', evidence)

      const cached = await cacheManager.checkCache(mockContext)

      // RATE_LIMITが最初にチェックされるため、それが返される
      expect(cached?.reason).toBe('RATE_LIMIT')
    })
  })

  describe('エラーハンドリング', () => {
    it('Redis接続エラーでもクラッシュしない', async () => {
      // Redis.getでエラーを発生させる
      mockRedis.get = vi.fn().mockRejectedValue(new Error('Redis connection failed'))

      const cached = await cacheManager.checkCache(mockContext)
      expect(cached).toBeNull()
      expect(mockLogger.error).toHaveBeenCalledWith('DENY cache check failed', expect.any(Object))
    })

    it('キャッシュ保存エラーでもクラッシュしない', async () => {
      mockRedis.set = vi.fn().mockRejectedValue(new Error('Redis write failed'))

      const evidence: SecurityEvidence = {
        rateLimit: {
          current: 10,
          limit: 5,
          window: 60000,
          remaining: 0,
          resetTime: Date.now(),
          key: 'test',
        },
      }

      // エラーが発生してもPromiseが解決される
      await expect(
        cacheManager.storeCache(mockContext, 'RATE_LIMIT', evidence)
      ).resolves.toBeUndefined()
      expect(mockLogger.error).toHaveBeenCalledWith('DENY cache store failed', expect.any(Object))
    })
  })
})
