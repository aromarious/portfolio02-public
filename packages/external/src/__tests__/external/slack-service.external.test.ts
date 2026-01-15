import { beforeAll, describe, expect, it } from 'vitest'

import type { RawContactData } from '../../shared/types'
import { SlackService } from '../../slack/slack-service'
import {
  getSlackExternalConfig,
  isRealApiTestEnabled,
  isSlackExternalConfigured,
} from './external-config'

// 実際のAPI呼び出しが無効な場合はテストをスキップ
const describeOrSkip =
  isRealApiTestEnabled() && isSlackExternalConfigured() ? describe : describe.skip

describeOrSkip('SlackService External Integration Tests', () => {
  let slackService: SlackService

  const testRawContactData: RawContactData = {
    id: 'slack-external-test-id',
    name: 'Slack外部統合テストユーザー',
    email: 'slack-external@example.com',
    subject: 'テスト問い合わせ',
    message: 'これはSlack外部統合テスト用の問い合わせメッセージです。実際のWebhookに送信されます。',
    createdAt: new Date(),
  }

  beforeAll(() => {
    // デバッグ: 環境変数の詳細出力
    console.log('🔍 環境変数の詳細デバッグ情報:')
    console.log('  ENABLE_REAL_API_TESTS:', JSON.stringify(process.env.ENABLE_REAL_API_TESTS))
    console.log('  SLACK_TEST_WEBHOOK_URL 存在:', !!process.env.SLACK_TEST_WEBHOOK_URL)
    console.log('  SLACK_TEST_WEBHOOK_URL 長さ:', process.env.SLACK_TEST_WEBHOOK_URL?.length || 0)
    console.log('  SLACK_TEST_WEBHOOK_URL 値:', process.env.SLACK_TEST_WEBHOOK_URL || 'undefined')
    console.log('  isRealApiTestEnabled():', isRealApiTestEnabled())
    console.log('  isSlackExternalConfigured():', isSlackExternalConfigured())

    if (!isRealApiTestEnabled() || !isSlackExternalConfigured()) {
      console.log('❌ テストがスキップされる理由: External統合テストが無効またはSlack設定が不完全')
      return
    }

    const config = getSlackExternalConfig()
    slackService = new SlackService(config.webhookUrl)

    console.log('🔗 Slack Webhook E2Eテストを開始します')
    console.log('⚠️  実際のSlackチャンネルにテストメッセージが送信されます')

    // デバッグ: 使用されている環境変数を出力
    console.log('📋 使用されている環境変数:')
    console.log('  ENABLE_REAL_API_TESTS:', process.env.ENABLE_REAL_API_TESTS)
    console.log(
      '  SLACK_TEST_WEBHOOK_URL:',
      process.env.SLACK_TEST_WEBHOOK_URL
        ? `${process.env.SLACK_TEST_WEBHOOK_URL.substring(0, 50)}...`
        : 'undefined'
    )
    console.log(
      '  設定取得結果:',
      config.webhookUrl ? `${config.webhookUrl.substring(0, 50)}...` : 'undefined'
    )
  })

  it('実際のSlack Webhookに通知を送信できる', async () => {
    const result = await slackService.sendContactNotification(testRawContactData)

    expect(result.success).toBe(true)
    expect(result.service).toBe('slack')

    console.log('✅ Slack通知の送信が成功しました')
    console.log('💬 Slackチャンネルでメッセージを確認してください')
  })

  it('日本語を含むメッセージを正しく送信できる', async () => {
    const japaneseRawContactData: RawContactData = {
      ...testRawContactData,
      id: 'japanese-test-id',
      name: '山田太郎',
      email: 'yamada.taro@example.jp',
      subject: '日本語テスト問い合わせ',
      message: 'こんにちは！これは日本語のテストメッセージです。絵文字も含めます 🚀✨🎉',
      createdAt: new Date(),
    }

    const result = await slackService.sendContactNotification(japaneseRawContactData)

    expect(result.success).toBe(true)
    expect(result.service).toBe('slack')

    console.log('✅ 日本語メッセージの送信が成功しました')
  })

  it('長いメッセージを送信できる', async () => {
    const longMessage = 'これは非常に長いテストメッセージです。'.repeat(50)
    const longMessageRawContactData: RawContactData = {
      ...testRawContactData,
      id: 'long-message-test-id',
      name: '長文テストユーザー',
      email: 'long-message@example.com',
      subject: '長文メッセージテスト',
      message: longMessage,
      createdAt: new Date(),
    }

    const result = await slackService.sendContactNotification(longMessageRawContactData)

    expect(result.success).toBe(true)
    expect(result.service).toBe('slack')

    console.log('✅ 長いメッセージの送信が成功しました')
  })

  it('特殊文字を含むメッセージを送信できる', async () => {
    const specialCharRawContactData: RawContactData = {
      ...testRawContactData,
      id: 'special-char-test-id',
      name: 'Special <User> & "Test"',
      email: 'special+chars@example.com',
      subject: '特殊文字テスト',
      message: 'メッセージに特殊文字を含みます: <>&"\'`{}[]()\\/*-+',
      createdAt: new Date(),
    }

    const result = await slackService.sendContactNotification(specialCharRawContactData)

    expect(result.success).toBe(true)
    expect(result.service).toBe('slack')

    console.log('✅ 特殊文字を含むメッセージの送信が成功しました')
  })

  it('複数の通知を連続で送信できる', async () => {
    const testMessages = [
      'バッチテストメッセージ 1/3',
      'バッチテストメッセージ 2/3',
      'バッチテストメッセージ 3/3',
    ]

    const results = await Promise.all(
      testMessages.map((message, index) =>
        slackService.sendContactNotification({
          ...testRawContactData,
          id: `batch-test-${index + 1}`,
          message,
          name: `バッチテストユーザー${index + 1}`,
          email: `batch${index + 1}@example.com`,
          subject: `バッチテスト${index + 1}`,
        })
      )
    )

    expect(results.every((result) => result.success)).toBe(true)
    expect(results.every((result) => result.service === 'slack')).toBe(true)

    console.log(`✅ ${testMessages.length}件の連続通知送信が成功しました`)
  })

  it('無効なWebhook URLでエラーハンドリングが機能する', async () => {
    const invalidService = new SlackService('https://invalid-webhook-url.example.com/invalid')

    await expect(invalidService.sendContactNotification(testRawContactData)).rejects.toThrow()

    console.log('✅ 無効なWebhook URLでのエラーハンドリングを確認しました')
  })
})
