import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterAll, afterEach, beforeAll, beforeEach } from 'vitest'

import { loadTestEnv } from './env-loader.js'

const dirname =
  typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(dirname, '../../../')

/**
 * キーチェーンからテスト用認証情報を読み込む
 */
function loadFromKeychain() {
  console.log('🔑 キーチェーンからテスト用認証情報を読み込み中...')

  const keychainEntries = [
    { key: 'NOTION_TEST_API_TOKEN', service: 'NOTION_TEST_API_TOKEN' },
    { key: 'NOTION_TEST_PARENT_PAGE_ID', service: 'NOTION_TEST_PARENT_PAGE_ID' },
    { key: 'SLACK_TEST_WEBHOOK_URL', service: 'SLACK_TEST_WEBHOOK_URL' },
  ]

  let loaded = false

  for (const { key, service } of keychainEntries) {
    try {
      if (!process.env[key]) {
        const value = execSync(`security find-generic-password -a portfolio02 -s "${service}" -w`, {
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'ignore'], // エラーを無視
        }).trim()

        if (value) {
          process.env[key] = value
          console.log(`   ✅ ${key}: キーチェーンから読み込み`)
          loaded = true
        }
      } else {
        console.log(`   ↪️  ${key}: 既存の環境変数を使用`)
      }
    } catch (error) {
      console.log(`   ❌ ${key}: キーチェーンで見つかりません`)
    }
  }

  if (loaded) {
    // キーチェーンから読み込めた場合は実際のAPIテストを有効化
    if (!process.env.ENABLE_REAL_API_TESTS) {
      process.env.ENABLE_REAL_API_TESTS = 'true'
      console.log('   🔓 ENABLE_REAL_API_TESTS=true に自動設定')
    }
  }

  return loaded
}

/**
 * external.config.local.jsonを読み込む
 */
function loadExternalConfigFile() {
  const configFiles = [
    path.join(rootDir, 'packages/external/external.config.local.json'),
    path.join(rootDir, 'external.config.local.json'),
  ]

  for (const configPath of configFiles) {
    if (fs.existsSync(configPath)) {
      try {
        console.log(`📋 External設定ファイルを読み込み: ${path.relative(rootDir, configPath)}`)
        const configContent = fs.readFileSync(configPath, 'utf-8')
        const config = JSON.parse(configContent)

        // 設定ファイルの値を環境変数に変換
        if (config.enableRealApiTests !== undefined) {
          process.env.ENABLE_REAL_API_TESTS = config.enableRealApiTests.toString()
        }

        // Notion設定
        if (config.notion?.apiToken) {
          process.env.NOTION_TEST_API_TOKEN = config.notion.apiToken
        }
        if (config.notion?.parentPageId) {
          process.env.NOTION_TEST_PARENT_PAGE_ID = config.notion.parentPageId
        }

        // Slack設定
        if (config.slack?.webhookUrl) {
          process.env.SLACK_TEST_WEBHOOK_URL = config.slack.webhookUrl
        }

        console.log('✅ External設定ファイルから設定を読み込みました')
        return true
      } catch (error) {
        console.warn(`⚠️ External設定ファイルの読み込みに失敗: ${error}`)
      }
    }
  }
  return false
}

// External統合テスト用の環境変数設定
function setupExternalEnvironment() {
  // まずキーチェーンから読み込む
  const keychainLoaded = loadFromKeychain()

  // キーチェーンから読み込めなかった場合はexternal.config.local.jsonファイルを読み込む
  const configLoaded = !keychainLoaded ? loadExternalConfigFile() : false

  // 設定ファイルがない場合は従来の.envファイルを読み込み
  if (!keychainLoaded && !configLoaded) {
    // .env.external.local ファイルから環境変数を読み込み
    const envFiles = [
      path.join(rootDir, '.env.external.local'),
      path.join(rootDir, '.env.external'),
      path.join(rootDir, 'packages/external/.env.external.local'),
      path.join(rootDir, 'packages/external/.env.external'),
    ]

    for (const envFile of envFiles) {
      if (fs.existsSync(envFile)) {
        console.log(`📄 External環境変数ファイルを読み込み: ${path.relative(rootDir, envFile)}`)
        const envContent = fs.readFileSync(envFile, 'utf-8')
        const loadedVars: string[] = []

        for (const line of envContent.split('\n')) {
          const trimmed = line.trim()
          if (trimmed && !trimmed.startsWith('#')) {
            const [key, ...valueParts] = trimmed.split('=')
            if (key && valueParts.length > 0) {
              const value = valueParts.join('=')
              // 既存の環境変数を上書きしない
              if (!process.env[key]) {
                process.env[key] = value
                loadedVars.push(`   ${key}=${value}`)
              } else {
                loadedVars.push(`   ${key}=<既存の環境変数を使用>`)
              }
            }
          }
        }

        if (loadedVars.length > 0) {
          console.log('📥 読み込まれた環境変数:')
          for (const varInfo of loadedVars) {
            console.log(varInfo)
          }
        }
        break
      }
    }
  }

  // External統合テスト用環境変数のデフォルト設定
  if (!process.env.ENABLE_REAL_API_TESTS) {
    process.env.ENABLE_REAL_API_TESTS = 'false'
  }

  // TEST_付きの環境変数から実際のモジュールが使用する環境変数に値を設定
  const testToProductionMapping = {
    SLACK_TEST_WEBHOOK_URL: 'SLACK_WEBHOOK_URL',
    NOTION_TEST_API_TOKEN: 'NOTION_API_TOKEN',
    NOTION_TEST_PARENT_PAGE_ID: 'NOTION_PARENT_PAGE_ID',
  }

  console.log('🔄 TEST_付き環境変数を本番用環境変数に設定中...')
  for (const [testVar, prodVar] of Object.entries(testToProductionMapping)) {
    if (process.env[testVar]) {
      process.env[prodVar] = process.env[testVar]
      console.log(`   ${testVar} → ${prodVar}: ${process.env[testVar]}`)
    } else {
      console.log(`   ${testVar} → ${prodVar}: 未設定`)
    }
  }
}

