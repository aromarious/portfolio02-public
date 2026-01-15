import type {
  Contact,
  Person,
  SlackNotificationPort,
  SlackNotificationResult,
} from '@aromarious/domain'

/**
 * SlackNotificationService
 * Slack Webhook APIを使用した通知実装
 */
export class SlackNotificationService implements SlackNotificationPort {
  constructor(private webhookUrl: string) {}

  /**
   * Contact作成通知をSlackに送信
   */
  async sendContactNotification(
    contact: Contact,
    person: Person
  ): Promise<SlackNotificationResult> {
    const message = this.buildContactNotificationMessage(contact, person)
    return await this.sendMessage(message)
  }

  /**
   * 一般的な通知メッセージ送信
   */
  async sendMessage(message: string): Promise<SlackNotificationResult> {
    try {
      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: message,
          username: 'Portfolio Contact Bot',
          icon_emoji: ':email:',
        }),
      })

      if (response.ok) {
        return {
          success: true,
          timestamp: new Date(),
        }
      }
      return {
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
        timestamp: new Date(),
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
      }
    }
  }

  /**
   * 接続状況確認
   */
  async checkConnection(): Promise<boolean> {
    try {
      const result = await this.sendMessage('Connection test from Portfolio Contact System')
      return result.success
    } catch {
      return false
    }
  }

  /**
   * Contact通知用メッセージ構築
   */
  private buildContactNotificationMessage(contact: Contact, person: Person): string {
    return `🆕 新しい問い合わせ

*問い合わせ者*: ${person.name}
*メール*: ${person.email.value}
*会社*: ${person.company || '未記入'}

*件名*: ${contact.subject || 'お問い合わせ'}
*メッセージ*:
${contact.message}

*作成日時*: ${contact.createdAt.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}
*Contact ID*: ${contact.id}`
  }
}
