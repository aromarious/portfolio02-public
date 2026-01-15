import { relations } from 'drizzle-orm/relations'

import { account, contact, person, session, user } from './schema'

export const contactRelations = relations(contact, ({ one }) => ({
  person: one(person, {
    fields: [contact.personId],
    references: [person.id],
  }),
}))

export const personRelations = relations(person, ({ many }) => ({
  contacts: many(contact),
}))

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}))

export const userRelations = relations(user, ({ many }) => ({
  accounts: many(account),
  sessions: many(session),
}))

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}))
