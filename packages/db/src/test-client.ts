import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

import * as schema from './schema'

let testDbInstance: PostgresJsDatabase<typeof schema> | null = null

export function createTestDb(): PostgresJsDatabase<typeof schema> {
  if (testDbInstance) {
    return testDbInstance
  }

  if (!process.env.POSTGRES_URL) {
    throw new Error('Missing POSTGRES_URL for test client')
  }

  // 通常のPostgreSQLドライバーを使用（ローカル接続対応）
  const client = postgres(process.env.POSTGRES_URL)

  testDbInstance = drizzle({
    client,
    schema,
    casing: 'snake_case',
  })

  return testDbInstance
}

export const testDb = createTestDb()

export type TestDatabase = PostgresJsDatabase<typeof schema>
