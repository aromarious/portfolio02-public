import { Client } from '@notionhq/client'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import type { RawContactData } from '../../shared/types'
import { NotionClient } from '../../notion/notion-client'
import {
  getNotionExternalConfig,
  isNotionExternalConfigured,
  isRealApiTestEnabled,
} from './external-config'

/**
 * 親ページからContactデータベースIDを取得
 */
async function getRawContactDatabaseId(
  client: Client,
  parentPageId?: string
): Promise<string | null> {
  if (!parentPageId) return null

  try {
    // 親ページの子ブロックを取得
    const response = await client.blocks.children.list({
      block_id: parentPageId,
    })

    // 「Contact」という名前のデータベースを探す
    for (const block of response.results) {
      if (
        'type' in block &&
        block.type === 'child_database' &&
        'child_database' in block &&
        block.child_database.title === 'Contact'
      ) {
        return block.id
      }
    }

    return null
  } catch (error) {
    console.error('Failed to fetch Contact database ID:', error)
    return null
  }
}

// 実際のAPI呼び出しが無効な場合はテストをスキップ
const describeOrSkip =
  isRealApiTestEnabled() && isNotionExternalConfigured() ? describe : describe.skip

describeOrSkip('NotionService External Integration Tests', () => {
  let notionService: NotionClient
  let client: Client
  const createdPageIds: string[] = []

  const testRawContactData: RawContactData = {
    id: 'external-test-contact-id',
    name: 'External統合テストユーザー',
    email: 'external-test@example.com',
    subject: '技術相談・アドバイス',
    message: 'これは外部サービス統合テスト用の問い合わせメッセージです。',
    createdAt: new Date(),
  }

  beforeAll(async () => {
    if (!isRealApiTestEnabled() || !isNotionExternalConfigured()) {
      return
    }

    const config = getNotionExternalConfig()
    notionService = new NotionClient(config.apiToken, config.parentPageId)
    client = new Client({ auth: config.apiToken })

    // デバッグ: 使用されている環境変数を出力
    console.log('📋 使用されている環境変数:')
    console.log('  ENABLE_REAL_API_TESTS:', process.env.ENABLE_REAL_API_TESTS)
    console.log(
      '  NOTION_TEST_API_TOKEN:',
      process.env.NOTION_TEST_API_TOKEN
        ? `${process.env.NOTION_TEST_API_TOKEN.substring(0, 20)}...`
        : 'undefined'
    )
    console.log(
      '  NOTION_TEST_PARENT_PAGE_ID:',
      process.env.NOTION_TEST_PARENT_PAGE_ID
        ? `${process.env.NOTION_TEST_PARENT_PAGE_ID.substring(0, 20)}...`
        : 'undefined'
    )
    console.log('  設定取得結果:')
    console.log(
      '    apiToken:',
      config.apiToken ? `${config.apiToken.substring(0, 20)}...` : 'undefined'
    )
    console.log(
      '    parentPageId:',
      config.parentPageId ? `${config.parentPageId.substring(0, 20)}...` : 'undefined'
    )

    // テスト用データベースの存在確認
    try {
      const parentPageId = config.parentPageId
      if (!parentPageId) {
        throw new Error('Parent page ID is not configured')
      }
      await client.pages.retrieve({ page_id: parentPageId })
      console.log('✅ Notion テスト親ページへの接続が確認されました')
    } catch (error) {
      throw new Error(`Notion テストデータベースに接続できませんでした: ${error}`)
    }
  })

  afterAll(async () => {
    if (!isRealApiTestEnabled() || !isNotionExternalConfigured()) {
      return
    }

    // テスト中に作成されたページをクリーンアップ
    console.log(`🧹 ${createdPageIds.length}個のテストページをクリーンアップ中...`)

    for (const pageId of createdPageIds) {
      try {
        await client.pages.update({
          page_id: pageId,
          archived: true,
        })
        console.log(`🗑️ ページ ${pageId} をアーカイブしました`)
      } catch (error) {
        console.warn(`⚠️ ページ ${pageId} のアーカイブに失敗: ${error}`)
      }
    }
  })

  beforeEach(() => {
    // テストデータの日時を毎回更新
    testRawContactData.createdAt = new Date()
    testRawContactData.id = `external-test-${Date.now()}`
  })

  it('実際のNotionデータベースにページを作成できる', async () => {
    const result = await notionService.createContactRecord(testRawContactData)

    expect(result.success).toBe(true)
    expect(result.service).toBe('notion')

    // 作成されたページを検索して確認
    const config = getNotionExternalConfig()
    const parentPageId = config.parentPageId
    if (!parentPageId) {
      throw new Error('Parent page ID is not configured')
    }

    // 親ページからContactデータベースIDを取得
    const contactDbId = await getRawContactDatabaseId(client, parentPageId)
    if (!contactDbId) {
      throw new Error('Contact database not found in parent page')
    }

    // biome-ignore lint/suspicious/noExplicitAny: Temporary fix for Notion SDK type issues
    const response = await (client.databases as any).query({
      database_id: contactDbId,
      filter: {
        property: 'email',
        email: {
          equals: testRawContactData.email,
        },
      },
      sorts: [
        {
          timestamp: 'created_time',
          direction: 'descending',
        },
      ],
      page_size: 1,
    })

    expect(response.results).toHaveLength(1)
    const page = response.results[0] as {
      id: string
      properties: Record<string, unknown>
    }

    // クリーンアップ用にページIDを保存
    createdPageIds.push(page.id)

    // ページの内容を検証
    const properties = page.properties as Record<
      string,
      {
        title?: Array<{ text: { content: string } }>
        email?: string
        rich_text?: Array<{ text: { content: string } }>
        select?: { name: string }
      }
    >

    if (properties?.title?.title?.[0]?.text?.content) {
      expect(String(properties.title.title[0].text.content)).toContain(testRawContactData.name)
    }
    expect(properties.email?.email).toBe(testRawContactData.email)
    if (properties.message?.rich_text?.[0]?.text?.content) {
      expect(String(properties.message.rich_text[0].text.content)).toContain(
        testRawContactData.message
      )
    }
    expect(properties.status?.select?.name).toBe('New')

    console.log(`✅ Notionページを作成しました: ${page.id}`)
  })

  it('作成したページのステータスを更新できる', async () => {
    // まずページを作成
    const createResult = await notionService.createContactRecord(testRawContactData)
    expect(createResult.success).toBe(true)

    // 作成されたページを検索
    const config = getNotionExternalConfig()
    const parentPageId = config.parentPageId
    if (!parentPageId) {
      throw new Error('Parent page ID is not configured')
    }

    // 親ページからContactデータベースIDを取得
    const contactDbId = await getRawContactDatabaseId(client, parentPageId)
    if (!contactDbId) {
      throw new Error('Contact database not found in parent page')
    }
    // biome-ignore lint/suspicious/noExplicitAny: Temporary fix for Notion SDK type issues
    const queryResponse = await (client.databases as any).query({
      database_id: contactDbId,
      filter: {
        property: 'email',
        email: {
          equals: testRawContactData.email,
        },
      },
      sorts: [
        {
          timestamp: 'created_time',
          direction: 'descending',
        },
      ],
      page_size: 1,
    })

    expect(queryResponse.results).toHaveLength(1)
    const page = queryResponse.results[0] as { id: string }
    createdPageIds.push(page.id)

    // ステータスを「進行中」に更新
    await client.pages.update({
      page_id: page.id,
      properties: {
        status: {
          select: {
            name: 'in-progress',
          },
        },
      },
    })

    // 更新されたページを取得して確認
    const updatedPage = await client.pages.retrieve({
      page_id: page.id,
    })

    if ('properties' in updatedPage) {
      const properties = updatedPage.properties as Record<string, { select?: { name: string } }>
      expect(properties.status?.select?.name).toBe('in-progress')
    } else {
      throw new Error('Updated page does not have properties')
    }
    console.log(`✅ ページステータスを更新しました: ${page.id}`)
  })

  it('複数のページを作成して検索できる', async () => {
    const testContacts: RawContactData[] = [
      {
        ...testRawContactData,
        id: `batch-test-1-${Date.now()}`,
        name: 'バッチテストユーザー1',
        email: 'batch-test-1@example.com',
        subject: 'バッチテスト問い合わせ1',
        message: 'バッチテスト1のメッセージ',
      },
      {
        ...testRawContactData,
        id: `batch-test-2-${Date.now()}`,
        name: 'バッチテストユーザー2',
        email: 'batch-test-2@example.com',
        subject: 'バッチテスト問い合わせ2',
        message: 'バッチテスト2のメッセージ',
      },
    ]

    // 複数ページを作成
    const results = await Promise.all(
      testContacts.map((contact) => notionService.createContactRecord(contact))
    )

    expect(results.every((result) => result.success)).toBe(true)

    // 作成されたページを検索
    const config = getNotionExternalConfig()
    const parentPageId = config.parentPageId
    if (!parentPageId) {
      throw new Error('Parent page ID is not configured')
    }

    // 親ページからContactデータベースIDを取得
    const contactDbId = await getRawContactDatabaseId(client, parentPageId)
    if (!contactDbId) {
      throw new Error('Contact database not found in parent page')
    }
    // biome-ignore lint/suspicious/noExplicitAny: Temporary fix for Notion SDK type issues
    const response = await (client.databases as any).query({
      database_id: contactDbId,
      filter: {
        or: [
          {
            property: 'email',
            email: {
              equals: 'batch-test-1@example.com',
            },
          },
          {
            property: 'email',
            email: {
              equals: 'batch-test-2@example.com',
            },
          },
        ],
      },
    })

    // 検索結果が少なくとも2件あることを確認（既存のデータがある可能性もあるため）
    expect(response.results.length).toBeGreaterThanOrEqual(2)

    // クリーンアップ用にページIDを保存
    for (const pageResult of response.results) {
      const page = pageResult as { id: string }
      createdPageIds.push(page.id)
    }

    console.log(`✅ バッチで${testContacts.length}個のページを作成しました`)
  }, 10000)

  it('無効な親ページIDでエラーハンドリングが機能する', async () => {
    const invalidService = new NotionClient(getNotionExternalConfig().apiToken, 'invalid-parent-id')

    const result = await invalidService.createContactRecord(testRawContactData)

    expect(result.success).toBe(false)
    expect(result.error).toContain('Contact database not found')

    console.log('✅ 無効な親ページIDでのエラーハンドリングを確認しました')
  })
})
