import type { Contact, NotionContactRepositoryPort, Person } from '@aromarious/domain'

import type { PersonData, RawContactData } from '../shared/types'
import { NotionClient } from '../notion/notion-client'

/**
 * NotionContactRepository
 * NotionデータストアでのContact操作を担当するRepository実装
 */
export class NotionContactRepository implements NotionContactRepositoryPort {
  private notionClient: NotionClient

  constructor(apiToken: string, parentPageId: string) {
    this.notionClient = new NotionClient(apiToken, parentPageId)
  }

  /**
   * ContactをNotionに保存
   */
  async save(contact: Contact, person: Person, personNotionId?: string): Promise<string | null> {
    const contactData = this.toRawContactData(contact, personNotionId)

    if (personNotionId) {
      // Person relationありで保存
      const result = await this.notionClient.createContactRecord(contactData)
      return result.success && result.pageId ? result.pageId : null
    }
    // Person relationなしで保存
    return await this.saveWithoutPersonRelation(contact, person)
  }

  /**
   * Person relationなしでContactを保存（段階的同期用）
   */
  async saveWithoutPersonRelation(contact: Contact, person: Person): Promise<string | null> {
    const contactData = this.toRawContactData(contact)
    const result = await this.notionClient.createContactRecordWithoutPersonRelation(contactData)
    return result.success && result.pageId ? result.pageId : null
  }

  /**
   * ContactとPersonの関連を更新
   */
  async updatePersonRelation(contactNotionPageId: string, personNotionId: string): Promise<void> {
    await this.notionClient.updateContactPersonRelation(contactNotionPageId, personNotionId)
  }

  /**
   * ContactのNotionページ存在を確認
   */
  async exists(contactNotionPageId: string): Promise<boolean> {
    return await this.notionClient.verifyPageExists(contactNotionPageId)
  }

  /**
   * NotionページIDでContactを検索
   */
  async findByNotionPageId(pageId: string): Promise<Contact | null> {
    // NotionServiceにpageId検索メソッドが必要
    // 現在はサポートされていないため、nullを返す
    return null
  }

  /**
   * 複数Contactの段階的同期処理（高度な復旧機能）
   * TODO: この機能はNotionServiceに移すべき
   */
  async performStagedSync(
    contact: Contact,
    personNotionId?: string,
    existingContactPageId?: string
  ): Promise<{
    success: boolean
    contactPageId?: string
    error?: string
  }> {
    // 暫定的に基本保存を実行
    try {
      const person = {
        id: contact.personId,
        name: contact.inquirerName,
        email: { value: contact.inquirerEmail },
        company: contact.inquirerCompany,
        twitterHandle: undefined,
        createdAt: contact.createdAt,
        // biome-ignore lint/suspicious/noExplicitAny: Contact data conversion for Notion API
      } as any

      const contactPageId = await this.save(contact, person, personNotionId)

      return {
        success: !!contactPageId,
        contactPageId: contactPageId ?? undefined,
        error: contactPageId ? undefined : 'Contact creation failed',
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Domain ContactからRawContactDataに変換
   */
  private toRawContactData(contact: Contact, personNotionId?: string): RawContactData {
    return {
      id: contact.id,
      name: contact.inquirerName,
      email: contact.inquirerEmail,
      company: contact.inquirerCompany,
      subject: contact.subject || 'お問い合わせ',
      message: contact.message,
      createdAt: contact.createdAt,
      personNotionId,
    }
  }

  /**
   * ContactからPersonDataを作成（段階的同期用）
   */
  private createPersonDataFromContact(contact: Contact): PersonData {
    return {
      id: contact.personId,
      name: contact.inquirerName,
      email: contact.inquirerEmail,
      company: contact.inquirerCompany,
      twitterHandle: undefined,
      createdAt: contact.createdAt,
    }
  }
}
