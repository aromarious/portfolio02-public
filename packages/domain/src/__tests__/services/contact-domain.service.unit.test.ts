import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { ContactRepositoryPort } from '../../ports/contact.repository.port'
import type { PersonRepositoryPort } from '../../ports/person.repository.port'
import type { InquiryData } from '../../services/contact-domain.service'
import { Contact } from '../../entities/contact.entity'
import { Person } from '../../entities/person.entity'
import { ContactDomainService } from '../../services/contact-domain.service'
import { Email } from '../../value-objects/email.vo'

describe('ContactDomainService', () => {
  let contactDomainService: ContactDomainService
  let mockPersonRepo: PersonRepositoryPort
  let mockContactRepo: ContactRepositoryPort

  const mockInquiryData: InquiryData = {
    email: 'test@example.com',
    name: 'テスト太郎',
    company: 'テスト株式会社',
    subject: 'お問い合わせ件名',
    message: 'お問い合わせ内容です。',
    twitterHandle: 'test_user',
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0',
    referer: 'https://example.com',
    sessionId: 'session123',
    deviceType: 'desktop',
    browserName: 'Chrome',
    browserVersion: '120.0',
    osName: 'Windows',
    screenResolution: '1920x1080',
    language: 'ja-JP',
    timezone: 'Asia/Tokyo',
  }

  beforeEach(() => {
    // PersonRepository のモック
    mockPersonRepo = {
      findByEmail: vi.fn(),
      findById: vi.fn(),
      save: vi.fn(),
      findMany: vi.fn(),
      findByCompany: vi.fn(),
      findRecentContacts: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      exists: vi.fn(),
      count: vi.fn(),
      findOrCreate: vi.fn(),
      existsByEmail: vi.fn(),
      updateNotionPageId: vi.fn(),
      deleteAll: vi.fn(),
    }

    // ContactRepository のモック
    mockContactRepo = {
      findById: vi.fn(),
      save: vi.fn(),
      findMany: vi.fn(),
      findByPersonId: vi.fn(),
      findUnsyncedForNotion: vi.fn(),
      findUnnotifiedForSlack: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      exists: vi.fn(),
      count: vi.fn(),
      updateExternalServiceStatus: vi.fn(),
      updateNotionPageId: vi.fn(),
      deleteAll: vi.fn(),
    }

    contactDomainService = new ContactDomainService(mockPersonRepo, mockContactRepo)
  })

  describe('handleInquiry', () => {
    it('初回問い合わせの場合、新しいPersonとContactを作成する', async () => {
      // Arrange
      vi.mocked(mockPersonRepo.findByEmail).mockResolvedValue(null)

      // Act
      const result = await contactDomainService.handleInquiry(mockInquiryData)

      // Assert
      expect(mockPersonRepo.findByEmail).toHaveBeenCalledWith(expect.any(Email))
      expect(result.person).toBeInstanceOf(Person)
      expect(result.contact).toBeInstanceOf(Contact)
      expect(result.isFirstTimeContact).toBe(true)
      expect(result.contact.personId).toBe(result.person.id)
      expect(result.person.getEmailValue()).toBe(mockInquiryData.email)
      expect(result.person.name).toBe(mockInquiryData.name)
      expect(result.contact.subject).toBe(mockInquiryData.subject)
      expect(result.contact.message).toBe(mockInquiryData.message)
    })

    it('リピート問い合わせの場合、既存のPersonを更新し新しいContactを作成する', async () => {
      // Arrange
      const existingPerson = Person.create({
        name: '既存太郎',
        email: 'test@example.com',
        company: '既存会社',
      })

      vi.mocked(mockPersonRepo.findByEmail).mockResolvedValue(existingPerson)

      // Act
      const result = await contactDomainService.handleInquiry(mockInquiryData)

      // Assert
      expect(mockPersonRepo.findByEmail).toHaveBeenCalledWith(expect.any(Email))
      expect(result.person).toBe(existingPerson)
      expect(result.contact).toBeInstanceOf(Contact)
      expect(result.isFirstTimeContact).toBe(false)
      expect(result.contact.personId).toBe(existingPerson.id)
      expect(result.person.name).toBe(mockInquiryData.name) // 更新されている
      expect(result.person.company).toBe(mockInquiryData.company) // 更新されている
    })

    it('リピート問い合わせの場合、Personの最終問い合わせ日時が更新される', async () => {
      // Arrange
      const mockOldDate = new Date('2024-01-01T10:00:00Z')
      const mockNewDate = new Date('2024-01-01T10:01:00Z')

      // 時刻をモック
      vi.useFakeTimers()
      vi.setSystemTime(mockOldDate)

      const existingPerson = Person.create({
        name: '既存太郎',
        email: 'test@example.com',
        company: '既存会社',
      })
      const oldDate = existingPerson.lastContactAt

      vi.mocked(mockPersonRepo.findByEmail).mockResolvedValue(existingPerson)

      // 時間を進める
      vi.setSystemTime(mockNewDate)

      // Act
      const result = await contactDomainService.handleInquiry(mockInquiryData)

      // Assert
      expect(result.person.lastContactAt.getTime()).toBeGreaterThan(oldDate.getTime())

      // Clean up
      vi.useRealTimers()
    })

    it('Contactエンティティに技術的メタデータが正しく設定される', async () => {
      // Arrange
      vi.mocked(mockPersonRepo.findByEmail).mockResolvedValue(null)

      // Act
      const result = await contactDomainService.handleInquiry(mockInquiryData)

      // Assert
      expect(result.contact.ipAddress).toBe(mockInquiryData.ipAddress)
      expect(result.contact.userAgent).toBe(mockInquiryData.userAgent)
      expect(result.contact.referer).toBe(mockInquiryData.referer)
      expect(result.contact.sessionId).toBe(mockInquiryData.sessionId)
      expect(result.contact.deviceType).toBe(mockInquiryData.deviceType)
      expect(result.contact.browserName).toBe(mockInquiryData.browserName)
      expect(result.contact.browserVersion).toBe(mockInquiryData.browserVersion)
      expect(result.contact.osName).toBe(mockInquiryData.osName)
      expect(result.contact.screenResolution).toBe(mockInquiryData.screenResolution)
      expect(result.contact.language).toBe(mockInquiryData.language)
      expect(result.contact.timezone).toBe(mockInquiryData.timezone)
    })

    it('Contactエンティティの外部サービス同期フラグが初期状態になる', async () => {
      // Arrange
      vi.mocked(mockPersonRepo.findByEmail).mockResolvedValue(null)

      // Act
      const result = await contactDomainService.handleInquiry(mockInquiryData)

      // Assert
      expect(result.contact.notionSynced).toBe(false)
      expect(result.contact.slackNotified).toBe(false)
    })

    it('会社名が設定されている場合正しく処理される', async () => {
      // Arrange
      const inquiryDataWithCompany = {
        ...mockInquiryData,
        company: 'テスト会社',
        twitterHandle: 'test_user',
      }
      vi.mocked(mockPersonRepo.findByEmail).mockResolvedValue(null)

      // Act
      const result = await contactDomainService.handleInquiry(inquiryDataWithCompany)

      // Assert
      expect(result.person.company).toBe('テスト会社')
    })

    it('技術的メタデータがオプショナルの場合も正しく処理される', async () => {
      // Arrange
      const minimalInquiryData: InquiryData = {
        email: 'test@example.com',
        name: 'テスト太郎',
        company: 'ミニマル会社',
        subject: 'お問い合わせ件名',
        message: 'お問い合わせ内容です。',
        twitterHandle: 'test_user',
      }
      vi.mocked(mockPersonRepo.findByEmail).mockResolvedValue(null)

      // Act
      const result = await contactDomainService.handleInquiry(minimalInquiryData)

      // Assert
      expect(result.contact.ipAddress).toBeUndefined()
      expect(result.contact.userAgent).toBeUndefined()
      expect(result.contact.referer).toBeUndefined()
      // 他のオプショナルフィールドも同様
    })
  })
})
