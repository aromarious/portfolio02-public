import { z } from 'zod/v4'

import { AggregateRoot, BaseDomainEvent } from '../ddd-base'

const DeviceTypeSchema = z.enum(['desktop', 'mobile', 'tablet'])
type DeviceType = z.infer<typeof DeviceTypeSchema>

// フィールド定義を別々に作成して再利用可能にする
export const ContactFields = {
  id: z.uuid({ error: 'IDはUUID形式である必要があります' }),
  personId: z.uuid({ error: '問い合わせ者IDはUUID形式である必要があります' }),

  // 問い合わせ者情報（非正規化）- NotionRepository用
  inquirerName: z.string().trim().min(1, { error: '問い合わせ者名は必須です' }),
  inquirerEmail: z.string().trim().email({ error: '有効なメールアドレスを入力してください' }),
  inquirerCompany: z
    .string()
    .trim()
    .max(256, { error: '会社名は256文字以内で入力してください' })
    .optional(),

  subject: z //
    .string()
    .trim()
    .max(256, { error: '件名は256文字以内で入力してください' })
    .optional(),
  message: z //
    .string()
    .min(1, { error: 'メッセージは必須です' }),

  // Technical information
  ipAddress: z //
    .string()
    .max(45, { error: 'IPアドレスは45文字以内である必要があります' })
    .optional(),
  userAgent: z //
    .string()
    .optional(),
  browserName: z //
    .string()
    .max(100, { error: 'ブラウザ名は100文字以内である必要があります' })
    .optional(),
  browserVersion: z //
    .string()
    .max(50, { error: 'ブラウザバージョンは50文字以内である必要があります' })
    .optional(),
  osName: z //
    .string()
    .max(100, { error: 'OS名は100文字以内である必要があります' })
    .optional(),
  deviceType: DeviceTypeSchema.optional(),
  screenResolution: z //
    .string()
    .max(20, { error: '画面解像度は20文字以内である必要があります' })
    .optional(),
  timezone: z //
    .string()
    .max(50, { error: 'タイムゾーンは50文字以内である必要があります' })
    .optional(),
  language: z //
    .string()
    .max(10, { error: '言語コードは10文字以内である必要があります' })
    .optional(),
  referer: z //
    .string()
    .optional(),

  // Session information
  sessionId: z //
    .string()
    .max(256, { error: 'セッションIDは256文字以内である必要があります' })
    .optional(),
  formDuration: z //
    .number()
    .int({ error: 'フォーム入力時間は整数である必要があります' })
    .min(0, { error: 'フォーム入力時間は0以上である必要があります' })
    .optional(),
  previousVisitAt: z //
    .date()
    .optional(),

  // External integration flags
  notionSynced: z.boolean(),
  slackNotified: z.boolean(),
  notionSyncedAt: z.date().optional(),
  slackNotifiedAt: z.date().optional(),
  notionPageId: z //
    .string()
    .trim()
    .optional(),

  createdAt: z.date(),
  updatedAt: z.date(),
}

export const ContactPropsSchema = z.object(ContactFields)
type ContactProps = z.infer<typeof ContactPropsSchema>

// pickを使ってスキーマを定義
// これにより将来ContactPropsSchemaが変更されても、ここの修正が必要ない
export const CreateContactPropsSchema = ContactPropsSchema.pick({
  personId: true,
  inquirerName: true,
  inquirerEmail: true,
  inquirerCompany: true,
  subject: true,
  message: true,
  ipAddress: true,
  userAgent: true,
  browserName: true,
  browserVersion: true,
  osName: true,
  deviceType: true,
  screenResolution: true,
  timezone: true,
  language: true,
  referer: true,
  sessionId: true,
  formDuration: true,
  previousVisitAt: true,
})

type CreateContactProps = z.infer<typeof CreateContactPropsSchema>

export class ContactCreatedEvent extends BaseDomainEvent {
  constructor(public readonly contactId: string) {
    super('ContactCreated')
  }
}

export class Contact extends AggregateRoot<ContactProps> {
  private constructor(props: ContactProps, isPersisted = false) {
    super(props, isPersisted)
  }

  get personId(): string {
    return this.props.personId
  }

  get inquirerName(): string {
    return this.props.inquirerName
  }

  get inquirerEmail(): string {
    return this.props.inquirerEmail
  }

  get inquirerCompany(): string | undefined {
    return this.props.inquirerCompany
  }

  get subject(): string | undefined {
    return this.props.subject
  }

  get message(): string {
    return this.props.message
  }

  get ipAddress(): string | undefined {
    return this.props.ipAddress
  }

  get userAgent(): string | undefined {
    return this.props.userAgent
  }

  get browserName(): string | undefined {
    return this.props.browserName
  }

  get browserVersion(): string | undefined {
    return this.props.browserVersion
  }

  get osName(): string | undefined {
    return this.props.osName
  }

  get deviceType(): DeviceType | undefined {
    return this.props.deviceType
  }

  get screenResolution(): string | undefined {
    return this.props.screenResolution
  }

  get timezone(): string | undefined {
    return this.props.timezone
  }

  get language(): string | undefined {
    return this.props.language
  }

  get referer(): string | undefined {
    return this.props.referer
  }

  get sessionId(): string | undefined {
    return this.props.sessionId
  }

  get formDuration(): number | undefined {
    return this.props.formDuration
  }

  get previousVisitAt(): Date | undefined {
    return this.props.previousVisitAt
  }

  get createdAt(): Date {
    return this.props.createdAt
  }

  get updatedAt(): Date {
    return this.props.updatedAt
  }

  get notionSynced(): boolean {
    return this.props.notionSynced
  }

  get slackNotified(): boolean {
    return this.props.slackNotified
  }

  get notionSyncedAt(): Date | undefined {
    return this.props.notionSyncedAt
  }

  get slackNotifiedAt(): Date | undefined {
    return this.props.slackNotifiedAt
  }

  get notionPageId(): string | undefined {
    return this.props.notionPageId
  }

  static create(props: CreateContactProps): Contact {
    const validatedProps = CreateContactPropsSchema.parse(props)

    const now = new Date()
    const contact = new Contact(
      {
        id: Contact.generateId(),
        ...validatedProps,
        notionSynced: false,
        slackNotified: false,
        notionPageId: undefined,
        createdAt: now,
        updatedAt: now,
      },
      false
    )

    contact.addDomainEvent(new ContactCreatedEvent(contact.id))
    return contact
  }

  static fromPersistence(props: ContactProps): Contact {
    return new Contact(props, true)
  }

  markNotionSynced(): void {
    this.props.notionSynced = true
    this.props.notionSyncedAt = new Date()
    this.props.updatedAt = new Date()
  }

  markSlackNotified(): void {
    this.props.slackNotified = true
    this.props.slackNotifiedAt = new Date()
    this.props.updatedAt = new Date()
  }

  needsNotionSync(): boolean {
    return !this.props.notionSynced
  }

  needsSlackNotification(): boolean {
    return !this.props.slackNotified
  }

  // For external service integrations
  toSlackMessage(): string {
    return `新しい問い合わせ
件名: ${this.subject}
メッセージ: ${this.message}
作成日時: ${this.createdAt.toISOString()}`
  }

  toNotionProperties(): Record<string, unknown> {
    return {
      title: this.subject,
      message: this.message,
      createdAt: this.createdAt.toISOString(),
      personId: this.personId,
    }
  }
}
