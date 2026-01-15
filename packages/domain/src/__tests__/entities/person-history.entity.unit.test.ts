import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { PersonHistoryChange } from '../../entities/person.entity'
import { Person } from '../../entities/person.entity'
import { Email } from '../../value-objects/email.vo'

describe('Person Entity - History Tracking', () => {
  let person: Person
  let mockHistoryCallback: (changes: PersonHistoryChange[]) => Promise<void>

  beforeEach(() => {
    vi.clearAllMocks()
    mockHistoryCallback = vi.fn().mockResolvedValue(undefined)

    person = Person.create({
      name: '田中太郎',
      email: 'tanaka@example.com',
      company: '株式会社A',
      twitterHandle: 'tanaka_old',
    })
  })

  describe('updateContactInfo with history tracking', () => {
    it('名前変更時に履歴コールバックが正しく呼ばれる', async () => {
      const contactId = 'contact-123'

      person.updateContactInfo(
        {
          name: '田中次郎',
        },
        {
          contactId,
          historyCallback: mockHistoryCallback,
        }
      )

      expect(mockHistoryCallback).toHaveBeenCalledWith([
        {
          changeType: 'name_changed',
          oldValue: '田中太郎',
          newValue: '田中次郎',
          timestamp: expect.any(Date),
          contactId,
        },
      ])
    })

    it('会社名変更時に履歴コールバックが正しく呼ばれる', async () => {
      const contactId = 'contact-456'

      person.updateContactInfo(
        {
          company: '株式会社B',
        },
        {
          contactId,
          historyCallback: mockHistoryCallback,
        }
      )

      expect(mockHistoryCallback).toHaveBeenCalledWith([
        {
          changeType: 'company_changed',
          oldValue: '株式会社A',
          newValue: '株式会社B',
          timestamp: expect.any(Date),
          contactId,
        },
      ])
    })

    it('Twitterハンドル変更時に履歴コールバックが正しく呼ばれる', async () => {
      const contactId = 'contact-789'

      person.updateContactInfo(
        {
          twitterHandle: 'tanaka_new',
        },
        {
          contactId,
          historyCallback: mockHistoryCallback,
        }
      )

      expect(mockHistoryCallback).toHaveBeenCalledWith([
        {
          changeType: 'twitter_handle_changed',
          oldValue: 'tanaka_old',
          newValue: 'tanaka_new',
          timestamp: expect.any(Date),
          contactId,
        },
      ])
    })

    it('複数フィールド変更時に複数の履歴エントリーが作成される', async () => {
      const contactId = 'contact-multi'

      person.updateContactInfo(
        {
          name: '田中次郎',
          company: '株式会社B',
          twitterHandle: 'tanaka_new',
        },
        {
          contactId,
          historyCallback: mockHistoryCallback,
        }
      )

      expect(mockHistoryCallback).toHaveBeenCalledWith([
        {
          changeType: 'name_changed',
          oldValue: '田中太郎',
          newValue: '田中次郎',
          timestamp: expect.any(Date),
          contactId,
        },
        {
          changeType: 'company_changed',
          oldValue: '株式会社A',
          newValue: '株式会社B',
          timestamp: expect.any(Date),
          contactId,
        },
        {
          changeType: 'twitter_handle_changed',
          oldValue: 'tanaka_old',
          newValue: 'tanaka_new',
          timestamp: expect.any(Date),
          contactId,
        },
      ])
    })

    it('変更がない場合は履歴コールバックが呼ばれない', async () => {
      person.updateContactInfo(
        {
          name: '田中太郎', // 同じ値
          company: '株式会社A', // 同じ値
        },
        {
          contactId: 'contact-no-change',
          historyCallback: mockHistoryCallback,
        }
      )

      expect(mockHistoryCallback).not.toHaveBeenCalled()
    })

    it('履歴コールバックが提供されていない場合でも正常に動作する', () => {
      expect(() => {
        person.updateContactInfo({
          name: '田中次郎',
        })
      }).not.toThrow()

      expect(person.name).toBe('田中次郎')
    })

    it('履歴コールバックでエラーが発生してもメイン処理は継続される', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const errorCallback = vi.fn().mockRejectedValue(new Error('History callback failed'))

      person.updateContactInfo(
        {
          name: '田中次郎',
        },
        {
          contactId: 'contact-error',
          historyCallback: errorCallback,
        }
      )

      // メイン処理は正常に完了
      expect(person.name).toBe('田中次郎')

      // エラーコールバックは呼ばれるが、メイン処理は影響されない
      expect(errorCallback).toHaveBeenCalled()

      // 非同期エラーの処理を待機
      await new Promise((resolve) => setTimeout(resolve, 0))

      expect(consoleSpy).toHaveBeenCalledWith('履歴記録に失敗しました:', expect.any(Error))

      consoleSpy.mockRestore()
    })

    it('contactIdが提供されていない場合でも履歴エントリーは作成される', async () => {
      person.updateContactInfo(
        {
          name: '田中次郎',
        },
        {
          historyCallback: mockHistoryCallback,
        }
      )

      expect(mockHistoryCallback).toHaveBeenCalledWith([
        {
          changeType: 'name_changed',
          oldValue: '田中太郎',
          newValue: '田中次郎',
          timestamp: expect.any(Date),
          contactId: undefined,
        },
      ])
    })

    it('会社名がundefinedから値に変更される場合の履歴記録', async () => {
      // 会社名がないPersonを作成
      const personWithoutCompany = Person.create({
        name: '佐藤花子',
        email: 'sato@example.com',
      })

      personWithoutCompany.updateContactInfo(
        {
          company: '株式会社新規',
        },
        {
          contactId: 'contact-new-company',
          historyCallback: mockHistoryCallback,
        }
      )

      expect(mockHistoryCallback).toHaveBeenCalledWith([
        {
          changeType: 'company_changed',
          oldValue: undefined,
          newValue: '株式会社新規',
          timestamp: expect.any(Date),
          contactId: 'contact-new-company',
        },
      ])
    })
  })
})
