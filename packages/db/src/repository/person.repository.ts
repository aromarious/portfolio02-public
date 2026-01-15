import { and, desc, eq, gte, ilike, lte, sql } from 'drizzle-orm'

import type { PaginationOptions, PersonFilter, PersonRepositoryPort } from '@aromarious/domain'
import { Email, Person } from '@aromarious/domain'

import type { DbClient } from '../client'
import type { PersonInsertModel, PersonSelectModel } from '../schema'
import { PersonTable } from '../schema'

export class PersonRepository implements PersonRepositoryPort {
  constructor(private readonly db: DbClient) {}

  async save(person: Person): Promise<Person> {
    // 既存のPersonかチェック
    const existingPerson = await this.findById(person.id)

    if (existingPerson) {
      // 既存の場合はupdateを使用
      return this.update(person)
    }

    // 新規の場合はinsertを使用
    const personData = this.toPersonPersistence(person)
    const inserted = await this.db.insert(PersonTable).values(personData).returning()
    const savedPerson = inserted[0]
    if (!savedPerson) {
      throw new Error('Failed to save person')
    }
    return this.toDomainPerson(savedPerson)
  }

  async update(person: Person): Promise<Person> {
    const now = new Date()

    const updateData: Partial<PersonInsertModel> = {
      name: person.name,
      company: person.company || null, // undefinedをnullに変換
      twitterHandle: person.twitterHandle || null,
      firstContactAt: person.firstContactAt,
      lastContactAt: person.lastContactAt,
      updatedAt: now,
    }

    const [updatedRecord] = await this.db
      .update(PersonTable)
      .set(updateData)
      .where(eq(PersonTable.id, person.id))
      .returning()

    // 存在しないPersonの場合、更新されたレコードが返されないため、
    // 引数として渡されたPersonオブジェクトをそのまま返す
    if (!updatedRecord) {
      return person
    }

    return this.toDomainPerson(updatedRecord)
  }

  async findById(id: string): Promise<Person | null> {
    try {
      const [personData] = await this.db
        .select()
        .from(PersonTable)
        .where(eq(PersonTable.id, id))
        .limit(1)

      if (!personData) {
        return null
      }

      return this.toDomainPerson(personData)
    } catch (error) {
      // UUID format error などをキャッチして null を返す
      return null
    }
  }

  async findByEmail(email: Email): Promise<Person | null> {
    const [personData] = await this.db
      .select()
      .from(PersonTable)
      .where(eq(PersonTable.email, email.value))
      .limit(1)

    if (!personData) {
      return null
    }

    return this.toDomainPerson(personData)
  }

