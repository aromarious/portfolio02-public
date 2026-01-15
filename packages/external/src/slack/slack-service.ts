import { IncomingWebhook } from '@slack/webhook'

import type { ExternalServiceResult, RawContactData } from '../shared/types'
import { ExternalServiceError } from '../shared/error'

/**
 * Slack通知サービス
 */
export class SlackService {
  private webhook: IncomingWebhook | null = null

  constructor(webhookUrl?: string) {
    if (webhookUrl) {
      this.webhook = new IncomingWebhook(webhookUrl)
    }
  }

  /**
   * 問い合わせ通知をSlackに送信
   */
  async sendContactNotification(contactData: RawContactData): Promise<ExternalServiceResult> {
    if (!this.webhook) {
      return {
        success: false,
        error: 'Slack webhook URL not configured',
        service: 'slack',
      }
    }

    try {
      await this.webhook.send({
        text: '📧 新しい問い合わせが届きました',
        attachments: [
          {
            color: 'good',
            fields: [
              {
                title: '名前',
                value: contactData.name,
                short: true,
              },
              {
                title: 'メールアドレス',
                value: contactData.email,
                short: true,
              },
              {
                title: '問い合わせ種別',
                value: contactData.subject,
                short: true,
              },
              {
                title: 'メッセージ',
                value: contactData.message,
                short: false,
              },
              {
                title: '受信日時',
                value: contactData.createdAt.toLocaleString('ja-JP'),
                short: true,
              },
            ],
            footer: 'Portfolio Contact Form',
            ts: Math.floor(contactData.createdAt.getTime() / 1000).toString(),
          },
        ],
      })

      return {
        success: true,
        service: 'slack',
      }
    } catch (error) {
      throw new ExternalServiceError(
        `Slack notification failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'slack',
        error
      )
    }
  }

  /**
   * システムエラー通知をSlackに送信
   */
  async sendErrorNotification(
    title: string,
    errorMessage: string,
    details?: Record<string, unknown>
  ): Promise<ExternalServiceResult> {
    if (!this.webhook) {
      return {
        success: false,
        error: 'Slack webhook URL not configured',
        service: 'slack',
      }
    }

    try {
      const fields = [
        {
          title: 'エラー内容',
          value: errorMessage,
          short: false,
        },
        {
          title: '発生時刻',
          value: new Date().toLocaleString('ja-JP'),
          short: true,
        },
      ]

      if (details) {
        fields.push({
          title: '詳細情報',
          value: JSON.stringify(details, null, 2),
          short: false,
        })
      }

      await this.webhook.send({
        text: `❌ ${title}`,
        attachments: [
          {
            color: 'danger',
            fields,
            footer: 'Portfolio System Monitor',
            ts: Math.floor(Date.now() / 1000).toString(),
          },
        ],
      })

      return {
        success: true,
        service: 'slack',
      }
    } catch (error) {
      throw new ExternalServiceError(
        `Slack error notification failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'slack',
        error
      )
    }
  }

  /**
   * Slack設定が有効かチェック
   */
  isConfigured(): boolean {
    return this.webhook !== null
  }
}
