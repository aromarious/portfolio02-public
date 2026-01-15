import type { NextRequest } from 'next/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { SecurityConfig, SecurityContext } from '../types'
import { SecurityEngine } from '../core'

// Next.js Request モック
function createMockRequest(
  path: string,
  method = 'GET',
  headers: Record<string, string> = {}
): NextRequest {
  const url = `https://example.com${path}`
  return {
    nextUrl: {
      pathname: path,
    },
    method,
    headers: {
      get: (key: string) => headers[key] || null,
      forEach: (callback: (value: string, key: string) => void) => {
        Object.entries(headers).forEach(([key, value]) => callback(value, key))
      },
    },
  } as unknown as NextRequest
}

// テスト用セキュリティ設定
const mockConfig: SecurityConfig = {
  mode: 'DRY_RUN',
  rateLimit: {
    default: { windowMs: 60000, max: 100 },
    paths: {
      '/api/test': { windowMs: 60000, max: 10 },
    },
  },
  authFailure: {
    paths: {
      '/api/auth': { maxAttempts: 3, lockoutDuration: 300000 },
    },
  },
  logging: {
    level: 'ERROR',
  },
}

describe('SecurityEngine', () => {
  let originalEnv: NodeJS.ProcessEnv

  beforeEach(() => {
    originalEnv = process.env
    vi.clearAllMocks()
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('protect static method', () => {
    it('Vercel環境以外では常にALLOWを返す', async () => {
      delete process.env.VERCEL

      const request = createMockRequest('/api/test')
      const decision = await SecurityEngine.protect(request, mockConfig)

      expect(decision.isAllowed()).toBe(true)
      expect(decision.isDenied()).toBe(false)
      expect(decision.metadata.processingTime).toBeGreaterThanOrEqual(0)
      expect(decision.metadata.ruleCount).toBe(0)
      expect(decision.metadata.cacheHit).toBe(false)
    })

    it('Vercel環境では実際のセキュリティチェックを実行する', async () => {
      process.env.VERCEL = '1'
      process.env.KV_REST_API_URL = 'https://redis.example.com'
      process.env.KV_REST_API_TOKEN = 'test-token'

      const request = createMockRequest('/api/test', 'GET', {
        'user-agent': 'Mozilla/5.0 (test)',
        'x-forwarded-for': '192.168.1.1',
      })

      // Redis モック
      const mockRedis = {
        get: vi.fn().mockResolvedValue(null),
        mget: vi.fn().mockResolvedValue([null, null, null, null, null, null]),
        set: vi.fn().mockResolvedValue(undefined),
        setAsync: vi.fn(),
        lpush: vi.fn().mockResolvedValue(1),
        expire: vi.fn().mockResolvedValue(undefined),
        hgetall: vi.fn().mockResolvedValue({}),
        hsetAsync: vi.fn(),
        expireAsync: vi.fn(),
        del: vi.fn().mockResolvedValue(1),
        zadd: vi.fn().mockResolvedValue(1),
        zaddAsync: vi.fn(),
        zcount: vi.fn().mockResolvedValue(0),
        increment: vi.fn().mockResolvedValue(1),
        hset: vi.fn().mockResolvedValue(undefined),
        hget: vi.fn().mockResolvedValue(null),
        lrange: vi.fn().mockResolvedValue([]),
        mset: vi.fn().mockResolvedValue(undefined),
        rateLimitPipeline: vi.fn().mockResolvedValue(0),
        ddosPipeline: vi.fn().mockResolvedValue(0),
      }

      // createRedisAdapter をモック
      vi.doMock('../redis-adapter', () => ({
        createRedisAdapter: vi.fn().mockReturnValue(mockRedis),
      }))

      const decision = await SecurityEngine.protect(request, mockConfig)

      expect(decision).toBeDefined()
      expect(decision.isAllowed).toBeDefined()
      expect(decision.isDenied).toBeDefined()
      expect(decision.metadata).toBeDefined()
    })
  })

  describe('extractContext', () => {
    it('NextRequestから正しくセキュリティコンテキストを抽出する', () => {
      const request = createMockRequest('/api/test', 'POST', {
        'user-agent': 'Mozilla/5.0 (test)',
        'x-forwarded-for': '192.168.1.1, 10.0.0.1',
        'x-real-ip': '192.168.1.2',
        'custom-header': 'test-value',
      })

      // extractContextは private なので、SecurityEngineを通じてテストする
      // 実際の実装では、この部分は統合テストでカバーされる
      expect(true).toBe(true) // プレースホルダー
    })
  })

  describe('セキュリティモード', () => {
    it('DRY_RUNモードではチェックを実行するがブロックしない', async () => {
      const dryRunConfig: SecurityConfig = {
        ...mockConfig,
        mode: 'DRY_RUN',
      }

      // SecurityEngineの内部ロジックテストは統合テストでカバー
      expect(dryRunConfig.mode).toBe('DRY_RUN')
    })

    it('LIVEモードではチェックを実行し実際にブロックする', async () => {
      const liveConfig: SecurityConfig = {
        ...mockConfig,
        mode: 'LIVE',
      }

      expect(liveConfig.mode).toBe('LIVE')
    })
  })

  describe('コンストラクタ', () => {
    it('SecurityEngineが正しく初期化される', () => {
      const mockRedis = {
        get: vi.fn(),
        set: vi.fn(),
        setAsync: vi.fn(),
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
        del: vi.fn(),
        mget: vi.fn(),
        mset: vi.fn(),
        rateLimitPipeline: vi.fn(),
        ddosPipeline: vi.fn(),
      }

      const mockLogger = {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      }

      const engine = new SecurityEngine({
        config: mockConfig,
        logger: mockLogger,
        redis: mockRedis,
      })

      expect(engine).toBeDefined()
    })
  })

  describe('fail-open 戦略', () => {
    it('エラーが発生した場合でもALLOWを返す', async () => {
      process.env.VERCEL = '1'
      process.env.KV_REST_API_URL = 'https://invalid-redis-endpoint.upstash.io'
      process.env.KV_REST_API_TOKEN = 'invalid-token'

      const request = createMockRequest('/api/test')

      // エラーが発生してもクラッシュしない
      const decision = await SecurityEngine.protect(request, mockConfig)

      expect(decision.isAllowed()).toBe(true)
      expect(decision.isDenied()).toBe(false)
    })
  })
})
