import { z } from 'zod/v4'

/**
 * 外部サービス統合用の環境変数設定
 */
const externalEnvSchema = z.object({
  // Slack設定
  SLACK_WEBHOOK_URL: z.string().url().optional(),

  // Notion設定
  NOTION_API_TOKEN: z.string().optional(),
  NOTION_PARENT_PAGE_ID: z.string().optional(), // 親ページID（複数DBの親）
})

export type ExternalEnv = z.infer<typeof externalEnvSchema>

/**
 * 環境変数の検証とパース
 */
export function parseExternalEnv(): ExternalEnv {
  return externalEnvSchema.parse({
    SLACK_WEBHOOK_URL: process.env.SLACK_WEBHOOK_URL,
    NOTION_API_TOKEN: process.env.NOTION_API_TOKEN,
    NOTION_PARENT_PAGE_ID: process.env.NOTION_PARENT_PAGE_ID,
  })
}

/**
 * 特定のサービスが設定されているかチェック
 */
export function isSlackConfigured(env: ExternalEnv): boolean {
  return !!env.SLACK_WEBHOOK_URL
}

export function isNotionConfigured(env: ExternalEnv): boolean {
  // APIトークンと親ページIDが設定されていればOK
  return !!(env.NOTION_API_TOKEN && env.NOTION_PARENT_PAGE_ID)
}
