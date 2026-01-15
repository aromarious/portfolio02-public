import type { Person } from '@aromarious/domain'

/**
 * Person取得のためのInput DTO
 */
export interface GetPersonInput {
  id?: string
  email?: string
}

/**
 * PersonのOutput DTO
 */
export interface PersonOutput {
  id: string
  name: string
  email: string
  company?: string
  twitterHandle?: string
  lastContactAt: Date
  createdAt: Date
  updatedAt: Date
}

/**
 * PersonエンティティからDTOへの変換ヘルパー
 */
export function personOutputFromEntity(person: Person): PersonOutput {
  return {
    id: person.id,
    name: person.name,
    email: person.email.value,
    company: person.company,
    twitterHandle: person.twitterHandle,
    lastContactAt: person.lastContactAt,
    createdAt: person.createdAt,
    updatedAt: person.updatedAt,
  }
}
