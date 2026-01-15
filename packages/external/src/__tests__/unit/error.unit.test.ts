import { describe, expect, it } from 'vitest'

import { ExternalServiceError } from '../../shared/error'

describe('ExternalServiceError', () => {
  it('メッセージ、サービス名、原因エラーを正しく設定する', () => {
    const originalError = new Error('Original error message')
    const error = new ExternalServiceError('Test error', 'notion', originalError)

    expect(error.message).toBe('Test error')
    expect(error.service).toBe('notion')
    expect(error.originalError).toBe(originalError)
    expect(error.name).toBe('ExternalServiceError')
    expect(error).toBeInstanceOf(Error)
    expect(error).toBeInstanceOf(ExternalServiceError)
  })

  it('原因エラーが提供されない場合でも正しく動作する', () => {
    const error = new ExternalServiceError('Test error', 'slack')

    expect(error.message).toBe('Test error')
    expect(error.service).toBe('slack')
    expect(error.originalError).toBeUndefined()
    expect(error.name).toBe('ExternalServiceError')
  })

  it('スタックトレースが保持される', () => {
    const error = new ExternalServiceError('Test error', 'notion')

    expect(error.stack).toBeDefined()
    expect(typeof error.stack).toBe('string')
  })

  it('異なるサービス名で作成できる', () => {
    const notionError = new ExternalServiceError('Notion error', 'notion')
    const slackError = new ExternalServiceError('Slack error', 'slack')

    expect(notionError.service).toBe('notion')
    expect(slackError.service).toBe('slack')
  })
})
