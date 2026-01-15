import type { NotionPersonRepositoryPort, Person } from '@aromarious/domain'

import type { PersonData } from '../shared/types'
import { NotionClient } from '../notion/notion-client'

/**
 * NotionPersonRepository
 * NotionデータストアでのPerson操作を担当するRepository実装
 */
export class NotionPersonRepository implements NotionPersonRepositoryPort {
  private notionClient: NotionClient

  constructor(apiToken: string, parentPageId: string) {
    this.notionClient = new NotionClient(apiToken, parentPageId)
  }

  /**
   * PersonをNotionに保存
   */
  async save(person: Person): Promise<string | null> {
    const personData = this.toPersonData(person)
    const result = await this.notionClient.createPersonRecord(personData)

    if (result.success && result.pageId) {
      return result.pageId
    }

    return null
  }

  /**
   * メールアドレスでPersonを検索
   */
  async findByEmail(email: string): Promise<Person | null> {
    const notionPerson = await this.notionClient.findPersonByEmail(email)
    if (notionPerson) {
      return this.toDomainPerson(notionPerson)
    }
    return null
  }

  /**
   * メールアドレスでPersonの存在を確認
   */
  async exists(email: string): Promise<boolean> {
    return (await this.notionClient.findPersonByEmail(email)) !== null
  }

  /**
   * Person作成後、他のレコードから参照可能になるまで待機
   */
  async waitUntilReferenceable(email: string): Promise<boolean> {
    // 暫定的に単純な存在確認を実行
    return await this.exists(email)
  }

  /**
   * NotionページIDでPersonを検索
   */
  async findByNotionPageId(pageId: string): Promise<Person | null> {
    // NotionServiceにpageId検索メソッドが必要
    // 現在はサポートされていないため、nullを返す
    return null
  }

  /**
   * Domain PersonからPersonDataに変換
   */
  private toPersonData(person: Person): PersonData {
    return {
      id: person.id,
      name: person.name,
      email: person.email.value,
      company: person.company || undefined,
      twitterHandle: person.twitterHandle || undefined,
      createdAt: person.createdAt,
    }
  }

  /**
   * NotionデータからDomain Personに変換
   * 注意: Notionから取得したデータの形式に依存
   */
  private toDomainPerson(notionData: unknown): Person {
    // NotionServiceの戻り値形式に合わせて実装が必要
    // 現在はNotionServiceからDomainオブジェクトが直接返されないため
    // この変換メソッドは将来的に実装する必要がある
    throw new Error('NotionデータからDomainオブジェクトへの変換は未実装')
  }
}
