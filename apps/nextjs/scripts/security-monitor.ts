#!/usr/bin/env tsx
import { Redis } from '@upstash/redis'

import type { SecurityEvent, SecurityMetrics, SecurityStats } from '@aromarious/edge-security'

const redis = new Redis({
  url: process.env.KV_REST_API_URL || '',
  token: process.env.KV_REST_API_TOKEN || '',
})

interface MonitorOptions {
  command: 'events' | 'metrics' | 'stats' | 'watch' | 'clear' | 'help'
  limit?: number
  follow?: boolean
  filter?: string
}

async function main() {
  const args = process.argv.slice(2)
  const options: MonitorOptions = parseArgs(args)

  try {
    switch (options.command) {
      case 'events':
        await showEvents(options)
        break
      case 'metrics':
        await showMetrics()
        break
      case 'stats':
        await showStats()
        break
      case 'watch':
        await watchEvents(options)
        break
      case 'clear':
        await clearData()
        break
      case 'help':
        showHelp()
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

function parseArgs(args: string[]): MonitorOptions {
  const options: MonitorOptions = { command: 'help' }

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]

    switch (arg) {
      case 'events':
      case 'metrics':
      case 'stats':
      case 'watch':
      case 'clear':
      case 'help':
        options.command = arg
        break
      case '--limit':
      case '-l':
        options.limit = Number.parseInt(args[++i] || '10', 10)
        break
      case '--follow':
      case '-f':
        options.follow = true
        break
      case '--filter':
        options.filter = args[++i]
        break
    }
  }

  return options
}

async function showEvents(options: MonitorOptions) {
  console.log('🔍 Security Events\n')

  const eventIds = await redis.lrange('security:events', 0, (options.limit || 10) - 1)

  if (eventIds.length === 0) {
    console.log('No security events found.')
    return
  }

  for (const eventId of eventIds) {
    const eventData = await redis.get(`security:event:${eventId}`)
    if (eventData) {
      const event: SecurityEvent = JSON.parse(eventData as string)

      if (options.filter && !matchesFilter(event, options.filter)) {
        continue
      }

      printEvent(event)
    }
  }
}

async function showMetrics() {
  console.log('📊 Security Metrics\n')

  const metricsData = await redis.hgetall('security:metrics')

  if (!metricsData || Object.keys(metricsData).length === 0) {
    console.log('No metrics data found.')
    return
  }

  const metrics: SecurityMetrics = {
    totalRequests: Number.parseInt(String(metricsData.totalRequests || '0'), 10),
    blockedRequests: Number.parseInt(String(metricsData.blockedRequests || '0'), 10),
    rateLimitHits: Number.parseInt(String(metricsData.rateLimitHits || '0'), 10),
    authFailures: Number.parseInt(String(metricsData.authFailures || '0'), 10),
    botDetections: Number.parseInt(String(metricsData.botDetections || '0'), 10),
    ddosAttempts: Number.parseInt(String(metricsData.ddosAttempts || '0'), 10),
    lastUpdated: Number.parseInt(String(metricsData.lastUpdated || '0'), 10),
  }

  const blockRate =
    metrics.totalRequests > 0
      ? ((metrics.blockedRequests / metrics.totalRequests) * 100).toFixed(2)
      : '0.00'

  console.log(`📈 Total Requests: ${metrics.totalRequests.toLocaleString()}`)
  console.log(`🚫 Blocked Requests: ${metrics.blockedRequests.toLocaleString()} (${blockRate}%)`)
  console.log(`⏱️  Rate Limit Hits: ${metrics.rateLimitHits.toLocaleString()}`)
  console.log(`🔐 Auth Failures: ${metrics.authFailures.toLocaleString()}`)
  console.log(`🤖 Bot Detections: ${metrics.botDetections.toLocaleString()}`)
  console.log(`💥 DDoS Attempts: ${metrics.ddosAttempts.toLocaleString()}`)
  console.log(`🕐 Last Updated: ${new Date(metrics.lastUpdated).toLocaleString()}`)
}

async function showStats() {
  console.log('📈 Security Statistics\n')

  const today = new Date().toISOString().split('T')[0]
  const statsData = await redis.get(`security:stats:${today}`)

  if (statsData) {
    const stats: SecurityStats = JSON.parse(statsData as string)

    console.log(`📅 Period: ${stats.period}`)
    console.log(`📊 Total Requests: ${stats.metrics.totalRequests.toLocaleString()}`)
    console.log(`🚫 Blocked Requests: ${stats.metrics.blockedRequests.toLocaleString()}`)

    if (stats.topBlockedIps.length > 0) {
      console.log('\n🔝 Top Blocked IPs:')
      stats.topBlockedIps.slice(0, 5).forEach((item, index) => {
        console.log(`  ${index + 1}. ${item.ip}: ${item.count} blocks`)
      })
    }

    if (stats.topBlockedPaths.length > 0) {
      console.log('\n🛣️  Top Blocked Paths:')
      stats.topBlockedPaths.slice(0, 5).forEach((item, index) => {
        console.log(`  ${index + 1}. ${item.path}: ${item.count} blocks`)
      })
    }
  } else {
    console.log('No statistics data found for today.')
  }
}

async function watchEvents(options: MonitorOptions) {
  console.log('👀 Watching security events (Press Ctrl+C to stop)\n')

  let lastEventCount = 0

  const interval = setInterval(async () => {
    try {
      const eventCount = await redis.llen('security:events')

      if (eventCount > lastEventCount) {
        const newEventIds = await redis.lrange(
          'security:events',
          0,
          eventCount - lastEventCount - 1
        )

        for (const eventId of newEventIds) {
          const eventData = await redis.get(`security:event:${eventId}`)
          if (eventData) {
            const event: SecurityEvent = JSON.parse(eventData as string)

            if (!options.filter || matchesFilter(event, options.filter)) {
              console.log(`\n🔔 ${new Date().toLocaleTimeString()} - New Event:`)
              printEvent(event)
            }
          }
        }

        lastEventCount = eventCount
      }
    } catch (error) {
      console.error('Watch error:', error)
    }
  }, 1000)

  process.on('SIGINT', () => {
    clearInterval(interval)
    console.log('\n👋 Monitoring stopped.')
    process.exit(0)
  })
}

async function clearData() {
  console.log('🧹 Clearing security data...')

  const confirm =
    process.env.FORCE_CLEAR === 'true' ||
    (await askConfirmation('Are you sure you want to clear all security data? (y/N): '))

  if (!confirm) {
    console.log('Operation cancelled.')
    return
  }

  try {
    await redis.del('security:events')
    await redis.del('security:metrics')

    const today = new Date().toISOString().split('T')[0]
    await redis.del(`security:stats:${today}`)

    console.log('✅ Security data cleared.')
  } catch (error) {
    console.error('❌ Failed to clear data:', error)
  }
}

function printEvent(event: SecurityEvent) {
  const icon = getEventIcon(event.type, event.severity)
  const timestamp = new Date(event.timestamp).toLocaleString()

  console.log(`${icon} [${event.severity}] ${event.type}`)
  console.log(`   IP: ${event.ip}`)
  console.log(`   Path: ${event.method} ${event.path}`)
  console.log(`   Reason: ${event.reason}`)
  console.log(`   Blocked: ${event.blocked ? '🚫 Yes' : '✅ No'}`)
  console.log(`   Time: ${timestamp}`)

  if (event.geo?.country) {
    console.log(
      `   Location: ${event.geo.city || ''} ${event.geo.region || ''} ${event.geo.country}`
    )
  }

  if (event.details && Object.keys(event.details).length > 0) {
    console.log(
      `   Details: ${JSON.stringify(event.details, null, 2).replace(/\n/g, '\n           ')}`
    )
  }

  console.log(`   ${'─'.repeat(50)}`)
}

function getEventIcon(type: string, severity: string): string {
  if (severity === 'CRITICAL') return '🚨'
  if (severity === 'HIGH') return '⚠️'

  switch (type) {
    case 'RATE_LIMIT':
      return '⏱️'
    case 'AUTH_FAILURE':
      return '🔐'
    case 'BOT_DETECTION':
      return '🤖'
    case 'DDOS_PROTECTION':
      return '💥'
    default:
      return '🔍'
  }
}

function matchesFilter(event: SecurityEvent, filter: string): boolean {
  const filterLower = filter.toLowerCase()

  return (
    event.type.toLowerCase().includes(filterLower) ||
    event.severity.toLowerCase().includes(filterLower) ||
    event.ip.includes(filterLower) ||
    event.path.toLowerCase().includes(filterLower) ||
    event.reason.toLowerCase().includes(filterLower)
  )
}

async function askConfirmation(question: string): Promise<boolean> {
  const readline = await import('node:readline')
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close()
      resolve(answer.toLowerCase().startsWith('y'))
    })
  })
}

function showHelp() {
  console.log(`
🔐 Security Monitor CLI Tool

Usage: pnpm tsx scripts/security-monitor.ts <command> [options]

Commands:
  events              Show recent security events
  metrics             Show security metrics summary
  stats               Show daily security statistics
  watch               Watch for new security events in real-time
  clear               Clear all security data (use with caution)
  help                Show this help message

Options:
  --limit, -l <num>   Limit number of events to show (default: 10)
  --follow, -f        Follow mode for events command
  --filter <text>     Filter events by type, severity, IP, path, or reason

Examples:
  pnpm tsx scripts/security-monitor.ts events --limit 20
  pnpm tsx scripts/security-monitor.ts events --filter "bot"
  pnpm tsx scripts/security-monitor.ts watch --filter "CRITICAL"
  pnpm tsx scripts/security-monitor.ts metrics
  pnpm tsx scripts/security-monitor.ts clear

Environment Variables:
  KV_REST_API_URL     Redis URL (required)
  KV_REST_API_TOKEN   Redis token (required)
  FORCE_CLEAR=true    Skip confirmation for clear command
`)
}

// Always run main when script is executed directly
main()

export { main as securityMonitor }
