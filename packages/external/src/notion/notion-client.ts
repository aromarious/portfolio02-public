import { Client } from '@notionhq/client'

import type { ExternalServiceResult, PersonData, RawContactData } from '../shared/types'
import { ExternalServiceError } from '../shared/error'

/**
 * Notion APIクライアント
 * APIの呼び出し、接続管理、基本的なCRUD操作を担当
 */
export class NotionClient {
  private client: Client | null = null
  private parentPageId: string | null = null
  private contactDatabaseId: string | null = null
  private personDatabaseId: string | null = null

  constructor(apiToken?: string, parentPageId?: string) {
    console.log('NotionService constructor called with:', {
      hasApiToken: !!apiToken,
      parentPageId: parentPageId,
    })

    if (apiToken && parentPageId) {
      this.client = new Client({ auth: apiToken })
      this.parentPageId = parentPageId
      console.log('Configured with parent page ID:', this.parentPageId)
    } else {
      console.log('NotionClient not configured due to missing credentials')
    }
  }

  /**
   * 親ページからContactデータベースIDを取得（必要な場合）
   */
  private async getRawContactDatabaseId(): Promise<string | null> {
    // すでにContactデータベースIDがキャッシュされている場合はそれを使用
    if (this.contactDatabaseId) {
      return this.contactDatabaseId
    }

    // 親ページIDがない場合は取得不可
    if (!this.client || !this.parentPageId) {
      return null
    }

    try {
      // 親ページの子ブロックを取得
      const response = await this.client.blocks.children.list({
        block_id: this.parentPageId,
      })

      // 「Contact」という名前のデータベースを探す
      for (const block of response.results) {
        // BlockObjectResponseかつchild_databaseタイプの場合
        if (
          'type' in block &&
          block.type === 'child_database' &&
          'child_database' in block &&
          block.child_database.title === 'Contact'
        ) {
          this.contactDatabaseId = block.id
          return block.id
        }
      }

      return null
    } catch (error) {
      console.error('Failed to fetch Contact database ID:', error)
      return null
    }
  }

  /**
   * 親ページからPersonデータベースIDを取得（必要な場合）
   */
  private async getPersonDatabaseId(): Promise<string | null> {
    // すでにPersonデータベースIDがキャッシュされている場合はそれを使用
    if (this.personDatabaseId) {
      return this.personDatabaseId
    }

    // 親ページIDがない場合は取得不可
    if (!this.client || !this.parentPageId) {
      return null
    }

    try {
      // 親ページの子ブロックを取得
      const response = await this.client.blocks.children.list({
        block_id: this.parentPageId,
      })

      // 「Person」という名前のデータベースを探す
      for (const block of response.results) {
        // BlockObjectResponseかつchild_databaseタイプの場合
        if (
          'type' in block &&
          block.type === 'child_database' &&
          'child_database' in block &&
          block.child_database.title === 'Person'
        ) {
          this.personDatabaseId = block.id
          return block.id
        }
      }

      return null
    } catch (error) {
      console.error('Failed to fetch Person database ID:', error)
      return null
    }
  }

