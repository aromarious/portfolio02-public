/**
 * applicationパッケージのindex.tsのテスト
 */
import { describe, expect, it } from 'vitest'

describe('application index exports', () => {
  it('should export all DTO functions', async () => {
    const application = await import('../../application/index')
    expect(application.contactResultFromEntity).toBeDefined()
    expect(application.personOutputFromEntity).toBeDefined()
  })

  it('should export all services', async () => {
    const application = await import('../../application/index')
    expect(application.ContactApplicationService).toBeDefined()
  })

  it('should have the same exports as individual modules', async () => {
    const application = await import('../../application/index')
    const dtos = await import('../../application/dtos/index')
    const services = await import('../../application/services/index')

    expect(application.contactResultFromEntity).toBe(dtos.contactResultFromEntity)
    expect(application.personOutputFromEntity).toBe(dtos.personOutputFromEntity)
    expect(application.ContactApplicationService).toBe(services.ContactApplicationService)
  })

  it('should be able to create instances of exported classes', async () => {
    const { ContactApplicationService } = await import('../../application/index')

    expect(() => {
      new ContactApplicationService(
        {} as any, // contactDomainService mock
        {} as any // externalSyncDomainService mock
      )
    }).not.toThrow()
  })
})
