import type { Contact } from '../entities/contact.entity'
import type { PaginationOptions } from './common'

export interface ContactFilter {
  personId?: string
  createdAfter?: Date
  createdBefore?: Date
  notionSynced?: boolean
  slackNotified?: boolean
}

export interface ContactRepositoryPort {
  /**
   * Save a new contact
   */
  save(contact: Contact): Promise<Contact>

  /**
   * Update an existing contact
   */
  update(contact: Contact): Promise<Contact>

  /**
   * Find contact by ID
   */
  findById(id: string): Promise<Contact | null>

  /**
   * Find contacts with filters and pagination
   */
  findMany(filter?: ContactFilter, pagination?: PaginationOptions): Promise<Contact[]>

  /**
   * Count contacts with filters
   */
  count(filter?: ContactFilter): Promise<number>

  /**
   * Find contacts by person ID
   */
  findByPersonId(personId: string): Promise<Contact[]>

  /**
   * Find unsynced contacts for external services
   */
  findUnsyncedForNotion(): Promise<Contact[]>
  findUnnotifiedForSlack(): Promise<Contact[]>

  /**
   * Delete a contact (soft delete recommended)
   */
  delete(id: string): Promise<void>

  /**
   * Check if contact exists
   */
  exists(id: string): Promise<boolean>

  /**
   * Update external service status flags
   */
  updateExternalServiceStatus(
    contactId: string,
    updates: {
      slackNotified?: boolean
      slackNotifiedAt?: Date
      notionSynced?: boolean
      notionSyncedAt?: Date
    }
  ): Promise<void>

  /**
   * Update notion page ID for a contact
   */
  updateNotionPageId(id: string, notionPageId: string): Promise<void>

  /**
   * Delete all contacts (for testing/seeding purposes)
   */
  deleteAll(): Promise<void>
}
