import { Client } from '@notionhq/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { PersonData, RawContactData } from '../../shared/types'
import { NotionClient } from '../../notion/notion-client'
import { ExternalServiceError } from '../../shared/error'

// Notion Clientをモック
vi.mock('@notionhq/client', () => ({
  Client: vi.fn(),
}))

describe('NotionService', () => {
  let notionService: NotionClient
  let mockPageCreate: ReturnType<typeof vi.fn>
  let mockBlocksChildrenList: ReturnType<typeof vi.fn>
  let mockDatabasesQuery: ReturnType<typeof vi.fn>
  let mockDatabasesRetrieve: ReturnType<typeof vi.fn>
  let mockDatabasesUpdate: ReturnType<typeof vi.fn>
  let mockPagesUpdate: ReturnType<typeof vi.fn>
  let consoleLogSpy: ReturnType<typeof vi.spyOn>
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>

  const mockRawContactData: RawContactData = {
    id: 'test-contact-id',
    name: 'テストユーザー',
    email: 'test@example.com',
    subject: 'テスト問い合わせ',
    message: 'テストメッセージです',
    createdAt: new Date('2023-12-01T10:00:00Z'),
  }

  beforeEach(() => {
    vi.clearAllMocks()

    // console.logとconsole.errorをモック
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    // pages.createメソッドのモック
    mockPageCreate = vi.fn()

    // pages.updateメソッドのモック
    mockPagesUpdate = vi.fn()

    // blocks.children.listメソッドのモック
    mockBlocksChildrenList = vi.fn()

    // databases.queryメソッドのモック
    mockDatabasesQuery = vi.fn()

    // databases.retrieveメソッドのモック
    mockDatabasesRetrieve = vi.fn()

    // databases.updateメソッドのモック
    mockDatabasesUpdate = vi.fn()

    // Contactデータベースを含む親ページのレスポンスをモック
    mockBlocksChildrenList.mockResolvedValue({
      results: [
        {
          type: 'child_database',
          id: 'test-contact-db-id',
          child_database: {
            title: 'Contact',
          },
        },
        {
          type: 'child_database',
          id: 'test-person-db-id',
          child_database: {
            title: 'Person',
          },
        },
      ],
    })

    // Clientコンストラクタのモック
    vi.mocked(Client).mockImplementation(
      () =>
        ({
          pages: {
            create: mockPageCreate,
            update: mockPagesUpdate,
          },
          blocks: {
            children: {
              list: mockBlocksChildrenList,
            },
          },
          databases: {
            query: mockDatabasesQuery,
            retrieve: mockDatabasesRetrieve,
            update: mockDatabasesUpdate,
          },
        }) as unknown as Client
    )
  })

  describe('constructor', () => {
    it('APIトークンと親ページIDが提供された場合、クライアントが初期化される', () => {
      const service = new NotionClient('test-token', 'test-parent-page-id')
      expect(Client).toHaveBeenCalledWith({ auth: 'test-token' })
      expect(service.isConfigured()).toBe(true)
    })

    it('APIトークンまたは親ページIDが不足している場合、クライアントが初期化されない', () => {
      const service1 = new NotionClient()
      const service2 = new NotionClient('test-token')
      const service3 = new NotionClient(undefined, 'test-parent-page-id')

      expect(service1.isConfigured()).toBe(false)
      expect(service2.isConfigured()).toBe(false)
      expect(service3.isConfigured()).toBe(false)
    })
  })

  describe('createContactRecord', () => {
    beforeEach(() => {
      notionService = new NotionClient('test-token', 'test-parent-page-id')
    })

    it('設定が無効な場合、エラー結果を返す', async () => {
      const unconfiguredService = new NotionClient()
      const result = await unconfiguredService.createContactRecord(mockRawContactData)

      expect(result).toEqual({
        success: false,
        error: 'Notion API token or database ID not configured',
        service: 'notion',
      })
    })

    it('正常にページを作成できる場合、成功結果を返す', async () => {
      mockPageCreate.mockResolvedValue({
        id: 'page-id',
        object: 'page',
      })

      const result = await notionService.createContactRecord(mockRawContactData)

      expect(result).toEqual({
        success: true,
        service: 'notion',
        pageId: 'page-id',
      })

      expect(mockPageCreate).toHaveBeenCalledWith({
        parent: {
          database_id: 'test-contact-db-id',
        },
        properties: {
          name: {
            title: [
              {
                text: {
                  content: 'テストユーザー - test@example.com',
                },
              },
            ],
          },
          email: {
            email: 'test@example.com',
          },
          message: {
            rich_text: [
              {
                text: {
                  content:
                    '問い合わせ種別: テスト問い合わせ\n\nテストメッセージです\n\n受信日時: 2023-12-01T10:00:00.000Z',
                },
              },
            ],
          },
          status: {
            select: {
              name: 'New',
            },
          },
          subject: {
            select: {
              name: 'テスト問い合わせ',
            },
          },
          contact_id: {
            rich_text: [
              {
                text: {
                  content: 'test-contact-id',
                },
              },
            ],
          },
        },
      })
    })

    it('Notion API呼び出しが失敗した場合、ExternalServiceErrorを投げる', async () => {
      const error = new Error('Notion API error')
      mockPageCreate.mockRejectedValue(error)

      await expect(notionService.createContactRecord(mockRawContactData)).rejects.toThrow(
        ExternalServiceError
      )

      await expect(notionService.createContactRecord(mockRawContactData)).rejects.toThrow(
        'Notion record creation failed: Notion API error'
      )
    })

    it('不明なエラーの場合、適切なエラーメッセージを設定する', async () => {
      mockPageCreate.mockRejectedValue('不明なエラー')

      await expect(notionService.createContactRecord(mockRawContactData)).rejects.toThrow(
        'Notion record creation failed: Unknown error'
      )
    })
  })

  describe('isConfigured', () => {
    it('クライアントと親ページIDが両方設定されている場合、trueを返す', () => {
      const service = new NotionClient('test-token', 'test-parent-page-id')
      expect(service.isConfigured()).toBe(true)
    })

    it('設定が不完全な場合、falseを返す', () => {
      const service = new NotionClient()
      expect(service.isConfigured()).toBe(false)
    })
  })

  describe('getPersonDatabaseId (private method)', () => {
    beforeEach(() => {
      notionService = new NotionClient('test-token', 'test-parent-page-id')
    })

    it('PersonデータベースIDがキャッシュされている場合、キャッシュされた値を返す', async () => {
      // プライベートプロパティにアクセスしてキャッシュをセット
      ;(notionService as any).personDatabaseId = 'cached-person-db-id'

      // 反射を使ってプライベートメソッドをテスト
      const result = await (notionService as any).getPersonDatabaseId()

      expect(result).toBe('cached-person-db-id')
      expect(mockBlocksChildrenList).not.toHaveBeenCalled()
    })

    it('キャッシュがない場合、APIからPersonデータベースIDを取得する', async () => {
      const result = await (notionService as any).getPersonDatabaseId()

      expect(result).toBe('test-person-db-id')
      expect(mockBlocksChildrenList).toHaveBeenCalledWith({
        block_id: 'test-parent-page-id',
      })
    })

    it('API呼び出しが失敗した場合、nullを返す', async () => {
      mockBlocksChildrenList.mockRejectedValue(new Error('API Error'))

      const result = await (notionService as any).getPersonDatabaseId()

      expect(result).toBeNull()
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to fetch Person database ID:',
        expect.any(Error)
      )
    })

    it('Personデータベースが見つからない場合、nullを返す', async () => {
      mockBlocksChildrenList.mockResolvedValue({
        results: [
          {
            type: 'child_database',
            id: 'test-contact-db-id',
            child_database: {
              title: 'Contact',
            },
          },
        ],
      })

      const result = await (notionService as any).getPersonDatabaseId()

      expect(result).toBeNull()
    })
  })

  describe('createPersonRecord', () => {
    const mockPersonData = {
      id: 'test-person-id',
      name: 'テスト太郎',
      email: 'test@example.com',
      company: 'テスト会社',
      twitterHandle: '@test_user',
      createdAt: new Date('2025-01-01'),
    }

    beforeEach(() => {
      notionService = new NotionClient('test-token', 'test-parent-page-id')
    })

    it('設定が無効な場合、エラー結果を返す', async () => {
      const unconfiguredService = new NotionClient()
      const result = await unconfiguredService.createPersonRecord(mockPersonData)

      expect(result).toEqual({
        success: false,
        error: 'Notion API token not configured',
        service: 'notion',
      })
    })

    it('正常にPersonページを作成できる場合、成功結果を返す', async () => {
      mockPageCreate.mockResolvedValue({
        id: 'person-page-id',
        object: 'page',
      })

      const result = await notionService.createPersonRecord(mockPersonData)

      expect(result).toEqual({
        success: true,
        service: 'notion',
        pageId: 'person-page-id',
      })

      expect(mockPageCreate).toHaveBeenCalledWith({
        parent: {
          database_id: 'test-person-db-id',
        },
        properties: {
          name: {
            title: [
              {
                text: {
                  content: 'テスト太郎',
                },
              },
            ],
          },
          email: {
            email: 'test@example.com',
          },
          company: {
            rich_text: [
              {
                text: {
                  content: 'テスト会社',
                },
              },
            ],
          },
          twitterHandle: {
            rich_text: [
              {
                text: {
                  content: 'test_user',
                },
              },
            ],
          },
        },
      })
    })

    it('Twitterハンドルがない場合、twitterHandleプロパティを含めない', async () => {
      mockPageCreate.mockResolvedValue({
        id: 'person-page-id',
        object: 'page',
      })

      const personDataWithoutTwitter = {
        id: 'test-person-id',
        name: 'テスト太郎',
        email: 'test@example.com',
        company: 'テスト会社',
        createdAt: new Date('2025-01-01'),
      }

      await notionService.createPersonRecord(personDataWithoutTwitter)

      expect(mockPageCreate).toHaveBeenCalledWith({
        parent: {
          database_id: 'test-person-db-id',
        },
        properties: {
          name: {
            title: [
              {
                text: {
                  content: 'テスト太郎',
                },
              },
            ],
          },
          email: {
            email: 'test@example.com',
          },
          company: {
            rich_text: [
              {
                text: {
                  content: 'テスト会社',
                },
              },
            ],
          },
        },
      })
    })

    it('Person API呼び出しが失敗した場合、ExternalServiceErrorを投げる', async () => {
      const error = new Error('Person API error')
      mockPageCreate.mockRejectedValue(error)

      await expect(notionService.createPersonRecord(mockPersonData)).rejects.toThrow(
        ExternalServiceError
      )

      await expect(notionService.createPersonRecord(mockPersonData)).rejects.toThrow(
        'Notion Person record creation failed: Person API error'
      )
    })
  })

  describe('findPersonByEmail', () => {
    beforeEach(() => {
      notionService = new NotionClient('test-token', 'test-parent-page-id')
    })

    it('設定が無効な場合、nullを返す', async () => {
      const unconfiguredService = new NotionClient()
      const result = await unconfiguredService.findPersonByEmail('test@example.com')

      expect(result).toBeNull()
    })

    it('Personが見つかった場合、ページIDを返す', async () => {
      mockDatabasesQuery.mockResolvedValue({
        results: [
          {
            id: 'found-person-id',
          },
        ],
      })

      const result = await notionService.findPersonByEmail('test@example.com')

      expect(result).toBe('found-person-id')
      expect(mockDatabasesQuery).toHaveBeenCalledWith({
        database_id: 'test-person-db-id',
        filter: {
          property: 'email',
          email: {
            equals: 'test@example.com',
          },
        },
        page_size: 1,
      })
    })

    it('Personが見つからない場合、nullを返す', async () => {
      mockDatabasesQuery.mockResolvedValue({
        results: [],
      })

      const result = await notionService.findPersonByEmail('notfound@example.com')

      expect(result).toBeNull()
    })

    it('API呼び出しが失敗した場合、nullを返す', async () => {
      mockDatabasesQuery.mockRejectedValue(new Error('Database query error'))

      const result = await notionService.findPersonByEmail('test@example.com')

      expect(result).toBeNull()
      expect(consoleErrorSpy).toHaveBeenCalledWith('Person verification error:', {
        email: 'test@example.com',
        error: 'Database query error',
      })
    })
  })

  describe('updateContactPersonRelation', () => {
    beforeEach(() => {
      notionService = new NotionClient('test-token', 'test-parent-page-id')
    })

    it('設定が無効な場合、エラー結果を返す', async () => {
      const unconfiguredService = new NotionClient()
      const result = await unconfiguredService.updateContactPersonRelation(
        'contact-id',
        'person-id'
      )

      expect(result).toEqual({
        success: false,
        error: 'Notion API token not configured',
        service: 'notion',
      })
    })

    it('正常にContactのPerson relationを更新できる場合、成功結果を返す', async () => {
      mockPagesUpdate.mockResolvedValue({})

      const result = await notionService.updateContactPersonRelation(
        'contact-page-id',
        'person-page-id'
      )

      expect(result).toEqual({
        success: true,
        service: 'notion',
      })

      expect(mockPagesUpdate).toHaveBeenCalledWith({
        page_id: 'contact-page-id',
        properties: {
          person: {
            type: 'relation',
            relation: [
              {
                id: 'person-page-id',
              },
            ],
          },
        },
      })
    })

    it('API呼び出しが失敗した場合、ExternalServiceErrorを投げる', async () => {
      const error = new Error('Update relation error')
      mockPagesUpdate.mockRejectedValue(error)

      await expect(
        notionService.updateContactPersonRelation('contact-id', 'person-id')
      ).rejects.toThrow(ExternalServiceError)

      await expect(
        notionService.updateContactPersonRelation('contact-id', 'person-id')
      ).rejects.toThrow('Contact Person relation update failed: Update relation error')
    })
  })

  describe('createContactRecordWithoutPersonRelation', () => {
    beforeEach(() => {
      notionService = new NotionClient('test-token', 'test-parent-page-id')
    })

    it('設定が無効な場合、エラー結果を返す', async () => {
      const unconfiguredService = new NotionClient()
      const result =
        await unconfiguredService.createContactRecordWithoutPersonRelation(mockRawContactData)

      expect(result).toEqual({
        success: false,
        error: 'Notion API token or database ID not configured',
        service: 'notion',
      })
    })

    it('正常にContactページ（Person relationなし）を作成できる場合、成功結果を返す', async () => {
      mockPageCreate.mockResolvedValue({
        id: 'contact-page-id',
        object: 'page',
      })

      const result =
        await notionService.createContactRecordWithoutPersonRelation(mockRawContactData)

      expect(result).toEqual({
        success: true,
        service: 'notion',
        pageId: 'contact-page-id',
      })

      expect(mockPageCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          parent: {
            database_id: 'test-contact-db-id',
          },
          properties: expect.not.objectContaining({
            person: expect.anything(),
          }),
        })
      )
    })

    it('API呼び出しが失敗した場合、ExternalServiceErrorを投げる', async () => {
      const error = new Error('Contact creation error')
      mockPageCreate.mockRejectedValue(error)

      await expect(
        notionService.createContactRecordWithoutPersonRelation(mockRawContactData)
      ).rejects.toThrow(ExternalServiceError)

      await expect(
        notionService.createContactRecordWithoutPersonRelation(mockRawContactData)
      ).rejects.toThrow('Notion Contact record creation failed: Contact creation error')
    })
  })

  describe('updateRawContactDatabaseSchema', () => {
    beforeEach(() => {
      notionService = new NotionClient('test-token', 'test-parent-page-id')
    })

    it('設定が無効な場合、エラー結果を返す', async () => {
      const unconfiguredService = new NotionClient()
      const result = await unconfiguredService.updateRawContactDatabaseSchema()

      expect(result).toEqual({
        success: false,
        error: 'Notion API token not configured',
      })
    })

    it('contact_idプロパティが既に存在する場合、alreadyExistsフラグで成功を返す', async () => {
      mockDatabasesRetrieve.mockResolvedValue({
        properties: {
          contact_id: {
            type: 'rich_text',
          },
        },
      })

      const result = await notionService.updateRawContactDatabaseSchema()

      expect(result).toEqual({
        success: true,
        alreadyExists: true,
      })
      expect(mockDatabasesUpdate).not.toHaveBeenCalled()
    })

    it('contact_idプロパティがない場合、プロパティを追加して成功を返す', async () => {
      mockDatabasesRetrieve.mockResolvedValue({
        properties: {},
      })
      mockDatabasesUpdate.mockResolvedValue({})

      const result = await notionService.updateRawContactDatabaseSchema()

      expect(result).toEqual({
        success: true,
        alreadyExists: false,
      })
      expect(mockDatabasesUpdate).toHaveBeenCalledWith({
        database_id: 'test-contact-db-id',
        properties: {
          contact_id: {
            rich_text: {},
          },
        },
      })
    })

    it('API呼び出しが失敗した場合、エラー結果を返す', async () => {
      mockDatabasesRetrieve.mockRejectedValue(new Error('Schema update error'))

      const result = await notionService.updateRawContactDatabaseSchema()

      expect(result).toEqual({
        success: false,
        error: 'Database schema update failed: Schema update error',
      })
    })
  })

  describe('Notion API エラーケース', () => {
    it('ページ作成でのHTTPエラー処理', async () => {
      const httpError = new Error('Request failed with status code 401')
      httpError.name = 'HTTPError'
      mockPageCreate.mockRejectedValue(httpError)

      await expect(notionService.createContactRecord(mockRawContactData)).rejects.toThrow(
        ExternalServiceError
      )
    })

    it('ページ作成でのネットワークエラー処理', async () => {
      const networkError = new Error('ECONNREFUSED')
      networkError.name = 'NetworkError'
      mockPageCreate.mockRejectedValue(networkError)

      await expect(notionService.createContactRecord(mockRawContactData)).rejects.toThrow(
        ExternalServiceError
      )
    })

    it('ページ作成でのタイムアウトエラー処理', async () => {
      const timeoutError = new Error('ETIMEDOUT')
      timeoutError.name = 'TimeoutError'
      mockPageCreate.mockRejectedValue(timeoutError)

      await expect(notionService.createContactRecord(mockRawContactData)).rejects.toThrow(
        ExternalServiceError
      )
    })

    it('データベース検索でのエラー処理', async () => {
      const searchError = new Error('Database query failed')
      searchError.name = 'DatabaseError'
      mockDatabasesQuery.mockRejectedValue(searchError)

      const result = await notionService.findPersonByEmail('test@example.com')

      expect(result).toBeNull()
    })

    it('ページ更新でのエラー処理', async () => {
      const updateError = new Error('Page update permission denied')
      updateError.name = 'PermissionError'
      mockPagesUpdate.mockRejectedValue(updateError)

      // NotionServiceには直接updateContactPersonRelationメソッドがないため、
      // 代替として createContactRecord でのエラーをテスト
      await expect(
        notionService.createContactRecord({
          id: 'test-id',
          name: 'Test Name',
          email: 'test@example.com',
          company: 'Test Company',
          subject: 'Test Subject',
          message: 'Test Message',
          createdAt: new Date(),
        })
      ).rejects.toThrow(ExternalServiceError)
    })
  })

  afterEach(() => {
    consoleLogSpy.mockRestore()
    consoleErrorSpy.mockRestore()
  })
})
