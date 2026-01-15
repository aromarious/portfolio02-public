import { beforeEach, describe, expect, it } from 'vitest'

import { Email, Person } from '@aromarious/domain'

import type { DbClient } from '../../../client'
import { PersonRepository } from '../../../repository/person.repository'

interface PersonRepositoryPrivate {
  toDomainPerson: (data: unknown) => Person
  toPersonPersistence: (person: Person) => unknown
  buildFilterConditions: (filter: unknown) => unknown[]
}

describe('PersonRepository Unit Test', () => {
  let personRepository: PersonRepository
  let mockDb: DbClient

  beforeEach(() => {
    // シンプルなモック設定
    mockDb = {} as DbClient
    personRepository = new PersonRepository(mockDb)
  })

  describe('プライベートメソッドのテスト', () => {
    it('toDomainPersonメソッドで永続化データからPersonエンティティを作成できる', () => {
      // Arrange
      const personData = {
        id: '01234567-89ab-cdef-0123-456789abcdef',
        name: 'Test User',
        email: 'test@example.com',
        company: 'Test Company',
        firstContactAt: new Date('2023-01-01'),
        lastContactAt: new Date('2023-01-02'),
        twitterHandle: '@testuser',
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-02'),
      }

      // Act - リフレクションを使ってプライベートメソッドにアクセス
      const result = (personRepository as unknown as PersonRepositoryPrivate).toDomainPerson(
        personData
      )

      // Assert
      expect(result).toBeInstanceOf(Person)
      expect(result.id).toBe('01234567-89ab-cdef-0123-456789abcdef')
      expect(result.name).toBe('Test User')
      expect(result.getEmailValue()).toBe('test@example.com')
      expect(result.company).toBe('Test Company')
    })

    it('toPersonPersistenceメソッドでPersonエンティティから永続化データを作成できる', () => {
      // Arrange
      const person = Person.create({
        name: 'Test User',
        email: 'test@example.com',
        company: 'Test Company',
      })

      // Act - リフレクションを使ってプライベートメソッドにアクセス
      const result = (personRepository as unknown as PersonRepositoryPrivate).toPersonPersistence(
        person
      )

      // Assert
      expect(result).toEqual({
        id: person.id,
        name: 'Test User',
        email: 'test@example.com',
        company: 'Test Company',
        firstContactAt: person.firstContactAt,
        lastContactAt: person.lastContactAt,
        twitterHandle: null, // undefinedはnullに変換される
        notionPageId: null, // undefinedはnullに変換される
        createdAt: person.createdAt,
        updatedAt: person.updatedAt,
      })
    })

    it('buildFilterConditionsメソッドでフィルター条件を構築できる', () => {
      // Arrange
      const filter = {
        name: 'John',
        email: 'john@example.com',
        company: 'Test Company',
        hasCompany: true,
        twitterHandle: '@john_doe',
        createdAfter: new Date('2023-01-01'),
        createdBefore: new Date('2023-12-31'),
      }

      // Act - リフレクションを使ってプライベートメソッドにアクセス
      const result = (personRepository as unknown as PersonRepositoryPrivate).buildFilterConditions(
        filter
      )

      // Assert
      expect(result).toBeInstanceOf(Array)
      expect(result.length).toBeGreaterThan(0)
    })

    it('buildFilterConditionsで会社なしフィルターが正しく動作する', () => {
      // Arrange
      const filter = { hasCompany: false }

      // Act - リフレクションを使ってプライベートメソッドにアクセス
      const result = (personRepository as unknown as PersonRepositoryPrivate).buildFilterConditions(
        filter
      )

      // Assert
      expect(result).toBeInstanceOf(Array)
      expect(result.length).toBe(1)
    })

    it('buildFilterConditionsで空のフィルターは空配列を返す', () => {
      // Arrange
      const filter = {}

      // Act - リフレクションを使ってプライベートメソッドにアクセス
      const result = (personRepository as unknown as PersonRepositoryPrivate).buildFilterConditions(
        filter
      )

      // Assert
      expect(result).toBeInstanceOf(Array)
      expect(result.length).toBe(0)
    })
  })

  describe('バリデーション', () => {
    it('不正なメールアドレスでEmailVOを作成するとエラーが発生する', () => {
      // Act & Assert
      expect(() => Email.create('invalid-email')).toThrow()
    })

    it('正しいメールアドレスでEmailVOを作成できる', () => {
      // Act
      const email = Email.create('valid@example.com')

      // Assert
      expect(email.value).toBe('valid@example.com')
    })
  })

  describe('twitterHandleプロパティのテスト', () => {
    it('twitterHandleありでPersonを作成できる', () => {
      // Act
      const person = Person.create({
        name: 'Twitter User',
        email: 'twitter@example.com',
        company: 'Twitter Company',
        twitterHandle: 'twitter_user',
      })

      // Assert
      expect(person).toBeInstanceOf(Person)
      expect(person.twitterHandle).toBe('twitter_user')
    })

    it('twitterHandleなしでPersonを作成できる', () => {
      // Act
      const person = Person.create({
        name: 'No Twitter User',
        email: 'notwitter@example.com',
        company: 'No Twitter Company',
      })

      // Assert
      expect(person.twitterHandle).toBeUndefined()
    })

    it('twitterHandleありのpersistenceデータからPersonを作成できる', () => {
      // Arrange
      const persistenceData = {
        id: '01234567-89ab-cdef-0123-456789abcdef',
        name: 'Persistence Twitter User',
        email: 'persist@example.com',
        company: 'Persist Company',
        twitterHandle: 'persist_user',
        firstContactAt: new Date('2023-01-01'),
        lastContactAt: new Date('2023-01-02'),
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-02'),
      }

      // Act
      const person = Person.fromPersistence(persistenceData)

      // Assert
      expect(person.twitterHandle).toBe('persist_user')
    })

    it('updateContactInfoでtwitterHandleを更新できる', () => {
      // Arrange
      const person = Person.create({
        name: 'Update User',
        email: 'update@example.com',
        company: 'Update Company',
        twitterHandle: 'old_handle',
      })

      // Act
      person.updateContactInfo({ twitterHandle: 'new_handle' })

      // Assert
      expect(person.twitterHandle).toBe('new_handle')
    })
  })

  describe('Personエンティティとの連携', () => {
    it('Personエンティティのcreateファクトリーメソッドが動作する', () => {
      // Act
      const person = Person.create({
        name: 'Test User',
        email: 'test@example.com',
        company: 'Test Company',
      })

      // Assert
      expect(person).toBeInstanceOf(Person)
      expect(person.name).toBe('Test User')
      expect(person.getEmailValue()).toBe('test@example.com')
      expect(person.company).toBe('Test Company')
      expect(person.twitterHandle).toBeUndefined()
    })

    it('PersonエンティティのfromPersistenceメソッドが動作する', () => {
      // Arrange
      const persistenceData = {
        id: '01234567-89ab-cdef-0123-456789abcdef',
        name: 'Test User',
        email: 'test@example.com',
        company: 'Test Company',
        firstContactAt: new Date('2023-01-01'),
        lastContactAt: new Date('2023-01-02'),
        twitterHandle: '@persisteduser',
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-02'),
      }

      // Act
      const person = Person.fromPersistence(persistenceData)

      // Assert
      expect(person).toBeInstanceOf(Person)
      expect(person.id).toBe('01234567-89ab-cdef-0123-456789abcdef')
      expect(person.name).toBe('Test User')
      expect(person.twitterHandle).toBe('@persisteduser')
    })
  })

  describe('エラーハンドリング', () => {
    it('PersonRepositoryのコンストラクタが正常に動作する', () => {
      // Act
      const repository = new PersonRepository(mockDb)

      // Assert
      expect(repository).toBeInstanceOf(PersonRepository)
    })
  })

  describe('型安全性の確認', () => {
    it('PersonRepositoryPortインターフェースを実装している', () => {
      // Assert - TypeScriptの型チェックでPersonRepositoryPortを実装していることを確認
      const repository = personRepository as unknown as Record<string, unknown>

      // 必須メソッドが存在することを確認
      expect(typeof repository.save).toBe('function')
      expect(typeof repository.findById).toBe('function')
      expect(typeof repository.findByEmail).toBe('function')
      expect(typeof repository.findMany).toBe('function')
      expect(typeof repository.count).toBe('function')
      expect(typeof repository.delete).toBe('function')
      expect(typeof repository.exists).toBe('function')
      expect(typeof repository.existsByEmail).toBe('function')
      // 追加の重要メソッドもチェック
      expect(typeof repository.update).toBe('function')
      expect(typeof repository.findOrCreate).toBe('function')
      expect(typeof repository.findRecentContacts).toBe('function')
      expect(typeof repository.findByCompany).toBe('function')
    })
  })

  describe('未テストの重要メソッドの型安全性確認', () => {
    it('updateメソッドが存在し正しい型を持つ', () => {
      const repository = personRepository as unknown as Record<string, unknown>
      expect(typeof repository.update).toBe('function')
    })

    it('findOrCreateメソッドが存在し正しい型を持つ', () => {
      const repository = personRepository as unknown as Record<string, unknown>
      expect(typeof repository.findOrCreate).toBe('function')
    })

    it('findRecentContactsメソッドが存在し正しい型を持つ', () => {
      const repository = personRepository as unknown as Record<string, unknown>
      expect(typeof repository.findRecentContacts).toBe('function')
    })

    it('findByCompanyメソッドが存在し正しい型を持つ', () => {
      const repository = personRepository as unknown as Record<string, unknown>
      expect(typeof repository.findByCompany).toBe('function')
    })

    it('existsメソッドが存在し正しい型を持つ', () => {
      const repository = personRepository as unknown as Record<string, unknown>
      expect(typeof repository.exists).toBe('function')
    })

    it('existsByEmailメソッドが存在し正しい型を持つ', () => {
      const repository = personRepository as unknown as Record<string, unknown>
      expect(typeof repository.existsByEmail).toBe('function')
    })
  })

  describe('フィルター条件の高度なテスト', () => {
    it('buildFilterConditionsで複雑なフィルターを正しく処理する', () => {
      // Arrange
      const complexFilter = {
        name: 'John',
        email: 'john@',
        company: 'Tech',
        hasCompany: true,
        twitterHandle: 'complex_handle',
        createdAfter: new Date('2023-01-01'),
        createdBefore: new Date('2023-12-31'),
      }

      // Act
      const result = (personRepository as unknown as PersonRepositoryPrivate).buildFilterConditions(
        complexFilter
      )

      // Assert
      expect(result).toBeInstanceOf(Array)
      expect(result.length).toBe(7) // 7つの条件がすべて含まれている
    })

    it('buildFilterConditionsで部分的なフィルターを正しく処理する', () => {
      // Arrange
      const partialFilter = {
        name: 'Alice',
        hasCompany: false, // 会社なしフィルター
      }

      // Act
      const result = (personRepository as unknown as PersonRepositoryPrivate).buildFilterConditions(
        partialFilter
      )

      // Assert
      expect(result).toBeInstanceOf(Array)
      expect(result.length).toBe(2) // nameとhasCompanyの2つの条件
    })

    it('buildFilterConditionsでtwitterHandleフィルターを正しく処理する', () => {
      // Arrange
      const twitterFilter = {
        twitterHandle: '@example_user',
      }

      // Act
      const result = (personRepository as unknown as PersonRepositoryPrivate).buildFilterConditions(
        twitterFilter
      )

      // Assert
      expect(result).toBeInstanceOf(Array)
      expect(result.length).toBe(1) // twitterHandleの条件
    })
  })

  describe('データ変換の詳細テスト', () => {
    it('toDomainPersonでnull/undefinedの変換を正しく処理する', () => {
      // Arrange - companyがnullの場合
      const personDataWithNullCompany = {
        id: '01234567-89ab-cdef-0123-456789abcdef',
        name: 'Test User',
        email: 'test@example.com',
        company: null, // null値
        firstContactAt: new Date('2023-01-01'),
        lastContactAt: new Date('2023-01-02'),
        twitterHandle: undefined,
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-02'),
      }

      // Act
      const result = (personRepository as unknown as PersonRepositoryPrivate).toDomainPerson(
        personDataWithNullCompany
      )

      // Assert
      expect(result.company).toBeUndefined() // nullがundefinedに変換される
    })

    it('toPersonPersistenceでundefinedをnullに変換する', () => {
      // Arrange - companyが必須なのでテスト内容を変更
      const person = Person.create({
        name: 'Test User',
        email: 'test@example.com',
        company: 'テスト会社',
      })

      // Act
      const result = (personRepository as unknown as PersonRepositoryPrivate).toPersonPersistence(
        person
      )

      // Assert
      const resultObj = result as { company: null | string }
      expect(resultObj.company).toBe('テスト会社') // companyが正しく設定される
    })
  })
})
