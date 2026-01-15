import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

import { isPreviewEnvironment } from './env'
import * as schema from './schema'

function createDbClient() {
  const postgresUrl = process.env.POSTGRES_URL

  if (!postgresUrl) {
    throw new Error('Missing POSTGRES_URL environment variable')
  }

  // 環境に応じて search_path を設定（preview or public）
  const targetSchema = isPreviewEnvironment() ? 'preview' : 'public'

  const client = postgres(postgresUrl, {
    // 接続時に search_path を設定
    onnotice: () => {}, // suppress notices
    connection: {
      search_path: targetSchema,
    },
  })

  return drizzle({
    client,
    schema,
    casing: 'snake_case',
  })
}

export const db = createDbClient()

export type Database = PostgresJsDatabase<typeof schema>
export type DbClient = Database
