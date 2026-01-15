import type { Contact } from '../entities/contact.entity'
import type { Person } from '../entities/person.entity'
import type {
  ContactRepositoryPort,
  NotionContactRepositoryPort,
  NotionPersonRepositoryPort,
  PersonRepositoryPort,
  SlackNotificationPort,
} from '../ports'
import type { ContactDomainService, InquiryData } from './contact-domain.service'

// 同期結果型定義
export interface SyncResult {
  success: boolean
  contact: Contact
  person: Person
  isFirstTimeContact: boolean
  notion: {
    contactPageId?: string
    personPageId?: string
    synced: boolean
  }
  slack: {
    notified: boolean
    error?: string
  }
}

// 再同期オプション
export interface ResyncOptions {
  limit?: number
  daysBack?: number
  forceResync?: boolean
}

// 再同期結果
export interface ResyncResult {
  processed: number
  succeeded: number
  failed: number
  errors: Array<{
    contactId: string
    error: string
  }>
}

/**
 * ExternalSyncDomainService
 * 複数データストア（PostgreSQL + Notion）+ 外部サービス（Slack）間の同期を管理
 *
 * 段階的統合方式:
 * - 既存のContactDomainServiceを活用
 * - PostgreSQL操作は既存の仕組みを維持
 * - 外部サービス統合を新たに追加
 */
export class ExternalSyncDomainService {
  constructor(
    // 既存Domain Service（段階的統合）
    private contactDomainService: ContactDomainService,

    // PostgreSQL Repository（既存）
    private pgContactRepo: ContactRepositoryPort,
    private pgPersonRepo: PersonRepositoryPort,

    // Notion Service（業務ロジック層）
    // biome-ignore lint/suspicious/noExplicitAny: NotionService type will be added later
    private notionService: any, // TODO: NotionServiceの型を追加

    // Notion Repository（データアクセス層）
    private notionContactRepo: NotionContactRepositoryPort,
    private notionPersonRepo: NotionPersonRepositoryPort,

    // Slack通知
    private slackNotifier: SlackNotificationPort
  ) {}

  /**
   * 新規Contact作成 + 外部サービス同期
   * メインエントリーポイント
   */
  async syncNewContact(input: InquiryData): Promise<SyncResult> {
    // 1. 既存ContactDSでドメインロジック実行
    const { contact, person, isFirstTimeContact } =
      await this.contactDomainService.handleInquiry(input)

    // 2. Person・Contactを保存
    await this.contactDomainService.savePerson(person)
    const savedContact = await this.contactDomainService.saveContact(contact)

    // 3. 外部サービス同期
    const syncResult = await this.syncToExternalServices(savedContact, person)

    return {
      success: true,
      contact: savedContact,
      person,
      isFirstTimeContact,
      ...syncResult,
    }
  }

  /**
   * 既存のContact/Personデータを外部サービスに同期
   * 保存済みデータに対してNotion/Slack連携のみを行う
   */
  async syncStoredContact(contact: Contact, person: Person) {
    return await this.syncToExternalServices(contact, person)
  }

  /**
   * 未同期レコードの再同期処理
   */
  async resyncUnsyncedRecords(options: ResyncOptions = {}): Promise<ResyncResult> {
    // 既存のresyncロジックを移植
    const result: ResyncResult = {
      processed: 0,
      succeeded: 0,
      failed: 0,
      errors: [],
    }

    // TODO: 実装詳細は既存ApplicationServiceから移植
    return result
  }

  /**
   * 外部サービス同期の中核処理
   */
  private async syncToExternalServices(contact: Contact, person: Person) {
    const result = {
      notion: { synced: false },
      slack: { notified: false },
    }

    try {
      // 1. Notion同期
      const notionResult = await this.syncToNotion(contact, person)
      result.notion = notionResult

      // 2. Slack通知
      const slackResult = await this.notifySlack(contact, person)
      result.slack = slackResult
    } catch (error) {
      console.error('External sync error:', error)
    }

    return result
  }

  /**
   * Notion同期処理
   */
  private async syncToNotion(contact: Contact, person: Person) {
    const result = {
      contactPageId: undefined as string | undefined,
      personPageId: undefined as string | undefined,
      synced: false,
    }

    try {
      // NotionServiceの段階的同期を使用
      const contactData = this.toRawContactData(contact)
      const personData = this.toPersonData(person)

      const syncResult = await this.notionService.createContactWithStagedPersonSync(
        contactData,
        personData
      )

      if (syncResult.success) {
        result.contactPageId = syncResult.contactPageId
        result.personPageId = syncResult.personPageId
        result.synced = true

        // 同期状態更新
        contact.markNotionSynced()
        await this.pgContactRepo.update(contact)
      }
    } catch (error) {
      console.error('Notion sync error:', error)
    }

    return result
  }

  /**
   * Slack通知処理
   */
  private async notifySlack(contact: Contact, person: Person) {
    const result = {
      notified: false,
      error: undefined as string | undefined,
    }

    try {
      const slackResult = await this.slackNotifier.sendContactNotification(contact, person)

      if (slackResult.success) {
        // Slack通知成功 → Contact状態更新
        contact.markSlackNotified()
        await this.pgContactRepo.update(contact)
        result.notified = true
      } else {
        result.error = slackResult.error
      }
    } catch (error) {
      result.error = error instanceof Error ? error.message : 'Unknown error'
      console.error('Slack notification error:', error)
    }

    return result
  }

  /**
   * ContactからRawContactDataに変換
   */
  // biome-ignore lint/suspicious/noExplicitAny: Return type for external API data
  private toRawContactData(contact: Contact): any {
    return {
      id: contact.id,
      name: contact.inquirerName,
      email: contact.inquirerEmail,
      company: contact.inquirerCompany,
      subject: contact.subject || 'お問い合わせ',
      message: contact.message,
      createdAt: contact.createdAt,
    }
  }

  /**
   * PersonからPersonDataに変換
   */
  // biome-ignore lint/suspicious/noExplicitAny: Return type for external API data
  private toPersonData(person: Person): any {
    return {
      id: person.id,
      name: person.name,
      email: person.email.value,
      company: person.company,
      twitterHandle: person.twitterHandle,
      createdAt: person.createdAt,
    }
  }
}
