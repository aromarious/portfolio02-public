import { describe, expect, it } from 'vitest'

import { Email } from '../../value-objects/email.vo'

describe('Email Value Object', () => {
  describe('正常系', () => {
    it('有効なメールアドレスで作成できる', () => {
      const email = Email.create('user@example.com')
      expect(email.value).toBe('user@example.com')
    })

    it('メールアドレスが正規化される（小文字・トリム）', () => {
      const email = Email.create('  USER@EXAMPLE.COM  ')
      expect(email.value).toBe('user@example.com')
    })

    it('複雑なメールアドレスでも作成できる', () => {
      const email = Email.create('test.email+tag@subdomain.example.org')
      expect(email.value).toBe('test.email+tag@subdomain.example.org')
    })

    it('静的ファクトリーメソッドで作成できる', () => {
      const email = Email.create('factory@example.com')
      expect(email.value).toBe('factory@example.com')
    })
  })

  describe('異常系', () => {
    it('空文字列の場合はエラーを投げる', () => {
      expect(() => Email.create('')).toThrow('メールアドレスは必須です')
    })

    it('nullまたはundefinedの場合はエラーを投げる', () => {
      // biome-ignore lint/suspicious/noExplicitAny: <explanation>
      expect(() => Email.create(null as any)).toThrow()
      // biome-ignore lint/suspicious/noExplicitAny: <explanation>
      expect(() => Email.create(undefined as any)).toThrow()
    })

    it('256文字を超える場合はエラーを投げる', () => {
      const longEmail = `${'a'.repeat(250)}@example.com` // 261文字
      expect(() => Email.create(longEmail)).toThrow('メールアドレスは256文字以内で入力してください')
    })

    it('無効なフォーマットの場合はエラーを投げる', () => {
      expect(() => Email.create('invalid-email')).toThrow(
        '正しいメールアドレス形式で入力してください'
      )
      expect(() => Email.create('invalid@')).toThrow('正しいメールアドレス形式で入力してください')
      expect(() => Email.create('@example.com')).toThrow(
        '正しいメールアドレス形式で入力してください'
      )
      expect(() => Email.create('user@')).toThrow('正しいメールアドレス形式で入力してください')
      expect(() => Email.create('user@domain')).toThrow(
        '正しいメールアドレス形式で入力してください'
      )
    })

    it('スペースが含まれる場合はエラーを投げる', () => {
      expect(() => Email.create('user name@example.com')).toThrow(
        '正しいメールアドレス形式で入力してください'
      )
      expect(() => Email.create('user@exam ple.com')).toThrow(
        '正しいメールアドレス形式で入力してください'
      )
    })
  })

  describe('等価性', () => {
    it('同じメールアドレスのEmailは等価である', () => {
      const email1 = Email.create('user@example.com')
      const email2 = Email.create('user@example.com')
      expect(email1.equals(email2)).toBe(true)
    })

    it('異なるメールアドレスのEmailは等価でない', () => {
      const email1 = Email.create('user1@example.com')
      const email2 = Email.create('user2@example.com')
      expect(email1.equals(email2)).toBe(false)
    })

    it('正規化後に同じになるメールアドレスは等価である', () => {
      const email1 = Email.create('USER@EXAMPLE.COM')
      const email2 = Email.create('user@example.com')
      expect(email1.equals(email2)).toBe(true)
    })
  })
})
