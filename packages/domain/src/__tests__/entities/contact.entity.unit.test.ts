import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { Contact, ContactCreatedEvent } from '../../entities/contact.entity'

describe('Contact Entity', () => {
  let validContactProps: {
    personId: string
    inquirerName: string
    inquirerEmail: string
    inquirerCompany?: string
    subject: string
    message: string
    ipAddress?: string
    userAgent?: string
    browserName?: string
    browserVersion?: string
    osName?: string
    deviceType?: 'desktop' | 'mobile' | 'tablet'
    screenResolution?: string
    timezone?: string
    language?: string
    referer?: string
    sessionId?: string
    formDuration?: number
    previousVisitAt?: Date
  }

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-01-01T10:00:00.000Z'))

    validContactProps = {
      personId: '550e8400-e29b-41d4-a716-446655440000',
      inquirerName: '田中太郎',
      inquirerEmail: 'tanaka@example.com',
      inquirerCompany: 'テスト株式会社',
      subject: 'テスト件名',
      message: 'テストメッセージです',
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0',
      browserName: 'Chrome',
      browserVersion: '120.0',
      osName: 'Windows',
      deviceType: 'desktop',
      screenResolution: '1920x1080',
      timezone: 'Asia/Tokyo',
      language: 'ja',
      referer: 'https://example.com',
      sessionId: 'session-123',
      formDuration: 120,
      previousVisitAt: new Date('2023-01-01'),
    }
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('作成', () => {
    it('有効なプロパティでContactを作成できる', () => {
      const contact = Contact.create(validContactProps)

      expect(contact.personId).toBe('550e8400-e29b-41d4-a716-446655440000')
      expect(contact.subject).toBe('テスト件名')
      expect(contact.message).toBe('テストメッセージです')
      expect(contact.notionSynced).toBe(false)
      expect(contact.slackNotified).toBe(false)
      expect(contact.createdAt).toBeInstanceOf(Date)
      expect(contact.updatedAt).toBeInstanceOf(Date)
    })

    it('オプション項目なしでContactを作成できる', () => {
      const minimalProps = {
        personId: validContactProps.personId,
        inquirerName: validContactProps.inquirerName,
        inquirerEmail: validContactProps.inquirerEmail,
        subject: validContactProps.subject,
        message: validContactProps.message,
      }

      const contact = Contact.create(minimalProps)
      expect(contact.personId).toBe(validContactProps.personId)
      expect(contact.subject).toBe(validContactProps.subject)
      expect(contact.message).toBe(validContactProps.message)
    })

    it('作成時にContactCreatedEventが発行される', () => {
      const contact = Contact.create(validContactProps)
      const events = contact.domainEvents

      expect(events).toHaveLength(1)
      expect(events[0]).toBeInstanceOf(ContactCreatedEvent)
      expect((events[0] as ContactCreatedEvent).contactId).toBe(contact.id)
    })

    it('件名がトリムされる', () => {
      const contact = Contact.create({
        ...validContactProps,
        subject: '  トリムテスト件名  ',
        message: '  トリムテストメッセージ  ',
      })

      expect(contact.subject).toBe('トリムテスト件名')
      // messageはトリムされない仕様
      expect(contact.message).toBe('  トリムテストメッセージ  ')
    })

    it('IDが自動生成される', () => {
      const contact = Contact.create(validContactProps)
      expect(contact.id).toBeTruthy()
      expect(typeof contact.id).toBe('string')
    })
  })

  describe('バリデーション', () => {
    it('personIdが必須', () => {
      expect(() => Contact.create({ ...validContactProps, personId: '' })).toThrow()
    })

    it('件名が空の場合は通る（オプションフィールド）', () => {
      expect(() => Contact.create({ ...validContactProps, subject: '' })).not.toThrow()
    })

    it('件名が256文字を超える場合はエラーを投げる', () => {
      const longSubject = 'あ'.repeat(257)
      expect(() => Contact.create({ ...validContactProps, subject: longSubject })).toThrow()
    })

    it('メッセージが空の場合はエラーを投げる', () => {
      expect(() => Contact.create({ ...validContactProps, message: '' })).toThrow()
    })

    it('件名が正確に256文字の場合は通る', () => {
      const exactLength = 'あ'.repeat(256)
      const contact = Contact.create({
        ...validContactProps,
        subject: exactLength,
      })
      expect(contact.subject).toBe(exactLength)
    })

    it('技術情報がオプショナルで正しく設定される', () => {
      const contact = Contact.create(validContactProps)

      expect(contact.ipAddress).toBe('192.168.1.1')
      expect(contact.userAgent).toBe('Mozilla/5.0')
      expect(contact.browserName).toBe('Chrome')
      expect(contact.deviceType).toBe('desktop')
      expect(contact.timezone).toBe('Asia/Tokyo')
    })
  })

  describe('永続化からの復元', () => {
    it('fromPersistenceで既存データから復元できる', () => {
      const persistenceData = {
        id: '550e8400-e29b-41d4-a716-446655440001',
        personId: '550e8400-e29b-41d4-a716-446655440000',
        inquirerName: '田中太郎',
        inquirerEmail: 'tanaka@example.com',
        inquirerCompany: 'テスト株式会社',
        subject: 'テスト件名',
        message: 'テストメッセージ',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        browserName: 'Chrome',
        browserVersion: '120.0',
        osName: 'Windows',
        deviceType: 'desktop' as const,
        screenResolution: '1920x1080',
        timezone: 'Asia/Tokyo',
        language: 'ja',
        referer: 'https://example.com',
        sessionId: 'session-123',
        formDuration: 120,
        previousVisitAt: new Date('2023-01-01'),
        notionSynced: false,
        slackNotified: false,
        notionSyncedAt: undefined,
        slackNotifiedAt: undefined,
        notionPageId: undefined,
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-15'),
      }

      const contact = Contact.fromPersistence(persistenceData)

      expect(contact.id).toBe('550e8400-e29b-41d4-a716-446655440001')
      expect(contact.personId).toBe('550e8400-e29b-41d4-a716-446655440000')
      expect(contact.subject).toBe('テスト件名')
      expect(contact.message).toBe('テストメッセージ')
      expect(contact.ipAddress).toBe('192.168.1.1')
    })
  })

  describe('外部サービス同期', () => {
    let contact: Contact

    beforeEach(() => {
      contact = Contact.create(validContactProps)
    })

    it('Notion同期をマークできる', () => {
      expect(contact.needsNotionSync()).toBe(true)

      contact.markNotionSynced()

      expect(contact.notionSynced).toBe(true)
      expect(contact.needsNotionSync()).toBe(false)
    })

    it('Slack通知をマークできる', () => {
      expect(contact.needsSlackNotification()).toBe(true)

      contact.markSlackNotified()

      expect(contact.slackNotified).toBe(true)
      expect(contact.needsSlackNotification()).toBe(false)
    })
  })

  describe('外部サービス連携メソッド', () => {
    let contact: Contact

    beforeEach(() => {
      contact = Contact.create(validContactProps)
    })

    it('Slackメッセージ形式に変換できる', () => {
      const slackMessage = contact.toSlackMessage()

      expect(slackMessage).toContain('新しい問い合わせ')
      expect(slackMessage).toContain('件名: テスト件名')
      expect(slackMessage).toContain('メッセージ: テストメッセージです')
      expect(slackMessage).toContain('作成日時:')
    })

    it('Notionプロパティ形式に変換できる', () => {
      const notionProps = contact.toNotionProperties()

      expect(notionProps.title).toBe('テスト件名')
      expect(notionProps.message).toBe('テストメッセージです')
      expect(notionProps.personId).toBe('550e8400-e29b-41d4-a716-446655440000')
      expect(typeof notionProps.createdAt).toBe('string')
    })
  })
})
