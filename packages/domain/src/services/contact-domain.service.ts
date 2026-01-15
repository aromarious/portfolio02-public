import type { PersonHistoryChange } from '../entities/person.entity'
import type { ContactFilter, ContactRepositoryPort } from '../ports/contact.repository.port'
import type { PersonHistoryPort } from '../ports/person-history.port'
import type { PersonRepositoryPort } from '../ports/person.repository.port'
import { Contact } from '../entities/contact.entity'
import { Person } from '../entities/person.entity'
import { Email } from '../value-objects/email.vo'

/**
 * 問い合わせ処理のドメインサービス
 *
 * 複数集約間の協調処理を担当する純粋なドメインロジック
 * - Person集約の作成/更新判定
 * - Contact集約の作成とビジネスルール適用
 * - 複数集約間の協調処理（Person ↔ Contact関係性）
 * - ドメイン知識に基づく判定（初回 vs リピート顧客）
 */
export class ContactDomainService {
  constructor(
    private readonly personRepository: PersonRepositoryPort,
    private readonly contactRepository: ContactRepositoryPort,
    private readonly historyPort?: PersonHistoryPort
  ) {}
  /**
   * 問い合わせ処理を実行
   *
   * @param inquiryData 問い合わせデータ
   * @returns Person と Contact のペア
   */
  async handleInquiry(
    inquiryData: InquiryData
  ): Promise<{ person: Person; contact: Contact; isFirstTimeContact: boolean }> {
    // 1. Person作成/更新の判定（ドメインロジック）
    const email = Email.create(inquiryData.email)
    const existingPerson = await this.personRepository.findByEmail(email)

    let person: Person
    const isFirstTimeContact = !existingPerson

    if (existingPerson) {
      // 既存Personの情報を更新（履歴記録対応）
      const historyCallback =
        this.historyPort && existingPerson.notionPageId
          ? async (changes: PersonHistoryChange[]) => {
              const pageId = existingPerson.notionPageId
              if (pageId) {
                for (const change of changes) {
                  await this.historyPort?.recordHistory(pageId, [change])
                }
              }
            }
          : undefined

      existingPerson.updateContactInfo(
        {
          name: inquiryData.name,
          company: inquiryData.company,
          twitterHandle: inquiryData.twitterHandle,
        },
        {
          contactId: '', // Contact作成前のため仮ID
          historyCallback,
        }
      )

      existingPerson.recordNewContact()
      person = existingPerson
    } else {
      // 新しいPersonを作成
      person = Person.create({
        name: inquiryData.name,
        email: inquiryData.email,
        company: inquiryData.company,
        twitterHandle: inquiryData.twitterHandle,
      })
    }

    // 2. Contact作成（ドメインロジック）
    const contact = Contact.create({
      personId: person.id,
      inquirerName: inquiryData.name,
      inquirerEmail: inquiryData.email,
      inquirerCompany: inquiryData.company,
      subject: inquiryData.subject,
      message: inquiryData.message,
      ipAddress: inquiryData.ipAddress,
      userAgent: inquiryData.userAgent,
      referer: inquiryData.referer,
      sessionId: inquiryData.sessionId,
      deviceType: inquiryData.deviceType,
      browserName: inquiryData.browserName,
      browserVersion: inquiryData.browserVersion,
      osName: inquiryData.osName,
      screenResolution: inquiryData.screenResolution,
      language: inquiryData.language,
      timezone: inquiryData.timezone,
      formDuration: inquiryData.formDuration,
      previousVisitAt: inquiryData.previousVisitAt,
    })

    return { person, contact, isFirstTimeContact }
  }

  /**
   * Personを保存
   */
  async savePerson(person: Person): Promise<Person> {
    return await this.personRepository.save(person)
  }

  /**
   * Contactを保存
   */
  async saveContact(contact: Contact): Promise<Contact> {
    return await this.contactRepository.save(contact)
  }

  /**
   * PersonをIDで検索
   */
  async findPersonById(id: string): Promise<Person | null> {
    return await this.personRepository.findById(id)
  }

  /**
   * Contact一覧を取得
   */
  async findContacts(filter?: ContactFilter, options?: { limit?: number }): Promise<Contact[]> {
    return await this.contactRepository.findMany(filter, options)
  }
}

/**
 * 問い合わせデータの型定義
 */
export interface InquiryData {
  email: string
  name: string
  company?: string
  twitterHandle?: string
  subject: string
  message: string
  ipAddress?: string
  userAgent?: string
  referer?: string
  sessionId?: string
  deviceType?: 'desktop' | 'mobile' | 'tablet'
  browserName?: string
  browserVersion?: string
  osName?: string
  screenResolution?: string
  language?: string
  timezone?: string
  formDuration?: number
  previousVisitAt?: Date
}
