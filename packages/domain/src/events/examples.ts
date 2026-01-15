/**
 * 使用例：イベント駆動システムの基本的な使い方
 *
 * このファイルは、実装したイベントシステムの使用方法を示すサンプルコードです。
 * 実際のアプリケーションでは、DIコンテナやサービス層で設定します。
 */

import { Person } from '../entities/person.entity'
import { setupEventHandlers } from './index'

/**
 * イベント駆動システムの使用例
 */
export async function exampleUsage(): Promise<void> {
  // 1. イベントディスパッチャーをセットアップ
  const eventDispatcher = setupEventHandlers()

  // 2. Personを作成（この時点でPersonCreatedEventが蓄積される）
  const person = Person.create({
    name: '田中太郎',
    email: 'tanaka@example.com',
    company: '株式会社サンプル',
  })

  console.log('Person作成完了。蓄積されたイベント数:', person.domainEvents.length)

  // 3. 蓄積されたイベントを処理
  if (person.domainEvents.length > 0) {
    console.log('イベントを処理中...')
    await eventDispatcher.dispatch(person.domainEvents)

    // 4. イベント処理後はクリア
    person.clearDomainEvents()
    console.log('イベント処理完了。残りのイベント数:', person.domainEvents.length)
  }
}

/**
 * リポジトリでの使用例（疑似コード）
 * 実際には PersonRepository.save() メソッド内で使用
 */
export async function repositoryUsageExample(person: Person): Promise<void> {
  const eventDispatcher = setupEventHandlers()

  // DBに保存後、イベントを発火
  // const savedPerson = await this.db.insert(personTable).values(data)

  if (person.domainEvents.length > 0) {
    await eventDispatcher.dispatch(person.domainEvents)
    person.clearDomainEvents()
  }
}
