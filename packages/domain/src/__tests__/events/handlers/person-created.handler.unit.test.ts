import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { PersonCreatedEvent } from '../../../entities/person.entity'
import { PersonCreatedEventHandler } from '../../../events/handlers/person-created.handler'

// mock console.log to avoid output in tests
const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

describe('PersonCreatedEventHandler', () => {
  let handler: PersonCreatedEventHandler

  beforeEach(() => {
    handler = new PersonCreatedEventHandler()
    consoleLogSpy.mockClear()
  })

  afterAll(() => {
    consoleLogSpy.mockRestore()
  })

  describe('handle', () => {
    it('PersonCreatedEventを正常に処理する', async () => {
      // Arrange
      const event = new PersonCreatedEvent(
        '12345678-9abc-def0-1234-56789abcdef0',
        'test@example.com'
      )

      // Act
      await handler.handle(event)

      // Assert - エラーが発生しないことを確認
      expect(consoleLogSpy).toHaveBeenCalled()

      // console.logの呼び出し内容を確認
      const logCalls = consoleLogSpy.mock.calls
      expect(logCalls.some((call) => call.join(' ').includes('新しい連絡先が作成されました'))).toBe(
        true
      )
      expect(
        logCalls.some((call) => call.join(' ').includes('12345678-9abc-def0-1234-56789abcdef0'))
      ).toBe(true)
      expect(logCalls.some((call) => call.join(' ').includes('test@example.com'))).toBe(true)
    })

    it('PersonCreatedEventのすべてのプロパティが出力される', async () => {
      // Arrange
      const event = new PersonCreatedEvent('test-person-id', 'user@example.com')

      // Act
      await handler.handle(event)

      // Assert
      expect(consoleLogSpy).toHaveBeenCalled()

      const allOutput = consoleLogSpy.mock.calls.flat().join(' ')
      expect(allOutput).toContain('test-person-id')
      expect(allOutput).toContain('user@example.com')
      expect(allOutput).toContain('✅ 副作用処理が完了しました')
    })

    it('複数回呼び出しても正常に動作する', async () => {
      // Arrange
      const event1 = new PersonCreatedEvent('person-1', 'user1@example.com')
      const event2 = new PersonCreatedEvent('person-2', 'user2@example.com')

      // Act
      await handler.handle(event1)
      await handler.handle(event2)

      // Assert
      expect(consoleLogSpy.mock.calls.length).toBeGreaterThanOrEqual(4) // 各イベントで2回以上のログ出力

      const allOutput = consoleLogSpy.mock.calls.flat().join(' ')
      expect(allOutput).toContain('person-1')
      expect(allOutput).toContain('user1@example.com')
      expect(allOutput).toContain('person-2')
      expect(allOutput).toContain('user2@example.com')
    })
  })
})
