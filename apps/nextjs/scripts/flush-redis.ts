#!/usr/bin/env tsx

// Redis全データ削除（FLUSHALL）スクリプト

async function flushAllRedis() {
  const url = process.env.KV_REST_API_URL
  const token = process.env.KV_REST_API_TOKEN

  if (!url || !token) {
    console.error('❌ Environment variables KV_REST_API_URL and KV_REST_API_TOKEN are required')
    process.exit(1)
  }

  console.log('🚨 WARNING: This will delete ALL data in Redis!')
  console.log('🔥 Executing FLUSHALL command...')

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(['FLUSHALL']),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Redis API error: ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    console.log('✅ FLUSHALL executed successfully:', data)
    console.log('🧹 All Redis data has been deleted')
  } catch (error) {
    console.error(
      '❌ Failed to flush Redis:',
      error instanceof Error ? error.message : String(error)
    )
    process.exit(1)
  }
}

// 確認プロンプト
const args = process.argv.slice(2)
if (!args.includes('--force')) {
  console.log(`
⚠️  WARNING: This will delete ALL data in your Redis database!

To proceed, use the --force flag:
  npx tsx scripts/flush-redis.ts --force

This action cannot be undone.
`)
  process.exit(0)
}

flushAllRedis()
