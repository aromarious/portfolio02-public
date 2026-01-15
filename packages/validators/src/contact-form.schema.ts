import { z } from 'zod/v4'

import { CreateContactPropsSchema, CreatePersonPropsSchema } from '@aromarious/domain'

// ドメインエンティティから必要なフィールドを取得してフォーム用に変換
// DRY原則: エンティティの定義を再利用して重複を避ける

// Personエンティティからフォーム用フィールドを取得
const personFormFields = CreatePersonPropsSchema.pick({
  name: true,
  company: true,
  twitterHandle: true,
}).extend({
  // emailは文字列として受け取る（フォーム入力用）
  email: z
    .string()
    .min(1, 'メールアドレスを入力してください')
    .email('有効なメールアドレスを入力してください'),
})

// Contactエンティティからフォーム用フィールドを取得
const contactFormFields = CreateContactPropsSchema.pick({
  subject: true,
  message: true,
  ipAddress: true,
  userAgent: true,
  referer: true,
  sessionId: true,
  deviceType: true,
  browserName: true,
  browserVersion: true,
  osName: true,
  screenResolution: true,
  language: true,
  timezone: true,
  formDuration: true,
  previousVisitAt: true,
})

// フロントエンドフォーム用の入力スキーマ
// エンティティ定義をベースとして、UI固有の調整のみ追加
export const contactFormInputSchema = personFormFields.merge(contactFormFields)

export type ContactFormInput = z.infer<typeof contactFormInputSchema>
