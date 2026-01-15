import { z } from 'zod/v4'

import { AggregateRoot, BaseDomainEvent } from '../ddd-base'
import { Email } from '../value-objects/email.vo'

// Person履歴変更の型定義
export interface PersonHistoryChange {
  changeType: 'created' | 'name_changed' | 'company_changed' | 'twitter_handle_changed'
  oldValue?: string
  newValue: string
  timestamp: Date
  contactId?: string
}

// フィールド定義を別々に作成して再利用可能にする
export const PersonFields = {
  id: z //
    .uuid(),
  name: z
    .string()
    .trim()
    .max(256, '名前は256文字以内で入力してください')
    .refine((val) => val.length > 0, '名前は必須です'),
  email: z //
    .custom<Email>((val) => val instanceof Email, {
      message: 'Email値オブジェクトのインスタンスである必要があります',
    }),
  company: z //
    .string()
    .trim()
    .min(1, '会社名は1文字以上で入力してください')
    .max(256, '会社名は256文字以内で入力してください')
    .optional(), // オプショナルに変更
  twitterHandle: z
    .string()
    .trim()
    .optional()
    .refine(
      (val) => {
        if (val === undefined || val === '') return true // 空文字列やundefinedは許可
        return val.length >= 5 && val.length <= 15 && /^[a-zA-Z0-9_]+$/.test(val)
      },
      { message: 'Twitterハンドルは5-15文字で英数字・アンダースコアのみ使用可能です' }
    ),
  notionPageId: z //
    .string()
    .trim()
    .optional(),
  firstContactAt: z.date(),
  lastContactAt: z.date(),
  createdAt: z.date(),
  updatedAt: z.date(),
}

export const PersonPropsSchema = z.object(PersonFields)

// 作成時に必要なフィールドをピックアップし、emailは文字列で受け取る
export const CreatePersonFields = {
  name: PersonFields.name,
  company: PersonFields.company, // 既にオプショナル
  twitterHandle: PersonFields.twitterHandle,
  email: z.string(), // 文字列で受け取り、Email.create()でインスタンス化
}

// pickを使ってスキーマを定義し、emailは拡張で追加
export const CreatePersonPropsSchema = PersonPropsSchema.pick({
  name: true,
  twitterHandle: true,
}).extend({
  company: PersonFields.company, // 既にオプショナル
  email: z.string(), // 文字列で受け取り、Email.create()でインスタンス化
})

// 更新用のスキーマ（すべてオプショナル）
export const UpdatePersonPropsSchema = PersonPropsSchema.pick({
  name: true,
  company: true,
  twitterHandle: true,
}).partial()

type PersonProps = z.infer<typeof PersonPropsSchema>
type CreatePersonProps = z.infer<typeof CreatePersonPropsSchema>
type UpdatePersonProps = z.infer<typeof UpdatePersonPropsSchema>

export class PersonCreatedEvent extends BaseDomainEvent {
  constructor(
    public readonly personId: string,
    public readonly email: string
  ) {
    super('PersonCreated')
  }
}

export class Person extends AggregateRoot<PersonProps> {
  private constructor(props: PersonProps, isPersisted = false) {
    super(props, isPersisted)
  }

  get name(): string {
    return this.props.name
  }

  get email(): Email {
    return this.props.email
  }

  get company(): string | undefined {
    return this.props.company
  }

  get twitterHandle(): string | undefined {
    return this.props.twitterHandle
  }

  get notionPageId(): string | undefined {
    return this.props.notionPageId
  }

  get firstContactAt(): Date {
    return this.props.firstContactAt
  }

  get lastContactAt(): Date {
    return this.props.lastContactAt
  }

  get createdAt(): Date {
    return this.props.createdAt
  }

  get updatedAt(): Date {
    return this.props.updatedAt
  }

  static create(props: CreatePersonProps): Person {
    // Zodスキーマを使ってバリデーション
    const validatedProps = CreatePersonPropsSchema.parse(props)

    const emailVO = Email.create(validatedProps.email)
    const now = new Date()
    const id = crypto.randomUUID()

    const person = new Person({
      id,
      name: validatedProps.name,
      email: emailVO,
      company: validatedProps.company,
      twitterHandle: validatedProps.twitterHandle,
      firstContactAt: now,
      lastContactAt: now,
      createdAt: now,
      updatedAt: now,
    })

    person.addDomainEvent(new PersonCreatedEvent(id, validatedProps.email))
    return person
  }

  static fromPersistence(
    props: Omit<PersonProps, 'email'> & { email: string; notionPageId?: string }
  ): Person {
    return new Person(
      {
        ...props,
        email: Email.create(props.email),
      },
      true
    )
  }

  updateContactInfo(
    updates: UpdatePersonProps,
    options?: {
      contactId?: string
      historyCallback?: (changes: PersonHistoryChange[]) => Promise<void>
    }
  ): void {
    // 何も更新するものがない場合は何もしない
    if (Object.keys(updates).length === 0) {
      return
    }

    // Zodスキーマでバリデーション
    const validatedUpdates = UpdatePersonPropsSchema.parse(updates)

    let hasChanged = false
    const historyChanges: PersonHistoryChange[] = []

    // 各フィールドを確認して変更があれば更新
    if (validatedUpdates.name !== undefined && this.props.name !== validatedUpdates.name) {
      historyChanges.push({
        changeType: 'name_changed',
        oldValue: this.props.name,
        newValue: validatedUpdates.name,
        timestamp: new Date(),
        contactId: options?.contactId,
      })
      this.props.name = validatedUpdates.name
      hasChanged = true
    }

    if (validatedUpdates.company !== undefined && this.props.company !== validatedUpdates.company) {
      historyChanges.push({
        changeType: 'company_changed',
        oldValue: this.props.company,
        newValue: validatedUpdates.company || '',
        timestamp: new Date(),
        contactId: options?.contactId,
      })
      this.props.company = validatedUpdates.company
      hasChanged = true
    }

    if (
      validatedUpdates.twitterHandle !== undefined &&
      validatedUpdates.twitterHandle !== this.props.twitterHandle
    ) {
      historyChanges.push({
        changeType: 'twitter_handle_changed',
        oldValue: this.props.twitterHandle,
        newValue: validatedUpdates.twitterHandle || '',
        timestamp: new Date(),
        contactId: options?.contactId,
      })
      this.props.twitterHandle = validatedUpdates.twitterHandle
      hasChanged = true
    }

    if (hasChanged) {
      this.props.updatedAt = new Date()

      // 履歴記録コールバックを実行（非同期、エラーは無視）
      if (options?.historyCallback && historyChanges.length > 0) {
        options.historyCallback(historyChanges).catch((error) => {
          console.error('履歴記録に失敗しました:', error)
        })
      }
    }
  }

  recordNewContact(): void {
    this.props.lastContactAt = new Date()
    this.props.updatedAt = new Date()
  }

  getTimeSinceLastContact(): number {
    return Date.now() - this.props.lastContactAt.getTime()
  }

  /**
   * 最近連絡したかどうかを確認する
   * @param days - 最近連絡した日数
   * @returns 指定した日数以内に連絡したかどうか
   */
  hasContactedRecently(days: number): boolean {
    if (days <= 0) {
      return false
    }

    if (!this.props.lastContactAt) {
      return false
    }

    const now = new Date()
    const daysDifference = Math.floor(
      (now.getTime() - this.props.lastContactAt.getTime()) / (1000 * 60 * 60 * 24)
    )

    return daysDifference < days
  }

  getEmailValue(): string {
    return this.email.value
  }

  getFullName(): string {
    return this.company ? `${this.name} (${this.company})` : this.name
  }
}
