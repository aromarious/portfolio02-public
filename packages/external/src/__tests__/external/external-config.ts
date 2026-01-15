// external-config.tsがimportされた時点で環境変数を初期化
import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { z } from 'zod/v4'

// 即座に環境変数を読み込み（簡易版）
try {
  const currentDir =
    typeof __dirname !== 'undefined' ? __dirname : path.dirname(new URL(import.meta.url).pathname)
  const envrcPath = path.resolve(
    currentDir,
    '../../../../../tooling/vitest/setup/.envrc.test.external'
  )
  console.log(`🔍 External設定: パス確認 ${envrcPath}`)

  if (fs.existsSync(envrcPath)) {
    // sourceコマンドで環境変数を読み込み、envで出力してパース
    const envOutput = execSync(`source ${envrcPath} && env`, {
      encoding: 'utf-8',
      shell: '/bin/bash',
    })

    // 環境変数をパースしてprocess.envに設定
    const envVars = envOutput
      .split('\n')
      .filter((line) => line.includes('='))
      .filter(
        (line) =>
          line.includes('NOTION_TEST_') ||
          line.includes('SLACK_TEST_') ||
          line.includes('ENABLE_REAL_API_TESTS')
      )

    for (const envVar of envVars) {
      const [key, ...valueParts] = envVar.split('=')
      if (key && valueParts.length > 0) {
        process.env[key] = valueParts.join('=')
      }
    }

    console.log('🔄 External設定: .envrc.test.external読み込み完了')
  } else {
    console.log('⚠️ External設定: .envrc.test.external見つからず')
  }
} catch (error) {
  console.log('⚠️ External設定: 環境変数読み込み失敗、デフォルト使用')
}

/**
 * External統合テスト用環境変数スキーマ
 */
const externalEnvSchema = z.object({
  // 実際のAPI呼び出しを有効にするフラグ
  ENABLE_REAL_API_TESTS: z.string().optional().default('false'),

  // Notion API設定（テスト用）
  NOTION_TEST_API_TOKEN: z.string().optional(),
  NOTION_TEST_PARENT_PAGE_ID: z.string().optional(),

  // Slack Webhook設定（テスト用）
  SLACK_TEST_WEBHOOK_URL: z.string().optional(),
})

/**
 * External統合テスト設定ファイルのスキーマ
 */
const externalConfigSchema = z.object({
  // 実際のAPI呼び出しを有効にするフラグ
  enableRealApiTests: z.boolean().default(false),

  // Notion API設定（テスト用）
  notion: z
    .object({
      apiToken: z.string().optional(),
      parentPageId: z.string().optional(),
    })
    .optional(),

  // Slack Webhook設定（テスト用）
  slack: z
    .object({
      webhookUrl: z.string().optional(),
    })
    .optional(),
})

export type ExternalConfig = z.infer<typeof externalConfigSchema>

/**
 * 設定ファイルのパスを解決
 */
function resolveConfigPath(): string | null {
  const packageRoot = path.resolve(__dirname, '../../../..')
  const configPaths = [
    path.join(packageRoot, 'external.config.json'),
    path.join(packageRoot, 'external.config.local.json'),
    path.join(__dirname, 'external.config.json'),
    path.join(__dirname, 'external.config.local.json'),
  ]

  for (const configPath of configPaths) {
    if (fs.existsSync(configPath)) {
      return configPath
    }
  }

  return null
}

/**
 * 設定ファイルから設定を読み込み
 */
function loadConfigFromFile(): ExternalConfig | null {
  const configPath = resolveConfigPath()

  if (!configPath) {
    return null
  }

  try {
    const configContent = fs.readFileSync(configPath, 'utf-8')
    const rawConfig = JSON.parse(configContent)
    return externalConfigSchema.parse(rawConfig)
  } catch (error) {
    console.warn(`Failed to load External config from ${configPath}:`, error)
    return null
  }
}

/**
 * 環境変数から設定を読み込み
 */
function loadConfigFromEnv(): ExternalConfig {
  const env = externalEnvSchema.parse(process.env)

  return {
    enableRealApiTests: env.ENABLE_REAL_API_TESTS === 'true',
    notion: {
      apiToken: env.NOTION_TEST_API_TOKEN,
      parentPageId: env.NOTION_TEST_PARENT_PAGE_ID,
    },
    slack: {
      webhookUrl: env.SLACK_TEST_WEBHOOK_URL,
    },
  }
}

// 設定をキャッシュ
let cachedConfig: ExternalConfig | null = null

/**
 * External統合テスト設定を取得
 * 優先順位: 1. 環境変数 2. 設定ファイル
 */
export function getExternalConfig(): ExternalConfig {
  if (!cachedConfig) {
    const envConfig = loadConfigFromEnv()

    // 環境変数が設定されているかチェック
    const hasEnvConfig =
      envConfig.enableRealApiTests ||
      envConfig.notion?.apiToken ||
      envConfig.notion?.parentPageId ||
      envConfig.slack?.webhookUrl

    if (hasEnvConfig) {
      cachedConfig = envConfig
      console.log('🌍 External統合テスト設定を環境変数から読み込みました')
    } else {
      // 環境変数が設定されていない場合は設定ファイルから読み込み
      const fileConfig = loadConfigFromFile()
      if (fileConfig) {
        cachedConfig = fileConfig
        console.log('📄 External統合テスト設定を設定ファイルから読み込みました')
      } else {
        // 設定ファイルも見つからない場合はデフォルト設定
        cachedConfig = envConfig // 空の設定
        console.log('⚠️  External統合テスト設定が見つかりません。デフォルト設定を使用します')
      }
    }
  }
  return cachedConfig
}

/**
 * 実際のAPI呼び出しが有効かチェック
 */
export function isRealApiTestEnabled(): boolean {
  const config = getExternalConfig()
  return config.enableRealApiTests
}

/**
 * Notion外部サービス統合テストが設定されているかチェック
 */
export function isNotionExternalConfigured(): boolean {
  const config = getExternalConfig()
  return !!(config.notion?.apiToken && config.notion?.parentPageId)
}

/**
 * Slack外部サービス統合テストが設定されているかチェック
 */
export function isSlackExternalConfigured(): boolean {
  const config = getExternalConfig()
  return !!config.slack?.webhookUrl
}

/**
 * 外部サービス統合テスト用Notion設定を取得
 */
export function getNotionExternalConfig() {
  const config = getExternalConfig()
  return {
    apiToken: config.notion?.apiToken,
    parentPageId: config.notion?.parentPageId,
  }
}

/**
 * 外部サービス統合テスト用Slack設定を取得
 */
export function getSlackExternalConfig() {
  const config = getExternalConfig()
  return {
    webhookUrl: config.slack?.webhookUrl,
  }
}