  async findMany(filter?: PersonFilter, pagination?: PaginationOptions): Promise<Person[]> {
    // ベースクエリを作成
    const baseQuery = this.db.select().from(PersonTable)

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
            name: PersonTable.name,
            createdAt: PersonTable.createdAt,
            updatedAt: PersonTable.updatedAt,
            lastContactAt: PersonTable.lastContactAt,
          }
          const orderField = orderByMap[pagination.orderBy] || PersonTable.createdAt
          const orderFn = pagination.orderDirection === 'asc' ? orderField : desc(orderField)
          return filteredQuery.orderBy(orderFn)
        })()
      : filteredQuery.orderBy(desc(PersonTable.createdAt))

    // ページネーションを適用
    const limitedQuery = pagination?.limit ? sortedQuery.limit(pagination.limit) : sortedQuery
    const paginatedQuery = pagination?.offset
      ? limitedQuery.offset(pagination.offset)
      : limitedQuery

    const personsData = await paginatedQuery
    return personsData.map((personData) => this.toDomainPerson(personData))
  }

  async count(filter?: PersonFilter): Promise<number> {
    const baseQuery = this.db.select({ count: sql<number>`count(*)` }).from(PersonTable)

    const filteredQuery = filter
      ? (() => {
          const conditions = this.buildFilterConditions(filter)
          return conditions.length > 0 ? baseQuery.where(and(...conditions)) : baseQuery
        })()
      : baseQuery

    const [result] = await filteredQuery
    return Number(result?.count ?? 0)
  }

  async findOrCreate(email: string, name: string, company?: string): Promise<Person> {
    const emailVo = Email.create(email)

    // Try to find existing person
    const existingPerson = await this.findByEmail(emailVo)

    if (existingPerson) {
      // Update contact info if provided data is different
      const needsUpdate = existingPerson.name !== name || existingPerson.company !== company

      if (needsUpdate) {
        existingPerson.updateContactInfo({ name, company })
        return this.update(existingPerson)
      }

      // Return as-is if no changes needed
      return existingPerson
    }

    // Create new person
    const newPerson = Person.create({
      email,
      name,
      company: company || undefined,
    })
    return this.save(newPerson)
  }

  async findRecentContacts(withinDays = 30): Promise<Person[]> {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - withinDays)

    const personsData = await this.db
      .select()
      .from(PersonTable)
      .where(gte(PersonTable.lastContactAt, cutoffDate))
      .orderBy(desc(PersonTable.lastContactAt))

    return personsData.map((personData) => this.toDomainPerson(personData))
  }

  async findByCompany(company: string): Promise<Person[]> {
    return this.findMany({ company })
  }

  async existsByEmail(email: Email): Promise<boolean> {
    const [result] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(PersonTable)
      .where(eq(PersonTable.email, email.value))

    return (result?.count ?? 0) > 0
  }

  async updateNotionPageId(id: string, notionPageId: string): Promise<void> {
    await this.db.update(PersonTable).set({ notionPageId }).where(eq(PersonTable.id, id))
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(PersonTable).where(eq(PersonTable.id, id))
  }

  async exists(id: string): Promise<boolean> {
    try {
      const [result] = await this.db
        .select({ count: sql<number>`count(*)` })
        .from(PersonTable)
        .where(eq(PersonTable.id, id))

      return (result?.count ?? 0) > 0
    } catch (error) {
      // UUID format error などをキャッチして false を返す
      return false
    }
  }

  private buildFilterConditions(filter: PersonFilter) {
    const conditions = []

    if (filter.name) {
      conditions.push(ilike(PersonTable.name, `%${filter.name}%`))
    }

    if (filter.email) {
      conditions.push(ilike(PersonTable.email, `%${filter.email}%`))
    }

    if (filter.company) {
      conditions.push(ilike(PersonTable.company, `%${filter.company}%`))
    }

    if (filter.createdAfter) {
      conditions.push(gte(PersonTable.createdAt, filter.createdAfter))
    }

    if (filter.createdBefore) {
      conditions.push(lte(PersonTable.createdAt, filter.createdBefore))
    }

    if (filter.hasCompany !== undefined) {
      if (filter.hasCompany) {
        conditions.push(sql`${PersonTable.company} IS NOT NULL AND ${PersonTable.company} != ''`)
      } else {
        conditions.push(sql`${PersonTable.company} IS NULL OR ${PersonTable.company} = ''`)
      }
    }

    if (filter.twitterHandle) {
      conditions.push(ilike(PersonTable.twitterHandle, `%${filter.twitterHandle}%`))
    }

    return conditions
  }

  private toDomainPerson(personData: PersonSelectModel): Person {
    return Person.fromPersistence({
      id: personData.id,
      name: personData.name,
      email: personData.email,
      company: personData.company || undefined, // nullをundefinedに変換
      twitterHandle: personData.twitterHandle || undefined,
      notionPageId: (personData.notionPageId as string) || undefined, // nullをundefinedに変換
      firstContactAt: personData.firstContactAt as Date,
      lastContactAt: personData.lastContactAt as Date,
      createdAt: personData.createdAt as Date,
      updatedAt: personData.updatedAt as Date,
    })
  }

  private toPersonPersistence(person: Person): PersonInsertModel {
    return {
      id: person.id,
      name: person.name,
      email: person.getEmailValue(),
      company: person.company || null, // undefinedをnullに変換
      twitterHandle: person.twitterHandle || null,
      notionPageId: person.notionPageId || null, // undefinedをnullに変換
      firstContactAt: person.firstContactAt,
      lastContactAt: person.lastContactAt,
      createdAt: person.createdAt,
      updatedAt: person.updatedAt,
    }
  }

  /**
   * 全てのPersonレコードを削除
   */
  async deleteAll(): Promise<void> {
    await this.db.delete(PersonTable)
  }
}
