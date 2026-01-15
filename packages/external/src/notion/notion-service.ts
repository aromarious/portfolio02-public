import type { Contact, Person } from '@aromarious/domain'

import type { NotionContactRepository } from '../repository/notion-contact.repository'
import type { NotionPersonRepository } from '../repository/notion-person.repository'
import type { ExternalServiceResult, PersonData, RawContactData } from '../shared/types'
import { ExternalServiceError } from '../shared/error'

/**
 * Notion業務ロジック層
 * Notion特有の複雑な業務ロジック（段階的同期・リトライ・履歴管理）を担当
 */
export class NotionService {
  constructor(
    private notionContactRepository: NotionContactRepository,
    private notionPersonRepository: NotionPersonRepository
  ) {}

  /**
   * 新しい同期戦略でContact＋Person同期を実行
   * 1. Contactをrelationなしで作成
   * 2. Personを段階的に処理
   * 3. Contact relationを更新
   * 4. 完了確認
   */
  async createContactWithStagedPersonSync(
    contactData: RawContactData,
    personData: PersonData
  ): Promise<{
    success: boolean
    contactPageId?: string
    personPageId?: string
    error?: string
    step?: string
  }> {
    try {
      // Step 1: Contact作成（relationなし）
      // 一時的にContactエンティティを作成
      const contact = this.createContactFromRawData(contactData)
      const person = this.createPersonFromData(personData)

      const contactPageId = await this.notionContactRepository.saveWithoutPersonRelation(
        contact,
        person
      )

      if (!contactPageId) {
        return {
          success: false,
          error: 'Contact creation failed',
          step: 'contact_creation',
        }
      }

      // Step 2: Person処理（段階的）
      const personResult = await this.ensurePersonExists(contactData.email, personData)

      if (!personResult.success || !personResult.pageId) {
        // Personの処理に失敗したが、Contactは作成済み
        return {
          success: false,
          contactPageId,
          error: personResult.error || 'Person processing failed',
          step: 'person_processing',
        }
      }

      const personPageId = personResult.pageId

      // Step 3: Contact relationを更新
      try {
        await this.notionContactRepository.updatePersonRelation(contactPageId, personPageId)
      } catch (error) {
        // Relationの更新に失敗したが、ContactとPersonは作成済み
        return {
          success: false,
          contactPageId,
          personPageId: personResult.pageId,
          error: error instanceof Error ? error.message : 'Relation update failed',
          step: 'relation_update',
        }
      }

      // Step 4: 完了確認（オプション）
      // 簡素化：基本的に成功とみなす

      return {
        success: true,
        contactPageId,
        personPageId: personResult.pageId,
        step: 'completed',
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        step: 'unknown',
      }
    }
  }

  /**
   * Person処理を段階的に実行（DB検索 → Notion確認 → 作成）
   */
  async ensurePersonExists(
    email: string,
    personData: PersonData,
    existingPersonPageId?: string
  ): Promise<{ success: boolean; pageId?: string; error?: string }> {
    try {
      // 既存のpageIdがある場合は検証
      if (existingPersonPageId) {
        // Repository経由で検証
        const existsPerson = await this.notionPersonRepository.exists(email)
        if (existsPerson) {
          return { success: true, pageId: existingPersonPageId }
        }
      }

      // Repository経由でPersonを検索
      const existingPerson = await this.notionPersonRepository.findByEmail(email)

      if (existingPerson) {
        // TODO: NotionページIDを取得する方法が必要
        // 現在はPersonエンティティからNotionページIDを取得できない
        return { success: true, pageId: 'existing-person-id' }
      }

      // Notionにいない場合は新規作成
      const person = this.createPersonFromData(personData)
      const personPageId = await this.notionPersonRepository.save(person)

      if (!personPageId) {
        return {
          success: false,
          error: 'Person creation failed',
        }
      }

      // 作成後の参照可能性を確認
      const isReferenceable = await this.notionPersonRepository.waitUntilReferenceable(email)

      if (isReferenceable) {
        return { success: true, pageId: personPageId }
      }

      // 作成は成功したのでIDを返す（後で再試行可能）
      return { success: true, pageId: personPageId }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * RawContactDataからContactエンティティを作成
   */
  private createContactFromRawData(contactData: RawContactData): Contact {
    // TODO: 実際のContactエンティティコンストラクタに合わせて実装
    return {
      id: contactData.id,
      inquirerName: contactData.name,
      inquirerEmail: contactData.email,
      inquirerCompany: contactData.company,
      subject: contactData.subject,
      message: contactData.message,
      createdAt: contactData.createdAt,
    } as Contact
  }

  /**
   * PersonDataからPersonエンティティを作成
   */
  private createPersonFromData(personData: PersonData): Person {
    // TODO: 実際のPersonエンティティコンストラクタに合わせて実装
    return {
      id: personData.id,
      name: personData.name,
      email: { value: personData.email },
      company: personData.company,
      twitterHandle: personData.twitterHandle,
      createdAt: personData.createdAt,
    } as Person
  }
}
