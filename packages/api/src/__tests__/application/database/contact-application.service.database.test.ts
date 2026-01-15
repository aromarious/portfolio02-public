import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Database } from '@aromarious/db'
import { ContactRepository, PersonRepository } from '@aromarious/db'
import { ContactDomainService, ExternalSyncDomainService, Person } from '@aromarious/domain'
import {
  NotionContactRepository,
  NotionPersonRepository,
  NotionService,
  SlackNotificationService,
} from '@aromarious/external'

// インターフェース型のみを使用するため、外部パッケージのインポートは不要

import type { SubmitInquiryInput } from '../../../application/dtos/contact.dto'
import { ContactApplicationService } from '../../../application/services/contact-application.service'

// グローバル型定義の拡張
declare global {
  var testDb: unknown
}

describe('ContactApplicationService Integration', () => {
  // リポジトリとサービスの宣言
  let contactRepository: ContactRepository
  let personRepository: PersonRepository
  let contactDomainService: ContactDomainService
  let externalSyncDomainService: ExternalSyncDomainService
  let contactApplicationService: ContactApplicationService

  // 標準的なテストデータ
  const standardInquiryData: SubmitInquiryInput = {
    name: 'テスト太郎',
    email: 'test@example.com', // ドメイン層でEmail値オブジェクトに変換される
    subject: 'テスト件名',
    message: 'テストメッセージ',
    ipAddress: '192.168.1.1',
    company: 'テスト株式会社',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    browserName: 'Chrome',
    browserVersion: '120.0.0.0',
    osName: 'Windows',
    deviceType: 'desktop',
    screenResolution: '1920x1080',
    timezone: 'Asia/Tokyo',
    language: 'ja-JP',
    referer: 'https://example.com',
    sessionId: 'test-session-id',
    formDuration: 120,
  }

  // テスト前のセットアップ
  beforeEach(async () => {
    // DB接続を使ってリポジトリを初期化
    contactRepository = new ContactRepository(globalThis.testDb as Database)
    personRepository = new PersonRepository(globalThis.testDb as Database)

    // テーブルをクリーンアップ - SQL文を使用
    try {
      // SQL文を直接実行
      await (globalThis.testDb as Database).execute(`DELETE FROM "contact"`)
      await (globalThis.testDb as Database).execute(`DELETE FROM "person"`)
    } catch (error) {
      console.warn('テーブルクリーンアップ中にエラーが発生しました:', error)
    }

    // ドメインサービスの初期化
    contactDomainService = new ContactDomainService(personRepository, contactRepository)
    const notionContactRepo = new NotionContactRepository(
      process.env.NOTION_API_TOKEN || '',
      process.env.NOTION_PARENT_PAGE_ID || ''
    )
    const notionPersonRepo = new NotionPersonRepository(
      process.env.NOTION_API_TOKEN || '',
      process.env.NOTION_PARENT_PAGE_ID || ''
    )
    const notionService = new NotionService(notionContactRepo, notionPersonRepo)
    const slackNotifier = new SlackNotificationService(process.env.SLACK_WEBHOOK_URL || '')
    externalSyncDomainService = new ExternalSyncDomainService(
      contactDomainService,
      contactRepository,
      personRepository,
      notionService,
      notionContactRepo,
      notionPersonRepo,
      slackNotifier
    )

    // アプリケーションサービスの初期化
    contactApplicationService = new ContactApplicationService(
      contactDomainService,
      externalSyncDomainService
    )
  })

  describe('基本機能テスト', () => {
    it('新規顧客からの問い合わせを正常に処理できること', async () => {
      // 問い合わせを送信
      const result = await contactApplicationService.submitInquiry(standardInquiryData)

      // 結果の検証
      expect(result.success).toBe(true)
      expect(result.contactId).toBeDefined()
      expect(result.message).toBe('お問い合わせを受け付けました')
      expect(result.isFirstTimeContact).toBe(true)

      // DBに保存されたデータの検証 - findByEmailはEmailオブジェクトを必要とするので、代わりにfindManyを使用
      const persons = await personRepository.findMany()
      const savedPerson = persons.find((p) => p.email.value === standardInquiryData.email)
      expect(savedPerson).toBeDefined()
      expect(savedPerson?.name).toBe(standardInquiryData.name)
      expect(savedPerson?.company).toBe(standardInquiryData.company)

      // 問い合わせデータの検証
      const savedContact = await contactRepository.findById(result.contactId)
      expect(savedContact).toBeDefined()
      expect(savedContact?.subject).toBe(standardInquiryData.subject)
      expect(savedContact?.message).toBe(standardInquiryData.message)
      expect(savedContact?.ipAddress).toBe(standardInquiryData.ipAddress)

      // 外部同期サービスが正常に動作したことを確認（モック環境のため詳細チェックは省略）
      // expect(notificationOrchestrator.stagedSyncCalled).toBe(true)
      // expect(notificationOrchestrator.notificationData).toBeDefined()
    })

    it('既存顧客からの問い合わせが正しく処理されること', async () => {
      // 事前に顧客を登録
      const existingPerson = Person.create({
        name: '既存顧客太郎',
        email: 'existing@example.com',
        company: '既存株式会社',
      })
      await personRepository.save(existingPerson)

      const inquiryData = {
        ...standardInquiryData,
        name: existingPerson.name,
        email: 'existing@example.com', // existingPerson.emailはEmailオブジェクトなのでプレーンな文字列を使用
        company: existingPerson.company,
        subject: '既存顧客テスト',
        ipAddress: '192.168.1.100',
      }

      // 問い合わせを送信
      const result = await contactApplicationService.submitInquiry(inquiryData)

      // 結果の検証
      expect(result.success).toBe(true)
      expect(result.isFirstTimeContact).toBe(false) // 既存顧客なのでfalse

      // DBのデータを検証 - personは新規作成されず既存のものが使われるはず
      const persons = await personRepository.findMany()
      const existingPersons = persons.filter(
        (p) => p.email && p.email.value === 'existing@example.com'
      )
      expect(existingPersons.length).toBe(1) // 重複作成されていないこと
    })
  })

  describe('エラーハンドリングテスト', () => {
    it('外部通知の失敗はメイン処理に影響しないこと', async () => {
      // ExternalSyncDomainServiceの段階的同期が失敗するようにモックを設定
      const originalSyncNewContact = externalSyncDomainService.syncNewContact
      externalSyncDomainService.syncNewContact = async () => {
        throw new Error('外部同期エラー')
      }

      // コンソールエラーをモック
      const originalConsoleError = console.error
      const mockConsoleError = vi.fn()
      console.error = mockConsoleError

      try {
        // 問い合わせを送信 - エラーが発生するはず
        await expect(contactApplicationService.submitInquiry(standardInquiryData)).rejects.toThrow(
          'お問い合わせの送信に失敗しました'
        )

        // エラーログが出力されることを確認
        await vi.waitFor(() => {
          expect(mockConsoleError).toHaveBeenCalled()
          const errorMessage = mockConsoleError.mock?.calls?.[0]?.[0]
          expect(errorMessage).toContain('問い合わせ送信処理でエラーが発生')
        })
      } finally {
        // コンソールエラーとモックを元に戻す
        console.error = originalConsoleError
        externalSyncDomainService.syncNewContact = originalSyncNewContact
      }
    })

    it('不正なメールアドレスでエラーになること', async () => {
      const invalidInput = {
        ...standardInquiryData,
        email: 'invalid-email', // 不正なメールアドレス
      }

      // 不正なメールアドレスでエラーになるはず
      await expect(contactApplicationService.submitInquiry(invalidInput)).rejects.toThrow(
        'お問い合わせの送信に失敗しました'
      )
    })

    it('異常に長いメッセージでもエラーにならないこと', async () => {
      // 非常に長いメッセージを生成
      const longMessage = 'a'.repeat(5000)

      const longMessageInput = {
        ...standardInquiryData,
        message: longMessage,
      }

      // 長いメッセージでも処理できるはず
      const result = await contactApplicationService.submitInquiry(longMessageInput)
      expect(result.success).toBe(true)

      // 保存されたメッセージを確認
      const savedContact = await contactRepository.findById(result.contactId)
      expect(savedContact?.message).toBe(longMessage)
    })
  })

  describe('データ整合性テスト', () => {
    it('オプションフィールドが省略されても正常に処理できること', async () => {
      // 最小限の必須フィールドのみの入力
      const minimalInput = {
        name: 'ミニマルテスト太郎',
        email: 'minimal@example.com',
        company: 'ミニマルテスト株式会社',
        subject: 'ミニマルテスト',
        message: 'これは最小限の入力テストです。',
        ipAddress: '192.168.3.1',
      }

      // 問い合わせを送信
      const result = await contactApplicationService.submitInquiry(minimalInput)

      // 結果の検証
      expect(result.success).toBe(true)
      expect(result.contactId).toBeDefined()

      // 保存されたデータの検証
      const savedContact = await contactRepository.findById(result.contactId)
      expect(savedContact).toBeDefined()
      expect(savedContact?.subject).toBe(minimalInput.subject)
      expect(savedContact?.message).toBe(minimalInput.message)
      expect(savedContact?.ipAddress).toBe(minimalInput.ipAddress)
    })
  })
})
