import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { ContactCreatedEvent } from '../../../entities/contact.entity'
import { ContactCreatedEventHandler } from '../../../events/handlers/contact-created.handler'

// mock console.log to avoid output in tests
const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

describe('ContactCreatedEventHandler', () => {
  let handler: ContactCreatedEventHandler

  beforeEach(() => {
    handler = new ContactCreatedEventHandler()
    consoleLogSpy.mockClear()
  })

  afterAll(() => {
    consoleLogSpy.mockRestore()
  })

  describe('handle', () => {
    it('ContactCreatedEventを正常に処理する', async () => {
      // Arrange
      const event = new ContactCreatedEvent('12345678-9abc-def0-1234-56789abcdef0')

      // Act
      await handler.handle(event)

      // Assert - エラーが発生しないことを確認
      expect(consoleLogSpy).toHaveBeenCalled()

      // console.logの呼び出し内容を確認
      const logCalls = consoleLogSpy.mock.calls
      expect(
        logCalls.some((call) => call.join(' ').includes('📧 新しい問い合わせが作成されました'))
      ).toBe(true)
      expect(
        logCalls.some((call) => call.join(' ').includes('12345678-9abc-def0-1234-56789abcdef0'))
      ).toBe(true)
    })

    it('ContactCreatedEventのすべてのプロパティが出力される', async () => {
      // Arrange
      const event = new ContactCreatedEvent('contact-id')

      // Act
      await handler.handle(event)

      // Assert
      expect(consoleLogSpy).toHaveBeenCalled()

      const allOutput = consoleLogSpy.mock.calls.flat().join(' ')
      expect(allOutput).toContain('contact-id')
      expect(allOutput).toContain('✅ Contact作成処理が完了しました')
    })

    it('複数回呼び出しても正常に動作する', async () => {
      // Arrange
      const event1 = new ContactCreatedEvent('contact-1')
      const event2 = new ContactCreatedEvent('contact-2')

      // Act
      await handler.handle(event1)
      await handler.handle(event2)

      // Assert
      expect(consoleLogSpy.mock.calls.length).toBeGreaterThanOrEqual(4) // 各イベントで2回以上のログ出力

      const allOutput = consoleLogSpy.mock.calls.flat().join(' ')
      expect(allOutput).toContain('contact-1')
      expect(allOutput).toContain('contact-2')
    })
  })
})
