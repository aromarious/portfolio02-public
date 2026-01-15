import { describe, expect, it } from 'vitest'

import { PersonCreatedEvent } from '../../entities/person.entity'
import { EventDispatcher } from '../../events/event-dispatcher'
import { PersonCreatedEventHandler } from '../../events/handlers/person-created.handler'

describe('EventDispatcher', () => {
  it('イベントハンドラーを登録して実行できる', async () => {
    const dispatcher = new EventDispatcher()
    const handler = new PersonCreatedEventHandler()

    // ハンドラーを登録
    dispatcher.subscribe('PersonCreated', handler)

    // テスト用イベントを作成
    const event = new PersonCreatedEvent('test-person-id', 'test@example.com')

    // イベントを発火（エラーが発生しないことを確認）
    await expect(dispatcher.dispatch([event])).resolves.not.toThrow()
  })

  it('複数のイベントを処理できる', async () => {
    const dispatcher = new EventDispatcher()
    const handler = new PersonCreatedEventHandler()

    dispatcher.subscribe('PersonCreated', handler)

    const events = [
      new PersonCreatedEvent('person-1', 'user1@example.com'),
      new PersonCreatedEvent('person-2', 'user2@example.com'),
    ]

    await expect(dispatcher.dispatch(events)).resolves.not.toThrow()
  })

  it('未登録のイベントタイプでもエラーにならない', async () => {
    const dispatcher = new EventDispatcher()

    const event = new PersonCreatedEvent('test-person-id', 'test@example.com')

    // ハンドラーが登録されていなくてもエラーにならない
    await expect(dispatcher.dispatch([event])).resolves.not.toThrow()
  })
})
