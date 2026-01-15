import type { Contact } from '../entities/contact.entity'
import type { Person } from '../entities/person.entity'

/**
 * SlackNotificationPort
 * Slack通知機能のポート定義
 */
export interface SlackNotificationPort {
  /**
   * Contact作成通知をSlackに送信
   */
  sendContactNotification(contact: Contact, person: Person): Promise<SlackNotificationResult>

  /**
   * 一般的な通知メッセージ送信
   */
  sendMessage(message: string): Promise<SlackNotificationResult>

  /**
   * 接続状況確認
   */
  checkConnection(): Promise<boolean>
}

/**
 * Slack通知結果
 */
export interface SlackNotificationResult {
  success: boolean
  messageId?: string
  error?: string
  timestamp?: Date
}
