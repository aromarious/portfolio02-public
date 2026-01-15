import type { Person } from '../entities/person.entity'

/**
 * NotionPersonRepositoryPort
 * Notionデータストアに対するPerson操作のポート定義
 */
export interface NotionPersonRepositoryPort {
  /**
   * PersonをNotionに保存
   */
  save(person: Person): Promise<string | null>

  /**
   * メールアドレスでPersonを検索
   */
  findByEmail(email: string): Promise<Person | null>

  /**
   * メールアドレスでPersonの存在を確認
   */
  exists(email: string): Promise<boolean>

  /**
   * Person作成後、他のレコードから参照可能になるまで待機
   */
  waitUntilReferenceable(email: string): Promise<boolean>

  /**
   * NotionページIDでPersonを検索
   */
  findByNotionPageId(pageId: string): Promise<Person | null>
}
