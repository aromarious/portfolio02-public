import { z } from 'zod/v4'

// Branded type for Email
const EmailSchema = z
  .string()
  .min(1, { error: 'メールアドレスは必須です' })
  .transform((s) => s.toLowerCase().trim())
  .pipe(
    z
      .email({ error: '正しいメールアドレス形式で入力してください' })
      .max(256, { error: 'メールアドレスは256文字以内で入力してください' })
  )
  .brand<'Email'>()

type EmailValue = z.infer<typeof EmailSchema>

export class Email {
  private constructor(private readonly _value: EmailValue) {}

  get value(): EmailValue {
    return this._value
  }

  static create(value: string): Email {
    const validated = EmailSchema.parse(value)
    return new Email(validated)
  }

  equals(other: Email): boolean {
    return this._value === other._value
  }

  toString(): string {
    return this._value
  }
}
