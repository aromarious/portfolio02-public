import type { InferInsertModel, InferSelectModel } from 'drizzle-orm'
import { foreignKey, index, pgTable } from 'drizzle-orm/pg-core'
import { createInsertSchema } from 'drizzle-zod'
import { z } from 'zod/v4'

/**
 * テーブル定義にはスキーマ名を指定しない
 * 実行時の search_path によって対象スキーマが決まる
 */
export const createTable = pgTable

// Persons table
export const PersonTable = createTable(
  'person',
  // biome-ignore lint/suspicious/noExplicitAny: Drizzle ORMの型システムに合わせて any を使用する必要がある
  (t: any) => ({
    id: t.uuid('id').notNull().primaryKey().defaultRandom(),
    name: t.varchar('name', { length: 256 }).notNull(),
    email: t.varchar('email', { length: 256 }).notNull().unique(),
    company: t.varchar('company', { length: 256 }),
    twitterHandle: t.varchar('twitter_handle', { length: 50 }),
    notionPageId: t.varchar('notion_page_id', { length: 128 }),
    firstContactAt: t.timestamp('first_contact_at').defaultNow().notNull(),
    lastContactAt: t.timestamp('last_contact_at').defaultNow().notNull(),
    createdAt: t.timestamp('created_at').defaultNow().notNull(),
    updatedAt: t
      .timestamp('updated_at')
      .notNull()
      .defaultNow()
      .$onUpdateFn(() => new Date()),
  }),
  // biome-ignore lint/suspicious/noExplicitAny: Drizzle ORMの型システムに合わせて any を使用する必要がある
  (table: any) => [index('person_email_idx').on(table.email)]
)

// Contacts table
export const ContactTable = createTable(
  'contact',
  // biome-ignore lint/suspicious/noExplicitAny: Drizzle ORMの型システムに合わせて any を使用する必要がある
  (t: any) => ({
    id: t.uuid('id').notNull().primaryKey().defaultRandom(),
    personId: t.uuid('person_id').notNull(),
    inquirerName: t.varchar('inquirer_name', { length: 256 }),
    inquirerEmail: t.varchar('inquirer_email', { length: 256 }),
    subject: t.varchar('subject', { length: 256 }).notNull(),
    message: t.text('message').notNull(),

    // Technical information
    ipAddress: t.varchar('ip_address', { length: 45 }),
    userAgent: t.text('user_agent'),
    browserName: t.varchar('browser_name', { length: 100 }),
    browserVersion: t.varchar('browser_version', { length: 50 }),
    osName: t.varchar('os_name', { length: 100 }),
    deviceType: t.varchar('device_type', { length: 20 }),
    screenResolution: t.varchar('screen_resolution', { length: 20 }),
    timezone: t.varchar('timezone', { length: 50 }),
    language: t.varchar('language', { length: 10 }),
    referer: t.text('referer'),

    // Session information
    sessionId: t.varchar('session_id', { length: 256 }),
    formDuration: t.integer('form_duration'),
    previousVisitAt: t.timestamp('previous_visit_at'),

    // External integration flags
    notionSynced: t.boolean('notion_synced').default(false).notNull(),
    slackNotified: t.boolean('slack_notified').default(false).notNull(),
    notionPageId: t.varchar('notion_page_id', { length: 128 }),
    notionSyncedAt: t.timestamp('notion_synced_at'),
    slackNotifiedAt: t.timestamp('slack_notified_at'),

    createdAt: t.timestamp('created_at').defaultNow().notNull(),
    updatedAt: t
      .timestamp('updated_at')
      .defaultNow()
      .$onUpdateFn(() => new Date()),
  }),
  // biome-ignore lint/suspicious/noExplicitAny: Drizzle ORMの型システムに合わせて any を使用する必要がある
  (table: any) => [
    foreignKey({
      columns: [table.personId],
      foreignColumns: [PersonTable.id],
      name: 'contact_person_id_fk',
    })
      .onDelete('cascade')
      .onUpdate('cascade'),
    index('contact_person_id_idx').on(table.personId),
    index('contact_created_at_idx').on(table.createdAt),
  ]
)

// Type definitions for repository layer
export type PersonSelectModel = InferSelectModel<typeof PersonTable>
export type PersonInsertModel = InferInsertModel<typeof PersonTable>

export type ContactSelectModel = InferSelectModel<typeof ContactTable>
export type ContactInsertModel = InferInsertModel<typeof ContactTable>
