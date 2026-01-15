import type { PersonHistoryChange, PersonHistoryPort } from '@aromarious/domain'

import type { NotionClient } from '../notion/notion-client'

/**
 * Person履歴記録のNotionアダプター
 */
export class PersonHistoryAdapter implements PersonHistoryPort {
  constructor(private notionClient: NotionClient) {}

  async recordHistory(personPageId: string, changes: PersonHistoryChange[]): Promise<void> {
    // 各変更について履歴エントリーを作成
    for (const change of changes) {
      try {
        await this.notionClient.updatePersonHistoryInNotionPage(personPageId, {
          timestamp: change.timestamp,
          changeType: change.changeType,
          oldValue: change.oldValue,
          newValue: change.newValue,
          contactId: change.contactId,
        })
      } catch (error) {
        console.error('Person履歴記録に失敗:', {
          personPageId,
          change,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
        // 履歴記録の失敗は主機能に影響させない
      }
    }
  }
}
