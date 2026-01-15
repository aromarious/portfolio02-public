export * from 'drizzle-orm/sql'
export { alias } from 'drizzle-orm/pg-core'

// Schema exports (table schemas only, avoid domain entity conflicts)
export { PersonTable, ContactTable } from './schema'

export { db, type Database, type DbClient } from './client'
export * from './repository/person.repository'
export * from './repository/contact.repository'
