/**
 * 外部サービス操作時のエラー
 */
export class ExternalServiceError extends Error {
  constructor(
    message: string,
    public readonly service: 'slack' | 'notion',
    public readonly originalError?: unknown
  ) {
    super(message)
    this.name = 'ExternalServiceError'
  }
}
