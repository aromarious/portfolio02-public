import { exec } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import type { Browser, BrowserContext, Page } from 'playwright'
import { chromium } from 'playwright'
import { afterAll, afterEach, beforeAll, beforeEach } from 'vitest'

import { loadTestEnv } from './env-loader.js'

// グローバルなテストDBとブラウザの型宣言
declare global {
  // eslint-disable-next-line no-var, @typescript-eslint/no-explicit-any
  // biome-ignore lint/suspicious/noExplicitAny: globalThis.testDb needs any type for flexibility
  var testDb: any
  // eslint-disable-next-line no-var
  var testBrowser: Browser
  // eslint-disable-next-line no-var
  var testContext: BrowserContext
  // eslint-disable-next-line no-var
  var testPage: Page
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

// E2Eテスト用のデータベースURL設定（database.tsと同じロジック）
function setupTestDatabaseUrl() {
  if (process.env.TEST_POSTGRES_URL) {
    process.env.POSTGRES_URL = process.env.TEST_POSTGRES_URL
    console.log('Using TEST_POSTGRES_URL:', process.env.POSTGRES_URL)
  } else {
    // CI環境の場合はデフォルトポートを使用（通常は5432）
    const testDbPort = isCI() ? '5432' : '5433'
    const dbUser = 'postgres'
    const dbPassword = 'password'
    const dbName = 'postgres'
    process.env.POSTGRES_URL = `postgresql://${dbUser}:${dbPassword}@localhost:${testDbPort}/${dbName}`
    console.log('Using constructed test database URL:', process.env.POSTGRES_URL)
  }
}

async function pushDatabaseSchema() {
  const testPostgresUrl = process.env.POSTGRES_URL
  if (!testPostgresUrl) {
    throw new Error('POSTGRES_URL is not set for test database')
  }

  console.log('Recreating database schema for E2E test database...')

  try {
    // pushを使用してスキーマを作成
    console.log('Creating database schema...')
    await execAsync('pnpm -F @aromarious/db push', {
      cwd: rootDir,
      env: {
        ...process.env,
        POSTGRES_URL: testPostgresUrl,
      },
    })
    console.log('Database schema created successfully')

    // 初回セットアップでは既存データクリーンアップをスキップ
    // （テーブルが作成されたばかりなので空）
    console.log('Database schema created and ready for E2E tests')
  } catch (error) {
    console.error('Failed to recreate database schema:', error)
    throw error
  }
}

async function startTestDatabase() {
  try {
    console.log('Starting test database for E2E tests...')

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
          console.log('Test database is ready for E2E tests')
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

async function startBrowser() {
  console.log('Starting Playwright browser for E2E tests...')

  // ブラウザを起動
  globalThis.testBrowser = await chromium.launch({
    headless: true, // ローカル開発では false に変更可能
  })

  // ブラウザコンテキストを作成
  globalThis.testContext = await globalThis.testBrowser.newContext({
    viewport: { width: 1280, height: 720 },
    // 必要に応じて他のオプションを追加
  })

  // ページを作成
  globalThis.testPage = await globalThis.testContext.newPage()

  console.log('Playwright browser started successfully')
}

async function stopBrowser() {
  try {
    if (globalThis.testPage) {
      await globalThis.testPage.close()
    }
    if (globalThis.testContext) {
      await globalThis.testContext.close()
    }
    if (globalThis.testBrowser) {
      await globalThis.testBrowser.close()
    }
    console.log('Playwright browser stopped successfully')
  } catch (error) {
    console.error('Failed to stop browser:', error)
  }
}

// グローバルなセットアップ状態を管理（プロセス間で共有される）
const SETUP_STATE_KEY = 'E2E_TEST_SETUP_DONE'

beforeAll(async () => {
  // Load E2E test environment variables first
  loadTestEnv('.envrc.test.e2e')

  // 既にセットアップ済みの場合はスキップ（環境変数でチェック）
  if (process.env[SETUP_STATE_KEY] && globalThis.testDb && globalThis.testBrowser) {
    console.log('E2E test environment already set up, skipping...')
    return
  }

  console.log('Setting up E2E tests...')

  // データベースのセットアップ
  await startTestDatabase()

  // テストデータベースクライアントを初期化
  const packageDbPath = `file://${path.resolve(rootDir, 'packages/db/src/__tests__/helpers/test-database.ts')}`
  console.log('Importing test database module from:', packageDbPath)
  const { createTestDatabase } = await import(packageDbPath)
  globalThis.testDb = await createTestDatabase()

  // ブラウザのセットアップ
  await startBrowser()

  // セットアップ完了をマーク
  process.env[SETUP_STATE_KEY] = 'true'
}, 90000) // E2E環境起動に時間がかかる可能性があるため長めに設定

afterAll(async () => {
  // セットアップが完了している場合のみクリーンアップを実行
  if (process.env[SETUP_STATE_KEY]) {
    // ブラウザのクリーンアップ
    await stopBrowser()

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
}, 60000)

beforeEach(async () => {
  // 各テスト前のデータベースクリーンアップ
  // TODO: 接続問題が解決したら有効化
  // if (globalThis.testDb) {
  //   const { cleanupTestDatabase } = await import(
  //     path.resolve(rootDir, 'packages/db/src/__tests__/helpers/test-database.js')
  //   )
  //   await cleanupTestDatabase(globalThis.testDb)
  // }

  // 各テスト前のページリセット（新しいページを作成）
  if (globalThis.testContext) {
    if (globalThis.testPage) {
      await globalThis.testPage.close()
    }
    globalThis.testPage = await globalThis.testContext.newPage()
  }
})

afterEach(async () => {
  // 各テスト後のクリーンアップ
  // 必要に応じてスクリーンショット撮影やログ収集を実装
  if (globalThis.testPage) {
    // テスト失敗時のスクリーンショット保存などを将来実装可能
  }
})
