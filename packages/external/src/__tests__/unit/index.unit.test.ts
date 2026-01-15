/**
 * externalパッケージのエントリポイントのテスト
 */
import { describe, expect, it } from 'vitest'

describe('external package exports', () => {
  it('should export all configuration functions', async () => {
    const { parseExternalEnv, isSlackConfigured, isNotionConfigured } =
      await import('../../config/env')

    expect(parseExternalEnv).toBeDefined()
    expect(typeof parseExternalEnv).toBe('function')
    expect(isSlackConfigured).toBeDefined()
    expect(typeof isSlackConfigured).toBe('function')
    expect(isNotionConfigured).toBeDefined()
    expect(typeof isNotionConfigured).toBe('function')
  })

  it('should export all error classes', async () => {
    const { ExternalServiceError } = await import('../../shared/error')

    expect(ExternalServiceError).toBeDefined()
    expect(typeof ExternalServiceError).toBe('function')
  })

  it('should export all service classes', async () => {
    const { SlackService } = await import('../../slack/slack-service')
    const { NotionClient } = await import('../../notion/notion-client')

    expect(SlackService).toBeDefined()
    expect(typeof SlackService).toBe('function')
    expect(NotionClient).toBeDefined()
    expect(typeof NotionClient).toBe('function')
  })

  it('should export types correctly', async () => {
    const types = await import('../../shared/types')

    expect(types).toBeDefined()
  })

  it('should create instances of exported classes without errors', async () => {
    const env = {
      NOTION_API_TOKEN: 'test-token',
      NOTION_PARENT_PAGE_ID: 'test-page-id',
      SLACK_WEBHOOK_URL: 'https://hooks.slack.com/test',
    }

    const { parseExternalEnv } = await import('../../config/env')
    const { SlackService } = await import('../../slack/slack-service')
    const { NotionClient } = await import('../../notion/notion-client')
    const config = parseExternalEnv()
    expect(config).toBeDefined()

    const slackService = new SlackService(env.SLACK_WEBHOOK_URL)
    expect(slackService).toBeInstanceOf(SlackService)

    const notionClient = new NotionClient(env.NOTION_API_TOKEN, env.NOTION_PARENT_PAGE_ID)
    expect(notionClient).toBeInstanceOf(NotionClient)
  })
})
