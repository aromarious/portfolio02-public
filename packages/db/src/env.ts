/**
 * 環境判定を一元管理するモジュール
 */

export type Environment = 'local' | 'preview' | 'production'

export function getEnvironment(): Environment {
  // NODE_ENVがdevelopment（ローカル開発）の場合は常にlocalと判定
  if (process.env.NODE_ENV === 'development') {
    return 'local'
  }

  const postgresUrl = process.env.POSTGRES_URL

  // ローカル環境の判定（PostgreSQL URLベース）
  if (postgresUrl?.includes('localhost') || postgresUrl?.includes('127.0.0.1')) {
    return 'local'
  }

  // Vercel環境の判定
  if (process.env.VERCEL_ENV === 'preview') {
    return 'preview'
  }

  return 'production'
}

export function isPreviewEnvironment(): boolean {
  return getEnvironment() === 'preview'
}

export function isLocalEnvironment(): boolean {
  return getEnvironment() === 'local'
}

export function isProductionEnvironment(): boolean {
  return getEnvironment() === 'production'
}

export function getTargetSchema(): string {
  return isPreviewEnvironment() ? 'preview' : 'public'
}

export function getSchemaFilter(): string[] {
  const env = getEnvironment()

  switch (env) {
    case 'preview':
      return ['preview'] // プレビュー環境はpreviewスキーマのみ管理
    case 'local':
      return ['public'] // ローカル環境はpublicスキーマのみ管理
    case 'production':
      return ['public'] // 本番環境はpublicスキーマのみ管理
  }
}