// External統合テスト用環境変数の検証
function validateExternalEnvironment() {
  const requiredEnvVars = {
    ENABLE_REAL_API_TESTS: 'External統合テストの実行フラグ',
    SLACK_TEST_WEBHOOK_URL: 'Slack Webhook URL（テスト用）',
    NOTION_TEST_API_TOKEN: 'Notion API Token（テスト用）',
    NOTION_TEST_PARENT_PAGE_ID: 'Notion Database ID（テスト用）',
  }

  const isRealApiEnabled = process.env.ENABLE_REAL_API_TESTS === 'true'

  console.log('🔍 External統合テスト環境変数の状態:')
  console.log(`   ENABLE_REAL_API_TESTS: ${process.env.ENABLE_REAL_API_TESTS}`)

  if (!isRealApiEnabled) {
    console.log('ℹ️  実際のAPI呼び出しは無効化されています（ENABLE_REAL_API_TESTS=false）')
    console.log('💡 実際のサービスをテストするには ENABLE_REAL_API_TESTS=true に設定してください')
    return
  }

  const missingVars: string[] = []
  const availableVars: string[] = []

  for (const [varName, description] of Object.entries(requiredEnvVars)) {
    if (varName === 'ENABLE_REAL_API_TESTS') continue // 既にチェック済み

    const value = process.env[varName]
    if (value) {
      availableVars.push(`   ✅ ${varName}: ${value}`)
    } else {
      missingVars.push(`   ❌ ${varName}: ${description}`)
    }
  }

  for (const msg of availableVars) {
    console.log(msg)
  }

  if (missingVars.length > 0) {
    console.warn('⚠️  以下の環境変数が設定されていません:')
    for (const msg of missingVars) {
      console.warn(msg)
    }
    console.warn('')
    console.warn('💡 設定方法:')
    console.warn(
      '   1. packages/external/external.config.local.json.example をコピーして external.config.local.json を作成'
    )
    console.warn('   2. 実際のAPI設定値を external.config.local.json に記入')
    console.warn('   3. テストを再実行')
  } else {
    console.log('✅ External統合テスト用環境変数がすべて設定済みです')
  }
}

beforeAll(async () => {
  console.log('🚀 External統合テスト環境をセットアップ中...')

  // Load External test environment variables first
  const envLoaded = loadTestEnv('.envrc.test.external')
  console.log(`📋 loadTestEnv結果: ${envLoaded}`)

  // Fallback to old setup if .envrc.test.external not found
  if (!envLoaded) {
    console.log('📄 .envrc.test.externalが見つからないため、従来セットアップを実行')
    setupExternalEnvironment()
  } else {
    // .envrc.test.external使用時もTEST_→本番用環境変数のマッピングを実行
    console.log('🔄 TEST_付き環境変数を本番用環境変数に設定中...')
    const testToProductionMapping = {
      SLACK_TEST_WEBHOOK_URL: 'SLACK_WEBHOOK_URL',
      NOTION_TEST_API_TOKEN: 'NOTION_API_TOKEN',
      NOTION_TEST_PARENT_PAGE_ID: 'NOTION_PARENT_PAGE_ID',
    }

    for (const [testVar, prodVar] of Object.entries(testToProductionMapping)) {
      if (process.env[testVar]) {
        process.env[prodVar] = process.env[testVar]
        console.log(`   ${testVar} → ${prodVar}: ${process.env[testVar]}`)
      } else {
        console.log(`   ${testVar} → ${prodVar}: 未設定`)
      }
    }
  }

  // 環境変数の検証
  validateExternalEnvironment()

  console.log('✨ External統合テストセットアップ完了')
}, 30000)

afterAll(async () => {
  console.log('🧹 External統合テスト環境をクリーンアップ中...')
}, 10000)

beforeEach(async () => {
  // 各External統合テスト前のセットアップ
})

afterEach(async () => {
  // 各External統合テスト後のクリーンアップ
})
