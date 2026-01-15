/**
 * Redis Adapter カバレッジ向上テスト
 * createRedisAdapterが返すメソッド（get, set, del, incr）の実行パステスト
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createRedisAdapter } from '../redis-adapter'

// @upstash/redisのモック
vi.mock('@upstash/redis', () => ({
  Redis: vi.fn().mockImplementation(() => ({
    get: vi.fn().mockRejectedValue(new Error('Mock Redis error')),
    set: vi.fn().mockRejectedValue(new Error('Mock Redis error')),
    setex: vi.fn().mockRejectedValue(new Error('Mock Redis error')),
    del: vi.fn().mockRejectedValue(new Error('Mock Redis error')),
    incr: vi.fn().mockRejectedValue(new Error('Mock Redis error')),
    mget: vi.fn().mockRejectedValue(new Error('Mock Redis error')),
    mset: vi.fn().mockRejectedValue(new Error('Mock Redis error')),
    expire: vi.fn().mockRejectedValue(new Error('Mock Redis error')),
    zadd: vi.fn().mockRejectedValue(new Error('Mock Redis error')),
    zcount: vi.fn().mockRejectedValue(new Error('Mock Redis error')),
    lpush: vi.fn().mockRejectedValue(new Error('Mock Redis error')),
    lrange: vi.fn().mockRejectedValue(new Error('Mock Redis error')),
    hget: vi.fn().mockRejectedValue(new Error('Mock Redis error')),
    hgetall: vi.fn().mockRejectedValue(new Error('Mock Redis error')),
  })),
}))

describe('Redis Adapter Coverage Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // console.logをモック
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('返されたメソッドの実行テスト', () => {
    it('should execute get method with error handling', async () => {
      const redisAdapter = createRedisAdapter('redis://fake-url', 'fake-token')

      // getメソッドを実行（Redis失敗でnull返却）
      const result = await redisAdapter.get('test-key')

      expect(result).toBeNull()
      expect(console.log).toHaveBeenCalledWith(
        expect.stringMatching(/⚠️ Redis GET failed for key test-key/),
        expect.any(String)
      )
    })

    it('should execute set method with error handling', async () => {
      const redisAdapter = createRedisAdapter('redis://fake-url', 'fake-token')

      // setメソッドを実行（Redis失敗でもvoid）
      const result = await redisAdapter.set('test-key', 'test-value', 60)

      expect(result).toBeUndefined()
      expect(console.log).toHaveBeenCalledWith(
        expect.stringMatching(/⚠️ Redis SET failed for key test-key/),
        expect.any(String)
      )
    })

    it('should execute del method with error handling', async () => {
      const redisAdapter = createRedisAdapter('redis://fake-url', 'fake-token')

      // delメソッドを実行（Redis失敗で0返却）
      const result = await redisAdapter.del('test-key')

      expect(result).toBe(0)
      expect(console.log).toHaveBeenCalledWith(
        expect.stringMatching(/⚠️ Redis DEL failed for key test-key/),
        expect.any(String)
      )
    })

    it('should execute increment method with error handling', async () => {
      const redisAdapter = createRedisAdapter('redis://fake-url', 'fake-token')

      // incrementメソッドを実行（Redis失敗で0返却）
      const result = await redisAdapter.increment('test-key')

      expect(result).toBe(0)
      expect(console.log).toHaveBeenCalledWith(
        expect.stringMatching(/⚠️ Redis INCR failed for key test-key/),
        expect.any(String)
      )
    })

    it('should test additional methods coverage', async () => {
      const redisAdapter = createRedisAdapter('redis://fake-url', 'fake-token')

      // incrementメソッド（失敗ケース）のテスト
      const incrementResult = await redisAdapter.increment('counter-key', 60)
      expect(incrementResult).toBe(0)

      // setAsyncメソッド（fire-and-forget）のテスト
      expect(() => {
        redisAdapter.setAsync('async-key', 'async-value', 30)
      }).not.toThrow()

      // mgetメソッドのテスト
      const mgetResult = await redisAdapter.mget('key1', 'key2')
      expect(Array.isArray(mgetResult)).toBe(true)

      // msetメソッドのテスト
      await redisAdapter.mset({ key1: 'value1', key2: 'value2' })

      // expireメソッドのテスト
      await redisAdapter.expire('test-key', 60)

      // 各種メソッドのエラーログ確認
      expect(console.log).toHaveBeenCalledWith(
        expect.stringMatching(/⚠️ Redis/),
        expect.any(String)
      )
    })
  })
})
