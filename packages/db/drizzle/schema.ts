import { sql } from 'drizzle-orm'
import {
  boolean,
  foreignKey,
  index,
  inet,
  integer,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core'

export const rateLimit = pgTable(
  'rate_limit',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    ipAddress: inet('ip_address'),
    email: varchar({ length: 254 }),
    attemptCount: integer('attempt_count').default(1).notNull(),
    firstAttemptAt: timestamp('first_attempt_at', { mode: 'string' }).defaultNow().notNull(),
    lastAttemptAt: timestamp('last_attempt_at', { mode: 'string' }).defaultNow().notNull(),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
  },
  (table) => [
    index('rate_limit_cleanup_idx').using(
      'btree',
      table.createdAt.asc().nullsLast().op('timestamp_ops')
    ),
    index('rate_limit_email_time_idx').using(
      'btree',
      table.email.asc().nullsLast().op('text_ops'),
      table.lastAttemptAt.asc().nullsLast().op('text_ops')
    ),
    index('rate_limit_ip_time_idx').using(
      'btree',
      table.ipAddress.asc().nullsLast().op('inet_ops'),
      table.lastAttemptAt.asc().nullsLast().op('timestamp_ops')
    ),
  ]
)

export const verification = pgTable('verification', {
  id: text().primaryKey().notNull(),
  identifier: text().notNull(),
  value: text().notNull(),
  expiresAt: timestamp('expires_at', { mode: 'string' }).notNull(),
  createdAt: timestamp('created_at', { mode: 'string' }),
  updatedAt: timestamp('updated_at', { mode: 'string' }),
})

export const person = pgTable(
  'person',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    name: varchar({ length: 256 }).notNull(),
    email: varchar({ length: 256 }).notNull(),
    company: varchar({ length: 256 }),
    twitterHandle: varchar('twitter_handle', { length: 50 }),
    firstContactAt: timestamp('first_contact_at', { mode: 'string' }).defaultNow().notNull(),
    lastContactAt: timestamp('last_contact_at', { mode: 'string' }).defaultNow().notNull(),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().notNull(),
  },
  (table) => [
    index('person_email_idx').using('btree', table.email.asc().nullsLast().op('text_ops')),
    unique('person_email_unique').on(table.email),
  ]
)

export const contact = pgTable(
  'contact',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    personId: uuid('person_id').notNull(),
    subject: varchar({ length: 256 }).notNull(),
    message: text().notNull(),
    ipAddress: varchar('ip_address', { length: 45 }),
    userAgent: text('user_agent'),
    browserName: varchar('browser_name', { length: 100 }),
    browserVersion: varchar('browser_version', { length: 50 }),
    osName: varchar('os_name', { length: 100 }),
    deviceType: varchar('device_type', { length: 20 }),
    screenResolution: varchar('screen_resolution', { length: 20 }),
    timezone: varchar({ length: 50 }),
    language: varchar({ length: 10 }),
    referer: text(),
    sessionId: varchar('session_id', { length: 256 }),
    formDuration: integer('form_duration'),
    previousVisitAt: timestamp('previous_visit_at', { mode: 'string' }),
    notionSynced: boolean('notion_synced').default(false).notNull(),
    slackNotified: boolean('slack_notified').default(false).notNull(),
    notionSyncedAt: timestamp('notion_synced_at', { mode: 'string' }),
    slackNotifiedAt: timestamp('slack_notified_at', { mode: 'string' }),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow(),
  },
  (table) => [
    index('contact_created_at_idx').using(
      'btree',
      table.createdAt.asc().nullsLast().op('timestamp_ops')
    ),
    index('contact_person_id_idx').using('btree', table.personId.asc().nullsLast().op('uuid_ops')),
    foreignKey({
      columns: [table.personId],
      foreignColumns: [person.id],
      name: 'contact_person_id_person_id_fk',
    }),
  ]
)

export const user = pgTable(
  'user',
  {
    id: text().primaryKey().notNull(),
    name: text().notNull(),
    email: text().notNull(),
    emailVerified: boolean('email_verified').notNull(),
    image: text(),
    createdAt: timestamp('created_at', { mode: 'string' }).notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).notNull(),
  },
  (table) => [unique('user_email_unique').on(table.email)]
)

export const account = pgTable(
  'account',
  {
    id: text().primaryKey().notNull(),
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(),
    userId: text('user_id').notNull(),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    idToken: text('id_token'),
    accessTokenExpiresAt: timestamp('access_token_expires_at', { mode: 'string' }),
    refreshTokenExpiresAt: timestamp('refresh_token_expires_at', { mode: 'string' }),
    scope: text(),
    password: text(),
    createdAt: timestamp('created_at', { mode: 'string' }).notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [user.id],
      name: 'account_user_id_user_id_fk',
    }).onDelete('cascade'),
  ]
)

export const session = pgTable(
  'session',
  {
    id: text().primaryKey().notNull(),
    expiresAt: timestamp('expires_at', { mode: 'string' }).notNull(),
    token: text().notNull(),
    createdAt: timestamp('created_at', { mode: 'string' }).notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).notNull(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    userId: text('user_id').notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [user.id],
      name: 'session_user_id_user_id_fk',
    }).onDelete('cascade'),
    unique('session_token_unique').on(table.token),
  ]
)
