import type { SecurityConfig } from '@aromarious/edge-security/types'

const securityConfig: SecurityConfig = {
  // セキュリティモード: DRY_RUN（ログのみ）/ LIVE（実際にブロック）
  mode: (process.env.SECURITY_MODE as 'DRY_RUN' | 'LIVE') || 'DRY_RUN',

  // レート制限設定（パス別）
  rateLimit: {
    // デフォルト制限（全パス、1分間に100回まで）
    default: { windowMs: 60_000, max: 100 },
    // パス別制限（エンドポイント別戦略）
    paths: {
      // 認証系API（5分間に5回まで）- 厳格な制限
      '/api/auth': { windowMs: 300_000, max: 5 },
      // クリーンアップCron（1分間に2回まで）- 厳格な制限
      '/api/cron': { windowMs: 60_000, max: 2 },
      // 管理者用 API（1分間に5回まで）- 厳格な制限
      '/api/admin': { windowMs: 60_000, max: 5 },
      // tRPC API（1分間に50回まで）- 通常の制限
      '/api/trpc': { windowMs: 60_000, max: 50 },
    },
  },

  // 認証失敗時の防御設定（パス別）
  authFailure: {
    paths: {
      // Cron API（3回失敗で30分ロック）
      '/api/cron': { maxAttempts: 3, lockoutDuration: 1_800_000 },
      // 管理者様 API（3回失敗で30分ロック）
      '/api/admin': { maxAttempts: 3, lockoutDuration: 1_800_000 },
    },
  },

  // Bot検知設定（HIGHレベル以上のみブロック）
  // シンプルモード: 'HIGH' だけ指定（デフォルト設定で動作）
  // 詳細モード: { blockSeverity: 'HIGH', honeypot: {...}, userAgent: {...}, timing: {...} }
  bot: 'HIGH',

  // DDoS攻撃防御設定（不要な場合はコメントアウト）
  ddos: {
    // 閾値（1分間に200回以上でDDoS疑い）
    threshold: 200,
    // 監視時間窓（1分間）
    windowMs: 60_000,
  },

  // ログ設定
  logging: {
    // ログレベル: DEBUG / INFO / WARN / ERROR
    level: 'INFO',
  },
}

// Slack通知設定（SLACK_SECURITY_WEBHOOK環境変数がある場合のみ有効）
if (process.env.SLACK_SECURITY_WEBHOOK) {
  securityConfig.logging.slack = {
    // SlackのWebhook URL
    webhook: process.env.SLACK_SECURITY_WEBHOOK,
    // 通知するログレベル（ERROR以上のみ通知）
    levels: ['ERROR'],
  }
}

export function getSecurityConfig(): SecurityConfig {
  return securityConfig
}

export default securityConfig
