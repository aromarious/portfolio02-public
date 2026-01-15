import { IncomingWebhook } from '@slack/webhook'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { RawContactData } from '../../shared/types'
import { ExternalServiceError } from '../../shared/error'
import { SlackService } from '../../slack/slack-service'

// Slack WebhookClientをモック
vi.mock('@slack/webhook', () => ({
  IncomingWebhook: vi.fn(),
}))

describe('SlackService', () => {
  let slackService: SlackService
  let mockWebhookSend: ReturnType<typeof vi.fn>

  const mockRawContactData: RawContactData = {
    id: 'test-contact-id',
    name: 'テストユーザー',
    email: 'test@example.com',
    subject: 'テスト問い合わせ',
    message: 'テストメッセージです',
    createdAt: new Date('2023-12-01T10:00:00Z'),
  }

  beforeEach(() => {
    vi.clearAllMocks()

    // sendメソッドのモック
    mockWebhookSend = vi.fn()

    // IncomingWebhookコンストラクタのモック
    vi.mocked(IncomingWebhook).mockImplementation(
      () =>
        ({
          send: mockWebhookSend,
        }) as unknown as IncomingWebhook
    )
  })

  describe('constructor', () => {
    it('WebhookURLが提供された場合、webhookクライアントが初期化される', () => {
      const service = new SlackService('https://hooks.slack.com/test')
      expect(IncomingWebhook).toHaveBeenCalledWith('https://hooks.slack.com/test')
      expect(service.isConfigured()).toBe(true)
    })

    it('WebhookURLが提供されない場合、webhookクライアントが初期化されない', () => {
      const service = new SlackService()
      expect(service.isConfigured()).toBe(false)
    })
  })

  describe('sendContactNotification', () => {
    beforeEach(() => {
      slackService = new SlackService('https://hooks.slack.com/test')
    })

    it('設定が無効な場合、エラー結果を返す', async () => {
      const unconfiguredService = new SlackService()
      const result = await unconfiguredService.sendContactNotification(mockRawContactData)

      expect(result).toEqual({
        success: false,
        error: 'Slack webhook URL not configured',
        service: 'slack',
      })
    })

    it('正常に通知を送信できる場合、成功結果を返す', async () => {
      mockWebhookSend.mockResolvedValue({ text: 'ok' })

      const result = await slackService.sendContactNotification(mockRawContactData)

      expect(result).toEqual({
        success: true,
        service: 'slack',
      })

      expect(mockWebhookSend).toHaveBeenCalledWith({
        text: '📧 新しい問い合わせが届きました',
        attachments: [
          {
            color: 'good',
            fields: [
              {
                title: '名前',
                value: 'テストユーザー',
                short: true,
              },
              {
                title: 'メールアドレス',
                value: 'test@example.com',
                short: true,
              },
              {
                title: '問い合わせ種別',
                value: 'テスト問い合わせ',
                short: true,
              },
              {
                title: 'メッセージ',
                value: 'テストメッセージです',
                short: false,
              },
              {
                title: '受信日時',
                value: mockRawContactData.createdAt.toLocaleString('ja-JP'),
                short: true,
              },
            ],
            footer: 'Portfolio Contact Form',
            ts: Math.floor(mockRawContactData.createdAt.getTime() / 1000).toString(),
          },
        ],
      })
    })

    it('Slack API呼び出しが失敗した場合、ExternalServiceErrorを投げる', async () => {
      const error = new Error('Slack API error')
      mockWebhookSend.mockRejectedValue(error)

      await expect(slackService.sendContactNotification(mockRawContactData)).rejects.toThrow(
        ExternalServiceError
      )

      await expect(slackService.sendContactNotification(mockRawContactData)).rejects.toThrow(
        'Slack notification failed: Slack API error'
      )
    })

    it('不明なエラーの場合、適切なエラーメッセージを設定する', async () => {
      mockWebhookSend.mockRejectedValue('不明なエラー')

      await expect(slackService.sendContactNotification(mockRawContactData)).rejects.toThrow(
        'Slack notification failed: Unknown error'
      )
    })
  })

  describe('isConfigured', () => {
    it('webhookクライアントが設定されている場合、trueを返す', () => {
      const service = new SlackService('https://hooks.slack.com/test')
      expect(service.isConfigured()).toBe(true)
    })

    it('設定が無効な場合、falseを返す', () => {
      const service = new SlackService()
      expect(service.isConfigured()).toBe(false)
    })
  })

  describe('sendErrorNotification', () => {
    beforeEach(() => {
      slackService = new SlackService('https://hooks.slack.com/test')
    })

    it('エラー通知メッセージが正しく送信される', async () => {
      mockWebhookSend.mockResolvedValue(undefined)

      const result = await slackService.sendErrorNotification(
        'テストエラー',
        'エラーメッセージです',
        { endpoint: '/api/test', code: 500 }
      )

      expect(result.success).toBe(true)
      expect(result.service).toBe('slack')
      expect(mockWebhookSend).toHaveBeenCalledWith({
        text: '❌ テストエラー',
        attachments: [
          {
            color: 'danger',
            fields: [
              {
                title: 'エラー内容',
                value: 'エラーメッセージです',
                short: false,
              },
              {
                title: '発生時刻',
                value: expect.any(String),
                short: true,
              },
              {
                title: '詳細情報',
                value: JSON.stringify({ endpoint: '/api/test', code: 500 }, null, 2),
                short: false,
              },
            ],
            footer: 'Portfolio System Monitor',
            ts: expect.any(String),
          },
        ],
      })
    })

    it('詳細情報なしでエラー通知が送信される', async () => {
      mockWebhookSend.mockResolvedValue(undefined)

      const result = await slackService.sendErrorNotification(
        'シンプルエラー',
        'エラーが発生しました'
      )

      expect(result.success).toBe(true)
      expect(mockWebhookSend).toHaveBeenCalledWith({
        text: '❌ シンプルエラー',
        attachments: [
          {
            color: 'danger',
            fields: [
              {
                title: 'エラー内容',
                value: 'エラーが発生しました',
                short: false,
              },
              {
                title: '発生時刻',
                value: expect.any(String),
                short: true,
              },
            ],
            footer: 'Portfolio System Monitor',
            ts: expect.any(String),
          },
        ],
      })
    })

    it('Webhook未設定の場合はエラーを返す', async () => {
      const unconfiguredService = new SlackService()

      const result = await unconfiguredService.sendErrorNotification('エラー', 'テストエラー')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Slack webhook URL not configured')
      expect(result.service).toBe('slack')
    })

    it('Slack送信に失敗した場合はExternalServiceErrorを投げる', async () => {
      mockWebhookSend.mockRejectedValue(new Error('Network error'))

      await expect(slackService.sendErrorNotification('エラー', 'テストエラー')).rejects.toThrow(
        ExternalServiceError
      )
    })
  })

  describe('さらなるエラーケース', () => {
    const testContact = {
      id: 'test-contact-id',
      subject: 'テスト件名',
      message: 'テストメッセージ',
      createdAt: new Date(),
      inquirerName: 'テスト太郎',
      inquirerEmail: 'test@example.com',
    }

    const testPerson = {
      id: 'test-person-id',
      name: 'テスト太郎',
      email: 'test@example.com',
      company: 'テスト会社',
    }

    beforeEach(() => {
      slackService = new SlackService('https://hooks.slack.com/test')
    })

    it('HTTPタイムアウトエラーの処理', async () => {
      mockWebhookSend.mockRejectedValue(new Error('ETIMEDOUT'))

      await expect(slackService.sendContactNotification(testContact as any)).rejects.toThrow(
        ExternalServiceError
      )
    })

    it('HTTP 400 Bad Requestエラーの処理', async () => {
      const httpError = new Error('HTTP 400: Bad Request')
      httpError.name = 'HTTPError'
      mockWebhookSend.mockRejectedValue(httpError)

      await expect(slackService.sendContactNotification(testContact as any)).rejects.toThrow(
        ExternalServiceError
      )
    })

    it('ネットワーク接続エラーの処理', async () => {
      const networkError = new Error('ECONNREFUSED')
      networkError.name = 'NetworkError'
      mockWebhookSend.mockRejectedValue(networkError)

      await expect(slackService.sendContactNotification(testContact as any)).rejects.toThrow(
        ExternalServiceError
      )
    })

    it('DNS解決エラーの処理', async () => {
      const dnsError = new Error('ENOTFOUND hooks.slack.com')
      dnsError.name = 'DNSError'
      mockWebhookSend.mockRejectedValue(dnsError)

      await expect(slackService.sendContactNotification(testContact as any)).rejects.toThrow(
        ExternalServiceError
      )
    })

    it('予期しないレスポンス形式エラーの処理', async () => {
      const parseError = new Error('Unexpected token in JSON')
      parseError.name = 'SyntaxError'
      mockWebhookSend.mockRejectedValue(parseError)

      await expect(slackService.sendContactNotification(testContact as any)).rejects.toThrow(
        ExternalServiceError
      )
    })

    it('APIエラーレスポンスでのエラー処理', async () => {
      const apiError = new Error('Webhook URL returned 404')
      apiError.name = 'HTTPError'
      mockWebhookSend.mockRejectedValue(apiError)

      // APIエラーの場合、ExternalServiceErrorが投げられる
      await expect(slackService.sendContactNotification(testContact as any)).rejects.toThrow(
        ExternalServiceError
      )
    })
  })
})
