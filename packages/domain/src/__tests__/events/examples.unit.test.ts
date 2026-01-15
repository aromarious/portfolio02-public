import { afterAll, afterEach, describe, expect, it, vi } from 'vitest'

import { Person } from '../../entities/person.entity'
import { exampleUsage, repositoryUsageExample } from '../../events/examples'

// mock console.log to avoid output in tests
const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

describe('Events Examples', () => {
  afterEach(() => {
    consoleLogSpy.mockClear()
  })

  afterAll(() => {
    consoleLogSpy.mockRestore()
  })

  describe('exampleUsage', () => {
    it('イベント駆動システムの基本的な使用例が正常に動作する', async () => {
      // Act & Assert - エラーが発生しないことを確認
      await expect(exampleUsage()).resolves.toBeUndefined()

      // console.logが呼ばれることを確認
      expect(consoleLogSpy).toHaveBeenCalled()
    })
  })

  describe('repositoryUsageExample', () => {
    it('リポジトリでの使用例が正常に動作する', async () => {
      // Arrange
      const person = Person.create({
        name: 'テスト太郎',
        email: 'test@example.com',
        company: 'テスト会社',
      })

      // Act & Assert - エラーが発生しないことを確認
      await expect(repositoryUsageExample(person)).resolves.toBeUndefined()
    })

    it('ドメインイベントがないPersonでも正常に動作する', async () => {
      // Arrange
      const person = Person.create({
        name: 'テスト太郎',
        email: 'test@example.com',
        company: 'テスト会社',
      })

      // ドメインイベントをクリア
      person.clearDomainEvents()

      // Act & Assert - エラーが発生しないことを確認
      await expect(repositoryUsageExample(person)).resolves.toBeUndefined()
    })
  })
})
