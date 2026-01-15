import { and, desc, eq, gte, lte, sql } from 'drizzle-orm'

import type { ContactFilter, ContactRepositoryPort, PaginationOptions } from '@aromarious/domain'
import { Contact } from '@aromarious/domain'

import type { DbClient } from '../client'
import type { ContactInsertModel, ContactSelectModel, PersonSelectModel } from '../schema'
import { ContactTable, PersonTable } from '../schema'

export class ContactRepository implements ContactRepositoryPort {
  constructor(private readonly db: DbClient) {}

  async save(contact: Contact): Promise<Contact> {
    const contactData = this.toContactPersistence(contact)

    const [savedContact] = await this.db.insert(ContactTable).values(contactData).returning()

    if (!savedContact) {
      throw new Error('Failed to save contact: no record returned')
    }

    return this.toDomainContact(savedContact)
  }

  async update(contact: Contact): Promise<Contact> {
    const contactData = this.toContactPersistence(contact)

    const [updatedContact] = await this.db
      .update(ContactTable)
      .set(contactData)
      .where(eq(ContactTable.id, contact.id))
      .returning()

    if (!updatedContact) {
      throw new Error(`Contact with id ${contact.id} not found for update`)
    }

    return this.toDomainContact(updatedContact)
  }

  async findById(id: string): Promise<Contact | null> {
    const contactData = await this.db
      .select()
      .from(ContactTable)
      .where(eq(ContactTable.id, id))
      .limit(1)

    const contact = contactData[0]
    if (!contact) {
      return null
    }

    return this.toDomainContact(contact)
  }

  async findMany(filter?: ContactFilter, pagination?: PaginationOptions): Promise<Contact[]> {
    // ベースクエリを作成
    const baseQuery = this.db.select().from(ContactTable)

    // 条件を適用
    const filteredQuery = filter
      ? (() => {
          const conditions = this.buildFilterConditions(filter)
          return conditions.length > 0 ? baseQuery.where(and(...conditions)) : baseQuery
        })()
      : baseQuery

    // ソートを適用
    const sortedQuery = pagination?.orderBy
      ? (() => {
          // ドメインのソートキーをデータベースのカラム名にマッピング
          // biome-ignore lint/suspicious/noExplicitAny: Drizzle ORMの動的なカラム参照に対応するため
          const orderByMap: Record<string, any> = {
            createdAt: ContactTable.createdAt,
            updatedAt: ContactTable.updatedAt,
          }
          const orderField = orderByMap[pagination.orderBy] || ContactTable.createdAt
          const orderFn = pagination.orderDirection === 'asc' ? orderField : desc(orderField)
          return filteredQuery.orderBy(orderFn)
        })()
      : filteredQuery.orderBy(desc(ContactTable.createdAt))

    // ページネーションを適用
    const limitedQuery = pagination?.limit ? sortedQuery.limit(pagination.limit) : sortedQuery
    const paginatedQuery = pagination?.offset
      ? limitedQuery.offset(pagination.offset)
      : limitedQuery

    const contactsData = await paginatedQuery

    return contactsData.map((contactData) => this.toDomainContact(contactData))
  }

  async count(filter?: ContactFilter): Promise<number> {
    const baseQuery = this.db.select({ count: sql<number>`count(*)` }).from(ContactTable)

    const filteredQuery = filter
      ? (() => {
          const conditions = this.buildFilterConditions(filter)
          return conditions.length > 0 ? baseQuery.where(and(...conditions)) : baseQuery
        })()
      : baseQuery

    const [result] = await filteredQuery
    return result ? Number(result.count) : 0
  }

  async findByPersonId(personId: string): Promise<Contact[]> {
    return this.findMany({ personId })
  }

  async findUnsyncedForNotion(): Promise<Contact[]> {
    return this.findMany({ notionSynced: false })
  }

  async findUnnotifiedForSlack(): Promise<Contact[]> {
    return this.findMany({ slackNotified: false })
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(ContactTable).where(eq(ContactTable.id, id))
  }

  async countAll(): Promise<number> {
    const contactData = await this.db.select({ count: sql<number>`count(*)` }).from(ContactTable)
    const result = contactData[0]
    return result ? Number(result.count) : 0
  }

  // --- Utility Methods ---

  async exists(id: string): Promise<boolean> {
    const contactData = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(ContactTable)
      .where(eq(ContactTable.id, id))
    const result = contactData[0]
    return (result?.count ?? 0) > 0
  }

