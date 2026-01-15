/**
 * ContactApplicationService カバレッジ向上テスト
 * 未実行メソッドと分岐パスのテスト
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

import type {
  Contact,
  ContactDomainService,
  ExternalSyncDomainService,
  Person,
} from '@aromarious/domain'

import type { SubmitInquiryInput } from '../../../application/dtos/contact.dto'
import { ContactApplicationService } from '../../../application/services/contact-application.service'

describe('ContactApplicationService Coverage Tests', () => {
  let contactApplicationService: ContactApplicationService
  let mockContactDomainService: any
  let mockExternalSyncDomainService: any

  beforeEach(() => {
    // ContactDomainServiceのモック
    mockContactDomainService = {
      handleInquiry: vi.fn(),
      savePerson: vi.fn(),
      saveContact: vi.fn(),
      findContacts: vi.fn(),
      findPersonById: vi.fn(),
    } as any

    // ExternalSyncDomainServiceのモック
    mockExternalSyncDomainService = {
      syncNewContact: vi.fn(),
      syncStoredContact: vi.fn(),
    } as any

    contactApplicationService = new ContactApplicationService(
      mockContactDomainService,
      mockExternalSyncDomainService
    )

    vi.clearAllMocks()
  })

  describe('submitInquiry - Synchronous path (without waitUntilCallback)', () => {
    it('should execute synchronous path when waitUntilCallback is not provided', async () => {
      const input: SubmitInquiryInput = {
        name: 'Test User',
        email: 'test@example.com',
        subject: 'Test Subject',
        message: 'Test message',
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent',
        referer: 'https://example.com',
        sessionId: 'test-session',
        deviceType: 'desktop',
        browserName: 'Chrome',
        browserVersion: '100.0',
        osName: 'Windows',
        screenResolution: '1920x1080',
        language: 'ja',
        timezone: 'Asia/Tokyo',
        formDuration: 30000,
        previousVisitAt: new Date(),
      }

      const mockContact = { id: 'contact-123' } as Contact
      const mockPerson = { id: 'person-123' } as Person
      const mockSyncResult = {
        success: true,
        contact: mockContact,
        person: mockPerson,
        isFirstTimeContact: true,
      }

      mockExternalSyncDomainService.syncNewContact.mockResolvedValue(mockSyncResult)

      // waitUntilCallbackなしで実行（同期処理パス）
      const result = await contactApplicationService.submitInquiry(input)

      expect(result).toEqual({
        success: true,
        contactId: 'contact-123',
        message: 'お問い合わせを受け付けました',
        isFirstTimeContact: true,
      })

      expect(mockExternalSyncDomainService.syncNewContact).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'test@example.com',
          name: 'Test User',
          subject: 'Test Subject',
          message: 'Test message',
        })
      )
    })

    it('should handle sync failure in synchronous path', async () => {
      const input: SubmitInquiryInput = {
        name: 'Test User',
        email: 'test@example.com',
        subject: 'Test Subject',
        message: 'Test message',
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent',
        referer: '',
        sessionId: 'test-session',
        deviceType: 'desktop',
        browserName: 'Chrome',
        browserVersion: '100.0',
        osName: 'Windows',
        screenResolution: '1920x1080',
        language: 'ja',
        timezone: 'Asia/Tokyo',
        formDuration: 30000,
        previousVisitAt: new Date(),
      }

      const mockContact = { id: 'contact-123' } as Contact
      const mockPerson = { id: 'person-123' } as Person
      const mockSyncResult = {
        success: false, // 失敗ケース
        contact: mockContact,
        person: mockPerson,
        isFirstTimeContact: false,
      }

      mockExternalSyncDomainService.syncNewContact.mockResolvedValue(mockSyncResult)

      const result = await contactApplicationService.submitInquiry(input)

      expect(result).toEqual({
        success: false,
        contactId: 'contact-123',
        message: 'お問い合わせを受け付けました',
        isFirstTimeContact: false,
      })
    })
  })

  describe('submitInquiry - Background processing path (with waitUntilCallback)', () => {
    it('should execute background processing path when waitUntilCallback is provided', async () => {
      const input: SubmitInquiryInput = {
        name: 'Test User',
        email: 'test@example.com',
        subject: 'Test Subject',
        message: 'Test message',
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent',
        referer: 'https://example.com',
        sessionId: 'test-session',
        deviceType: 'desktop',
        browserName: 'Chrome',
        browserVersion: '100.0',
        osName: 'Windows',
        screenResolution: '1920x1080',
        language: 'ja',
        timezone: 'Asia/Tokyo',
        formDuration: 30000,
        previousVisitAt: new Date(),
      }

      const mockContact = { id: 'contact-123' } as Contact
      const mockPerson = { id: 'person-123', name: 'Test User' } as Person
      const mockSavedContact = { id: 'contact-123' } as Contact
      const mockSavedPerson = { id: 'person-123' } as Person

      mockContactDomainService.handleInquiry.mockResolvedValue({
        contact: mockContact,
        person: mockPerson,
        isFirstTimeContact: true,
      })
      mockContactDomainService.savePerson.mockResolvedValue(mockSavedPerson)
      mockContactDomainService.saveContact.mockResolvedValue(mockSavedContact)
      mockExternalSyncDomainService.syncStoredContact.mockResolvedValue({
        success: true,
        contact: mockContact,
        person: mockPerson,
        isFirstTimeContact: true,
      })

      const mockWaitUntilCallback = vi.fn()

      // waitUntilCallbackありで実行（バックグラウンド処理パス）
      const result = await contactApplicationService.submitInquiry(input, mockWaitUntilCallback)

      expect(result).toEqual({
        success: true,
        contactId: 'contact-123',
        message: 'お問い合わせを受け付けました',
        isFirstTimeContact: true,
      })

      expect(mockWaitUntilCallback).toHaveBeenCalledWith(expect.any(Promise))
      expect(mockContactDomainService.handleInquiry).toHaveBeenCalled()
      expect(mockContactDomainService.savePerson).toHaveBeenCalledWith(mockPerson)
      expect(mockContactDomainService.saveContact).toHaveBeenCalledWith(mockContact)
    })
  })

  describe('resyncUnsyncedRecords method', () => {
    it('should return empty result with default options', async () => {
      const mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => {})

      const result = await contactApplicationService.resyncUnsyncedRecords()

      expect(result).toEqual({
        processed: 0,
        success: 0,
        failed: 0,
        results: [],
      })

      expect(mockConsoleLog).toHaveBeenCalledWith(
        'resyncUnsyncedRecords is temporarily disabled pending ExternalSyncDomainService integration'
      )

      mockConsoleLog.mockRestore()
    })

    it('should return empty result with custom options', async () => {
      const mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => {})

      const options = {
        includeNotion: true,
        includeSlack: false,
        limit: 10,
        createdAfter: new Date('2023-01-01'),
        createdBefore: new Date('2023-12-31'),
      }

      const result = await contactApplicationService.resyncUnsyncedRecords(options)

      expect(result).toEqual({
        processed: 0,
        success: 0,
        failed: 0,
        results: [],
      })

      mockConsoleLog.mockRestore()
    })
  })

  describe('retryExternalSync method', () => {
    it('should log temporary disabled message', async () => {
      const mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => {})

      const contactData = {
        personId: 'person-123',
        contactId: 'contact-123',
        name: 'Test User',
        email: 'test@example.com',
        subject: 'Test Subject',
        message: 'Test message',
        twitterHandle: '@test',
        createdAt: new Date(),
      }

      await contactApplicationService.retryExternalSync('contact-123', contactData)

      expect(mockConsoleLog).toHaveBeenCalledWith(
        'retryExternalSync is temporarily disabled pending ExternalSyncDomainService integration'
      )

      mockConsoleLog.mockRestore()
    })

    it('should handle data without optional fields', async () => {
      const mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => {})

      const contactData = {
        personId: 'person-123',
        contactId: 'contact-123',
        name: 'Test User',
        email: 'test@example.com',
        subject: 'Test Subject',
        message: 'Test message',
        createdAt: new Date(),
        // twitterHandle は省略
      }

      await contactApplicationService.retryExternalSync('contact-123', contactData)

      expect(mockConsoleLog).toHaveBeenCalled()
      mockConsoleLog.mockRestore()
    })
  })

  describe('Input mapping and validation', () => {
    it('should handle input with optional fields missing', async () => {
      const minimalInput: SubmitInquiryInput = {
        name: 'Test User',
        email: 'test@example.com',
        // subject省略 -> デフォルト値が設定される
        message: 'Test message',
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent',
        referer: '',
        sessionId: 'test-session',
        deviceType: 'desktop',
        browserName: 'Chrome',
        browserVersion: '100.0',
        osName: 'Windows',
        screenResolution: '1920x1080',
        language: 'ja',
        timezone: 'Asia/Tokyo',
        formDuration: 0,
        previousVisitAt: new Date(),
      }

      const mockSyncResult = {
        success: true,
        contact: { id: 'contact-123' } as Contact,
        person: { id: 'person-123' } as Person,
        isFirstTimeContact: true,
      }

      mockExternalSyncDomainService.syncNewContact.mockResolvedValue(mockSyncResult)

      const result = await contactApplicationService.submitInquiry(minimalInput)

      expect(result.success).toBe(true)
      expect(mockExternalSyncDomainService.syncNewContact).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: 'お問い合わせ', // デフォルト値が設定される
        })
      )
    })
  })

  describe('Error handling', () => {
    it('should handle error in submitInquiry and throw meaningful message', async () => {
      const input: SubmitInquiryInput = {
        name: 'Test User',
        email: 'test@example.com',
        subject: 'Test Subject',
        message: 'Test message',
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent',
        referer: '',
        sessionId: 'test-session',
        deviceType: 'desktop',
        browserName: 'Chrome',
        browserVersion: '100.0',
        osName: 'Windows',
        screenResolution: '1920x1080',
        language: 'ja',
        timezone: 'Asia/Tokyo',
        formDuration: 30000,
        previousVisitAt: new Date(),
      }

      const mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

      mockExternalSyncDomainService.syncNewContact.mockRejectedValue(
        new Error('External service error')
      )

      await expect(contactApplicationService.submitInquiry(input)).rejects.toThrow(
        'お問い合わせの送信に失敗しました'
      )

      expect(mockConsoleError).toHaveBeenCalledWith(
        '問い合わせ送信処理でエラーが発生:',
        expect.any(Error)
      )

      mockConsoleError.mockRestore()
    })
  })
})
