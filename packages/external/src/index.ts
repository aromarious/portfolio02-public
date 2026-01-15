// 設定関連
export { parseExternalEnv, isSlackConfigured, isNotionConfigured } from './config/env'
export type { ExternalEnv } from './config/env'

// 型定義
export type { RawContactData, PersonData, ExternalServiceResult } from './shared/types'
export { ExternalServiceError } from './shared/error'

// 個別サービス
export { SlackService } from './slack/slack-service'
export { NotionClient } from './notion/notion-client'
export { NotionService } from './notion/notion-service'

// Repository実装
export { NotionPersonRepository } from './repository/notion-person.repository'
export { NotionContactRepository } from './repository/notion-contact.repository'

// Service実装
export { SlackNotificationService } from './slack/slack-notification.service'