  /**
   * 問い合わせデータをNotionデータベースに保存（Person relationなし）
   */
  async createContactRecordWithoutPersonRelation(
    contactData: RawContactData
  ): Promise<ExternalServiceResult & { pageId?: string }> {
    if (!this.client) {
      return {
        success: false,
        error: 'Notion API token or database ID not configured',
        service: 'notion',
      }
    }

    // データベースIDを取得
    const databaseId = await this.getRawContactDatabaseId()

    if (!databaseId) {
      return {
        success: false,
        error: 'Notion database ID not configured or Contact database not found',
        service: 'notion',
      }
    }

    try {
      const response = await this.client.pages.create({
        parent: {
          database_id: databaseId,
        },
        properties: {
          // タイトル（名前）
          name: {
            title: [
              {
                text: {
                  content: `${contactData.name} - ${contactData.email}`,
                },
              },
            ],
          },
          // メールアドレス
          email: {
            email: contactData.email,
          },
          // メッセージ（問い合わせ種別と受信日時も含める）
          message: {
            rich_text: [
              {
                text: {
                  content: `問い合わせ種別: ${contactData.subject}\n\n${contactData.message}\n\n受信日時: ${contactData.createdAt.toISOString()}`,
                },
              },
            ],
          },
          // ステータス（デフォルトで新規）
          status: {
            select: {
              name: 'New',
            },
          },
          // 問い合わせ種別
          subject: {
            select: {
              name: contactData.subject,
            },
          },
          // Contact ID（検索・照合用）
          contact_id: {
            rich_text: [
              {
                text: {
                  content: contactData.id,
                },
              },
            ],
          },
          // Person relationは意図的に除外（後で追加する）
        },
      })

      // レスポンスの検証
      if (!response || !response.id) {
        throw new Error('Invalid response from Notion: missing page ID')
      }

      if (response.object !== 'page') {
        throw new Error(
          `Invalid response from Notion: expected 'page' object, got '${response.object}'`
        )
      }

      return {
        success: true,
        service: 'notion',
        pageId: response.id,
      }
    } catch (error) {
      console.error('Notion Contact creation (without relation) failed:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        contactId: contactData.id,
      })
      throw new ExternalServiceError(
        `Notion Contact record creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'notion',
        error
      )
    }
  }

  /**
   * 問い合わせデータをNotionデータベースに保存（従来方式、互換性のため保持）
   */
  async createContactRecord(
    contactData: RawContactData
  ): Promise<ExternalServiceResult & { pageId?: string }> {
    if (!this.client) {
      return {
        success: false,
        error: 'Notion API token or database ID not configured',
        service: 'notion',
      }
    }

    // データベースIDを取得
    const databaseId = await this.getRawContactDatabaseId()

    if (!databaseId) {
      return {
        success: false,
        error: 'Notion database ID not configured or Contact database not found',
        service: 'notion',
      }
    }

    try {
      const response = await this.client.pages.create({
        parent: {
          database_id: databaseId,
        },
        properties: {
          // タイトル（名前）
          name: {
            title: [
              {
                text: {
                  content: `${contactData.name} - ${contactData.email}`,
                },
              },
            ],
          },
          // メールアドレス
          email: {
            email: contactData.email,
          },
          // メッセージ（問い合わせ種別と受信日時も含める）
          message: {
            rich_text: [
              {
                text: {
                  content: `問い合わせ種別: ${contactData.subject}\n\n${contactData.message}\n\n受信日時: ${contactData.createdAt.toISOString()}`,
                },
              },
            ],
          },
          // ステータス（デフォルトで新規）
          status: {
            select: {
              name: 'New',
            },
          },
          // 問い合わせ種別
          subject: {
            select: {
              name: contactData.subject,
            },
          },
          // Contact ID（検索・照合用）
          contact_id: {
            rich_text: [
              {
                text: {
                  content: contactData.id,
                },
              },
            ],
          },
          // Personリレーション（PersonのNotionページIDがある場合）
          ...(contactData.personNotionId && {
            person: {
              relation: [
                {
                  id: contactData.personNotionId,
                },
              ],
            },
          }),
        },
      })

      // レスポンスの検証
      if (!response || !response.id) {
        throw new Error('Invalid response from Notion: missing page ID')
      }

      if (response.object !== 'page') {
        throw new Error(
          `Invalid response from Notion: expected 'page' object, got '${response.object}'`
        )
      }

      return {
        success: true,
        service: 'notion',
        pageId: response.id,
      }
    } catch (error) {
      console.error('Notion Contact creation failed:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        contactId: contactData.id,
      })
      throw new ExternalServiceError(
        `Notion record creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'notion',
        error
      )
    }
  }

  /**
   * 個人データをNotionデータベースに保存し、作成されたページIDを返す
   */
  async createPersonRecord(
    personData: PersonData
  ): Promise<ExternalServiceResult & { pageId?: string }> {
    if (!this.client) {
      return {
        success: false,
        error: 'Notion API token not configured',
        service: 'notion',
      }
    }

    // PersonデータベースIDを取得
    const databaseId = await this.getPersonDatabaseId()

    if (!databaseId) {
      return {
        success: false,
        error: 'Person database not found',
        service: 'notion',
      }
    }

    try {
      const response = await this.client.pages.create({
        parent: {
          database_id: databaseId,
        },
        properties: {
          // タイトル（名前）
          name: {
            title: [
              {
                text: {
                  content: personData.name,
                },
              },
            ],
          },
          // メールアドレス
          email: {
            email: personData.email,
          },
          // 会社名
          ...(personData.company && {
            company: {
              rich_text: [
                {
                  text: {
                    content: personData.company,
                  },
                },
              ],
            },
          }),
          // Twitterハンドル
          ...(personData.twitterHandle && {
            twitterHandle: {
              rich_text: [
                {
                  text: {
                    content: personData.twitterHandle.replace('@', ''),
                  },
                },
              ],
            },
          }),
        },
      })

      // レスポンスの検証
      if (!response || !response.id) {
        throw new Error('Invalid response from Notion: missing page ID')
      }

      if (response.object !== 'page') {
        throw new Error(
          `Invalid response from Notion: expected 'page' object, got '${response.object}'`
        )
      }

      return {
        success: true,
        service: 'notion',
        pageId: response.id,
      }
    } catch (error) {
      console.error('Notion Person creation failed:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        email: personData.email,
      })
      throw new ExternalServiceError(
        `Notion Person record creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'notion',
        error
      )
    }
  }

  /**
   * EmailでPersonページを検索してIDを取得
   */
  async findPersonByEmail(email: string): Promise<string | null> {
    if (!this.client) {
      return null
    }

    // Personデータベースを取得
    const personDatabaseId = await this.getPersonDatabaseId()
    if (!personDatabaseId) {
      return null
    }

    try {
      // biome-ignore lint/suspicious/noExplicitAny: Temporary fix for Notion SDK type issues
      const response = await (this.client.databases as any).query({
        database_id: personDatabaseId,
        filter: {
          property: 'email',
          email: {
            equals: email,
          },
        },
        page_size: 1,
      })

      if (response.results.length > 0) {
        const personId = response.results[0]?.id || null
        return personId
      }

      return null
    } catch (error) {
      console.error('Person verification error:', {
        email,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      return null
    }
  }

  /**
   * ContactのPerson relationを更新
   */
  async updateContactPersonRelation(
    contactPageId: string,
    personPageId: string
  ): Promise<ExternalServiceResult> {
    if (!this.client) {
      return {
        success: false,
        error: 'Notion API token not configured',
        service: 'notion',
      }
    }

    try {
      await this.client.pages.update({
        page_id: contactPageId,
        properties: {
          person: {
            type: 'relation',
            relation: [
              {
                id: personPageId,
              },
            ],
          },
        },
      })

      return {
        success: true,
        service: 'notion',
      }
    } catch (error) {
      console.error('Contact Person relation update failed:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        contactPageId,
        personPageId,
      })
      throw new ExternalServiceError(
        `Contact Person relation update failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'notion',
        error
      )
    }
  }

  /**
   * NotionページIDでページの存在確認
   */
  async verifyPageExists(pageId: string): Promise<boolean> {
    if (!this.client) {
      return false
    }

    try {
      await this.client.pages.retrieve({ page_id: pageId })
      return true
    } catch (error) {
      return false
    }
  }

  /**
   * Notion設定が有効かチェック
   */
  isConfigured(): boolean {
    return this.client !== null && this.parentPageId !== null
  }

  /**
   * ページのブロックを取得
   */
  async getPageBlocks(pageId: string, pageSize = 100): Promise<unknown> {
    if (!this.client) {
      throw new Error('Notion client not configured')
    }

    return await this.client.blocks.children.list({
      block_id: pageId,
      page_size: pageSize,
    })
  }

  /**
   * ページにブロックを追記
   */
  async appendPageBlocks(
    pageId: string,
    // biome-ignore lint/suspicious/noExplicitAny: Notion API requires any[] for children blocks
    children: any[]
  ): Promise<void> {
    if (!this.client) {
      throw new Error('Notion client not configured')
    }

    await this.client.blocks.children.append({
      block_id: pageId,
      children,
    })
  }

  /**
   * PersonがNotionでrelation参照可能になるまで待機（一時的な実装）
   */
  async waitForPersonToBeReferenceable(
    email: string,
    maxWaitMs = 5000,
    pollIntervalMs = 300
  ): Promise<string | null> {
    const startTime = Date.now()

    while (Date.now() - startTime < maxWaitMs) {
      try {
        const personId = await this.findPersonByEmail(email)
        if (personId) {
          return personId
        }
      } catch (error) {
        // Retry on error
      }

      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs))
    }

    return null
  }

  /**
   * 段階的同期処理（一時的な実装）
   */
  async createContactWithStagedPersonSync(
    // biome-ignore lint/suspicious/noExplicitAny: Legacy method, TODO: add proper types
    contactData: any,
    // biome-ignore lint/suspicious/noExplicitAny: Legacy method, TODO: add proper types
    personData: any
  ): Promise<{
    success: boolean
    contactPageId?: string
    personPageId?: string
    error?: string
    step?: string
  }> {
    // 一時的にシンプルな実装
    try {
      const contactResult = await this.createContactRecordWithoutPersonRelation(contactData)
      if (!contactResult.success || !contactResult.pageId) {
        return {
          success: false,
          error: contactResult.error || 'Contact creation failed',
          step: 'contact_creation',
        }
      }

      return {
        success: true,
        contactPageId: contactResult.pageId,
        step: 'completed',
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        step: 'unknown',
      }
    }
  }

  /**
   * PersonExists確認（一時的な実装）
   */
  async ensurePersonExists(
    email: string,
    // biome-ignore lint/suspicious/noExplicitAny: Legacy method, TODO: add proper types
    personData: any,
    existingPersonPageId?: string
  ): Promise<{ success: boolean; pageId?: string; error?: string }> {
    try {
      const existingPersonId = await this.findPersonByEmail(email)
      if (existingPersonId) {
        return { success: true, pageId: existingPersonId }
      }

      const createResult = await this.createPersonRecord(personData)
      if (!createResult.success || !createResult.pageId) {
        return {
          success: false,
          error: createResult.error || 'Person creation failed',
        }
      }

      return { success: true, pageId: createResult.pageId }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * PersonHistoryUpdate（一時的な実装）
   */
  async updatePersonHistoryInNotionPage(
    personPageId: string,
    // biome-ignore lint/suspicious/noExplicitAny: Legacy method, TODO: add proper types
    historyEntry: any
    // biome-ignore lint/suspicious/noExplicitAny: Legacy method, TODO: add proper types
  ): Promise<any> {
    // 一時的にシンプルな成功を返す
    return {
      success: true,
      service: 'notion',
    }
  }

  /**
   * ContactデータベースにContact IDプロパティを追加
   */
  async updateRawContactDatabaseSchema(): Promise<{
    success: boolean
    error?: string
    alreadyExists?: boolean
  }> {
    if (!this.client) {
      return {
        success: false,
        error: 'Notion API token not configured',
      }
    }

    const contactDatabaseId = await this.getRawContactDatabaseId()
    if (!contactDatabaseId) {
      return {
        success: false,
        error: 'Contact database not found',
      }
    }

    try {
      // 現在のデータベーススキーマを取得
      const database = await this.client.databases.retrieve({
        database_id: contactDatabaseId,
      })

      // contact_idプロパティが既に存在するかチェック
      // biome-ignore lint/suspicious/noExplicitAny: Temporary fix for Notion SDK type issues
      if ('properties' in database && (database as any).properties.contact_id) {
        return {
          success: true,
          alreadyExists: true,
        }
      }

      // contact_idプロパティを追加
      await this.client.databases.update({
        database_id: contactDatabaseId,
        properties: {
          contact_id: {
            rich_text: {},
          },
        },
        // biome-ignore lint/suspicious/noExplicitAny: Temporary fix for Notion SDK type issues
      } as any)

      return {
        success: true,
        alreadyExists: false,
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error('Database schema update failed:', errorMessage)
      return {
        success: false,
        error: `Database schema update failed: ${errorMessage}`,
      }
    }
  }
}
