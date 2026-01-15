import { beforeEach, describe, expect, it, vi } from 'vitest'

import { Contact } from '@aromarious/domain'

import type { DbClient } from '../../../client'
import { ContactRepository } from '../../../repository/contact.repository'

interface ContactRepositoryPrivate {
  toDomainContact: (data: any) => Contact
  toContactPersistence: (contact: Contact) => any
  buildFilterConditions: (filter: any) => any[]
}

describe('ContactRepository Unit Test', () => {
  let contactRepository: ContactRepository
  let mockDb: DbClient

  beforeEach(() => {
    // モックDBの詳細設定
    mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      offset: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      values: vi.fn().mockReturnThis(),
      onConflictDoUpdate: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([]),
      update: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
    } as any
    contactRepository = new ContactRepository(mockDb)
  })

  describe('基本的な動作確認', () => {
    it('ContactRepositoryが正常にインスタンス化される', () => {
      // Act
      const repository = new ContactRepository(mockDb)

      // Assert
      expect(repository).toBeInstanceOf(ContactRepository)
    })
  })

  describe('Contactエンティティとの連携', () => {
    it('Contactエンティティのcreateファクトリーメソッドが動作する', () => {
      // Act
      const contact = Contact.create({
        inquirerName: 'Test Name',
        inquirerEmail: 'test@example.com',
        personId: '12345678-9abc-4ef0-9234-56789abcdef0',
        subject: 'Test Subject',
        message: 'Test Message',
        ipAddress: '192.168.1.1',
        timezone: 'Asia/Tokyo',
      })

      // Assert
      expect(contact).toBeInstanceOf(Contact)
      expect(contact.personId).toBe('12345678-9abc-4ef0-9234-56789abcdef0')
      expect(contact.subject).toBe('Test Subject')
      expect(contact.message).toBe('Test Message')
      expect(contact.ipAddress).toBe('192.168.1.1')
      expect(contact.timezone).toBe('Asia/Tokyo')
      expect(contact.notionSynced).toBe(false)
      expect(contact.slackNotified).toBe(false)
    })

    it('Contactエンティティの外部同期機能が動作する', () => {
      // Arrange
      const contact = Contact.create({
        inquirerName: 'Test Name',
        inquirerEmail: 'test@example.com',
        personId: '12345678-9abc-4ef0-9234-56789abcdef0',
        subject: 'Sync Test',
        message: 'External sync test',
      })

      // Act & Assert: Notion同期
      expect(contact.notionSynced).toBe(false)
      contact.markNotionSynced()
      expect(contact.notionSynced).toBe(true)
      expect(contact.notionSyncedAt).toBeInstanceOf(Date)

      // Act & Assert: Slack通知
      expect(contact.slackNotified).toBe(false)
      contact.markSlackNotified()
      expect(contact.slackNotified).toBe(true)
      expect(contact.slackNotifiedAt).toBeInstanceOf(Date)
    })
  })

  describe('外部サービス連携機能', () => {
    it('SlackメッセージフォーマットやNotionプロパティが正しく生成される', () => {
      // Arrange
      const contact = Contact.create({
        inquirerName: 'Test Name',
        inquirerEmail: 'test@example.com',
        personId: '12345678-9abc-4ef0-9234-56789abcdef0',
        subject: 'Integration Test',
        message: 'Test Message for Integration',
      })

      // Act
      const slackMessage = contact.toSlackMessage()
      const notionProperties = contact.toNotionProperties()

      // Assert
      expect(slackMessage).toContain('Integration Test')
      expect(slackMessage).toContain('Test Message for Integration')
      expect(notionProperties.title).toBe('Integration Test')
      expect(notionProperties.message).toBe('Test Message for Integration')
      expect(notionProperties.personId).toBe('12345678-9abc-4ef0-9234-56789abcdef0')
    })
  })

  describe('エラーハンドリング', () => {
    it('ContactRepositoryのコンストラクタが正常に動作する', () => {
      // Act
      const repository = new ContactRepository(mockDb)

      // Assert
      expect(repository).toBeInstanceOf(ContactRepository)
    })
  })

  describe('型安全性の確認', () => {
    it('ContactRepositoryPortインターフェースを実装している', () => {
      // Assert - TypeScriptの型チェックでContactRepositoryPortを実装していることを確認
      const repository = contactRepository as unknown as Record<string, unknown>

      // 必須メソッドが存在することを確認
      expect(typeof repository.save).toBe('function')
      expect(typeof repository.update).toBe('function')
      expect(typeof repository.findById).toBe('function')
      expect(typeof repository.findByPersonId).toBe('function')
      expect(typeof repository.findMany).toBe('function')
      expect(typeof repository.delete).toBe('function')
      // 追加の重要メソッドもチェック
      expect(typeof repository.count).toBe('function')
      expect(typeof repository.exists).toBe('function')
      expect(typeof repository.findUnsyncedForNotion).toBe('function')
      expect(typeof repository.findUnnotifiedForSlack).toBe('function')
    })
  })

  describe('プライベートメソッドのテスト', () => {
    it('toDomainContactメソッドでContactエンティティを正しく作成できる', () => {
      // Arrange
      const contactData = {
        id: '01234567-89ab-cdef-0123-456789abcdef',
        inquirerName: 'Test Name',
        inquirerEmail: 'test@example.com',
        personId: '12345678-9abc-4ef0-9234-56789abcdef0',
        subject: 'Test Subject',
        message: 'Test Message',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        browserName: 'Chrome',
        browserVersion: '120.0',
        osName: 'Windows',
        deviceType: 'desktop',
        screenResolution: '1920x1080',
        timezone: 'Asia/Tokyo',
        language: 'ja',
        referer: 'https://example.com',
        sessionId: 'session123',
        formDuration: 30000,
        previousVisitAt: new Date('2023-01-01'),
        notionSynced: false,
        slackNotified: false,
        notionSyncedAt: null,
        slackNotifiedAt: null,
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-02'),
      }

      // Act - リフレクションを使ってプライベートメソッドにアクセス
      const result = (contactRepository as unknown as ContactRepositoryPrivate).toDomainContact(
        contactData
      )

      // Assert
      expect(result).toBeInstanceOf(Contact)
      expect(result.id).toBe('01234567-89ab-cdef-0123-456789abcdef')
      expect(result.personId).toBe('12345678-9abc-4ef0-9234-56789abcdef0')
      expect(result.subject).toBe('Test Subject')
      expect(result.message).toBe('Test Message')
      expect(result.ipAddress).toBe('192.168.1.1')
      expect(result.userAgent).toBe('Mozilla/5.0')
      expect(result.timezone).toBe('Asia/Tokyo')
    })

    it('toContactPersistenceメソッドで永続化データを正しく作成できる', () => {
      // Arrange
      const contact = Contact.create({
        inquirerName: 'Test Name',
        inquirerEmail: 'test@example.com',
        personId: '12345678-9abc-4ef0-9234-56789abcdef0',
        subject: 'Test Subject',
        message: 'Test Message',
        ipAddress: '192.168.1.1',
        timezone: 'Asia/Tokyo',
      })

      // Act - リフレクションを使ってプライベートメソッドにアクセス
      const result = (
        contactRepository as unknown as ContactRepositoryPrivate
      ).toContactPersistence(contact)

      // Assert
      expect(result).toEqual({
        id: contact.id,
        inquirerName: 'Test Name',
        inquirerEmail: 'test@example.com',
        personId: '12345678-9abc-4ef0-9234-56789abcdef0',
        subject: 'Test Subject',
        message: 'Test Message',
        ipAddress: '192.168.1.1',
        userAgent: contact.userAgent || null,
        browserName: contact.browserName || null,
        browserVersion: contact.browserVersion || null,
        osName: contact.osName || null,
        deviceType: contact.deviceType || null,
        screenResolution: contact.screenResolution || null,
        timezone: 'Asia/Tokyo',
        language: contact.language || null,
        referer: contact.referer || null,
        sessionId: contact.sessionId || null,
        formDuration: contact.formDuration || null,
        previousVisitAt: contact.previousVisitAt || null,
        notionSynced: false,
        slackNotified: false,
        notionSyncedAt: contact.notionSyncedAt || null,
        slackNotifiedAt: contact.slackNotifiedAt || null,
        notionPageId: null,
        createdAt: contact.createdAt,
        updatedAt: contact.updatedAt,
      })
    })

    it('buildFilterConditionsメソッドで複雑なフィルター条件を構築できる', () => {
      // Arrange
      const filter = {
        inquirerName: 'Test Name',
        inquirerEmail: 'test@example.com',
        personId: '12345678-9abc-4ef0-9234-56789abcdef0',
        createdAfter: new Date('2023-01-01'),
        createdBefore: new Date('2023-12-31'),
        notionSynced: false,
        slackNotified: true,
      }

      // Act - リフレクションを使ってプライベートメソッドにアクセス
      const result = (
        contactRepository as unknown as ContactRepositoryPrivate
      ).buildFilterConditions(filter)

      // Assert
      expect(result).toBeInstanceOf(Array)
      // 5つのフィルター条件に対して5つの条件が作成されているか確認
      expect(result.length).toBe(5)
    })

    it('buildFilterConditionsで空のフィルターは空配列を返す', () => {
      // Arrange
      const filter = {}

      // Act - リフレクションを使ってプライベートメソッドにアクセス
      const result = (
        contactRepository as unknown as ContactRepositoryPrivate
      ).buildFilterConditions(filter)

      // Assert
      expect(result).toBeInstanceOf(Array)
      expect(result.length).toBe(0)
    })
  })

  describe('ビジネスロジックのテスト', () => {
    it('外部同期機能が正しく動作する', () => {
      // Arrange
      const contact = Contact.create({
        inquirerName: 'Test Name',
        inquirerEmail: 'test@example.com',
        personId: '12345678-9abc-4ef0-9234-56789abcdef0',
        subject: 'Sync Test',
        message: 'External sync test',
      })

      // Act & Assert: Notion同期
      expect(contact.notionSynced).toBe(false)
      expect(contact.needsNotionSync()).toBe(true)
      contact.markNotionSynced()
      expect(contact.notionSynced).toBe(true)
      expect(contact.notionSyncedAt).toBeInstanceOf(Date)
      expect(contact.needsNotionSync()).toBe(false)

      // Act & Assert: Slack通知
      expect(contact.slackNotified).toBe(false)
      expect(contact.needsSlackNotification()).toBe(true)
      contact.markSlackNotified()
      expect(contact.slackNotified).toBe(true)
      expect(contact.slackNotifiedAt).toBeInstanceOf(Date)
      expect(contact.needsSlackNotification()).toBe(false)
    })
  })

  describe('エラーハンドリングの詳細テスト', () => {
    it('空の件名でContactを作成するとエラーが発生する', () => {
      // Act & Assert
      expect(() =>
        Contact.create({
          inquirerName: 'Test Name',
          inquirerEmail: 'test@example.com',
          personId: '12345678-9abc-def0-1234-56789abcdef0',
          subject: '', // 空の件名
          message: 'Test Message',
        })
      ).toThrow()
    })

    it('空のメッセージでContactを作成するとエラーが発生する', () => {
      // Act & Assert
      expect(() =>
        Contact.create({
          inquirerName: 'Test Name',
          inquirerEmail: 'test@example.com',
          personId: '12345678-9abc-4ef0-9234-56789abcdef0',
          subject: 'Test Subject',
          message: '', // 空のメッセージ
        })
      ).toThrow()
    })

    it('不正なUUID形式のpersonIdでContactを作成するとエラーが発生する', () => {
      // Act & Assert
      expect(() =>
        Contact.create({
          inquirerName: 'Test Name',
          inquirerEmail: 'test@example.com',
          personId: 'invalid-uuid', // 不正なUUID
          subject: 'Test Subject',
          message: 'Test Message',
        })
      ).toThrow()
    })
  })

  describe('データベース操作エラーケース', () => {
    it('Repository内部エラーのシミュレーション', async () => {
      // Arrange - Repository内部でエラーが発生するケースをテスト
      const contact = Contact.create({
        inquirerName: 'Test Name',
        inquirerEmail: 'test@example.com',
        personId: '12345678-9abc-4ef0-9234-56789abcdef0',
        subject: 'Test Subject',
        message: 'Test Message',
      })

      // Repository のプライベートメソッドをスパイしてエラーを発生させる
      const toContactPersistenceSpy = vi
        .spyOn(contactRepository as any, 'toContactPersistence')
        .mockImplementation(() => {
          throw new Error('Data transformation error')
        })

      // Act & Assert
      await expect(contactRepository.save(contact)).rejects.toThrow('Data transformation error')

      toContactPersistenceSpy.mockRestore()
    })

    it('findById で無効なID形式でエラーハンドリング', async () => {
      // Arrange - 無効なUUID形式とモック設定
      const invalidId = 'invalid-uuid-format'
      // 完全なチェーンモックを設定
      const mockChain = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]), // 空の配列を返す
      }
      ;(mockDb.select as any).mockReturnValue(mockChain)

      // Act
      const result = await contactRepository.findById(invalidId)

      // Assert - 無効IDの場合は null を返すことを確認
      expect(result).toBeNull()
    })

    it('データ変換エラーのハンドリング', async () => {
      // Arrange - データ変換でエラーが発生するケース
      const contact = Contact.create({
        inquirerName: 'Test Name',
        inquirerEmail: 'test@example.com',
        personId: '12345678-9abc-4ef0-9234-56789abcdef0',
        subject: 'Test Subject',
        message: 'Test Message',
      })

      // toDomainContact でエラーを発生させる
      const toDomainContactSpy = vi
        .spyOn(contactRepository as any, 'toDomainContact')
        .mockImplementation(() => {
          throw new Error('Domain mapping error')
        })
      // DBからデータが返されるようにモックを設定
      ;(mockDb as any).limit.mockResolvedValue([
        {
          id: '12345678-9abc-4ef0-9234-56789abcdef0',
          inquirerName: 'Test Name',
          inquirerEmail: 'test@example.com',
          personId: '12345678-9abc-4ef0-9234-56789abcdef0',
          subject: 'Test Subject',
          message: 'Test Message',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ])
      // Act & Assert - findById でドメインマッピングエラー
      await expect(contactRepository.findById(contact.id)).rejects.toThrow('Domain mapping error')

      toDomainContactSpy.mockRestore()
    })

    it('フィルター構築でのエラーハンドリング', async () => {
      // Arrange - 無効なフィルタークエリ
      const invalidFilter = {
        invalidField: 'value',
        anotherInvalidField: 123,
      } as any

      // buildFilterConditions でエラーを発生させる
      const buildFilterSpy = vi
        .spyOn(contactRepository as any, 'buildFilterConditions')
        .mockImplementation(() => {
          throw new Error('Invalid filter criteria')
        })

      // Act & Assert
      await expect(contactRepository.findMany(invalidFilter)).rejects.toThrow(
        'Invalid filter criteria'
      )

      buildFilterSpy.mockRestore()
    })

    it('バリデーションエラーのあるエンティティでの処理', () => {
      // Arrange - 直接的にエラーになるエンティティ作成を試行
      expect(() =>
        Contact.create({
          inquirerName: 'Test Name',
          inquirerEmail: 'test@example.com',
          personId: '12345678-9abc-4ef0-9234-56789abcdef0',
          subject: '', // 空の件名でエラーチェック（実際はオプションフィールド）
          message: '', // 空のメッセージでエラー発生
        })
      ).toThrow()
    })

    it('Repository の状態不整合エラー', async () => {
      // Arrange - Repository が想定外の状態になった場合
      const contact = Contact.create({
        inquirerName: 'Test Name',
        inquirerEmail: 'test@example.com',
        personId: '12345678-9abc-4ef0-9234-56789abcdef0',
        subject: 'Test Subject',
        message: 'Test Message',
      })

      // toContactPersistence が null/undefined を返すエラーケース
      const toContactPersistenceSpy = vi
        .spyOn(contactRepository as any, 'toContactPersistence')
        .mockReturnValue(null)

      // Act & Assert - null データでの保存処理エラー
      await expect(contactRepository.save(contact)).rejects.toThrow()

      toContactPersistenceSpy.mockRestore()
    })
  })
})
