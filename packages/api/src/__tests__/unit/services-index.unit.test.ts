/**
 * servicesパッケージのindex.tsのテスト
 */
import { describe, expect, it } from 'vitest'

describe('services index exports', () => {
  it('should export ContactApplicationService', async () => {
    const services = await import('../../application/services/index')
    expect(services.ContactApplicationService).toBeDefined()
    expect(typeof services.ContactApplicationService).toBe('function')
  })

  it('should be able to import ContactApplicationService directly', async () => {
    const { ContactApplicationService } =
      await import('../../application/services/contact-application.service')
    expect(ContactApplicationService).toBeDefined()
    expect(typeof ContactApplicationService).toBe('function')
  })

  it('should have the same export from index and direct import', async () => {
    const fromIndex = await import('../../application/services/index')
    const fromDirect = await import('../../application/services/contact-application.service')

    expect(fromIndex.ContactApplicationService).toBe(fromDirect.ContactApplicationService)
  })
})