  private buildFilterConditions(filter: ContactFilter) {
    const conditions = []

    if (filter.personId) {
      conditions.push(eq(ContactTable.personId, filter.personId))
    }

    if (filter.createdAfter) {
      conditions.push(gte(ContactTable.createdAt, filter.createdAfter))
    }

    if (filter.createdBefore) {
      conditions.push(lte(ContactTable.createdAt, filter.createdBefore))
    }

    if (filter.notionSynced !== undefined) {
      conditions.push(eq(ContactTable.notionSynced, filter.notionSynced))
    }

    if (filter.slackNotified !== undefined) {
      conditions.push(eq(ContactTable.slackNotified, filter.slackNotified))
    }

    return conditions
  }

  private toDomainContact(
    contactData: ContactSelectModel,
    personData?: PersonSelectModel | null
  ): Contact {
    const data = contactData
    return Contact.fromPersistence({
      id: data.id,
      personId: data.personId,
      inquirerName: data.inquirerName || undefined,
      inquirerEmail: data.inquirerEmail || undefined,
      subject: data.subject,
      message: data.message,
      ipAddress: data.ipAddress || undefined,
      userAgent: data.userAgent || undefined,
      browserName: data.browserName || undefined,
      browserVersion: data.browserVersion || undefined,
      osName: data.osName || undefined,
      deviceType: (data.deviceType as 'desktop' | 'mobile' | 'tablet') || undefined,
      screenResolution: data.screenResolution || undefined,
      timezone: data.timezone || undefined,
      language: data.language || undefined,
      referer: data.referer || undefined,
      sessionId: data.sessionId || undefined,
      formDuration: data.formDuration || undefined,
      previousVisitAt: data.previousVisitAt || undefined,
      notionSynced: data.notionSynced,
      slackNotified: data.slackNotified,
      notionSyncedAt: data.notionSyncedAt || undefined,
      slackNotifiedAt: data.slackNotifiedAt || undefined,
      notionPageId: data.notionPageId || undefined,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt ?? new Date(),
    })
  }

  async updateExternalServiceStatus(
    contactId: string,
    updates: {
      slackNotified?: boolean
      slackNotifiedAt?: Date
      notionSynced?: boolean
      notionSyncedAt?: Date
    }
  ): Promise<void> {
    await this.db
      .update(ContactTable)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(ContactTable.id, contactId))
  }

  async updateNotionPageId(id: string, notionPageId: string): Promise<void> {
    await this.db.update(ContactTable).set({ notionPageId }).where(eq(ContactTable.id, id))
  }

  private toContactPersistence(contact: Contact): ContactInsertModel {
    return {
      id: contact.id,
      personId: contact.personId,
      inquirerName: contact.inquirerName || null,
      inquirerEmail: contact.inquirerEmail || null,
      subject: contact.subject || '', // 必須フィールドのフォールバック
      message: contact.message || '',
      ipAddress: contact.ipAddress || null,
      userAgent: contact.userAgent || null,
      browserName: contact.browserName || null,
      browserVersion: contact.browserVersion || null,
      osName: contact.osName || null,
      deviceType: contact.deviceType || null,
      screenResolution: contact.screenResolution || null,
      timezone: contact.timezone || null,
      language: contact.language || null,
      referer: contact.referer || null,
      sessionId: contact.sessionId || null,
      formDuration: contact.formDuration || null,
      previousVisitAt: contact.previousVisitAt || null,
      notionSynced: contact.notionSynced,
      slackNotified: contact.slackNotified,
      notionSyncedAt: contact.notionSyncedAt || null,
      slackNotifiedAt: contact.slackNotifiedAt || null,
      notionPageId: contact.notionPageId || null,
      createdAt: contact.createdAt,
      updatedAt: contact.updatedAt,
    }
  }

  /**
   * Notion同期に失敗したContactレコードを取得
   */
  async findUnsyncedContacts(): Promise<Contact[]> {
    const contactsData = await this.db
      .select()
      .from(ContactTable)
      .leftJoin(PersonTable, eq(ContactTable.personId, PersonTable.id))
      .where(eq(ContactTable.notionSynced, false))
      .orderBy(ContactTable.createdAt)

    return contactsData.map((data) => {
      const contactData = data.contact
      const personData = data.person

      if (!contactData) {
        throw new Error('Contact data is missing')
      }

      return this.toDomainContact(contactData, personData)
    })
  }

  /**
   * Notion同期ステータスを更新
   */
  async updateNotionSyncStatus(contactId: string, synced: boolean): Promise<void> {
    await this.db
      .update(ContactTable)
      .set({
        notionSynced: synced,
        notionSyncedAt: synced ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(eq(ContactTable.id, contactId))
  }

  /**
   * 全てのContactレコードを削除
   */
  async deleteAll(): Promise<void> {
    await this.db.delete(ContactTable)
  }
}
