import type { PersonHistoryChange } from '../entities/person.entity'

/**
 * Person履歴記録のポート
 */
export interface PersonHistoryPort {
  /**
   * PersonのNotionページに履歴情報を記録
   * @param personPageId NotionのPersonページID
   * @param changes 履歴変更内容の配列
   */
  recordHistory(personPageId: string, changes: PersonHistoryChange[]): Promise<void>
}
