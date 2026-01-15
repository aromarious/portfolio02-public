import type { Contact } from '@aromarious/domain'
import type { ContactFormInput } from '@aromarious/validators'

/**
 * 問い合わせ送信のためのInput DTO
 * 現在はContactFormInputと同じ定義を使用
 * 将来的に他の呼び出し元からの要求が異なる場合は、この型を拡張する
 */
export type SubmitInquiryInput = ContactFormInput

/**
 * 問い合わせ送信結果のOutput DTO
 */
export interface SubmitInquiryOutput {
  success: boolean
  contactId: string
  message: string
  isFirstTimeContact: boolean
}

/**
 * ContactエンティティからDTOへの変換結果
 */
export interface ContactResult {
  id: string
  personId: string
  subject: string
  message: string
  createdAt: Date
  isFirstTimeContact: boolean
}

/**
 * ContactエンティティからContactResultへの変換ヘルパー
 */
export function contactResultFromEntity(
  contact: Contact,
  isFirstTimeContact: boolean
): ContactResult {
  if (!contact.personId) {
    throw new Error('Contact personId is required')
  }
  if (!contact.subject) {
    throw new Error('Contact subject is required')
  }
  if (!contact.message) {
    throw new Error('Contact message is required')
  }

  return {
    id: contact.id,
    personId: contact.personId,
    subject: contact.subject,
    message: contact.message,
    createdAt: contact.createdAt,
    isFirstTimeContact,
  }
}
