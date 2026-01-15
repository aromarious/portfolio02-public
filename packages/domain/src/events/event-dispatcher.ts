import type { DomainEvent } from '../ddd-base'
import type { EventHandler } from './event-handler.interface'

/**
 * シンプルなイベントディスパッチャー
 * 複数のイベントハンドラーを管理し、イベントを適切なハンドラーに配信する
 */
export class EventDispatcher {
  private handlers = new Map<string, EventHandler<DomainEvent>[]>()

  /**
   * イベントタイプにハンドラーを登録する
   */
  subscribe<T extends DomainEvent>(eventType: string, handler: EventHandler<T>): void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, [])
    }
    const handlerList = this.handlers.get(eventType)
    if (handlerList) {
      handlerList.push(handler)
    }
  }

  /**
   * 複数のイベントを順次処理する
   */
  async dispatch(events: DomainEvent[]): Promise<void> {
    for (const event of events) {
      const eventHandlers = this.handlers.get(event.eventType) || []

      // 各ハンドラーを並列実行（エラーが起きても他のハンドラーは継続）
      const results = await Promise.allSettled(
        eventHandlers.map((handler) => handler.handle(event))
      )

      // エラーがあればログ出力（実際のアプリではより適切なエラーハンドリングが必要）
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          console.error(
            `イベントハンドラーでエラーが発生しました: ${event.eventType}`,
            result.reason
          )
        }
      })
    }
  }
}
