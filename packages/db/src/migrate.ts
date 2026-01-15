import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'

import { getEnvironment, isPreviewEnvironment } from './env'

async function runMigrations() {
  const connectionString = process.env.POSTGRES_URL

  if (!connectionString) {
    throw new Error('POSTGRES_URL is required')
  }

  // 環境に応じて search_path を設定（preview or public）
  // client.ts と同じロジックを使用
  const targetSchema = isPreviewEnvironment() ? 'preview' : 'public'

  console.log(`Running migrations for ${getEnvironment()} environment...`)
  console.log(`Target Schema (search_path): ${targetSchema}`)

  const sql = postgres(connectionString, {
    max: 1,
    onnotice: () => {}, // suppress notices
    connection: {
      search_path: targetSchema,
    },
  })

  // Drizzleインスタンス作成
  // schemaはマイグレーション実行には不要だが、型定義のために必要なら入れる
  // migrate関数は内部的にdrizzle_migrationsテーブルをチェックする
  const db = drizzle(sql)

  try {
    // マイグレーション実行
    // migrationsSchemaを指定しない場合、デフォルトで 'drizzle' スキーマが使用される
    // 現在の構成では各スキーマ（preview/public）直下に管理テーブルを置いているため明示的に指定する
    await migrate(db, {
      migrationsFolder: 'drizzle',
      migrationsSchema: targetSchema,
    })

    console.log('Migrations completed successfully')
  } catch (error) {
    console.error('Migration failed:', error)
    process.exit(1)
  } finally {
    await sql.end()
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runMigrations().catch((err) => {
    console.error(err)
    process.exit(1)
  })
}
