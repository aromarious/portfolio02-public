/**
 * 型定義のテスト
 */
import { describe, expect, it } from 'vitest'

import type { ExternalServiceResult, PersonData, RawContactData } from '../../shared/types'

describe('shared types', () => {
  describe('ExternalServiceResult', () => {
    it('should have correct structure for success case', () => {
      const result: ExternalServiceResult = {
        success: true,
        service: 'slack',
      }

      expect(result.success).toBe(true)
      expect(result.service).toBe('slack')
      expect(result.error).toBeUndefined()
    })

    it('should have correct structure for error case', () => {
      const result: ExternalServiceResult = {
        success: false,
        error: 'Test error',
        service: 'notion',
      }

      expect(result.success).toBe(false)
      expect(result.service).toBe('notion')
      expect(result.error).toBe('Test error')
    })

    it('should allow both slack and notion services', () => {
      const slackResult: ExternalServiceResult = {
        success: true,
        service: 'slack',
      }

      const notionResult: ExternalServiceResult = {
        success: true,
        service: 'notion',
      }

      expect(slackResult.service).toBe('slack')
      expect(notionResult.service).toBe('notion')
    })
  })

  describe('RawContactData', () => {
    it('should have correct structure with required fields', () => {
      const contactData: RawContactData = {
        id: 'contact-123',
        name: 'Test User',
        email: 'test@example.com',
        subject: 'Test Subject',
        message: 'Test Message',
        createdAt: new Date('2025-01-01'),
      }

      expect(contactData.id).toBe('contact-123')
      expect(contactData.name).toBe('Test User')
      expect(contactData.email).toBe('test@example.com')
      expect(contactData.subject).toBe('Test Subject')
      expect(contactData.message).toBe('Test Message')
      expect(contactData.createdAt).toBeInstanceOf(Date)
      expect(contactData.personNotionId).toBeUndefined()
    })

    it('should support optional personNotionId field', () => {
      const contactData: RawContactData = {
        id: 'contact-123',
        name: 'Test User',
        email: 'test@example.com',
        subject: 'Test Subject',
        message: 'Test Message',
        createdAt: new Date('2025-01-01'),
        personNotionId: 'person-notion-123',
      }

      expect(contactData.personNotionId).toBe('person-notion-123')
    })
  })

  describe('PersonData', () => {
    it('should have correct structure with required fields', () => {
      const personData: PersonData = {
        id: 'person-123',
        name: 'Test Person',
        email: 'person@example.com',
        createdAt: new Date('2025-01-01'),
      }

      expect(personData.id).toBe('person-123')
      expect(personData.name).toBe('Test Person')
      expect(personData.email).toBe('person@example.com')
      expect(personData.createdAt).toBeInstanceOf(Date)
      expect(personData.twitterHandle).toBeUndefined()
    })

    it('should support optional twitterHandle field', () => {
      const personData: PersonData = {
        id: 'person-123',
        name: 'Test Person',
        email: 'person@example.com',
        twitterHandle: '@testuser',
        createdAt: new Date('2025-01-01'),
      }

      expect(personData.twitterHandle).toBe('@testuser')
    })
  })
})
