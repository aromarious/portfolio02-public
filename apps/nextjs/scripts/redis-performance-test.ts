#!/usr/bin/env tsx

/**
 * Redis詳細パフォーマンステストスクリプト
 *
 * 使用方法:
 * npx tsx apps/nextjs/scripts/redis-performance-test.ts
 */
import { Redis } from '@upstash/redis'

interface TestResult {
  operation: string
  duration: number
  success: boolean
  error?: string
}

async function measureOperation<T>(
  operation: string,
  fn: () => Promise<T>
): Promise<{ result: T | null; testResult: TestResult }> {
  const startTime = Date.now()
  try {
    const result = await fn()
    const duration = Date.now() - startTime
    console.log(`⏱️ ${operation}: ${duration}ms`)
    return {
      result,
      testResult: { operation, duration, success: true },
    }
  } catch (error) {
    const duration = Date.now() - startTime
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.log(`❌ ${operation}: ${duration}ms (ERROR: ${errorMsg})`)
    return {
      result: null,
      testResult: { operation, duration, success: false, error: errorMsg },
    }
  }
}

async function testRedisPerformance() {
  console.log('🔍 Redis詳細パフォーマンステスト開始...\n')

  try {
    // 環境変数を確認
    const url = process.env.KV_REST_API_URL
    const token = process.env.KV_REST_API_TOKEN

    if (!url || !token) {
      console.error('❌ 環境変数が設定されていません:')
      console.error('   KV_REST_API_URL')
      console.error('   KV_REST_API_TOKEN')
      process.exit(1)
    }

    console.log(`📡 接続先: ${url.substring(0, 30)}...`)
    console.log(`🔑 トークン: ${token.substring(0, 10)}...\n`)

    // Redis インスタンス作成
    const redis = new Redis({
      url,
      token,
      retry: {
        retries: 1,
        backoff: () => 100,
      },
    })

    const results: TestResult[] = []
    const timestamp = Date.now()

    // 1. PING テスト
    console.log('🏓 PING テスト')
    const { testResult: pingResult } = await measureOperation('PING', () => redis.ping())
    results.push(pingResult)

    // 2. 単純な書き込みテスト（SET）
    console.log('\n📝 書き込みテスト')
    const simpleKey = `perf:simple:${timestamp}`
    const { testResult: setResult } = await measureOperation('SET (simple)', () =>
      redis.set(simpleKey, 'test-value')
    )
    results.push(setResult)

    // 3. TTL付き書き込みテスト（SETEX）
    const ttlKey = `perf:ttl:${timestamp}`
    const { testResult: setexResult } = await measureOperation('SETEX (with TTL)', () =>
      redis.setex(ttlKey, 60, 'test-value-with-ttl')
    )
    results.push(setexResult)

    // 4. ハッシュ書き込みテスト（HSET）
    const hashKey = `perf:hash:${timestamp}`
    const { testResult: hsetResult } = await measureOperation('HSET (hash)', () =>
      redis.hset(hashKey, { field1: 'value1', field2: 'value2', timestamp: String(timestamp) })
    )
    results.push(hsetResult)

    // 5. Sorted Set書き込みテスト（ZADD）
    const zsetKey = `perf:zset:${timestamp}`
    const { testResult: zaddResult } = await measureOperation('ZADD (sorted set)', () =>
      redis.zadd(zsetKey, { score: timestamp, member: `member-${timestamp}` })
    )
    results.push(zaddResult)

    // 6. EXPIRE テスト
    const { testResult: expireResult } = await measureOperation('EXPIRE', () =>
      redis.expire(zsetKey, 60)
    )
    results.push(expireResult)

    // 7. 読み込みテスト
    console.log('\n📖 読み込みテスト')
    const { testResult: getResult } = await measureOperation('GET (simple)', () =>
      redis.get(simpleKey)
    )
    results.push(getResult)

    const { testResult: hgetallResult } = await measureOperation('HGETALL (hash)', () =>
      redis.hgetall(hashKey)
    )
    results.push(hgetallResult)

    const { testResult: zcountResult } = await measureOperation('ZCOUNT (sorted set)', () =>
      redis.zcount(zsetKey, 0, Date.now() + 1000)
    )
    results.push(zcountResult)

    // 8. 複数キー操作テスト
    console.log('\n📊 複数キー操作テスト')
    const keys = [simpleKey, ttlKey, `perf:nonexistent:${timestamp}`]
    const { testResult: mgetResult } = await measureOperation('MGET (multiple keys)', () =>
      redis.mget(...keys)
    )
    results.push(mgetResult)

    // 9. パイプライン操作テスト
    console.log('\n🔗 パイプライン操作テスト')
    const pipelineKey = `perf:pipeline:${timestamp}`
    const { testResult: pipelineResult } = await measureOperation(
      'Pipeline (ZADD + EXPIRE + ZCOUNT)',
      async () => {
        const pipeline = redis.pipeline()
        pipeline.zadd(pipelineKey, { score: timestamp, member: `pipeline-${timestamp}` })
        pipeline.expire(pipelineKey, 60)
        pipeline.zcount(pipelineKey, 0, timestamp + 1000)
        return await pipeline.exec()
      }
    )
    results.push(pipelineResult)

    // 10. 削除テスト
    console.log('\n🗑️ 削除テスト')
    const keysToDelete = [simpleKey, ttlKey, hashKey, zsetKey, pipelineKey]
    for (const key of keysToDelete) {
      const { testResult } = await measureOperation(`DEL (${key.split(':')[1]})`, () =>
        redis.del(key)
      )
      results.push(testResult)
    }

    // 結果サマリー
    console.log('\n📈 テスト結果サマリー')
    console.log('='.repeat(50))

    const successfulOperations = results.filter((r) => r.success)
    const failedOperations = results.filter((r) => !r.success)

    console.log(`✅ 成功: ${successfulOperations.length}/${results.length} 操作`)
    console.log(`❌ 失敗: ${failedOperations.length}/${results.length} 操作`)

    if (successfulOperations.length > 0) {
      const avgDuration =
        successfulOperations.reduce((sum, r) => sum + r.duration, 0) / successfulOperations.length
      const minDuration = Math.min(...successfulOperations.map((r) => r.duration))
      const maxDuration = Math.max(...successfulOperations.map((r) => r.duration))

      console.log(`⏱️ 平均実行時間: ${avgDuration.toFixed(1)}ms`)
      console.log(`⚡ 最速: ${minDuration}ms`)
      console.log(`🐌 最遅: ${maxDuration}ms`)
    }

    // 書き込み vs 読み込み比較
    const writeOps = successfulOperations.filter((r) =>
      ['SET', 'SETEX', 'HSET', 'ZADD', 'EXPIRE'].some((op) => r.operation.includes(op))
    )
    const readOps = successfulOperations.filter((r) =>
      ['GET', 'HGETALL', 'ZCOUNT', 'MGET'].some((op) => r.operation.includes(op))
    )

    if (writeOps.length > 0 && readOps.length > 0) {
      const avgWriteTime = writeOps.reduce((sum, r) => sum + r.duration, 0) / writeOps.length
      const avgReadTime = readOps.reduce((sum, r) => sum + r.duration, 0) / readOps.length

      console.log(`\n📝 書き込み平均: ${avgWriteTime.toFixed(1)}ms`)
      console.log(`📖 読み込み平均: ${avgReadTime.toFixed(1)}ms`)
      console.log(`📊 書き込み/読み込み比: ${(avgWriteTime / avgReadTime).toFixed(2)}x`)
    }

    // 失敗した操作の詳細
    if (failedOperations.length > 0) {
      console.log('\n❌ 失敗した操作:')
      for (const op of failedOperations) {
        console.log(`   ${op.operation}: ${op.error}`)
      }
    }

    console.log('\n🎉 Redis詳細パフォーマンステスト完了！')
  } catch (error) {
    console.error('\n❌ Redis接続テスト失敗:')
    console.error(error)
    process.exit(1)
  }
}

testRedisPerformance()
