import type {
  Contact,
  ContactDomainService,
  ExternalSyncDomainService,
  InquiryData,
  Person,
} from '@aromarious/domain'
import type { PersonData, RawContactData } from '@aromarious/external'

import type { SubmitInquiryInput, SubmitInquiryOutput } from '../dtos/contact.dto'

// Resync関連の型定義
export interface ResyncOptions {
  includeNotion?: boolean
  includeSlack?: boolean
  limit?: number
  createdAfter?: Date
  createdBefore?: Date
}

export interface ContactFilter {
  notionSynced?: boolean
  slackNotified?: boolean
  createdAfter?: Date
  createdBefore?: Date
}

export interface ServiceResult {
  service: 'notion' | 'slack'
  success: boolean
  error?: string
}

export interface ContactProcessResult {
  contactId: string
  email: string
  status: 'success' | 'failed'
  services: ServiceResult[]
}

export interface ResyncResult {
  processed: number
  success: number
  failed: number
  results: ContactProcessResult[]
}

/**
 * 問い合わせ処理のアプリケーションサービス
 *
 * Clean Architectureにおけるアプリケーション層の責務:
 * - トランザクション境界の管理
 * - ドメインサービス呼び出し（純粋な委譲）
 * - 外部サービス連携（Notion/Slack）
 * - エラーハンドリングと外部障害対応
 * - ログ出力とモニタリング連携
 */
export class ContactApplicationService {
  constructor(
    private readonly contactDomainService: ContactDomainService,
    private readonly externalSyncDomainService: ExternalSyncDomainService
  ) {}

  /**
   * 問い合わせ送信処理（メインエントリーポイント）
   *
   * Repository Pattern統一とDomain層集約による簡潔な実装
   * ExternalSyncDomainServiceによる外部サービス統合
   */
  async submitInquiry(
    input: SubmitInquiryInput,
    waitUntilCallback?: (promise: Promise<void>) => void
  ): Promise<SubmitInquiryOutput> {
    console.time('⏱️ submitInquiry total')

    try {
      // 1. ExternalSyncDomainServiceで統合処理
      const inquiryData: InquiryData = this.mapToInquiryData(input)

      if (waitUntilCallback) {
        // Vercel waitUntilでバックグラウンド処理（高速レスポンス）
        // 共通処理: まだDBには保存しないが、Entity生成を行う
        // （※ syncNewContactは内部でsaveを行うため、waitUntil時は手動でsaveしてからsyncStoredContactを呼ぶ）
        const { contact, person, isFirstTimeContact } =
          await this.contactDomainService.handleInquiry(inquiryData)

        // 2. 同期的にDB保存（ID確定のため）
        const savedPerson = await this.contactDomainService.savePerson(person)
        const savedContact = await this.contactDomainService.saveContact(contact)

        console.log('🚀 Starting background external service sync (waitUntil)')

        // 保存済みのエンティティを使って外部サービス同期のみを行う
        const syncPromise = this.externalSyncDomainService
          .syncStoredContact(savedContact, savedPerson)
          .catch((error) => {
            console.error('❌ Background sync failed:', error)
          })
        waitUntilCallback(syncPromise.then(() => {}))

        console.timeEnd('⏱️ submitInquiry total')
        return {
          success: true,
          contactId: savedContact.id,
          message: 'お問い合わせを受け付けました',
          isFirstTimeContact,
        }
      }

      // 同期処理フォールバック
      console.log('🚀 Starting synchronous external service sync')
      const syncResult = await this.externalSyncDomainService.syncNewContact(inquiryData)

      console.timeEnd('⏱️ submitInquiry total')
      return {
        success: syncResult.success,
        contactId: syncResult.contact.id,
        message: 'お問い合わせを受け付けました',
        isFirstTimeContact: syncResult.isFirstTimeContact,
      }
    } catch (error) {
      console.timeEnd('⏱️ submitInquiry total')
      console.error('問い合わせ送信処理でエラーが発生:', error)
      throw new Error('お問い合わせの送信に失敗しました')
    }
  }

  /**
   * Contact と Person から RawContactData への変換
   */
  private toRawContactData(
    contact: Contact,
    person: Person,
    personNotionId?: string
  ): RawContactData {
    return {
      id: contact.id,
      name: person.name,
      email: person.email.value,
      company: person.company || undefined,
      subject: contact.subject || 'お問い合わせ',
      message: contact.message || '',
      createdAt: contact.createdAt,
      personNotionId,
    }
  }

  /**
   * Person から PersonData への変換
   */
  private toPersonData(person: Person): PersonData {
    return {
      id: person.id,
      name: person.name,
      email: person.email.value,
      company: person.company || undefined,
      twitterHandle: person.twitterHandle,
      createdAt: person.createdAt,
    }
  }

  /**
   * SubmitInquiryInput から InquiryData への変換
   */
  private mapToInquiryData(input: SubmitInquiryInput): InquiryData {
    return {
      email: input.email,
      name: input.name,
      company: input.company,
      twitterHandle: input.twitterHandle,
      subject: input.subject || 'お問い合わせ',
      message: input.message,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      referer: input.referer,
      sessionId: input.sessionId,
      deviceType: input.deviceType,
      browserName: input.browserName,
      browserVersion: input.browserVersion,
      osName: input.osName,
      screenResolution: input.screenResolution,
      language: input.language,
      timezone: input.timezone,
      formDuration: input.formDuration,
      previousVisitAt: input.previousVisitAt,
    }
  }

  /**
   * 未同期レコードの再同期処理
   * notion_synced = false または slack_notified = false のレコードを再処理
   *
   * TODO: ExternalSyncDomainServiceでの再同期機能実装後に本実装に変更
   */
  async resyncUnsyncedRecords(options?: ResyncOptions): Promise<ResyncResult> {
    // 一時的な実装: 現在は空の結果を返す
    console.log(
      'resyncUnsyncedRecords is temporarily disabled pending ExternalSyncDomainService integration'
    )

    return {
      processed: 0,
      success: 0,
      failed: 0,
      results: [],
    }
  }

  /**
   * 単一のContactレコードの外部サービス同期をリトライ
   *
   * TODO: ExternalSyncDomainServiceでの再同期機能実装後に本実装に変更
   */
  async retryExternalSync(
    contactId: string,
    data: {
      personId: string
      contactId: string
      name: string
      email: string
      subject: string
      message: string
      twitterHandle?: string
      createdAt: Date
    }
  ): Promise<void> {
    console.log(
      'retryExternalSync is temporarily disabled pending ExternalSyncDomainService integration'
    )
    // 一時的な実装: 現在は何もしない
  }

  /**
   * 未同期Contactレコードを取得
   */
  private async fetchUnsyncedContacts(filter: ContactFilter, limit: number): Promise<Contact[]> {
    return await this.contactDomainService.findContacts(filter, { limit })
  }

  /**
   * Contact処理の準備（PersonとContactの検証）
   */
  private async validateContactAndPerson(
    contact: Contact
  ): Promise<{ contact: Contact; person: Person } | null> {
    // Person情報を取得
    const person = await this.contactDomainService.findPersonById(contact.personId)
    if (!person) {
      console.error(`Person not found for contact ${contact.id}`)
      return null
    }

    // emailの値をチェック
    if (!person.email.value) {
      console.error(`Person email is null for contact ${contact.id}`)
      return null
    }

    return { contact, person }
  }
}
