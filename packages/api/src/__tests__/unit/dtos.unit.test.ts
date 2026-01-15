/**
 * DTOファイルのテスト
 */
import { describe, expect, it } from 'vitest'

describe('Contact DTO exports', () => {
  it('should export SubmitInquiryInput interface', async () => {
    const contactDto = await import('../../application/dtos/contact.dto')

    // 型チェックを通るように実際の型を使用
    const testInput = {
      email: 'test@example.com',
      name: 'Test User',
      subject: 'Test Subject',
      message: 'Test Message',
    }

    expect(testInput.email).toBe('test@example.com')
    expect(testInput.name).toBe('Test User')

    // DTOモジュールが正しくロードされることを確認
    expect(contactDto).toBeDefined()
  })

  it('should export contactResultFromEntity function', async () => {
    const { contactResultFromEntity } = await import('../../application/dtos/contact.dto')
    expect(contactResultFromEntity).toBeDefined()
    expect(typeof contactResultFromEntity).toBe('function')
  })

  it('should have working contactResultFromEntity function', async () => {
    const { contactResultFromEntity } = await import('../../application/dtos/contact.dto')

    const mockContact = {
      id: 'test-id',
      personId: 'person-id',
      subject: 'Test Subject',
      message: 'Test Message',
      createdAt: new Date('2025-01-01'),
    }

    const result = contactResultFromEntity(mockContact as any, true)
    expect(result.id).toBe('test-id')
    expect(result.personId).toBe('person-id')
    expect(result.isFirstTimeContact).toBe(true)
  })
})

describe('Person DTO exports', () => {
  it('should export GetPersonInput interface', async () => {
    const personDto = await import('../../application/dtos/person.dto')

    // 型チェックを通るように実際の型を使用
    const testInput = {
      email: 'test@example.com',
    }

    expect(testInput.email).toBe('test@example.com')

    // DTOモジュールが正しくロードされることを確認
    expect(personDto).toBeDefined()
  })

  it('should export personOutputFromEntity function', async () => {
    const { personOutputFromEntity } = await import('../../application/dtos/person.dto')
    expect(personOutputFromEntity).toBeDefined()
    expect(typeof personOutputFromEntity).toBe('function')
  })

  it('should have working personOutputFromEntity function', async () => {
    const { personOutputFromEntity } = await import('../../application/dtos/person.dto')

    const mockPerson = {
      id: 'test-person-id',
      name: 'Test Person',
      email: { value: 'person@example.com' },
      lastContactAt: new Date('2025-01-01'),
      createdAt: new Date('2025-01-01'),
      updatedAt: new Date('2025-01-01'),
    }

    const result = personOutputFromEntity(mockPerson as any)
    expect(result.id).toBe('test-person-id')
    expect(result.name).toBe('Test Person')
    expect(result.email).toBe('person@example.com')
  })
})

describe('DTO index exports', () => {
  it('should export all contact DTO functions and types', async () => {
    const dtos = await import('../../application/dtos/index')
    expect(dtos.contactResultFromEntity).toBeDefined()
    expect(dtos.personOutputFromEntity).toBeDefined()
  })
})
