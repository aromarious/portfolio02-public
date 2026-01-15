import { eq } from 'drizzle-orm'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { Contact } from '@aromarious/domain'

import type { TestDbClient } from '../../helpers/test-database'
import { ContactRepository } from '../../../repository/contact.repository'
import { ContactTable, PersonTable } from '../../../schema'

// グローバルなテストDBを使用するため、vite/setupで定義されたglobalThis.testDbを使用
declare global {
  // eslint-disable-next-line no-var
  var testDb: TestDbClient
}

describe('ContactRepository統合テスト (PostgreSQL)', () => {
  let repository: ContactRepository
  let testPersonId: string

  beforeEach(async () => {
    // グローバルなテストDBインスタンスを使用
    repository = new ContactRepository(globalThis.testDb as never)

    // テスト用のPersonを作成
    const [person] = await globalThis.testDb
      .insert(PersonTable)
      .values({
        name: 'テストユーザー',
        email: `test-${Date.now()}@example.com`, // ユニークなEmailを使用
        company: 'テスト会社',
      })
      .returning()

    testPersonId = person!.id
  })

  afterEach(async () => {
    // テスト後にクリーンアップを行い、テスト間の影響を避ける
    await globalThis.testDb.delete(ContactTable)
    await globalThis.testDb.delete(PersonTable)
  })

  describe('save', () => {
    it('新しいContactを保存できる', async () => {
      const contact = Contact.create({
        personId: testPersonId,
        inquirerName: 'Test Name',
        inquirerEmail: 'test@example.com',
        subject: 'テスト件名',
        message: 'テストメッセージです',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        browserName: 'Chrome',
        browserVersion: '120.0',
        osName: 'Windows',
        deviceType: 'desktop',
        timezone: 'Asia/Tokyo',
        language: 'ja',
      })

      const savedContact = await repository.save(contact)

      expect(savedContact.id).toBe(contact.id)
      expect(savedContact.personId).toBe(testPersonId)
      expect(savedContact.subject).toBe('テスト件名')
      expect(savedContact.message).toBe('テストメッセージです')
      expect(savedContact.notionSynced).toBe(false)
      expect(savedContact.slackNotified).toBe(false)

      // データベースにも保存されていることを確認
      const [dbRecord] = await globalThis.testDb
        .select()
        .from(ContactTable)
        .where(eq(ContactTable.id, contact.id))

      expect(dbRecord).toBeTruthy()
      if (dbRecord) {
        expect(dbRecord.personId).toBe(testPersonId)
        expect(dbRecord.subject).toBe('テスト件名')
        expect(dbRecord.message).toBe('テストメッセージです')
        expect(dbRecord.notionSynced).toBe(false)
        expect(dbRecord.slackNotified).toBe(false)
      }
    })

    it('必須フィールドのみでContactを保存できる', async () => {
      const contact = Contact.create({
        personId: testPersonId,
        inquirerName: 'Test Name',
        inquirerEmail: 'test@example.com',
        subject: 'ミニマル件名',
        message: 'ミニマルメッセージ',
      })

      const savedContact = await repository.save(contact)

      expect(savedContact.personId).toBe(testPersonId)
      expect(savedContact.subject).toBe('ミニマル件名')
      expect(savedContact.notionSynced).toBe(false) // デフォルト値
    })

    it('外部同期フラグ付きのContactを保存できる', async () => {
      const contact = Contact.create({
        personId: testPersonId,
        inquirerName: 'Test Name',
        inquirerEmail: 'test@example.com',
        subject: '同期テスト',
        message: 'テストメッセージ',
      })

      // 外部同期フラグを設定
      contact.markNotionSynced()
      contact.markSlackNotified()

      const savedContact = await repository.save(contact)

      expect(savedContact.notionSynced).toBe(true)
      expect(savedContact.slackNotified).toBe(true)
      expect(savedContact.notionSyncedAt).toBeInstanceOf(Date)
      expect(savedContact.slackNotifiedAt).toBeInstanceOf(Date)
    })
  })

  describe('update', () => {
    it('既存のContactを更新できる', async () => {
      // 初期データを保存
      const contact = Contact.create({
        personId: testPersonId,
        inquirerName: 'Test Name',
        inquirerEmail: 'test@example.com',
        subject: '更新前件名',
        message: '更新前メッセージ',
      })
      await repository.save(contact)

      // Contactの更新テストではNotion同期フラグを変更
      contact.markNotionSynced()

      const updatedContact = await repository.update(contact)

      expect(updatedContact.notionSynced).toBe(true)

      // データベースも更新されていることを確認
      const [dbRecord] = await globalThis.testDb
        .select()
        .from(ContactTable)
        .where(eq(ContactTable.id, contact.id))

      if (dbRecord) {
        expect(dbRecord.notionSynced).toBe(true)
      }
    })

    it('Notion同期ステータスを更新できる', async () => {
      const contact = Contact.create({
        personId: testPersonId,
        inquirerName: 'Test Name',
        inquirerEmail: 'test@example.com',
        subject: 'Notion同期テスト',
        message: 'テストメッセージ',
      })
      await repository.save(contact)

      contact.markNotionSynced()

      const updatedContact = await repository.update(contact)

      expect(updatedContact.notionSynced).toBe(true)

      // データベースも更新されていることを確認
      const [dbRecord] = await globalThis.testDb
        .select()
        .from(ContactTable)
        .where(eq(ContactTable.id, contact.id))

      if (dbRecord) {
        expect(dbRecord.notionSynced).toBe(true)
        // 同期日時は実装の詳細によりテストから除外
      }
    })

    it('Slack通知ステータスを更新できる', async () => {
      const contact = Contact.create({
        personId: testPersonId,
        inquirerName: 'Test Name',
        inquirerEmail: 'test@example.com',
        subject: 'Slack通知テスト',
        message: 'テストメッセージ',
      })
      await repository.save(contact)

      contact.markSlackNotified()

      const updatedContact = await repository.update(contact)

      expect(updatedContact.slackNotified).toBe(true)

      // データベースも更新されていることを確認
      const [dbRecord] = await globalThis.testDb
        .select()
        .from(ContactTable)
        .where(eq(ContactTable.id, contact.id))

      if (dbRecord) {
        expect(dbRecord.slackNotified).toBe(true)
        // 通知日時は実装の詳細によりテストから除外
      }
    })
  })

  describe('findById', () => {
    it('IDでContactを検索できる', async () => {
      const contact = Contact.create({
        personId: testPersonId,
        inquirerName: 'Test Name',
        inquirerEmail: 'test@example.com',
        subject: '検索テスト件名',
        message: '検索テストメッセージ',
        ipAddress: '192.168.1.100',
      })
      await repository.save(contact)

      const foundContact = await repository.findById(contact.id)

      expect(foundContact).not.toBeNull()
      if (foundContact) {
        expect(foundContact.id).toBe(contact.id)
        expect(foundContact.subject).toBe('検索テスト件名')
        expect(foundContact.ipAddress).toBe('192.168.1.100')
      }
    })

    it('存在しないIDでは何も返さない', async () => {
      const foundContact = await repository.findById('550e8400-e29b-41d4-a716-446655440999')
      expect(foundContact).toBeNull()
    })

    it('外部同期フラグ付きのContactを正しく取得できる', async () => {
      const contact = Contact.create({
        personId: testPersonId,
        inquirerName: 'Test Name',
        inquirerEmail: 'test@example.com',
        subject: '同期検索テスト',
        message: 'テストメッセージ',
      })

      // 外部同期フラグを設定
      contact.markNotionSynced()
      await repository.save(contact)

      const foundContact = await repository.findById(contact.id)

      expect(foundContact).not.toBeNull()
      if (foundContact) {
        expect(foundContact.notionSynced).toBe(true)
        expect(foundContact.notionSyncedAt).toBeInstanceOf(Date)
        expect(foundContact.slackNotified).toBe(false)
      }
    })
  })

  describe('findByPersonId', () => {
    it('PersonIDでContactsを検索できる', async () => {
      // 複数のContactを作成
      const contact1 = Contact.create({
        personId: testPersonId,
        inquirerName: 'Test Name',
        inquirerEmail: 'test@example.com',
        subject: 'Contact 1',
        message: 'Message 1',
      })

      const contact2 = Contact.create({
        personId: testPersonId,
        inquirerName: 'Test Name',
        inquirerEmail: 'test@example.com',
        subject: 'Contact 2',
        message: 'Message 2',
      })

      await repository.save(contact1)
      await repository.save(contact2)

      const contacts = await repository.findByPersonId(testPersonId)

      expect(contacts).toHaveLength(2)
      expect(contacts.map((c) => c.subject)).toEqual(
        expect.arrayContaining(['Contact 1', 'Contact 2'])
      )
    })

    it('該当するContactがない場合は空配列を返す', async () => {
      const contacts = await repository.findByPersonId('550e8400-e29b-41d4-a716-446655440999')
      expect(contacts).toEqual([])
    })
  })

  describe('findMany with filters', () => {
    it('フィルターでContactsを検索できる', async () => {
      // 異なるフラグのContactを作成
      const syncedContact = Contact.create({
        personId: testPersonId,
        inquirerName: 'Test Name',
        inquirerEmail: 'test@example.com',
        subject: 'Synced Contact',
        message: 'Synced Message',
      })
      syncedContact.markNotionSynced()

      const unsyncedContact = Contact.create({
        personId: testPersonId,
        inquirerName: 'Test Name',
        inquirerEmail: 'test@example.com',
        subject: 'Unsynced Contact',
        message: 'Unsynced Message',
      })

      await repository.save(syncedContact)
      await repository.save(unsyncedContact)

      const syncedContacts = await repository.findMany({ notionSynced: true })
      const unsyncedContacts = await repository.findMany({ notionSynced: false })

      expect(syncedContacts).toHaveLength(1)
      expect(syncedContacts[0]!.subject).toBe('Synced Contact')

      expect(unsyncedContacts).toHaveLength(1)
      expect(unsyncedContacts[0]!.subject).toBe('Unsynced Contact')
    })
  })

  describe('findUnsyncedForNotion', () => {
    it('Notion同期が必要なContactsを取得できる', async () => {
      const needsSyncContact = Contact.create({
        personId: testPersonId,
        inquirerName: 'Test Name',
        inquirerEmail: 'test@example.com',
        subject: 'Needs Sync',
        message: 'Sync Message',
      })

      const syncedContact = Contact.create({
        personId: testPersonId,
        inquirerName: 'Test Name',
        inquirerEmail: 'test@example.com',
        subject: 'Already Synced',
        message: 'Synced Message',
      })
      syncedContact.markNotionSynced()

      await repository.save(needsSyncContact)
      await repository.save(syncedContact)

      const needsSyncContacts = await repository.findUnsyncedForNotion()

      expect(needsSyncContacts).toHaveLength(1)
      expect(needsSyncContacts[0]!.subject).toBe('Needs Sync')
    })
  })

  describe('findUnnotifiedForSlack', () => {
    it('Slack通知が必要なContactsを取得できる', async () => {
      const needsNotificationContact = Contact.create({
        personId: testPersonId,
        inquirerName: 'Test Name',
        inquirerEmail: 'test@example.com',
        subject: 'Needs Notification',
        message: 'Notification Message',
      })

      const notifiedContact = Contact.create({
        personId: testPersonId,
        inquirerName: 'Test Name',
        inquirerEmail: 'test@example.com',
        subject: 'Already Notified',
        message: 'Notified Message',
      })
      notifiedContact.markSlackNotified()

      await repository.save(needsNotificationContact)
      await repository.save(notifiedContact)

      const needsNotificationContacts = await repository.findUnnotifiedForSlack()

      expect(needsNotificationContacts).toHaveLength(1)
      expect(needsNotificationContacts[0]!.subject).toBe('Needs Notification')
    })
  })

  describe('findMany with filters', () => {
    beforeEach(async () => {
      // テストデータの準備
      const contacts = [
        Contact.create({
          personId: testPersonId,
          inquirerName: 'Test Name',
          inquirerEmail: 'test@example.com',
          subject: 'Synced Contact',
          message: 'Message 1',
        }),
        Contact.create({
          personId: testPersonId,
          inquirerName: 'Test Name',
          inquirerEmail: 'test@example.com',
          subject: 'Notified Contact',
          message: 'Message 2',
        }),
        Contact.create({
          personId: testPersonId,
          inquirerName: 'Test Name',
          inquirerEmail: 'test@example.com',
          subject: 'Regular Contact',
          message: 'Message 3',
        }),
      ]

      // 外部同期フラグを設定
      contacts[0]!.markNotionSynced()
      contacts[1]!.markSlackNotified()

      for (const contact of contacts) {
        await repository.save(contact)
      }
    })

    it('Notion同期ステータスでフィルタリングできる', async () => {
      const syncedResult = await repository.findMany(
        { notionSynced: true },
        { limit: 10, offset: 0 }
      )
      const unsyncedResult = await repository.findMany(
        { notionSynced: false },
        { limit: 10, offset: 0 }
      )

      expect(syncedResult).toHaveLength(1)
      expect(syncedResult[0]!.subject).toBe('Synced Contact')
      expect(unsyncedResult).toHaveLength(2)
    })

    it('Slack通知ステータスでフィルタリングできる', async () => {
      const notifiedResult = await repository.findMany(
        { slackNotified: true },
        { limit: 10, offset: 0 }
      )
      const unnotifiedResult = await repository.findMany(
        { slackNotified: false },
        { limit: 10, offset: 0 }
      )

      expect(notifiedResult).toHaveLength(1)
      expect(notifiedResult[0]!.subject).toBe('Notified Contact')
      expect(unnotifiedResult).toHaveLength(2)
    })

    it('日付範囲でフィルタリングできる', async () => {
      const today = new Date()
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
      const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000)

      const result = await repository.findMany(
        { createdAfter: yesterday, createdBefore: tomorrow },
        { limit: 10, offset: 0 }
      )

      expect(result).toHaveLength(3)
    })

    it('ページネーションが機能する', async () => {
      const page1 = await repository.findMany({}, { limit: 2, offset: 0 })
      const page2 = await repository.findMany({}, { limit: 2, offset: 2 })

      expect(page1).toHaveLength(2)
      expect(page2).toHaveLength(1)

      const total = await repository.count()
      expect(total).toBe(3)
    })

    it('複数の条件を組み合わせてフィルタリングできる', async () => {
      const result = await repository.findMany(
        { personId: testPersonId, notionSynced: true },
        { limit: 10, offset: 0 }
      )

      expect(result).toHaveLength(1)
      expect(result[0]!.subject).toBe('Synced Contact')
    })
  })

  describe('delete', () => {
    it('Contactを削除できる', async () => {
      const contact = Contact.create({
        personId: testPersonId,
        inquirerName: 'Test Name',
        inquirerEmail: 'test@example.com',
        subject: '削除テスト',
        message: '削除メッセージ',
      })
      await repository.save(contact)

      // 削除前に存在することを確認
      const beforeDelete = await repository.findById(contact.id)
      expect(beforeDelete).not.toBeNull()

      // 削除実行
      await repository.delete(contact.id)

      // 削除後に存在しないことを確認
      const afterDelete = await repository.findById(contact.id)
      expect(afterDelete).toBeNull()
    })

    it('存在しないIDの削除は何もしない', async () => {
      // エラーを投げずに正常に完了することを確認
      await expect(
        repository.delete('550e8400-e29b-41d4-a716-446655440999')
      ).resolves.toBeUndefined()
    })
  })
})
