import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { appRouter, createTRPCContext } from '@aromarious/api'
import { SlackService } from '@aromarious/external'

import { auth } from '~/auth/server'

export async function GET(request: NextRequest) {
  try {
    // Vercel cron認証ヘッダーをチェック
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET?.trim() // 改行文字を削除
    const expectedAuth = `Bearer ${cronSecret}`

    if (authHeader !== expectedAuth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // tRPCコンテキストを作成
    const ctx = await createTRPCContext({
      auth: auth,
      headers: request.headers,
    })

    // tRPCルーターのcallerを作成
    const caller = appRouter.createCaller(ctx)

    // 既存のtRPCエンドポイントを呼び出し
    const result = await caller.contact.resyncUnsynced({
      includeNotion: true,
      includeSlack: true,
      limit: 50,
    })

    return NextResponse.json({
      success: true,
      processed: result.processed,
      successCount: result.success,
      failedCount: result.processed - (typeof result.success === 'number' ? result.success : 0),
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Cron cleanup failed:', error)

    // Slack通知を送信（失敗してもAPIレスポンスには影響しない）
    try {
      const slackService = new SlackService(process.env.SLACK_WEBHOOK_URL)
      if (slackService.isConfigured()) {
        await slackService.sendErrorNotification(
          'Notion同期失敗 - portfolio02',
          error instanceof Error ? error.message : 'Unknown error',
          {
            endpoint: '/api/cron/cleanup',
            timestamp: new Date().toISOString(),
            userAgent: request.headers.get('user-agent'),
          }
        )
      }
    } catch (slackError) {
      console.error('Failed to send Slack notification:', slackError)
    }

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}
