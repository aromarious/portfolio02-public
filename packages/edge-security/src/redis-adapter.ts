import { Redis } from '@upstash/redis'

import type { SecurityEngineOptions } from './types'

export function createRedisAdapter(url: string, token: string): SecurityEngineOptions['redis'] {
  console.log(
    `🔧 Creating Redis adapter with URL: ${url?.substring(0, 30)}... Token: ${token ? 'SET' : 'MISSING'}`
  )

  // Edge Runtime環境では常にUpstash REST API使用
  // ローカル環境でもUpstash Redisを使用（Next.js Edge Runtimeの制限）
  console.log('🔧 Using Upstash Redis REST API for Edge Runtime compatibility')

  // 本番環境: Upstash REST API使用
  const upstashRedis = new Redis({
    url: url,
    token: token,
    // Edge Runtime用の設定を追加
    retry: {
      retries: 1,
      backoff: () => 100,
    },
  })

  console.log(
    `🔧 Redis initialized with URL: ${url?.substring(0, 50)}... Token length: ${token?.length || 0}`
  )

  return {
    async get(key: string): Promise<string | null> {
      const startTime = Date.now()
      try {
        const result = await Promise.race([
          upstashRedis.get(key),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Redis GET timeout')), 5000)
          ),
        ])
        const duration = Date.now() - startTime
        console.log(`🔍 Redis GET ${key}: ${duration}ms`)
        return typeof result === 'string' ? result : null
      } catch (error) {
        const duration = Date.now() - startTime
        console.log(
          `⚠️ Redis GET failed for key ${key} after ${duration}ms:`,
          error instanceof Error ? error.message : String(error)
        )
        return null
      }
    },

    async set(key: string, value: string, ttl?: number): Promise<void> {
      const startTime = Date.now()
      try {
        if (ttl) {
          await Promise.race([
            upstashRedis.setex(key, ttl, value),
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error('Redis SETEX timeout')), 5000)
            ),
          ])
          const duration = Date.now() - startTime
          console.log(`🔍 Redis SETEX ${key}: ${duration}ms (TTL: ${ttl}s)`)
        } else {
          await Promise.race([
            upstashRedis.set(key, value),
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error('Redis SET timeout')), 5000)
            ),
          ])
          const duration = Date.now() - startTime
          console.log(`🔍 Redis SET ${key}: ${duration}ms`)
        }
      } catch (error) {
        const duration = Date.now() - startTime
        console.log(
          `⚠️ Redis SET failed for key ${key} after ${duration}ms:`,
          error instanceof Error ? error.message : String(error)
        )
      }
    },

    // Fire-and-forget SET operations (non-blocking)
    setAsync(key: string, value: string, ttl?: number): void {
      Promise.resolve().then(async () => {
        try {
          if (ttl) {
            await Promise.race([
              upstashRedis.setex(key, ttl, value),
              new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error('Redis SETEX timeout')), 5000)
              ),
            ])
          } else {
            await Promise.race([
              upstashRedis.set(key, value),
              new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error('Redis SET timeout')), 5000)
              ),
            ])
          }
        } catch (error) {
          console.log(
            `⚠️ Redis SET async failed for key ${key}:`,
            error instanceof Error ? error.message : String(error)
          )
        }
      })
    },

    async increment(key: string, ttl?: number): Promise<number> {
      try {
        const result = await Promise.race([
          upstashRedis.incr(key),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Redis INCR timeout')), 5000)
          ),
        ])
        if (ttl) await upstashRedis.expire(key, ttl)
        return result
      } catch (error) {
        console.log(
          `⚠️ Redis INCR failed for key ${key}:`,
          error instanceof Error ? error.message : String(error)
        )
        return 0
      }
    },

    async zadd(key: string, score: number, member: string): Promise<number> {
      try {
        const result = await Promise.race([
          upstashRedis.zadd(key, { score, member }),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Redis ZADD timeout')), 5000)
          ),
        ])
        return result ?? 0
      } catch (error) {
        console.log(
          `⚠️ Redis ZADD failed for key ${key}:`,
          error instanceof Error ? error.message : String(error)
        )
        return 0
      }
    },

    // Fire-and-forget ZADD operations (non-blocking)
    zaddAsync(key: string, score: number, member: string): void {
      Promise.resolve().then(async () => {
        try {
          await Promise.race([
            upstashRedis.zadd(key, { score, member }),
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error('Redis ZADD timeout')), 5000)
            ),
          ])
        } catch (error) {
          console.log(
            `⚠️ Redis ZADD async failed for key ${key}:`,
            error instanceof Error ? error.message : String(error)
          )
        }
      })
    },

    async zcount(key: string, min: number, max: number): Promise<number> {
      try {
        const result = await Promise.race([
          upstashRedis.zcount(key, min, max),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Redis ZCOUNT timeout')), 5000)
          ),
        ])
        return result
      } catch (error) {
        console.log(
          `⚠️ Redis ZCOUNT failed for key ${key}:`,
          error instanceof Error ? error.message : String(error)
        )
        return 0
      }
    },

    async lpush(key: string, ...values: string[]): Promise<number> {
      try {
        const result = await Promise.race([
          upstashRedis.lpush(key, ...values),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Redis LPUSH timeout')), 5000)
          ),
        ])
        return result
      } catch (error) {
        console.log(
          `⚠️ Redis LPUSH failed for key ${key}:`,
          error instanceof Error ? error.message : String(error)
        )
        return 0
      }
    },

    async lrange(key: string, start: number, stop: number): Promise<string[]> {
      try {
        const result = await Promise.race([
          upstashRedis.lrange(key, start, stop),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Redis LRANGE timeout')), 5000)
          ),
        ])
        return result.map((item) => String(item))
      } catch (error) {
        console.log(
          `⚠️ Redis LRANGE failed for key ${key}:`,
          error instanceof Error ? error.message : String(error)
        )
        return []
      }
    },

    async hset(
      key: string,
      fieldOrFields: string | Record<string, string>,
      value?: string
    ): Promise<void> {
      const startTime = Date.now()
      try {
        if (typeof fieldOrFields === 'string' && value !== undefined) {
          // 単一フィールド形式: hset(key, field, value)
          await Promise.race([
            upstashRedis.hset(key, { [fieldOrFields]: value }),
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error('Redis HSET timeout')), 5000)
            ),
          ])
          const duration = Date.now() - startTime
          console.log(`🔍 Redis HSET ${key} (single field): ${duration}ms`)
        } else if (typeof fieldOrFields === 'object') {
          // 複数フィールド形式: hset(key, {field1: value1, field2: value2})
          await Promise.race([
            upstashRedis.hset(key, fieldOrFields),
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error('Redis HSET timeout')), 5000)
            ),
          ])
          const duration = Date.now() - startTime
          const fieldCount = Object.keys(fieldOrFields).length
          console.log(`🔍 Redis HSET ${key} (${fieldCount} fields): ${duration}ms`)
        } else {
          throw new Error('Invalid arguments for hset')
        }
      } catch (error) {
        const duration = Date.now() - startTime
        console.log(
          `⚠️ Redis HSET failed for key ${key} after ${duration}ms:`,
          error instanceof Error ? error.message : String(error)
        )
      }
    },

    // Fire-and-forget HSET operations (non-blocking)
    hsetAsync(key: string, fieldOrFields: string | Record<string, string>, value?: string): void {
      Promise.resolve().then(async () => {
        try {
          if (typeof fieldOrFields === 'string' && value !== undefined) {
            // 単一フィールド形式: hset(key, field, value)
            await Promise.race([
              upstashRedis.hset(key, { [fieldOrFields]: value }),
              new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error('Redis HSET timeout')), 5000)
              ),
            ])
          } else if (typeof fieldOrFields === 'object') {
            // 複数フィールド形式: hset(key, {field1: value1, field2: value2})
            await Promise.race([
              upstashRedis.hset(key, fieldOrFields),
              new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error('Redis HSET timeout')), 5000)
              ),
            ])
          } else {
            throw new Error('Invalid arguments for hset')
          }
        } catch (error) {
          console.log(
            `⚠️ Redis HSET async failed for key ${key}:`,
            error instanceof Error ? error.message : String(error)
          )
        }
      })
    },

    async hget(key: string, field: string): Promise<string | null> {
      try {
        const result = await Promise.race([
          upstashRedis.hget(key, field),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Redis HGET timeout')), 5000)
          ),
        ])
        return typeof result === 'string' ? result : null
      } catch (error) {
        console.log(
          `⚠️ Redis HGET failed for key ${key}:`,
          error instanceof Error ? error.message : String(error)
        )
        return null
      }
    },

    async hgetall(key: string): Promise<Record<string, string>> {
      try {
        const result = await Promise.race([
          upstashRedis.hgetall(key),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Redis HGETALL timeout')), 5000)
          ),
        ])
        if (!result) return {}
        return Object.fromEntries(Object.entries(result).map(([k, v]) => [k, String(v)]))
      } catch (error) {
        console.log(
          `⚠️ Redis HGETALL failed for key ${key}:`,
          error instanceof Error ? error.message : String(error)
        )
        return {}
      }
    },

    async expire(key: string, seconds: number): Promise<void> {
      const startTime = Date.now()
      try {
        await Promise.race([
          upstashRedis.expire(key, seconds),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Redis EXPIRE timeout')), 5000)
          ),
        ])
        const duration = Date.now() - startTime
        console.log(`🔍 Redis EXPIRE ${key}: ${duration}ms (TTL: ${seconds}s)`)
      } catch (error) {
        const duration = Date.now() - startTime
        console.log(
          `⚠️ Redis EXPIRE failed for key ${key} after ${duration}ms:`,
          error instanceof Error ? error.message : String(error)
        )
        // Silent fail
      }
    },

    // Fire-and-forget EXPIRE operations (non-blocking)
    expireAsync(key: string, seconds: number): void {
      Promise.resolve().then(async () => {
        try {
          await Promise.race([
            upstashRedis.expire(key, seconds),
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error('Redis EXPIRE timeout')), 5000)
            ),
          ])
        } catch (error) {
          console.log(
            `⚠️ Redis EXPIRE async failed for key ${key}:`,
            error instanceof Error ? error.message : String(error)
          )
        }
      })
    },

    async del(key: string): Promise<number> {
      try {
        const result = await Promise.race([
          upstashRedis.del(key),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Redis DEL timeout')), 5000)
          ),
        ])
        return result
      } catch (error) {
        console.log(
          `⚠️ Redis DEL failed for key ${key}:`,
          error instanceof Error ? error.message : String(error)
        )
        return 0
      }
    },

    async mget(...keys: string[]): Promise<(string | null)[]> {
      const startTime = Date.now()
      try {
        const result = await Promise.race([
          upstashRedis.mget(...keys),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Redis MGET timeout')), 10000)
          ),
        ])
        const duration = Date.now() - startTime
        console.log(`🔍 Redis MGET ${keys.length} keys: ${duration}ms`)
        return result.map((item) => (typeof item === 'string' ? item : null))
      } catch (error) {
        const duration = Date.now() - startTime
        console.log(
          `⚠️ Redis MGET failed for ${keys.length} keys after ${duration}ms:`,
          error instanceof Error ? error.message : String(error)
        )
        return keys.map(() => null)
      }
    },

    async mset(keyValues: Record<string, string>): Promise<void> {
      const startTime = Date.now()
      try {
        await Promise.race([
          upstashRedis.mset(keyValues),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Redis MSET timeout')), 10000)
          ),
        ])
        const duration = Date.now() - startTime
        console.log(`🔍 Redis MSET ${Object.keys(keyValues).length} keys: ${duration}ms`)
      } catch (error) {
        const duration = Date.now() - startTime
        console.log(
          `⚠️ Redis MSET failed for ${Object.keys(keyValues).length} keys after ${duration}ms:`,
          error instanceof Error ? error.message : String(error)
        )
      }
    },

    // Pipeline operations for time-series optimizations
    async rateLimitPipeline(
      key: string,
      score: number,
      member: string,
      ttlSeconds: number,
      rangeMin: number,
      rangeMax: number
    ): Promise<number> {
      try {
        const startTime = Date.now()
        const pipeline = upstashRedis.pipeline()
        pipeline.zadd(key, { score, member })
        pipeline.expire(key, ttlSeconds)
        pipeline.zcount(key, rangeMin, rangeMax)

        const results = await Promise.race([
          pipeline.exec(),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Redis Pipeline timeout')), 5000)
          ),
        ])

        const duration = Date.now() - startTime
        console.log(`🔍 Rate limit pipeline operations: ${duration}ms`)

        // 3番目の結果（zcount）を返す
        return (results?.[2] as number) ?? 0
      } catch (error) {
        console.log(
          `⚠️ Redis Pipeline failed for key ${key}:`,
          error instanceof Error ? error.message : String(error)
        )
        return 0
      }
    },

    // DDoS detection pipeline
    async ddosPipeline(
      key: string,
      score: number,
      member: string,
      ttlSeconds: number,
      rangeMin: number,
      rangeMax: number
    ): Promise<number> {
      try {
        const startTime = Date.now()
        const pipeline = upstashRedis.pipeline()
        pipeline.zadd(key, { score, member })
        pipeline.expire(key, ttlSeconds)
        pipeline.zcount(key, rangeMin, rangeMax)

        const results = await Promise.race([
          pipeline.exec(),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Redis DDoS Pipeline timeout')), 5000)
          ),
        ])

        const duration = Date.now() - startTime
        console.log(`🔍 DDoS pipeline operations: ${duration}ms`)

        // 3番目の結果（zcount）を返す
        return (results?.[2] as number) ?? 0
      } catch (error) {
        console.log(
          `⚠️ Redis DDoS Pipeline failed for key ${key}:`,
          error instanceof Error ? error.message : String(error)
        )
        return 0
      }
    },
  }
}
