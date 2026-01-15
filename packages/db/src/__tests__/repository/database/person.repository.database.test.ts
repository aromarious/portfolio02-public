import { eq } from 'drizzle-orm'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { Email, Person } from '@aromarious/domain'

import type { TestDbClient } from '../../helpers/test-database'
import { PersonRepository } from '../../../repository/person.repository'
import { ContactTable, PersonTable } from '../../../schema'

// グローバルなテストDBを使用するため、vite/setupで定義されたglobalThis.testDbを使用
declare global {
  // eslint-disable-next-line no-var
  var testDb: TestDbClient
}

describe('PersonRepository統合テスト (PostgreSQL)', () => {
  let repository: PersonRepository

  beforeEach(async () => {
    // グローバルなテストDBインスタンスを使用
    repository = new PersonRepository(globalThis.testDb as never)
  })

  afterEach(async () => {
    // テスト後にクリーンアップを行い、テスト間の影響を避ける
    // 外部キー制約を考慮してContactを先に削除
    await globalThis.testDb.delete(ContactTable)
    await globalThis.testDb.delete(PersonTable)
  })

  describe('twitterHandleプロパティのテスト', () => {
    it('twitterHandleありでPersonを保存できる', async () => {
      const person = Person.create({
        name: 'Twitter太郎',
        email: 'twitter@example.com',
        company: 'ツイッター会社',
        twitterHandle: 'twitter_taro',
      })

      const savedPerson = await repository.save(person)

      expect(savedPerson.twitterHandle).toBe('twitter_taro')

      // データベースにも保存されていることを確認
      const [dbRecord] = await globalThis.testDb
        .select()
        .from(PersonTable)
        .where(eq(PersonTable.id, person.id))

      expect(dbRecord).toBeTruthy()
      if (dbRecord) {
        expect(dbRecord.twitterHandle).toBe('twitter_taro')
      }
    })

    it('twitterHandleの更新ができる', async () => {
      const person = Person.create({
        name: 'ハンドル更新',
        email: 'handle-update@example.com',
        company: 'ハンドル更新会社',
        twitterHandle: 'old_handle',
      })
      await repository.save(person)

      // twitterHandleを更新
      person.updateContactInfo({ twitterHandle: 'new_handle' })
      const updatedPerson = await repository.update(person)

      expect(updatedPerson.twitterHandle).toBe('new_handle')

      // データベースでも更新されていることを確認
      const [dbRecord] = await globalThis.testDb
        .select()
        .from(PersonTable)
        .where(eq(PersonTable.id, person.id))

      if (dbRecord) {
        expect(dbRecord.twitterHandle).toBe('new_handle')
      }
    })

    it('twitterHandleでフィルタリングできる', async () => {
      // テスト用のPersonを作成
      const person1 = Person.create({
        name: 'フィルター1',
        email: 'filter1@example.com',
        company: 'フィルター会社1',
        twitterHandle: 'filter_user_1',
      })
      const person2 = Person.create({
        name: 'フィルター2',
        email: 'filter2@example.com',
        company: 'フィルター会社2',
        twitterHandle: 'filter_user_2',
      })
      const person3 = Person.create({
        name: 'フィルター3',
        email: 'filter3@example.com',
        company: 'フィルター会社3',
        // twitterHandleなし
      })

      await repository.save(person1)
      await repository.save(person2)
      await repository.save(person3)

      // twitterHandleでフィルタリング
      const results = await repository.findMany({
        name: 'フィルター', // 部分マッチでテストデータのみを取得
      })

      // twitterHandleがあるものとないものが混在していることを確認
      const withTwitter = results.filter((p) => p.twitterHandle !== undefined)
      const withoutTwitter = results.filter((p) => p.twitterHandle === undefined)

      expect(withTwitter.length).toBeGreaterThanOrEqual(2)
      expect(withoutTwitter.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('save', () => {
    it('新しいPersonを保存できる', async () => {
      const person = Person.create({
        name: '田中太郎',
        email: 'tanaka@example.com',
        company: '株式会社テスト',
      })

      const savedPerson = await repository.save(person)

      expect(savedPerson.id).toBe(person.id)
      expect(savedPerson.name).toBe('田中太郎')
      expect(savedPerson.getEmailValue()).toBe('tanaka@example.com')
      expect(savedPerson.company).toBe('株式会社テスト')
      expect(savedPerson.twitterHandle).toBeUndefined()

      // データベースにも保存されていることを確認
      const [dbRecord] = await globalThis.testDb
        .select()
        .from(PersonTable)
        .where(eq(PersonTable.id, person.id))

      expect(dbRecord).toBeTruthy()
      if (dbRecord) {
        expect(dbRecord.name).toBe('田中太郎')
        expect(dbRecord.email).toBe('tanaka@example.com')
      }
    })

    it('会社名ありのPersonを保存できる', async () => {
      const person = Person.create({
        name: '佐藤花子',
        email: 'sato@example.com',
        company: '佐藤商事',
      })

      const savedPerson = await repository.save(person)

      expect(savedPerson.company).toBe('佐藤商事')
    })
  })

  describe('findById', () => {
    it('IDでPersonを検索できる', async () => {
      const person = Person.create({
        name: '検索ユーザー',
        email: 'search@example.com',
        company: '検索会社',
      })
      await repository.save(person)

      const found = await repository.findById(person.id)

      expect(found).not.toBeNull()
      if (found) {
        expect(found.id).toBe(person.id)
        expect(found.name).toBe('検索ユーザー')
        expect(found.getEmailValue()).toBe('search@example.com')
      }
    })

    it('存在しないIDの場合はnullを返す', async () => {
      const found = await repository.findById('non-existent-id')
      expect(found).toBeNull()
    })
  })

  describe('findByEmail', () => {
    it('メールアドレスでPersonを検索できる', async () => {
      const person = Person.create({
        name: 'メール検索',
        email: 'email@example.com',
        company: 'メール検索会社',
      })
      await repository.save(person)

      const email = Email.create('email@example.com')
      const found = await repository.findByEmail(email)

      expect(found).not.toBeNull()
      if (found) {
        expect(found.getEmailValue()).toBe('email@example.com')
        expect(found.name).toBe('メール検索')
      }
    })

    it('存在しないメールアドレスの場合はnullを返す', async () => {
      const email = Email.create('nonexistent@example.com')
      const found = await repository.findByEmail(email)
      expect(found).toBeNull()
    })
  })

  describe('count', () => {
    it('空のテーブルでは0を返す', async () => {
      const result = await repository.count()
      expect(result).toBe(0)
    })

    it('正しい件数を返す', async () => {
      const person1 = Person.create({
        name: 'User 1',
        email: 'user1@example.com',
        company: 'User 1 会社',
      })
      const person2 = Person.create({
        name: 'User 2',
        email: 'user2@example.com',
        company: 'User 2 会社',
      })

      await repository.save(person1)
      await repository.save(person2)

      const result = await repository.count()
      expect(result).toBe(2)
    })
  })

  describe('エラーハンドリング', () => {
    it('重複したメールアドレスで保存時にエラーが発生する', async () => {
      const person1 = Person.create({
        name: 'ユーザー1',
        email: 'duplicate@example.com',
        company: 'ユーザー1会社',
      })
      await repository.save(person1)

      const person2 = Person.create({
        name: 'ユーザー2',
        email: 'duplicate@example.com',
        company: 'ユーザー2会社',
      })

      await expect(repository.save(person2)).rejects.toThrow()
    })
  })

  describe('update', () => {
    it('既存のPersonを更新できる', async () => {
      // 新しいPersonを作成・保存
      const person = Person.create({
        name: '更新前の名前',
        email: 'update-test@example.com',
        company: '更新前の会社',
      })
      await repository.save(person)

      // 連絡先情報を更新
      person.updateContactInfo({
        name: '更新後の名前',
        company: '更新後の会社',
        twitterHandle: 'updated_handle',
      })

      const updatedPerson = await repository.update(person)

      expect(updatedPerson.name).toBe('更新後の名前')
      expect(updatedPerson.company).toBe('更新後の会社')
      expect(updatedPerson.twitterHandle).toBe('updated_handle')
      expect(updatedPerson.getEmailValue()).toBe('update-test@example.com') // メールは変更なし

      // データベースでも更新されていることを確認
      const [dbRecord] = await globalThis.testDb
        .select()
        .from(PersonTable)
        .where(eq(PersonTable.id, person.id))

      if (dbRecord) {
        expect(dbRecord.name).toBe('更新後の名前')
        expect(dbRecord.company).toBe('更新後の会社')
        expect(dbRecord.twitterHandle).toBe('updated_handle')
      }
    })

    it('存在しないPersonを更新しようとしてもエラーにならない', async () => {
      // 存在しないIDで直接Personオブジェクトを作成
      const fakeId = '00000000-1111-2222-3333-444444444444'
      const now = new Date()
      const nonExistentPerson = Person.fromPersistence({
        id: fakeId,
        name: '存在しないユーザー',
        email: 'nonexistent@example.com',
        company: 'undefined company',
        firstContactAt: now,
        lastContactAt: now,
        twitterHandle: undefined,
        createdAt: now,
        updatedAt: now,
      })

      // 更新してもエラーにならない（ただし何も更新されない）
      await expect(repository.update(nonExistentPerson)).resolves.toBeDefined()
    })
  })

  describe('findOrCreate', () => {
    it('存在しないPersonの場合は新規作成する', async () => {
      const result = await repository.findOrCreate(
        'new-user@example.com',
        '新規ユーザー',
        '新規会社'
      )

      expect(result.name).toBe('新規ユーザー')
      expect(result.getEmailValue()).toBe('new-user@example.com')
      expect(result.company).toBe('新規会社')
      expect(result.twitterHandle).toBeUndefined()

      // データベースにも保存されていることを確認
      const found = await repository.findByEmail(Email.create('new-user@example.com'))
      expect(found).not.toBeNull()
    })

    it('既存のPersonが見つかった場合は情報を更新する', async () => {
      // 既存のPersonを作成
      const existingPerson = Person.create({
        name: '既存ユーザー',
        email: 'existing@example.com',
        company: '既存会社',
      })
      await repository.save(existingPerson)

      // 異なる情報でfindOrCreateを実行
      const result = await repository.findOrCreate(
        'existing@example.com',
        '更新されたユーザー',
        '更新された会社'
      )

      expect(result.id).toBe(existingPerson.id) // 同じPersonオブジェクト
      expect(result.name).toBe('更新されたユーザー')
      expect(result.company).toBe('更新された会社')
    })

    it('既存のPersonと同じ情報の場合は更新せずそのまま返す', async () => {
      const existingPerson = Person.create({
        name: '同じユーザー',
        email: 'same@example.com',
        company: '同じ会社',
      })
      await repository.save(existingPerson)

      const result = await repository.findOrCreate('same@example.com', '同じユーザー', '同じ会社')

      expect(result.id).toBe(existingPerson.id)
      expect(result.name).toBe('同じユーザー')
      expect(result.company).toBe('同じ会社')
    })
  })

  describe('exists と existsByEmail', () => {
    it('存在するPersonのIDでexistsはtrueを返す', async () => {
      const person = Person.create({
        name: '存在チェック',
        email: 'exists@example.com',
        company: '存在チェック会社',
      })
      await repository.save(person)

      const exists = await repository.exists(person.id)
      expect(exists).toBe(true)
    })

    it('存在しないIDでexistsはfalseを返す', async () => {
      const exists = await repository.exists('00000000-1111-2222-3333-444444444444')
      expect(exists).toBe(false)
    })

    it('不正なUUID形式でexistsはfalseを返す', async () => {
      const exists = await repository.exists('invalid-uuid')
      expect(exists).toBe(false)
    })

    it('存在するメールアドレスでexistsByEmailはtrueを返す', async () => {
      const person = Person.create({
        name: 'メール存在チェック',
        email: 'email-exists@example.com',
        company: 'メール存在チェック会社',
      })
      await repository.save(person)

      const exists = await repository.existsByEmail(Email.create('email-exists@example.com'))
      expect(exists).toBe(true)
    })

    it('存在しないメールアドレスでexistsByEmailはfalseを返す', async () => {
      const exists = await repository.existsByEmail(Email.create('nonexistent@example.com'))
      expect(exists).toBe(false)
    })
  })

  describe('delete', () => {
    it('既存のPersonを削除できる', async () => {
      const person = Person.create({
        name: '削除テスト',
        email: 'delete-test@example.com',
        company: '削除テスト会社',
      })
      await repository.save(person)

      // 削除前に存在することを確認
      const beforeDelete = await repository.findById(person.id)
      expect(beforeDelete).not.toBeNull()

      // 削除実行
      await repository.delete(person.id)

      // 削除後に存在しないことを確認
      const afterDelete = await repository.findById(person.id)
      expect(afterDelete).toBeNull()

      const exists = await repository.exists(person.id)
      expect(exists).toBe(false)
    })

    it('存在しないIDの削除は何もしない', async () => {
      // エラーを投げずに正常に完了することを確認
      await expect(
        repository.delete('00000000-1111-2222-3333-444444444444')
      ).resolves.toBeUndefined()
    })
  })

  describe('findMany, findFrequentContacts, findRecentContacts, findByCompany', () => {
    beforeEach(async () => {
      // テストデータを準備
      const testPersons = [
        Person.create({
          name: '高頻度ユーザー',
          email: 'frequent@example.com',
          company: 'テスト会社A',
        }),
        Person.create({
          name: '低頻度ユーザー',
          email: 'infrequent@example.com',
          company: 'テスト会社B',
        }),
        Person.create({
          name: '会社なしユーザー',
          email: 'nocompany@example.com',
          company: '会社なしユーザー会社',
        }),
      ]

      for (const person of testPersons) {
        await repository.save(person)
      }

      // 高頻度ユーザーのtwitterHandleを設定（直接データベース更新）
      await globalThis.testDb
        .update(PersonTable)
        .set({ twitterHandle: 'frequent_user' })
        .where(eq(PersonTable.email, 'frequent@example.com'))
    })

    it('findManyですべてのPersonを取得できる', async () => {
      const results = await repository.findMany()
      expect(results.length).toBeGreaterThanOrEqual(3)
    })

    it('findManyで会社名でフィルタリングできる', async () => {
      const results = await repository.findMany({ company: 'テスト会社A' })
      expect(results.length).toBe(1)
      expect(results[0]!.company).toBe('テスト会社A')
    })

    it('findManyで会社ありフィルターが動作する', async () => {
      const results = await repository.findMany({ hasCompany: true })
      expect(results.length).toBeGreaterThanOrEqual(2)
      expect(results.every((p) => p.company !== undefined)).toBe(true)
    })

    it('findManyで会社なしフィルターが動作する', async () => {
      const results = await repository.findMany({ hasCompany: false })
      // 現在のスキーマでは会社は必須項目なので、結果は0件になる
      expect(results.length).toBe(0)
    })

    it('findRecentContactsで最近の連絡者を取得できる', async () => {
      // 最近の連絡者として設定（データベース直接更新）
      const recentDate = new Date()
      await globalThis.testDb
        .update(PersonTable)
        .set({ lastContactAt: recentDate })
        .where(eq(PersonTable.email, 'frequent@example.com'))

      const results = await repository.findRecentContacts(30)
      expect(results.length).toBeGreaterThanOrEqual(1)
    })

    it('findByCompanyで会社別にPersonを取得できる', async () => {
      const results = await repository.findByCompany('テスト会社A')
      expect(results.length).toBe(1)
      expect(results[0]!.company).toBe('テスト会社A')
    })
  })
})
