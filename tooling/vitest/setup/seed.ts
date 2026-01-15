import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterAll, beforeAll } from 'vitest'

import { loadTestEnv } from './env-loader.js'

const dirname =
  typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(dirname, '../../../')

// グローバルなテストDBの型宣言
declare global {
  // eslint-disable-next-line no-var, @typescript-eslint/no-explicit-any
  // biome-ignore lint/suspicious/noExplicitAny: globalThis.testDb needs any type for flexibility
  var testDb: any
}

/**
 * Seed用データベースセットアップ
 * 開発用データベース（ポート5432）に接続
 */
beforeAll(async () => {
  console.log('🌱 Seedデータベースセットアップを開始...')

  // Load seed test environment variables first
  loadTestEnv('.envrc.test.seed')

  // 開発用データベースクライアントを動的import
  const packageDbPath = path.resolve(rootDir, 'packages/db/src/client.js')
  const { db } = await import(packageDbPath)
  globalThis.testDb = db

  console.log('✅ Seedデータベースセットアップ完了')
})

afterAll(async () => {
  console.log('🌱 Seedデータ作成完了 - データは開発用データベースに保存されました')

  // seedの目的はデータを残すことなので、クリーンアップは行わない
  // データベース接続のみ適切に終了
  if (globalThis.testDb) {
    console.log('✅ データベース接続を終了')
  }
})
