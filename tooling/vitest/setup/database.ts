import { exec } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import { afterAll, afterEach, beforeAll, beforeEach } from 'vitest'

import { loadTestEnv } from './env-loader.js'

// グローバルなテストDBの型宣言
declare global {
  // eslint-disable-next-line no-var, @typescript-eslint/no-explicit-any
  // biome-ignore lint/suspicious/noExplicitAny: globalThis.testDb needs any type for flexibility
  var testDb: any
}

const dirname =
  typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(dirname, '../../../')

const execAsync = promisify(exec)

/**
 * CI環境かどうかを判定
 * GitHub Actions、CircleCI、Jenkins等の一般的なCI環境変数をチェック
 */
function isCI(): boolean {
  return Boolean(
    process.env.CI || // GitHub Actions, CircleCI, Travis CI等
    process.env.GITHUB_ACTIONS ||
    process.env.CIRCLECI ||
    process.env.JENKINS_URL
  )
}

// 統合テスト用のデータベースURL設定
function setupTestDatabaseUrl() {
  if (process.env.TEST_POSTGRES_URL) {
    process.env.POSTGRES_URL = process.env.TEST_POSTGRES_URL
    console.log('Using TEST_POSTGRES_URL:', process.env.POSTGRES_URL)
  } else {
    // CI環境の場合はデフォルトポートを使用（通常は5432）
    const testDbPort = isCI() ? '5432' : process.env.TEST_DB_PORT || '5433'
    const dbUser = process.env.DB_USER || 'postgres'
    const dbPassword = process.env.DB_PASSWORD || 'password'
    const dbName = process.env.DB_NAME || 'postgres'
    process.env.POSTGRES_URL = `postgresql://${dbUser}:${dbPassword}@localhost:${testDbPort}/${dbName}`
    console.log('Using constructed test database URL:', process.env.POSTGRES_URL)
  }
}

async function pushDatabaseSchema() {
  const testPostgresUrl = process.env.POSTGRES_URL
  if (!testPostgresUrl) {
    throw new Error('POSTGRES_URL is not set for test database')
  }

  console.log('Recreating database schema for test database...')

  try {
    // まず既存のテーブルを全て削除する
    console.log('Dropping existing tables...')

    // test-database.tsからクリーンアップ関数をインポートして使用
    const packageDbPath = path.resolve(
      rootDir,
      'packages/db/src/__tests__/helpers/test-database.ts'
    )
    const { createTestDatabase, cleanupTestDatabase } = await import(packageDbPath)

    // テストDBクライアントを作成
    const testDb = await createTestDatabase()

    // 全テーブルのクリーンアップ
    await cleanupTestDatabase(testDb)
    console.log('All tables cleaned successfully')

    // DB接続を閉じる
    if (testDb.client && typeof testDb.client.end === 'function') {
      await testDb.client.end()
    }

    // pushを使用してスキーマを作成（クリーンなDBでは対話モードなし）
    await execAsync('pnpm -F @aromarious/db push', {
      cwd: rootDir,
      env: {
        ...process.env,
        POSTGRES_URL: testPostgresUrl,
      },
    })
    console.log('Database schema pushed successfully')
  } catch (error) {
    console.error('Failed to recreate database schema:', error)
    throw error
  }
}

async function startTestDatabase() {
  try {
    console.log('Starting test database...')

    // 環境変数をまず設定
    setupTestDatabaseUrl()

    // CI環境でない場合のみDockerを使用
    if (!isCI()) {
      // Docker Composeでテスト用データベースを起動
      // 環境変数を明示的に渡す
      await execAsync('pnpm docker:test:up', {
        cwd: rootDir,
        env: { ...process.env },
      })

      // データベースが起動するまで待機
      let retries = 30
      while (retries > 0) {
        try {
          const testDbPort = process.env.DB_PORT || '5433'
          const dbUser = process.env.DB_USER || 'postgres'
          const dbName = process.env.DB_NAME || 'postgres'
          await execAsync(`pg_isready -h localhost -p ${testDbPort} -U ${dbUser} -d ${dbName}`)
          console.log('Test database is ready')
          break
        } catch {
          retries--
          if (retries === 0) throw new Error('Test database failed to start')
          await new Promise((resolve) => setTimeout(resolve, 1000))
        }
      }
    } else {
      console.log('Running in CI environment, skipping Docker setup')
    }

    // スキーマを適用
    await pushDatabaseSchema()
  } catch (error) {
    console.error('Failed to start test database:', error)
    throw error
  }
}

async function stopTestDatabase() {
  // CI環境でない場合のみDockerを停止
  if (!isCI()) {
    try {
      // コンテナを停止のみ（削除しない）
      await execAsync('pnpm docker:test:stop', {
        cwd: rootDir,
        env: { ...process.env },
      })
      console.log('Test database stopped (containers preserved for data inspection)')
    } catch (error) {
      console.error('Failed to stop test database:', error)
    }
  }
}

// グローバルなセットアップ状態を管理（プロセス間で共有される）
const SETUP_STATE_KEY = 'INTEGRATION_TEST_SETUP_DONE'

beforeAll(async () => {
  // Load integration test environment variables first
  loadTestEnv('.envrc.test.database')

  // 既にセットアップ済みの場合はスキップ（環境変数でチェック）
  if (process.env[SETUP_STATE_KEY] && globalThis.testDb) {
    console.log('Integration test database already set up, skipping...')
    return
  }

  console.log('Setting up integration tests...')
  await startTestDatabase()

  // テストデータベースクライアントを初期化
  // 絶対パスを使用してモジュールを動的にインポート
  const packageDbPath = `file://${path.resolve(rootDir, 'packages/db/src/__tests__/helpers/test-database.ts')}`
  console.log('Importing test database module from:', packageDbPath)
  const { createTestDatabase } = await import(packageDbPath)
  globalThis.testDb = await createTestDatabase()

  // セットアップ完了をマーク
  process.env[SETUP_STATE_KEY] = 'true'
}, 60000)

afterAll(async () => {
  // セットアップが完了している場合のみクリーンアップを実行
  if (process.env[SETUP_STATE_KEY]) {
    // データベースクライアントのクリーンアップ
    if (globalThis.testDb) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      // biome-ignore lint/suspicious/noExplicitAny: globalThis.testDb needs any type for client access
      const client = globalThis.testDb as any
      if (client.client && typeof client.client.end === 'function') {
        await client.client.end()
      }
    }

    await stopTestDatabase()
    // セットアップ状態をリセット
    delete process.env[SETUP_STATE_KEY]
  }
}, 30000)

beforeEach(async () => {
  // 各テスト前のデータベースクリーンアップ
  if (globalThis.testDb) {
    const { cleanupTestDatabase } = await import(
      path.resolve(rootDir, 'packages/db/src/__tests__/helpers/test-database.js')
    )
    await cleanupTestDatabase(globalThis.testDb)
  }
})

afterEach(async () => {
  // 各テスト後のクリーンアップ
  // 必要に応じてロールバックなどを実装
})
