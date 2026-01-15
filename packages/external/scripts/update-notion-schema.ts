#!/usr/bin/env tsx
/**
 * NotionのContactデータベースにcontact_idプロパティを追加するスクリプト
 */
import { NotionService } from '../src/notion/notion-service'

async function main() {
  console.log('🚀 Notionデータベーススキーマ更新を開始します...')
  console.log()

  const notionService = new NotionService()

  if (!notionService.isConfigured()) {
    console.error('❌ Notion APIが設定されていません')
    console.error('以下の環境変数を設定してください:')
    console.error('- NOTION_API_TOKEN')
    console.error('- NOTION_PARENT_PAGE_ID または NOTION_DATABASE_ID')
    process.exit(1)
  }

  console.log('✅ Notion API設定を確認しました')
  console.log()

  try {
    console.log('🔍 Contactデータベースのスキーマを更新中...')
    const result = await notionService.updateContactDatabaseSchema()

    if (result.success) {
      if (result.alreadyExists) {
        console.log('✅ contact_idプロパティは既に存在していました')
        console.log('📊 データベーススキーマは最新です')
      } else {
        console.log('✅ contact_idプロパティを正常に追加しました')
        console.log('🎉 データベーススキーマの更新が完了しました')
      }
    } else {
      console.error('❌ スキーマ更新に失敗しました:', result.error)
      process.exit(1)
    }
  } catch (error) {
    console.error('❌ 予期しないエラーが発生しました:', error)
    process.exit(1)
  }

  console.log()
  console.log('🏁 スキーマ更新スクリプトが完了しました')
}

// スクリプトを直接実行
main().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})
