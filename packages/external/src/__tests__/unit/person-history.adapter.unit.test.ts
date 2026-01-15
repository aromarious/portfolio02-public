import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { PersonHistoryChange } from '@aromarious/domain'

import { PersonHistoryAdapter } from '../../adapters/person-history.adapter'
import { NotionClient } from '../../notion/notion-client'

// NotionService のモック
const mockNotionService = {
  updatePersonHistoryInNotionPage: vi.fn(),
}

describe('PersonHistoryAdapter', () => {
  let adapter: PersonHistoryAdapter

  beforeEach(() => {
    vi.clearAllMocks()
    adapter = new PersonHistoryAdapter(mockNotionService as unknown as NotionClient)
  })

  describe('recordHistory', () => {
    it('単一の履歴変更を正しく記録する', async () => {
      const personPageId = 'person-page-123'
      const changes: PersonHistoryChange[] = [
        {
          changeType: 'name_changed',
          oldValue: '田中太郎',
          newValue: '田中次郎',
          timestamp: new Date('2025-07-08T15:30:00Z'),
          contactId: 'contact-123',
        },
      ]

      mockNotionService.updatePersonHistoryInNotionPage.mockResolvedValue({
        success: true,
        service: 'notion',
      })

      await adapter.recordHistory(personPageId, changes)

      expect(mockNotionService.updatePersonHistoryInNotionPage).toHaveBeenCalledTimes(1)
      expect(mockNotionService.updatePersonHistoryInNotionPage).toHaveBeenCalledWith(personPageId, {
        timestamp: changes[0]?.timestamp,
        changeType: changes[0]?.changeType,
        oldValue: changes[0]?.oldValue,
        newValue: changes[0]?.newValue,
        contactId: changes[0]?.contactId,
      })
    })

    it('複数の履歴変更を順次記録する', async () => {
      const personPageId = 'person-page-456'
      const changes: PersonHistoryChange[] = [
        {
          changeType: 'name_changed',
          oldValue: '田中太郎',
          newValue: '田中次郎',
          timestamp: new Date('2025-07-08T15:30:00Z'),
          contactId: 'contact-123',
        },
        {
          changeType: 'company_changed',
          oldValue: '株式会社A',
          newValue: '株式会社B',
          timestamp: new Date('2025-07-08T15:31:00Z'),
          contactId: 'contact-123',
        },
      ]

      mockNotionService.updatePersonHistoryInNotionPage.mockResolvedValue({
        success: true,
        service: 'notion',
      })

      await adapter.recordHistory(personPageId, changes)

      expect(mockNotionService.updatePersonHistoryInNotionPage).toHaveBeenCalledTimes(2)
      expect(mockNotionService.updatePersonHistoryInNotionPage).toHaveBeenNthCalledWith(
        1,
        personPageId,
        {
          timestamp: changes[0]?.timestamp,
          changeType: changes[0]?.changeType,
          oldValue: changes[0]?.oldValue,
          newValue: changes[0]?.newValue,
          contactId: changes[0]?.contactId,
        }
      )
      expect(mockNotionService.updatePersonHistoryInNotionPage).toHaveBeenNthCalledWith(
        2,
        personPageId,
        {
          timestamp: changes[1]?.timestamp,
          changeType: changes[1]?.changeType,
          oldValue: changes[1]?.oldValue,
          newValue: changes[1]?.newValue,
          contactId: changes[1]?.contactId,
        }
      )
    })

    it('NotionService でエラーが発生してもエラーを投げずにログ出力する', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const personPageId = 'person-page-error'
      const changes: PersonHistoryChange[] = [
        {
          changeType: 'name_changed',
          oldValue: '田中太郎',
          newValue: '田中次郎',
          timestamp: new Date('2025-07-08T15:30:00Z'),
          contactId: 'contact-123',
        },
      ]

      mockNotionService.updatePersonHistoryInNotionPage.mockRejectedValue(
        new Error('Notion API Error')
      )

      // エラーを投げずに正常に完了することを確認
      await expect(adapter.recordHistory(personPageId, changes)).resolves.toBeUndefined()

      expect(consoleSpy).toHaveBeenCalledWith('Person履歴記録に失敗:', {
        personPageId,
        change: changes[0],
        error: 'Notion API Error',
      })

      consoleSpy.mockRestore()
    })

    it('空の変更配列でも正常に処理する', async () => {
      const personPageId = 'person-page-empty'
      const changes: PersonHistoryChange[] = []

      await adapter.recordHistory(personPageId, changes)

      expect(mockNotionService.updatePersonHistoryInNotionPage).not.toHaveBeenCalled()
    })

    it('contactIdがない履歴変更も正しく記録する', async () => {
      const personPageId = 'person-page-no-contact'
      const changes: PersonHistoryChange[] = [
        {
          changeType: 'twitter_handle_changed',
          oldValue: '@old_handle',
          newValue: '@new_handle',
          timestamp: new Date('2025-07-08T15:30:00Z'),
          // contactId なし
        },
      ]

      mockNotionService.updatePersonHistoryInNotionPage.mockResolvedValue({
        success: true,
        service: 'notion',
      })

      await adapter.recordHistory(personPageId, changes)

      expect(mockNotionService.updatePersonHistoryInNotionPage).toHaveBeenCalledWith(personPageId, {
        timestamp: changes[0]?.timestamp,
        changeType: changes[0]?.changeType,
        oldValue: changes[0]?.oldValue,
        newValue: changes[0]?.newValue,
        contactId: undefined,
      })
    })

    it('一部の履歴記録が失敗しても他の記録は継続される', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const personPageId = 'person-page-partial-error'
      const changes: PersonHistoryChange[] = [
        {
          changeType: 'name_changed',
          oldValue: '田中太郎',
          newValue: '田中次郎',
          timestamp: new Date('2025-07-08T15:30:00Z'),
          contactId: 'contact-123',
        },
        {
          changeType: 'company_changed',
          oldValue: '株式会社A',
          newValue: '株式会社B',
          timestamp: new Date('2025-07-08T15:31:00Z'),
          contactId: 'contact-123',
        },
      ]

      mockNotionService.updatePersonHistoryInNotionPage
        .mockRejectedValueOnce(new Error('First call failed'))
        .mockResolvedValueOnce({ success: true, service: 'notion' })

      await adapter.recordHistory(personPageId, changes)

      expect(mockNotionService.updatePersonHistoryInNotionPage).toHaveBeenCalledTimes(2)
      expect(consoleSpy).toHaveBeenCalledTimes(1)
      expect(consoleSpy).toHaveBeenCalledWith('Person履歴記録に失敗:', {
        personPageId,
        change: changes[0],
        error: 'First call failed',
      })

      consoleSpy.mockRestore()
    })
  })
})
