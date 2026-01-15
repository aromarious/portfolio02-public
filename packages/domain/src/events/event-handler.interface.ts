import type { DomainEvent } from '../ddd-base'

/**
 * ドメインイベントハンドラーのインターフェース
 */
export interface EventHandler<T extends DomainEvent> {
  handle(event: T): Promise<void>
}
