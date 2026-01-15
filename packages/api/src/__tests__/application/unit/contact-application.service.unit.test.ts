import { beforeEach, describe, expect, it, vi } from 'vitest'

import type {
  ContactDomainService,
  ContactRepositoryPort,
  ExternalSyncDomainService,
  PersonRepositoryPort,
} from '@aromarious/domain'
import { Contact, Person } from '@aromarious/domain'

import type { SubmitInquiryInput } from '../../../application/dtos/contact.dto'
// インターフェース型のみを使用するため、外部パッケージのインポートは不要

import { ContactApplicationService } from '../../../application/services/contact-application.service'

describe('ContactApplicationService', () => {
  let contactApplicationService: ContactApplicationService
  let mockContactDomainService: ContactDomainService
  let mockPersonRepository: PersonRepositoryPort
  let mockContactRepository: ContactRepositoryPort
  let mockExternalSyncDomainService: ExternalSyncDomainService

  beforeEach(() => {
    // Mock console methods
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(console, 'time').mockImplementation(() => {})
    vi.spyOn(console, 'timeEnd').mockImplementation(() => {})

    // Mock repositories
    mockPersonRepository = {
      findByEmail: vi.fn(),
      findById: vi.fn(),
      findMany: vi.fn(),
      findOrCreate: vi.fn(),
      findRecentContacts: vi.fn(),
      findByCompany: vi.fn(),
      existsByEmail: vi.fn(),
      delete: vi.fn(),
      exists: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
      save: vi.fn(),
      updateNotionPageId: vi.fn(),
      deleteAll: vi.fn(),
    }

    mockContactRepository = {
      findById: vi.fn(),
      findByPersonId: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      delete: vi.fn(),
      exists: vi.fn(),
      update: vi.fn(),
      save: vi.fn(),
      findUnsyncedForNotion: vi.fn(),
      findUnnotifiedForSlack: vi.fn(),
      updateExternalServiceStatus: vi.fn(),
      updateNotionPageId: vi.fn(),
      deleteAll: vi.fn(),
    }

    // Mock domain service with all required methods
    mockContactDomainService = {
      handleInquiry: vi.fn(),
      savePerson: vi.fn(),
      saveContact: vi.fn(),
      findPersonById: vi.fn(),
      findContacts: vi.fn(),
    } as unknown as ContactDomainService

    // Mock external sync domain service
    mockExternalSyncDomainService = {
      syncNewContact: vi.fn().mockResolvedValue({
        success: true,
        contact: { id: 'mock-contact-id' },
        person: { id: 'mock-person-id' },
        isFirstTimeContact: true,
        notion: { synced: true },
        slack: { notified: true },
      }),
      syncStoredContact: vi.fn(),
      // biome-ignore lint/suspicious/noExplicitAny: test mock
    } as any

    // Create service instance
    contactApplicationService = new ContactApplicationService(
      mockContactDomainService,
      mockExternalSyncDomainService
    )
  })

  describe('submitInquiry', () => {
    const validInput: SubmitInquiryInput = {
      name: 'テスト太郎',
      email: 'test@example.com',
      company: 'テスト会社',
      twitterHandle: 'test_user',
      subject: 'テスト件名',
      message: 'テストメッセージ',
      ipAddress: '192.168.1.1',
    }

    it('正常に問い合わせを送信できること', async () => {
      // Arrange
      const mockPerson = Person.create({
        name: 'テスト太郎',
        email: 'test@example.com',
        company: 'テスト会社',
        twitterHandle: 'test_user',
      })
      const mockContact = Contact.create({
        personId: mockPerson.id,
        inquirerName: 'Test Name',
        inquirerEmail: 'test@example.com',
        subject: 'テスト件名',
        message: 'テストメッセージ',
        ipAddress: '192.168.1.1',
        userAgent: 'test',
        browserName: 'test',
        browserVersion: '1.0',
        osName: 'test',
        deviceType: 'desktop',
        screenResolution: '1920x1080',
        timezone: 'Asia/Tokyo',
        language: 'ja',
        referer: '',
        sessionId: 'test',
        formDuration: 0,
        previousVisitAt: new Date(),
      })

      // Mock external sync domain service to return success
      vi.mocked(mockExternalSyncDomainService.syncNewContact).mockResolvedValue({
        success: true,
        contact: mockContact,
        person: mockPerson,
        isFirstTimeContact: true,
        notion: {
          contactPageId: 'mock-contact-page-id',
          personPageId: 'mock-person-page-id',
          synced: true,
        },
        slack: {
          notified: true,
        },
      })

      // Act
      const result = await contactApplicationService.submitInquiry(validInput)

      // Assert
      expect(result.success).toBe(true)
      expect(result.contactId).toBe(mockContact.id)
      expect(result.isFirstTimeContact).toBe(true)
      expect(result.message).toBe('お問い合わせを受け付けました')

      // Verify external sync domain service was called
      expect(mockExternalSyncDomainService.syncNewContact).toHaveBeenCalledWith(
        expect.objectContaining({
          email: validInput.email,
          name: validInput.name,
          subject: validInput.subject,
          message: validInput.message,
        })
      )
    })

    it('ドメインサービスでエラーが発生した場合エラーになること', async () => {
      // Arrange - ExternalSyncDomainServiceでエラーを発生させる
      vi.mocked(mockExternalSyncDomainService.syncNewContact).mockRejectedValue(
        new Error('ドメインエラー')
      )

      // Act & Assert
      await expect(contactApplicationService.submitInquiry(validInput)).rejects.toThrow(
        'お問い合わせの送信に失敗しました'
      )

      // エラーログが出力されることを確認
      expect(console.error).toHaveBeenCalledWith(
        '問い合わせ送信処理でエラーが発生:',
        expect.any(Error)
      )
    })

    it('外部通知の失敗はメイン処理に影響しないこと', async () => {
      // Arrange
      const mockPerson = Person.create({
        name: 'テスト太郎',
        email: 'test@example.com',
        company: 'テスト会社',
        twitterHandle: 'test_user',
      })
      const mockContact = Contact.create({
        personId: mockPerson.id,
        inquirerName: 'Test Name',
        inquirerEmail: 'test@example.com',
        subject: 'テスト件名',
        message: 'テストメッセージ',
        ipAddress: '192.168.1.1',
        userAgent: 'test',
        browserName: 'test',
        browserVersion: '1.0',
        osName: 'test',
        deviceType: 'desktop',
        screenResolution: '1920x1080',
        timezone: 'Asia/Tokyo',
        language: 'ja',
        referer: '',
        sessionId: 'test',
        formDuration: 0,
        previousVisitAt: new Date(),
      })

      // 外部サービス同期のモック設定
      vi.mocked(mockExternalSyncDomainService.syncNewContact).mockRejectedValue(
        new Error('外部通知エラー')
      )

      // Mock console.error to verify it's called
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      // Act & Assert - 外部サービスエラーで例外がスローされる
      await expect(contactApplicationService.submitInquiry(validInput)).rejects.toThrow(
        'お問い合わせの送信に失敗しました'
      )

      // Verify error was logged
      await vi.waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          '問い合わせ送信処理でエラーが発生:',
          expect.any(Error)
        )
      })

      consoleSpy.mockRestore()
    })
  })
})
