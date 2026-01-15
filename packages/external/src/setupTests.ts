/**
 * テスト実行環境のセットアップファイル
 */
import { beforeAll } from 'vitest'

// テスト実行前に環境変数を設定
beforeAll(() => {
  // 環境設定のデバッグ情報を表示
  console.log('ℹ️ テスト環境設定情報:')

  // E2Eテストを実行するかどうかのフラグ
  if (!process.env.ENABLE_REAL_API_TESTS) {
    console.log('  ⚠️ ENABLE_REAL_API_TESTSが設定されていません。デフォルトでtrueを設定します。')
    process.env.ENABLE_REAL_API_TESTS = 'true'
  }

  console.log(`  🔄 ENABLE_REAL_API_TESTS: ${process.env.ENABLE_REAL_API_TESTS}`)

  // Notionの設定を確認
  if (!process.env.NOTION_TEST_API_TOKEN) {
    console.log('  ⚠️ NOTION_TEST_API_TOKENが設定されていません')
  } else {
    console.log(
      `  ✅ NOTION_TEST_API_TOKEN: ${process.env.NOTION_TEST_API_TOKEN.substring(0, 10)}...`
    )
  }

  if (!process.env.NOTION_TEST_PARENT_PAGE_ID && !process.env.NOTION_PARENT_PAGE_ID) {
    console.log('  ⚠️ NOTION_TEST_PARENT_PAGE_IDおよびNOTION_PARENT_PAGE_IDが設定されていません')
    console.log('  テストスキップまたはモックモードで実行します')
  } else {
    const pageId = process.env.NOTION_TEST_PARENT_PAGE_ID || process.env.NOTION_PARENT_PAGE_ID
    console.log(`  ✅ NOTION_PARENT_PAGE_ID: ${pageId?.substring(0, 10)}...`)
  }

  // Slackの設定を確認
  if (!process.env.SLACK_TEST_WEBHOOK_URL && !process.env.SLACK_WEBHOOK_URL) {
    console.log('  ⚠️ SLACK_TEST_WEBHOOK_URLおよびSLACK_WEBHOOK_URLが設定されていません')
  } else {
    const webhookUrl = process.env.SLACK_TEST_WEBHOOK_URL || process.env.SLACK_WEBHOOK_URL
    console.log(`  ✅ SLACK_WEBHOOK_URL: ${webhookUrl?.substring(0, 20)}...`)
  }

  // 設定情報の表示
  if (process.env.ENABLE_REAL_API_TESTS === 'true') {
    console.log('✅ 実際のAPI呼び出しを伴うテストを実行します')
  } else {
    console.log('ℹ️ モックモードでテストを実行します')
  }
})
