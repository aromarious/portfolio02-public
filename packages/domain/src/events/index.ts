import { EventDispatcher } from './event-dispatcher'
import { ContactCreatedEventHandler } from './handlers/contact-created.handler'
import { PersonCreatedEventHandler } from './handlers/person-created.handler'

/**
 * イベントハンドラーの設定とサンプル使用方法
 */
export function setupEventHandlers(): EventDispatcher {
  const dispatcher = new EventDispatcher()

  // PersonCreatedEventのハンドラーを登録
  dispatcher.subscribe('PersonCreated', new PersonCreatedEventHandler())

  // ContactイベントのハンドラーをCREATE登録
  dispatcher.subscribe('ContactCreated', new ContactCreatedEventHandler())

  // TODO: 他のイベントハンドラーもここに追加
  // dispatcher.subscribe('PersonContacted', new PersonContactedEventHandler())

  return dispatcher
}

// 使用例のエクスポート
export { EventDispatcher } from './event-dispatcher'
export { PersonCreatedEventHandler } from './handlers/person-created.handler'
export { ContactCreatedEventHandler } from './handlers/contact-created.handler'
export type { EventHandler } from './event-handler.interface'
