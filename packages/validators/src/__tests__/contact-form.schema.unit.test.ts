import { describe, expect, it } from 'vitest'
import { z } from 'zod/v4'

import type { ContactFormInput } from '../contact-form.schema'
import { contactFormInputSchema } from '../contact-form.schema'

describe('contactFormInputSchema', () => {
  describe('正常系', () => {
    it('有効な入力データを受け入れる', () => {
      const validData: ContactFormInput = {
        name: 'テスト太郎',
        email: 'test@example.com',
        company: 'テスト会社',
        twitterHandle: 'test_user',
        subject: 'テスト件名',
        message: 'テストメッセージ',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        referer: 'https://example.com',
        sessionId: 'session123',
        deviceType: 'desktop',
        browserName: 'Chrome',
        browserVersion: '91.0',
        osName: 'Windows',
        screenResolution: '1920x1080',
        language: 'ja',
        timezone: 'Asia/Tokyo',
        formDuration: 30000,
        previousVisitAt: new Date(),
      }

      const result = contactFormInputSchema.parse(validData)
      expect(result).toEqual(validData)
    })

    it('必須フィールドのみでも受け入れる', () => {
      const minimalData = {
        name: 'テスト太郎',
        email: 'test@example.com',
        subject: 'テスト件名',
        message: 'テストメッセージ',
      }

      const result = contactFormInputSchema.parse(minimalData)
      expect(result.name).toBe('テスト太郎')
      expect(result.email).toBe('test@example.com')
    })
  })

  describe('エラーケース - emailバリデーション', () => {
    it('空のメールアドレスでエラーになる', () => {
      const invalidData = {
        name: 'テスト太郎',
        email: '',
        subject: 'テスト件名',
        message: 'テストメッセージ',
      }

      expect(() => contactFormInputSchema.parse(invalidData)).toThrow()

      const result = contactFormInputSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe('メールアドレスを入力してください')
      }
    })

    it('無効な形式のメールアドレスでエラーになる', () => {
      const invalidData = {
        name: 'テスト太郎',
        email: 'invalid-email',
        subject: 'テスト件名',
        message: 'テストメッセージ',
      }

      const result = contactFormInputSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe('有効なメールアドレスを入力してください')
      }
    })

    it('@マークのないメールアドレスでエラーになる', () => {
      const invalidData = {
        name: 'テスト太郎',
        email: 'testexample.com',
        subject: 'テスト件名',
        message: 'テストメッセージ',
      }

      const result = contactFormInputSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe('有効なメールアドレスを入力してください')
      }
    })

    it('ドメインのないメールアドレスでエラーになる', () => {
      const invalidData = {
        name: 'テスト太郎',
        email: 'test@',
        subject: 'テスト件名',
        message: 'テストメッセージ',
      }

      const result = contactFormInputSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe('有効なメールアドレスを入力してください')
      }
    })
  })

  describe('エラーケース - 必須フィールド', () => {
    it('nameが未定義でエラーになる', () => {
      const invalidData = {
        email: 'test@example.com',
        subject: 'テスト件名',
        message: 'テストメッセージ',
      }

      expect(() => contactFormInputSchema.parse(invalidData)).toThrow()

      const result = contactFormInputSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('emailが未定義でエラーになる', () => {
      const invalidData = {
        name: 'テスト太郎',
        subject: 'テスト件名',
        message: 'テストメッセージ',
      }

      expect(() => contactFormInputSchema.parse(invalidData)).toThrow()

      const result = contactFormInputSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('subjectが未定義でも正常に処理される（optional）', () => {
      const dataWithoutSubject = {
        name: 'テスト太郎',
        email: 'test@example.com',
        message: 'テストメッセージ',
      }

      const result = contactFormInputSchema.safeParse(dataWithoutSubject)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.subject).toBeUndefined()
      }
    })

    it('messageが未定義でエラーになる', () => {
      const invalidData = {
        name: 'テスト太郎',
        email: 'test@example.com',
        subject: 'テスト件名',
      }

      expect(() => contactFormInputSchema.parse(invalidData)).toThrow()

      const result = contactFormInputSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })

  describe('エラーケース - 型不正', () => {
    it('nameが文字列以外でエラーになる', () => {
      const invalidData = {
        name: 123,
        email: 'test@example.com',
        subject: 'テスト件名',
        message: 'テストメッセージ',
      }

      expect(() => contactFormInputSchema.parse(invalidData)).toThrow()

      const result = contactFormInputSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('deviceTypeが無効な値でエラーになる', () => {
      const invalidData = {
        name: 'テスト太郎',
        email: 'test@example.com',
        subject: 'テスト件名',
        message: 'テストメッセージ',
        deviceType: 'invalid-device-type',
      }

      const result = contactFormInputSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('formDurationが数値以外でエラーになる', () => {
      const invalidData = {
        name: 'テスト太郎',
        email: 'test@example.com',
        subject: 'テスト件名',
        message: 'テストメッセージ',
        formDuration: 'not-a-number',
      }

      const result = contactFormInputSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('previousVisitAtが日付以外でエラーになる', () => {
      const invalidData = {
        name: 'テスト太郎',
        email: 'test@example.com',
        subject: 'テスト件名',
        message: 'テストメッセージ',
        previousVisitAt: 'not-a-date',
      }

      const result = contactFormInputSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })

  describe('エラーケース - 境界値', () => {
    it('非常に長いメールアドレスの処理', () => {
      const longEmail = 'a'.repeat(50) + '@' + 'b'.repeat(50) + '.com'
      const dataWithLongEmail = {
        name: 'テスト太郎',
        email: longEmail,
        subject: 'テスト件名',
        message: 'テストメッセージ',
      }

      // Zodの標準emailバリデーションの動作を確認
      const result = contactFormInputSchema.safeParse(dataWithLongEmail)
      // 適度な長さのメールアドレスは有効として処理される
      expect(result.success).toBe(true)
    })

    it('特殊文字を含むメールアドレスの処理', () => {
      const specialCharEmail = 'test+tag@example.com'
      const dataWithSpecialEmail = {
        name: 'テスト太郎',
        email: specialCharEmail,
        subject: 'テスト件名',
        message: 'テストメッセージ',
      }

      const result = contactFormInputSchema.safeParse(dataWithSpecialEmail)
      // +記号を含むメールアドレスは有効
      expect(result.success).toBe(true)
    })
  })

  describe('複数エラーの処理', () => {
    it('複数のフィールドエラーを同時に検出する', () => {
      const multipleErrorsData = {
        name: '', // 空文字（エラーの可能性）
        email: 'invalid-email', // 無効なメール
        subject: '', // 空文字（エラーの可能性）
        message: '', // 空文字（エラーの可能性）
        deviceType: 'invalid-type', // 無効なデバイスタイプ
      }

      const result = contactFormInputSchema.safeParse(multipleErrorsData)
      expect(result.success).toBe(false)
      if (!result.success) {
        // 複数のエラーが検出されることを確認
        expect(result.error.issues.length).toBeGreaterThan(1)
      }
    })
  })
})
