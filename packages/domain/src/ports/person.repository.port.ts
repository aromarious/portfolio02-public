import { z } from 'zod/v4'

import type { Person } from '../entities/person.entity'
import type { Email } from '../value-objects/email.vo'
import type { PaginationOptions } from './common'
import { PersonPropsSchema } from '../entities/person.entity'

const PersonFilterSchema = PersonPropsSchema.pick({
  name: true,
  company: true,
})
  .partial()
  .extend({
    email: z.string().optional(), // 文字列として部分一致検索
    createdAfter: z.date().optional(),
    createdBefore: z.date().optional(),
    hasCompany: z.boolean().optional(),
    twitterHandle: z.string().optional(), // Twitter ハンドルでの検索
  })

export type PersonFilter = z.infer<typeof PersonFilterSchema>

export interface PersonRepositoryPort {
  /**
   * Save a new person
   */
  save(person: Person): Promise<Person>

  /**
   * Update an existing person
   */
  update(person: Person): Promise<Person>

  /**
   * Find person by ID
   */
  findById(id: string): Promise<Person | null>

  /**
   * Find person by email
   */
  findByEmail(email: Email): Promise<Person | null>

  /**
   * Find persons with filters and pagination
   */
  findMany(filter?: PersonFilter, pagination?: PaginationOptions): Promise<Person[]>

  /**
   * Count persons with filters
   */
  count(filter?: PersonFilter): Promise<number>

  /**
   * Find or create person by email
   * If person exists, update their info and return existing person
   * If person doesn't exist, create new person
   */
  findOrCreate(email: string, name: string, company?: string): Promise<Person>

  /**
   * Find recent contacts (people who contacted recently)
   */
  findRecentContacts(withinDays?: number): Promise<Person[]>

  /**
   * Find persons by company
   */
  findByCompany(company: string): Promise<Person[]>

  /**
   * Check if person exists by email
   */
  existsByEmail(email: Email): Promise<boolean>

  /**
   * Delete a person (soft delete recommended)
   */
  delete(id: string): Promise<void>

  /**
   * Check if person exists
   */
  exists(id: string): Promise<boolean>

  /**
   * Update notion page ID for a person
   */
  updateNotionPageId(id: string, notionPageId: string): Promise<void>

  /**
   * Delete all persons (for testing/seeding purposes)
   */
  deleteAll(): Promise<void>
}
