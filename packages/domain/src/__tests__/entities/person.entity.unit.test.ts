import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { Person, PersonCreatedEvent } from '../../entities/person.entity'
import { Email } from '../../value-objects/email.vo'

describe('Person Entity', () => {
  let validPersonProps: { name: string; email: string; company?: string; twitterHandle?: string }

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-01-01T10:00:00.000Z'))

    validPersonProps = {
      name: '田中太郎',
      email: 'tanaka@example.com',
      company: '株式会社テスト',
      twitterHandle: 'tanaka_taro',
    }
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('作成', () => {
    it('有効なプロパティでPersonを作成できる', () => {
      const person = Person.create(validPersonProps)

      expect(person.name).toBe('田中太郎')
      expect(person.getEmailValue()).toBe('tanaka@example.com')
      expect(person.company).toBe('株式会社テスト')
      expect(person.twitterHandle).toBe('tanaka_taro')
      expect(person.createdAt).toBeInstanceOf(Date)
      expect(person.updatedAt).toBeInstanceOf(Date)
      expect(person.firstContactAt).toBeInstanceOf(Date)
      expect(person.lastContactAt).toBeInstanceOf(Date)
    })

    it('会社名はオプショナルフィールドである', () => {
      const { company, ...propsWithoutCompany } = validPersonProps

      const person = Person.create(propsWithoutCompany)
      expect(person.company).toBeUndefined()
    })

    it('twitterHandleなしでPersonを作成できる', () => {
      const { twitterHandle, ...propsWithoutTwitter } = validPersonProps

      const person = Person.create(propsWithoutTwitter)
      expect(person.twitterHandle).toBeUndefined()
    })

    it('twitterHandleありでPersonを作成できる', () => {
      const person = Person.create(validPersonProps)
      expect(person.twitterHandle).toBe('tanaka_taro')
    })

    it('作成時にPersonCreatedEventが発行される', () => {
      const person = Person.create(validPersonProps)
      const events = person.domainEvents

      expect(events).toHaveLength(1)
      expect(events[0]).toBeInstanceOf(PersonCreatedEvent)
      expect((events[0] as PersonCreatedEvent).personId).toBe(person.id)
      expect((events[0] as PersonCreatedEvent).email).toBe('tanaka@example.com')
    })

    it('名前と会社名がトリムされる', () => {
      const person = Person.create({
        name: '  田中太郎  ',
        email: 'tanaka@example.com',
        company: '  株式会社テスト  ',
        twitterHandle: '  tanaka_taro  ',
      })

      expect(person.name).toBe('田中太郎')
      expect(person.company).toBe('株式会社テスト')
      expect(person.twitterHandle).toBe('tanaka_taro')
    })

    it('IDが自動生成される', () => {
      const person = Person.create(validPersonProps)
      expect(person.id).toBeTruthy()
      expect(typeof person.id).toBe('string')
    })
  })

  describe('バリデーション', () => {
    it('名前が空の場合はエラーを投げる', () => {
      expect(() => Person.create({ ...validPersonProps, name: '' })).toThrow('名前は必須です')
    })

    it('空白文字のみの名前はエラーになる', () => {
      expect(() => Person.create({ ...validPersonProps, name: '   ' })).toThrow('名前は必須です')
    })

    it('名前が256文字を超える場合はエラーを投げる', () => {
      const longName = 'あ'.repeat(257)
      expect(() => Person.create({ ...validPersonProps, name: longName })).toThrow(
        '名前は256文字以内で入力してください'
      )
    })

    it('会社名が256文字を超える場合はエラーを投げる', () => {
      const longCompany = 'あ'.repeat(257)
      expect(() => Person.create({ ...validPersonProps, company: longCompany })).toThrow(
        '会社名は256文字以内で入力してください'
      )
    })

    it('twitterHandleが15文字を超える場合はエラーを投げる', () => {
      const longTwitterHandle = `${'a'.repeat(16)}`
      expect(() =>
        Person.create({ ...validPersonProps, twitterHandle: longTwitterHandle })
      ).toThrow('Twitterハンドルは5-15文字で英数字・アンダースコアのみ使用可能です')
    })

    it('無効なメールアドレスの場合はエラーを投げる', () => {
      expect(() => Person.create({ ...validPersonProps, email: 'invalid-email' })).toThrow(
        '正しいメールアドレス形式で入力してください'
      )
    })

    it('名前が正確に256文字の場合は通る', () => {
      const exactLength = 'あ'.repeat(256)
      const person = Person.create({ ...validPersonProps, name: exactLength })
      expect(person.name).toBe(exactLength)
    })

    it('会社名が正確に256文字の場合は通る', () => {
      const exactLength = 'あ'.repeat(256)
      const person = Person.create({ ...validPersonProps, company: exactLength })
      expect(person.company).toBe(exactLength)
    })

    it('twitterHandleが正確に15文字の場合は通る', () => {
      const exactLength = `${'a'.repeat(15)}`
      const person = Person.create({ ...validPersonProps, twitterHandle: exactLength })
      expect(person.twitterHandle).toBe(exactLength)
    })

    it('空白文字のみの会社名はエラーになる', () => {
      expect(() => Person.create({ ...validPersonProps, company: '   ' })).toThrow(
        '会社名は1文字以上で入力してください'
      )
    })

    it('空白文字のみのtwitterHandleは空文字列扱いになる', () => {
      const person = Person.create({ ...validPersonProps, twitterHandle: '   ' })
      expect(person.twitterHandle).toBe('')
    })

    it('5文字未満のtwitterHandleはエラーになる', () => {
      expect(() => Person.create({ ...validPersonProps, twitterHandle: 'abc' })).toThrow(
        'Twitterハンドルは5-15文字で英数字・アンダースコアのみ使用可能です'
      )
    })

    it('特殊文字を含む名前でも作成できる', () => {
      const specialName = '田中-太郎 (代表)'
      const person = Person.create({ ...validPersonProps, name: specialName })
      expect(person.name).toBe(specialName)
    })
  })

  describe('永続化からの復元', () => {
    it('fromPersistenceで既存データから復元できる', () => {
      const persistenceData = {
        id: 'test-id-123',
        name: '佐藤花子',
        email: 'sato@example.com',
        company: '株式会社ABC',
        twitterHandle: 'sato_hanako',
        firstContactAt: new Date('2023-01-01'),
        lastContactAt: new Date('2023-01-15'),
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-15'),
      }

      const person = Person.fromPersistence(persistenceData)

      expect(person.id).toBe('test-id-123')
      expect(person.name).toBe('佐藤花子')
      expect(person.getEmailValue()).toBe('sato@example.com')
      expect(person.company).toBe('株式会社ABC')
      expect(person.twitterHandle).toBe('sato_hanako')
    })

    it('twitterHandleなしのデータからも復元できる', () => {
      const persistenceData = {
        id: 'test-id-456',
        name: '田中二郎',
        email: 'tanaka2@example.com',
        company: '株式会社XYZ',
        firstContactAt: new Date('2023-02-01'),
        lastContactAt: new Date('2023-02-15'),
        createdAt: new Date('2023-02-01'),
        updatedAt: new Date('2023-02-15'),
      }

      const person = Person.fromPersistence(persistenceData)

      expect(person.id).toBe('test-id-456')
      expect(person.name).toBe('田中二郎')
      expect(person.twitterHandle).toBeUndefined()
    })
  })

  describe('連絡先情報更新', () => {
    let person: Person

    beforeEach(() => {
      person = Person.create(validPersonProps)
    })

    it('名前を更新できる', () => {
      const originalUpdatedAt = person.updatedAt

      // 時間を1秒進める
      vi.advanceTimersByTime(1000)

      person.updateContactInfo({ name: '山田次郎' })

      expect(person.name).toBe('山田次郎')
      expect(person.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime())
    })

    it('会社名を更新できる', () => {
      person.updateContactInfo({ company: '株式会社新会社' })
      expect(person.company).toBe('株式会社新会社')
    })

    it('twitterHandleを更新できる', () => {
      person.updateContactInfo({ twitterHandle: 'new_handle12' })
      expect(person.twitterHandle).toBe('new_handle12')
    })

    it('名前と会社名を同時に更新できる', () => {
      person.updateContactInfo({ name: '山田次郎', company: '株式会社新会社' })
      expect(person.name).toBe('山田次郎')
      expect(person.company).toBe('株式会社新会社')
    })

    it('名前、会社名、twitterHandleを同時に更新できる', () => {
      person.updateContactInfo({
        name: '山田次郎',
        company: '株式会社新会社',
        twitterHandle: 'yamada_jiro2',
      })
      expect(person.name).toBe('山田次郎')
      expect(person.company).toBe('株式会社新会社')
      expect(person.twitterHandle).toBe('yamada_jiro2')
    })

    it('同じ値で更新した場合は変更されない', () => {
      const originalUpdatedAt = person.updatedAt

      person.updateContactInfo({
        name: '田中太郎',
        company: '株式会社テスト',
        twitterHandle: 'tanaka_taro',
      })

      expect(person.updatedAt).toEqual(originalUpdatedAt)
    })

    it('空文字列の会社名はエラーになる', () => {
      expect(() => person.updateContactInfo({ company: '' })).toThrow(
        '会社名は1文字以上で入力してください'
      )
    })

    it('空文字列のtwitterHandleは空文字列に設定される', () => {
      person.updateContactInfo({ twitterHandle: '' })
      expect(person.twitterHandle).toBe('')
    })

    it('5文字未満のtwitterHandleはエラーになる', () => {
      expect(() => person.updateContactInfo({ twitterHandle: 'abc' })).toThrow(
        'Twitterハンドルは5-15文字で英数字・アンダースコアのみ使用可能です'
      )
    })

    it('更新時の名前長さ制限チェック', () => {
      const longName = 'あ'.repeat(257)
      expect(() => person.updateContactInfo({ name: longName })).toThrow(
        '名前は256文字以内で入力してください'
      )
    })

    it('更新時の会社名長さ制限チェック', () => {
      const longCompany = 'あ'.repeat(257)
      expect(() => person.updateContactInfo({ company: longCompany })).toThrow(
        '会社名は256文字以内で入力してください'
      )
    })

    it('更新時のtwitterHandle長さ制限チェック', () => {
      const longTwitterHandle = `${'a'.repeat(16)}`
      expect(() => person.updateContactInfo({ twitterHandle: longTwitterHandle })).toThrow(
        'Twitterハンドルは5-15文字で英数字・アンダースコアのみ使用可能です'
      )
    })
  })

  describe('連絡記録', () => {
    let person: Person

    beforeEach(() => {
      person = Person.create(validPersonProps)
    })

    it('新しい連絡を記録できる', () => {
      const originalLastContact = person.lastContactAt
      const originalUpdatedAt = person.updatedAt

      // 時間を1秒進める
      vi.advanceTimersByTime(1000)

      person.recordNewContact()

      expect(person.lastContactAt.getTime()).toBeGreaterThan(originalLastContact.getTime())
      expect(person.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime())
    })

    it('複数回の連絡を記録できる', () => {
      const originalLastContact = person.lastContactAt

      // 時間を1秒進める
      vi.advanceTimersByTime(1000)

      person.recordNewContact()
      const firstRecord = person.lastContactAt

      // さらに1秒進める
      vi.advanceTimersByTime(1000)

      person.recordNewContact()
      const secondRecord = person.lastContactAt

      expect(firstRecord.getTime()).toBeGreaterThan(originalLastContact.getTime())
      expect(secondRecord.getTime()).toBeGreaterThan(firstRecord.getTime())
    })
  })

  describe('ビジネスロジック', () => {
    let person: Person

    beforeEach(() => {
      person = Person.create(validPersonProps)
    })

    describe('最近の連絡判定', () => {
      it('30日以内の連絡は最近の連絡である', () => {
        expect(person.hasContactedRecently(30)).toBe(true)
      })

      it('指定日数以内の連絡判定ができる', () => {
        expect(person.hasContactedRecently(1)).toBe(true)
        expect(person.hasContactedRecently(0)).toBe(false)
      })

      it('過去の特定日時からの連絡判定ができる', () => {
        // 10日前のPersonを作成
        const pastDate = new Date()
        pastDate.setDate(pastDate.getDate() - 10)

        const pastPerson = Person.fromPersistence({
          id: 'past-id',
          name: '過去の人',
          email: 'past@example.com',
          firstContactAt: pastDate,
          lastContactAt: pastDate,
          createdAt: pastDate,
          updatedAt: pastDate,
        })

        expect(pastPerson.hasContactedRecently(5)).toBe(false)
        expect(pastPerson.hasContactedRecently(15)).toBe(true)
      })
    })

    describe('時間関連の計算', () => {
      it('最後の連絡からの経過時間が正確に計算される', () => {
        const timeSince = person.getTimeSinceLastContact()
        expect(timeSince).toBeLessThan(1000) // 1秒以内
      })

      it('過去の連絡からの経過時間が正確に計算される', () => {
        const pastDate = new Date()
        pastDate.setHours(pastDate.getHours() - 2) // 2時間前

        const pastPerson = Person.fromPersistence({
          id: 'past-id',
          name: '過去の人',
          email: 'past@example.com',
          firstContactAt: pastDate,
          lastContactAt: pastDate,
          createdAt: pastDate,
          updatedAt: pastDate,
        })

        const timeSince = pastPerson.getTimeSinceLastContact()
        expect(timeSince).toBeGreaterThan(7000000) // 約2時間（ミリ秒）
      })
    })

    describe('パフォーマンステスト', () => {
      it('大量の連絡記録でも正常に動作する', () => {
        const originalLastContact = person.lastContactAt

        // 時間を少し進める
        vi.advanceTimersByTime(100)

        for (let i = 0; i < 100; i++) {
          person.recordNewContact()
        }

        expect(person.lastContactAt.getTime()).toBeGreaterThan(originalLastContact.getTime())
      })
    })

    describe('表示用メソッド', () => {
      it('フルネームを取得できる（会社名あり）', () => {
        expect(person.getFullName()).toBe('田中太郎 (株式会社テスト)')
      })

      it('フルネームを取得できる（会社名あり）', () => {
        const personWithCompany = Person.create({
          name: '田中太郎',
          email: 'tanaka@example.com',
          company: 'テスト会社',
        })
        expect(personWithCompany.getFullName()).toBe('田中太郎 (テスト会社)')
      })

      it('メール値を取得できる', () => {
        expect(person.getEmailValue()).toBe('tanaka@example.com')
      })

      it('最後の連絡からの経過時間を取得できる', () => {
        const timeSince = person.getTimeSinceLastContact()
        expect(timeSince).toBeGreaterThanOrEqual(0)
        expect(typeof timeSince).toBe('number')
      })
    })
  })

  describe('Email値オブジェクトの統合', () => {
    it('EmailオブジェクトがPersonに正しく格納される', () => {
      const person = Person.create(validPersonProps)
      expect(person.email).toBeInstanceOf(Email)
      expect(person.email.value).toBe('tanaka@example.com')
    })
  })
})
