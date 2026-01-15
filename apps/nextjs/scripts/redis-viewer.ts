#!/usr/bin/env tsx
import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.KV_REST_API_URL || '',
  token: process.env.KV_REST_API_TOKEN || '',
})

interface ViewerOptions {
  command: 'keys' | 'get' | 'scan' | 'type' | 'clear' | 'help'
  pattern?: string
  key?: string
  limit?: number
  force?: boolean
}

async function main() {
  const args = process.argv.slice(2)
  const options: ViewerOptions = parseArgs(args)

  try {
    switch (options.command) {
      case 'keys':
        await listKeys(options.pattern || '*', options.limit || 100)
        break
      case 'get':
        if (!options.key) {
          console.error('Key is required for get command')
          process.exit(1)
        }
        await getValue(options.key)
        break
      case 'scan':
        await scanKeys(options.pattern || 'security:*')
        break
      case 'type':
        if (!options.key) {
          console.error('Key is required for type command')
          process.exit(1)
        }
        await getKeyType(options.key)
        break
      case 'clear':
        await clearRedisData(options.pattern || 'test:*', options.force || false)
        break
      default:
        showHelp()
        break
    }
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
}

function parseArgs(args: string[]): ViewerOptions {
  const options: ViewerOptions = { command: 'help' }

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]

    switch (arg) {
      case 'keys':
      case 'get':
      case 'scan':
      case 'type':
      case 'clear':
      case 'help':
        options.command = arg
        break
      case '--pattern':
      case '-p':
        options.pattern = args[++i]
        break
      case '--key':
      case '-k':
        options.key = args[++i]
        break
      case '--limit':
      case '-l':
        options.limit = Number.parseInt(args[++i] || '100')
        break
      case '--force':
      case '-f':
        options.force = true
        break
      default:
        if (!arg?.startsWith('-') && !options.key && !options.pattern) {
          if (options.command === 'get' || options.command === 'type') {
            options.key = arg
          } else {
            options.pattern = arg
          }
        }
        break
    }
  }

  return options
}

async function listKeys(pattern: string, limit: number) {
  console.log(`🔑 Keys matching "${pattern}" (limit: ${limit})\n`)

  try {
    // Note: Upstash Redis doesn't support SCAN, so we'll use a different approach
    // This is a simplified version - in production you might want to use different patterns
    const securityKeys = ['security:events', 'security:metrics']

    for (const key of securityKeys) {
      const exists = await redis.exists(key)
      if (exists) {
        const type = await redis.type(key)
        console.log(`${key} (${type})`)
      }
    }

    // Try to get rate limit keys
    const rateLimitPatterns = [
      'security:ratelimit:general:*',
      'security:ratelimit:auth:*',
      'security:ratelimit:contact:*',
    ]

    console.log('\n📊 Sample rate limit keys (may exist):')
    for (const pattern of rateLimitPatterns) {
      console.log(`  ${pattern}`)
    }
  } catch (error) {
    console.error('Failed to list keys:', error)
  }
}

async function getValue(key: string) {
  console.log(`📄 Value for key: ${key}\n`)

  try {
    const type = await redis.type(key)
    console.log(`Type: ${type}`)

    switch (type) {
      case 'string': {
        const value = await redis.get(key)
        console.log('Value:')
        try {
          const parsed = JSON.parse(value as string)
          console.log(JSON.stringify(parsed, null, 2))
        } catch {
          console.log(value)
        }
        break
      }

      case 'list': {
        const listValues = await redis.lrange(key, 0, -1)
        console.log(`List (${listValues.length} items):`)
        for (const [index, item] of listValues.entries()) {
          console.log(`  ${index}: ${item}`)
        }
        break
      }

      case 'hash': {
        const hashValues = await redis.hgetall(key)
        console.log('Hash:')
        if (hashValues) {
          for (const [field, value] of Object.entries(hashValues)) {
            console.log(`  ${field}: ${value}`)
          }
        }
        break
      }

      case 'zset':
        // Note: Limited support for sorted sets in REST API
        console.log('Sorted set (limited info available via REST API)')
        break

      case 'none':
        console.log('Key does not exist')
        break

      default:
        console.log(`Unsupported type: ${type}`)
        break
    }
  } catch (error) {
    console.error('Failed to get value:', error)
  }
}

async function scanKeys(pattern: string) {
  console.log(`🔍 Scanning for keys matching: ${pattern}\n`)

  // Since Upstash REST API doesn't support SCAN, we'll check known security keys
  const knownPatterns = [
    'security:events',
    'security:metrics',
    'security:event:*',
    'security:ratelimit:*',
    'security:authfail:*',
    'security:bot:*',
    'security:ddos:*',
    'security:timing:*',
    'security:behavior:*',
    'security:fingerprint:*',
  ]

  console.log('Known security key patterns:')
  for (const p of knownPatterns) {
    console.log(`  ${p}`)
  }

  console.log('\nChecking specific keys:')
  const specificKeys = ['security:events', 'security:metrics']

  for (const key of specificKeys) {
    const exists = await redis.exists(key)
    if (exists) {
      const type = await redis.type(key)
      console.log(`✅ ${key} (${type})`)
    } else {
      console.log(`❌ ${key} (not found)`)
    }
  }
}

