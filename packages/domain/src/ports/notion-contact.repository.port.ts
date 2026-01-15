import type { Contact } from '../entities/contact.entity'
import type { Person } from '../entities/person.entity'

/**
 * NotionContactRepositoryPort
 * Notionデータストアに対するContact操作のポート定義
 */
export interface NotionContactRepositoryPort {
  /**
   * ContactをNotionに保存
   * @param contact 保存するContact
   * @param person 関連するPerson（名前・メール等のデータ取得用）
   * @param personNotionId 関連するPersonのNotionページID（任意）
   * @returns 作成されたContactのNotionページID
   */
  save(contact: Contact, person: Person, personNotionId?: string): Promise<string | null>

  /**
   * Person relationなしでContactを保存（段階的同期用）
   */
  saveWithoutPersonRelation(contact: Contact, person: Person): Promise<string | null>

  /**
   * ContactとPersonの関連を更新
   */
  updatePersonRelation(contactNotionPageId: string, personNotionId: string): Promise<void>

  /**
   * ContactのNotionページ存在を確認
   */
  exists(contactNotionPageId: string): Promise<boolean>

  /**
   * NotionページIDでContactを検索
   */
  findByNotionPageId(pageId: string): Promise<Contact | null>

  /**
   * 複数Contactの段階的同期処理（高度な復旧機能）
   */
  performStagedSync(
    contact: Contact,
    personNotionId?: string,
    existingContactPageId?: string
  ): Promise<{
    success: boolean
    contactPageId?: string
    error?: string
  }>
}
