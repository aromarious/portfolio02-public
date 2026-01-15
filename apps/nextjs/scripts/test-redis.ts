#!/usr/bin/env tsx

/**
 * Redis接続テストスクリプト
 *
 * 使用方法:
 * pnpm tsx scripts/test-redis.ts
 *
 * または環境変数を指定:
 * KV_REST_API_URL=... KV_REST_API_TOKEN=... pnpm tsx scripts/test-redis.ts
 */
import { Redis } from '@upstash/redis'

async function testRedisConnection() {
  console.log('🔍 Redis接続テスト開始...')

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
    console.log(`🔑 トークン: ${token.substring(0, 10)}...`)

    // Redis インスタンス作成
    const redis = new Redis({
      url,
      token,
    })

    // 接続テスト
    console.log('🏓 PING テスト...')
    const pingResult = await redis.ping()
    console.log(`✅ PING: ${pingResult}`)

    // 書き込みテスト
    const testKey = `security:test:${Date.now()}`
    const testValue = { timestamp: Date.now(), test: true }

    console.log('📝 書き込みテスト...')
    await redis.set(testKey, JSON.stringify(testValue), { ex: 60 }) // 60秒で期限切れ
    console.log(`✅ 書き込み完了: ${testKey}`)

    // 読み込みテスト
    console.log('📖 読み込みテスト...')
    const readValue = await redis.get(testKey)
    console.log(`✅ 読み込み完了: ${readValue}`)

    // 削除テスト
    console.log('🗑️ 削除テスト...')
    await redis.del(testKey)
    console.log(`✅ 削除完了: ${testKey}`)

    // 最終確認
    const finalCheck = await redis.get(testKey)
    if (finalCheck === null) {
      console.log('✅ 削除確認完了')
    } else {
      console.log(`⚠️ 削除確認失敗: ${finalCheck}`)
    }

    console.log('\n🎉 Redis接続テスト成功！')
    console.log('セキュリティシステムでRedisを使用する準備が整いました。')
  } catch (error) {
    console.error('\n❌ Redis接続テスト失敗:')
    console.error(error)

    if (error instanceof Error) {
      if (error.message.includes('401')) {
        console.error(
          '\n💡 解決方法: トークンが無効です。Upstashダッシュボードで正しいトークンを確認してください。'
        )
      } else if (error.message.includes('ENOTFOUND')) {
        console.error(
          '\n💡 解決方法: URLが無効です。Upstashダッシュボードで正しいURLを確認してください。'
        )
      }
    }

    process.exit(1)
  }
}

testRedisConnection()
