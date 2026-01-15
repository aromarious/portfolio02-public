import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

// サービス接続結果の型定義
interface ServiceConnectionResult {
  status: 'connected' | 'error' | 'missing'
  error?: string
  httpStatus?: number
  url?: string
  pageId?: string
  pageTitle?: string
  result?: string
}

interface SlackServiceResult {
  main: ServiceConnectionResult
  security: ServiceConnectionResult
}

interface EnvCheckServices {
  postgresql: ServiceConnectionResult
  notion: ServiceConnectionResult
  slack: SlackServiceResult
  redis: ServiceConnectionResult
}

/**
 * 環境変数確認用のAPIエンドポイント
 * 各外部サービスに実際に接続して環境変数が正しく設定されているか確認
 */
export async function GET() {
  try {
    // CRON_SECRET認証
    const headersList = await headers()
    const authHeader = headersList.get('authorization')
    const expectedSecret = process.env.CRON_SECRET

    if (!expectedSecret) {
      return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 })
    }

    if (authHeader !== `Bearer ${expectedSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const results = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      services: {} as EnvCheckServices,
    }

    // 1. PostgreSQL接続確認
    try {
      const { db } = await import('@aromarious/db')
      await db.execute('SELECT 1')
      results.services.postgresql = {
        status: 'connected',
        url: process.env.POSTGRES_URL?.replace(/:[^:]*@/, ':****@'), // パスワードをマスク
      }
    } catch (error) {
      results.services.postgresql = {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }

    // 2. Notion API接続確認
    try {
      const notionToken = process.env.NOTION_API_TOKEN
      const notionPageId = process.env.NOTION_PARENT_PAGE_ID

      if (!notionToken || !notionPageId) {
        results.services.notion = {
          status: 'error',
          error: 'Missing NOTION_API_TOKEN or NOTION_PARENT_PAGE_ID',
        }
      } else {
        const response = await fetch(`https://api.notion.com/v1/pages/${notionPageId}`, {
          headers: {
            Authorization: `Bearer ${notionToken}`,
            'Notion-Version': '2022-06-28',
          },
        })

        if (response.ok) {
          const data = await response.json()
          results.services.notion = {
            status: 'connected',
            pageId: notionPageId,
            pageTitle: data.properties?.title?.title?.[0]?.plain_text || 'Unknown',
          }
        } else {
          results.services.notion = {
            status: 'error',
            error: `HTTP ${response.status}: ${response.statusText}`,
          }
        }
      }
    } catch (error) {
      results.services.notion = {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }

    // 3. Slack Webhook接続確認
    try {
      const slackWebhookUrl = process.env.SLACK_WEBHOOK_URL
      const slackSecurityWebhookUrl = process.env.SLACK_SECURITY_WEBHOOK

      results.services.slack = {
        main: {
          url: slackWebhookUrl ? 'configured' : 'missing',
          status: 'connected',
        },
        security: {
          url: slackSecurityWebhookUrl ? 'configured' : 'missing',
          status: 'connected',
        },
      }

      // メイン Webhook テスト
      if (slackWebhookUrl) {
        const response = await fetch(slackWebhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: `🔧 環境変数確認テスト - ${new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}`,
            username: 'env-check-bot',
          }),
        })

        results.services.slack.main = {
          status: response.ok ? 'connected' : 'error',
          httpStatus: response.status,
          url: slackWebhookUrl.replace(/\/services\/.*/, '/services/***'),
        }
      }

      // セキュリティ Webhook テスト
      if (slackSecurityWebhookUrl) {
        const response = await fetch(slackSecurityWebhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: `🔒 セキュリティ環境変数確認テスト - ${new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}`,
            username: 'security-env-check-bot',
          }),
        })

        results.services.slack.security = {
          status: response.ok ? 'connected' : 'error',
          httpStatus: response.status,
          url: slackSecurityWebhookUrl.replace(/\/services\/.*/, '/services/***'),
        }
      }
    } catch (error) {
      results.services.slack = {
        main: {
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        security: {
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      }
    }

    // 4. Redis接続確認
    try {
      const kvUrl = process.env.KV_REST_API_URL
      const kvToken = process.env.KV_REST_API_TOKEN

      if (!kvUrl || !kvToken) {
        results.services.redis = {
          status: 'error',
          error: 'Missing KV_REST_API_URL or KV_REST_API_TOKEN',
        }
      } else {
        const response = await fetch(`${kvUrl}/ping`, {
          headers: {
            Authorization: `Bearer ${kvToken}`,
          },
        })

        if (response.ok) {
          const data = await response.json()
          results.services.redis = {
            status: 'connected',
            url: kvUrl.replace(/\/\/[^@]*@/, '//***@'), // 認証情報をマスク
            result: data.result,
          }
        } else {
          results.services.redis = {
            status: 'error',
            error: `HTTP ${response.status}: ${response.statusText}`,
          }
        }
      }
    } catch (error) {
      results.services.redis = {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }

    return NextResponse.json(results)
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
