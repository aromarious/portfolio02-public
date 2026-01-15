import type { Config } from 'drizzle-kit'

import { getSchemaFilter } from './src/env'

if (!process.env.POSTGRES_URL) {
  throw new Error('Missing POSTGRES_URL')
}

// Supabaseのpooling URLを非pooling URLに変換（本番環境のみ）
// テスト環境のポート5433はそのまま使用
const nonPoolingUrl = process.env.POSTGRES_URL.includes(':6543')
  ? process.env.POSTGRES_URL.replace(':6543', ':5432')
  : process.env.POSTGRES_URL

export default {
  schema: './src/schema.ts',
  dialect: 'postgresql',
  dbCredentials: { url: nonPoolingUrl },
  casing: 'snake_case',
  schemaFilter: getSchemaFilter(),
  // 詳細なログ出力（デバッグ用）
  verbose: process.env.NODE_ENV === 'development',
  // 本番環境では厳格モード
  strict: process.env.NODE_ENV === 'production',
} satisfies Config
