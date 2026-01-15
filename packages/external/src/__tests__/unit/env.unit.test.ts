import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { isNotionConfigured, isSlackConfigured, parseExternalEnv } from '../../config/env'

describe('Environment Configuration', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.clearAllMocks()
    // 環境変数をリセット
    process.env = { ...originalEnv }
    process.env.NOTION_API_TOKEN = undefined
    process.env.NOTION_PARENT_PAGE_ID = undefined
    process.env.SLACK_WEBHOOK_URL = undefined
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('parseExternalEnv', () => {
    it('すべての環境変数が設定されている場合、パースされた値を返す', () => {
      process.env.NOTION_API_TOKEN = 'test-notion-token'
      process.env.NOTION_PARENT_PAGE_ID = 'test-notion-db-id'
      process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/test'

      const result = parseExternalEnv()

      expect(result).toEqual({
        NOTION_API_TOKEN: 'test-notion-token',
        NOTION_PARENT_PAGE_ID: 'test-notion-db-id',
        SLACK_WEBHOOK_URL: 'https://hooks.slack.com/test',
      })
    })

    it('一部の環境変数が未設定の場合、undefinedとして返す', () => {
      process.env.NOTION_API_TOKEN = 'test-notion-token'
      // NOTION_PARENT_PAGE_IDとSLACK_WEBHOOK_URLは未設定

      const result = parseExternalEnv()

      expect(result).toEqual({
        NOTION_API_TOKEN: 'test-notion-token',
        NOTION_PARENT_PAGE_ID: undefined,
        SLACK_WEBHOOK_URL: undefined,
      })
    })

    it('すべての環境変数が未設定の場合、すべてundefinedとして返す', () => {
      const result = parseExternalEnv()

      expect(result).toEqual({
        NOTION_API_TOKEN: undefined,
        NOTION_PARENT_PAGE_ID: undefined,
        SLACK_WEBHOOK_URL: undefined,
      })
    })
  })

  describe('isNotionConfigured', () => {
    it('APIトークンと親ページIDが設定されている場合、trueを返す', () => {
      const env = {
        NOTION_API_TOKEN: 'test-token',
        NOTION_PARENT_PAGE_ID: 'test-parent-id',
        SLACK_WEBHOOK_URL: undefined,
      }

      expect(isNotionConfigured(env)).toBe(true)
    })

    it('APIトークンが未設定の場合、falseを返す', () => {
      const env = {
        NOTION_API_TOKEN: undefined,
        NOTION_PARENT_PAGE_ID: 'test-parent-id',
        SLACK_WEBHOOK_URL: undefined,
      }

      expect(isNotionConfigured(env)).toBe(false)
    })

    it('親ページIDが未設定の場合、falseを返す', () => {
      const env = {
        NOTION_API_TOKEN: 'test-token',
        NOTION_PARENT_PAGE_ID: undefined,
        SLACK_WEBHOOK_URL: undefined,
      }

      expect(isNotionConfigured(env)).toBe(false)
    })

    it('すべての値が未設定の場合、falseを返す', () => {
      const env = {
        NOTION_API_TOKEN: undefined,
        NOTION_PARENT_PAGE_ID: undefined,
        SLACK_WEBHOOK_URL: undefined,
      }

      expect(isNotionConfigured(env)).toBe(false)
    })
  })

  describe('isSlackConfigured', () => {
    it('WebhookURLが設定されている場合、trueを返す', () => {
      const env = {
        NOTION_API_TOKEN: undefined,
        NOTION_PARENT_PAGE_ID: undefined,
        SLACK_WEBHOOK_URL: 'https://hooks.slack.com/test',
      }

      expect(isSlackConfigured(env)).toBe(true)
    })

    it('WebhookURLが未設定の場合、falseを返す', () => {
      const env = {
        NOTION_API_TOKEN: undefined,
        NOTION_PARENT_PAGE_ID: undefined,
        SLACK_WEBHOOK_URL: undefined,
      }

      expect(isSlackConfigured(env)).toBe(false)
    })

    it('WebhookURLが空文字の場合、falseを返す', () => {
      const env = {
        NOTION_API_TOKEN: undefined,
        NOTION_PARENT_PAGE_ID: undefined,
        SLACK_WEBHOOK_URL: '',
      }

      expect(isSlackConfigured(env)).toBe(false)
    })
  })
})
