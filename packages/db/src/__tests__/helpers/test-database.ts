import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

import * as schema from '../../schema'

/**
 * テスト用データベースの型定義
 */
export type TestDbClient = PostgresJsDatabase<typeof schema>

/**
 * Postgresを使ったテスト用データベースセットアップ
 * 各テストファイルで独立したテスト用PostgreSQLデータベースに接続
 */
export async function createTestDatabase(): Promise<TestDbClient> {
  // integration.tsで設定されたPOSTGRES_URLを使用
  const url = process.env.POSTGRES_URL || process.env.TEST_POSTGRES_URL
  if (!url) {
    throw new Error('POSTGRES_URL or TEST_POSTGRES_URL is not set')
  }

  // テスト用Postgresクライアント作成
  const client = postgres(url, { max: 1 })

  // Drizzle ORMのクライアントを作成
  const db = drizzle(client, { schema })

  // integration.tsで既にスキーマがプッシュされているため、ここでは再プッシュしない
  return db
}

/**
 * テストデータベースのクリーンアップ
 */
export async function cleanupTestDatabase(client: TestDbClient): Promise<void> {
  try {
    // テスト後に全テーブルのデータをクリア
    await client.execute(sql`TRUNCATE TABLE "contact", "rate_limit", "person" CASCADE`)
  } catch (error) {
    // テーブルが存在しない場合は無視（スキーマプッシュ前のクリーンアップで発生する可能性がある）
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorCause = error && typeof error === 'object' && 'cause' in error ? error.cause : null
    const causeCoded =
      errorCause && typeof errorCause === 'object' && 'code' in errorCause ? errorCause.code : null

    if (
      errorMessage.includes('does not exist') ||
      errorMessage.includes('relation') ||
      causeCoded === '42P01'
    ) {
      console.log('Tables do not exist yet, skipping cleanup')
      return
    }
    throw error
  }
}
