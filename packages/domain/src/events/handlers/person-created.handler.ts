import type { PersonCreatedEvent } from '../../entities/person.entity'
import type { EventHandler } from '../event-handler.interface'

/**
 * Person作成時のイベントハンドラー（サンプル実装）
 * 実際のアプリケーションでは、メール送信やSlack通知などの副作用処理を行う
 */
export class PersonCreatedEventHandler implements EventHandler<PersonCreatedEvent> {
  async handle(event: PersonCreatedEvent): Promise<void> {
    // サンプル実装：コンソールログ出力
    console.log('🎉 新しい連絡先が作成されました！')
    console.log(`  - Person ID: ${event.personId}`)
    console.log(`  - Email: ${event.email}`)
    console.log(`  - 作成日時: ${event.occurredOn.toISOString()}`)

    // TODO: 実際のアプリケーションでは以下のような処理を行う
    // - ウェルカムメールの送信
    // - Slack/Teams通知
    // - 分析データの送信
    // - CRMシステムへの同期
    // など

    // 非同期処理のサンプル（実際のAPI呼び出しをシミュレート）
    await this.simulateAsyncOperation()
  }

  private async simulateAsyncOperation(): Promise<void> {
    // 実際のAPI呼び出しやDBアクセスをシミュレート
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log('  ✅ 副作用処理が完了しました')
        resolve()
      }, 100)
    })
  }
}
