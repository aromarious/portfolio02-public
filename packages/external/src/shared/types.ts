/**
 * 外部サービス操作の結果
 */
export interface ExternalServiceResult {
  success: boolean
  error?: string
  service: 'slack' | 'notion'
}

/**
 * 外部サービス送信用の生データ（PersonとContactの情報をフラット化）
 */
export interface RawContactData {
  id: string
  name: string
  email: string
  company?: string
  subject: string
  message: string
  createdAt: Date
  personNotionId?: string // PersonのNotionページID（リレーション用）
}

/**
 * 個人データの型定義
 */
export interface PersonData {
  id: string
  name: string
  email: string
  company?: string
  twitterHandle?: string
  createdAt: Date
}