async function getKeyType(key: string) {
  console.log(`🏷️  Type for key: ${key}\n`)

  try {
    const type = await redis.type(key)
    const exists = await redis.exists(key)

    console.log(`Type: ${type}`)
    console.log(`Exists: ${exists ? 'Yes' : 'No'}`)

    if (exists) {
      switch (type) {
        case 'string':
          console.log('Additional info: String value')
          break
        case 'list': {
          const length = await redis.llen(key)
          console.log(`Additional info: List with ${length} items`)
          break
        }
        case 'hash': {
          const hashKeys = await redis.hgetall(key)
          const keyCount = hashKeys ? Object.keys(hashKeys).length : 0
          console.log(`Additional info: Hash with ${keyCount} fields`)
          break
        }
        case 'zset':
          console.log('Additional info: Sorted set (limited info via REST API)')
          break
      }
    }
  } catch (error) {
    console.error('Failed to get key type:', error)
  }
}

async function clearRedisData(pattern: string, force: boolean) {
  console.log(`🧹 Clearing Redis data matching pattern: ${pattern}`)

  if (!force) {
    console.log('\n⚠️  WARNING: This will delete Redis data!')
    console.log('To proceed, use --force flag:')
    console.log(`  pnpm tsx scripts/redis-viewer.ts clear "${pattern}" --force\n`)
    return
  }

  console.log('\n🚨 CLEARING REDIS DATA...')

  try {
    // Clear known test keys
    const testPatterns = ['test:middleware:*', 'test:*', 'security:test:*']

    if (pattern === 'test:*' || pattern === '*') {
      console.log('🧪 Clearing test keys...')

      // Since Upstash doesn't support KEYS command via REST API,
      // we'll try to delete common test key patterns
      const testKeyAttempts = []

      // Generate potential test keys from recent timestamps
      const now = Date.now()
      for (let i = 0; i < 100; i++) {
        const timestamp = now - i * 1000 // Last 100 seconds
        testKeyAttempts.push(`test:middleware:${timestamp}`)
      }

      let deletedCount = 0
      for (const key of testKeyAttempts) {
        try {
          const result = await redis.del(key)
          if (result > 0) {
            deletedCount++
            console.log(`  ✅ Deleted: ${key}`)
          }
        } catch (error) {
          // Ignore individual key errors
        }
      }

      console.log(`\n📊 Deleted ${deletedCount} test keys`)
    }

    if (pattern === 'security:*' || pattern === '*') {
      console.log('\n🛡️ Clearing security keys...')

      const securityKeys = [
        'security:events',
        'security:metrics',
        'security:ratelimit',
        'security:authfail',
        'security:bot',
        'security:ddos',
      ]

      let deletedCount = 0
      for (const key of securityKeys) {
        try {
          const result = await redis.del(key)
          if (result > 0) {
            deletedCount++
            console.log(`  ✅ Deleted: ${key}`)
          }
        } catch (error) {
          console.log(`  ❌ Failed to delete: ${key}`)
        }
      }

      console.log(`\n📊 Deleted ${deletedCount} security keys`)
    }

    console.log('\n✅ Redis data clearing completed!')
  } catch (error) {
    console.error('❌ Failed to clear Redis data:', error)
  }
}

function showHelp() {
  console.log(`
🔍 Redis Viewer CLI Tool

Usage: pnpm tsx scripts/redis-viewer.ts <command> [options]

Commands:
  keys [pattern]      List keys matching pattern (default: *)
  get <key>           Get value for specific key
  scan [pattern]      Scan for keys (default: security:*)
  type <key>          Get type of specific key
  clear [pattern]     Clear Redis data (default: test:*)
  help                Show this help message

Options:
  --pattern, -p       Pattern to match keys
  --key, -k           Specific key to operate on
  --limit, -l         Limit number of results (default: 100)
  --force, -f         Force operation without confirmation

Examples:
  pnpm tsx scripts/redis-viewer.ts keys "security:*"
  pnpm tsx scripts/redis-viewer.ts get security:events
  pnpm tsx scripts/redis-viewer.ts get security:metrics
  pnpm tsx scripts/redis-viewer.ts type security:events
  pnpm tsx scripts/redis-viewer.ts scan
  pnpm tsx scripts/redis-viewer.ts clear "test:*" --force
  pnpm tsx scripts/redis-viewer.ts clear "*" --force

Environment Variables:
  KV_REST_API_URL     Redis URL (required)
  KV_REST_API_TOKEN   Redis token (required)

Note: This tool works with Upstash Redis REST API which has some limitations
compared to native Redis commands. Some advanced operations may not be available.
`)
}

// Always run main when script is executed directly
main()

export { main as redisViewer }
