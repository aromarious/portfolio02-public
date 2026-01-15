import type { ContactCreatedEvent } from '../../entities/contact.entity'
import type { EventHandler } from '../event-handler.interface'

/**
 * Contact作成時のイベントハンドラー
 * 新しい問い合わせが作成された際の副作用処理を行う
 */
export class ContactCreatedEventHandler implements EventHandler<ContactCreatedEvent> {
  async handle(event: ContactCreatedEvent): Promise<void> {
    console.log('📧 新しい問い合わせが作成されました！')
    console.log(`  - Contact ID: ${event.contactId}`)
    console.log(`  - 発生日時: ${event.occurredOn.toISOString()}`)

    // TODO: 実際のアプリケーションでは以下のような処理を行う
    // - Slack通知の送信
    // - Notion同期の開始
    // - 担当者への自動アサイン
    // - 緊急度が高い場合のエスカレーション
    // - 分析データの送信
    // - ウェルカムメールの送信（必要に応じて）

    await this.simulateAsyncOperation()
  }

  private async simulateAsyncOperation(): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log('  ✅ Contact作成処理が完了しました')
        resolve()
      }, 100)
    })
  }
}
