# 問い合わせシステム技術仕様書

## 1. アーキテクチャ詳細

### 1.1 技術スタック

```
Frontend:  React 19 + TypeScript + Tailwind CSS + tRPC Client
Backend:   tRPC v11 + Drizzle ORM + PostgreSQL
External:  Slack Webhooks + Notion API
Validation: Zod v4
```

### 1.2 パッケージ構成

```
packages/
├── external/                     # 外部サービス連携専用パッケージ
│   ├── src/slack.ts             # Slack連携サービス
│   ├── src/notion.ts            # Notion連携サービス
│   └── src/types.ts             # 連携サービス共通型定義
├── api/src/router/contact.ts     # tRPCルーター（dbパッケージのドメイン・リポジトリを使用）
├── db/                           # データベース・ドメイン・リポジトリ統合パッケージ
│   ├── src/schema.ts            # データベーススキーマ
│   ├── src/domain/              # ドメインモデル
│   └── src/repository/          # データアクセス層
├── validators/src/contact.ts     # 共通バリデーション
└── ui/src/components/           # 共通UIコンポーネント

apps/
└── nextjs/src/components/Contact.tsx  # フロントエンドコンポーネント
```

#### パッケージ責務

- **packages/external**: Notion/Slack等の外部サービス連携を抽象化
- **packages/db**: データベーススキーマ、ドメインモデル、リポジトリの統合パッケージ
- **packages/api**: tRPCルーターでdb/externalパッケージを統合
- **packages/validators**: フロントエンド/バックエンド共通のバリデーション

#### 依存関係フロー

```
tRPC Router (packages/api)
    ↓ 呼び出し
Domain & Repository (packages/db)
    ↓ 呼び出し
Integration Services (packages/external)
    ↓ 呼び出し
External APIs (Slack/Notion)
```

具体的な実行フロー：

1. **tRPCプロシージャ** (`api/src/router/contact.ts`) - クライアント要求受信
2. **ドメイン・リポジトリ** (`db/src/domain/`, `db/src/repository/`) - ビジネスロジック実行・データ永続化
3. **externalサービス** (`external/src/slack.ts`, `external/src/notion.ts`) - 外部連携

#### パッケージ依存関係

```json
// packages/db/package.json
{
  "dependencies": {
    "@aromarious/validators": "workspace:*",
    "drizzle-orm": "^0.44.1",
    "drizzle-zod": "^0.8.2"
  }
}

// packages/api/package.json
{
  "dependencies": {
    "@aromarious/db": "workspace:*",
    "@aromarious/validators": "workspace:*"
  }
}
```

## 2. データベース実装詳細

### 2.1 Drizzleスキーマ定義

```typescript
// packages/db/src/schema.ts
export const Contact = pgTable('contacts', (t) => ({
  id: t.uuid().notNull().primaryKey().defaultRandom(),
  name: t.varchar({ length: 50 }).notNull(),
  email: t.varchar({ length: 254 }).notNull(),
  subject: t.varchar({ length: 100 }).notNull(),
  message: t.text().notNull(),
  status: t.varchar({ length: 20 }).default('unread').notNull(),
  notionPageId: t.varchar({ length: 100 }),
  slackMessageTs: t.varchar({ length: 50 }),
  createdAt: t.timestamp().defaultNow().notNull(),
  updatedAt: t.timestamp({ mode: 'date', withTimezone: true }).$onUpdateFn(() => sql`now()`),
}))

export const RateLimit = pgTable('rate_limits', (t) => ({
  id: t.uuid().notNull().primaryKey().defaultRandom(),
  ipAddress: t.inet(),
  email: t.varchar({ length: 254 }),
  attemptCount: t.integer().default(1).notNull(),
  firstAttemptAt: t.timestamp().defaultNow().notNull(),
  lastAttemptAt: t.timestamp().defaultNow().notNull(),
  createdAt: t.timestamp().defaultNow().notNull(),
}))
```

### 2.2 インデックス設定

```sql
-- contactsテーブル用インデックス
CREATE INDEX idx_contacts_status ON contacts(status);
CREATE INDEX idx_contacts_created_at ON contacts(created_at DESC);
CREATE INDEX idx_contacts_email ON contacts(email);

-- rate_limitsテーブル用インデックス（レート制限チェック高速化）
CREATE INDEX idx_rate_limits_ip_time ON rate_limits(ip_address, last_attempt_at);
CREATE INDEX idx_rate_limits_email_time ON rate_limits(email, last_attempt_at);
CREATE INDEX idx_rate_limits_cleanup ON rate_limits(created_at);
```

### 2.3 マイグレーション

```typescript
// データベースマイグレーション実行
pnpm db:push
```

## 3. バリデーション詳細

### 3.1 共通スキーマ定義

```typescript
// packages/validators/src/contact.ts
import { z } from 'zod/v4'

export const ContactSubjects = [
  'お仕事のご相談',
  '技術メンタリング',
  '技術相談・アドバイス',
  '講演・執筆依頼',
  'その他',
] as const

export const ContactStatusEnum = ['unread', 'reading', 'replied', 'completed'] as const

export const CreateContactSchema = z.object({
  name: z
    .string()
    .min(1, '名前は必須です')
    .max(50, '名前は50文字以内で入力してください')
    .regex(/^[^\x00-\x1F\x7F]+$/, '無効な文字が含まれています'),

  email: z
    .string()
    .email('有効なメールアドレスを入力してください')
    .max(254, 'メールアドレスが長すぎます'),

  subject: z.enum(ContactSubjects, {
    errorMap: () => ({ message: '有効な問い合わせ種別を選択してください' }),
  }),

  message: z
    .string()
    .min(10, 'メッセージは10文字以上で入力してください')
    .max(2000, 'メッセージは2000文字以内で入力してください')
    .regex(/^[^\x00-\x1F\x7F]*$/, '無効な文字が含まれています'),
})

export const UpdateContactStatusSchema = z.object({
  id: z.string().uuid('無効なIDです'),
  status: z.enum(ContactStatusEnum),
})

export type CreateContactInput = z.infer<typeof CreateContactSchema>
export type UpdateContactStatusInput = z.infer<typeof UpdateContactStatusSchema>
```

## 4. tRPCルーター実装

### 4.1 ルーター定義

```typescript
// packages/api/src/router/contact.ts
import type { TRPCRouterRecord } from '@trpc/server'
import { TRPCError } from '@trpc/server'
import { z } from 'zod/v4'

import { and, desc, eq, gte } from '@aromarious/db'
import { Contact, RateLimit } from '@aromarious/db/schema'
import { CreateContactSchema, UpdateContactStatusSchema } from '@aromarious/validators/contact'

import { createNotionPage } from '../services/notion'
import { sendSlackNotification } from '../services/slack'
import { protectedProcedure, publicProcedure } from '../trpc'

export const contactRouter = {
  // 問い合わせ作成（公開）
  create: publicProcedure.input(CreateContactSchema).mutation(async ({ ctx, input }) => {
    // レート制限チェック（IPアドレス取得方法は実装時に決定）
    await checkRateLimit(ctx, input.email, ctx.ip)

    try {
      // データベースに保存
      const [contact] = await ctx.db
        .insert(Contact)
        .values({
          name: input.name,
          email: input.email,
          subject: input.subject,
          message: input.message,
        })
        .returning()

      // 並行してSlack通知とNotion蓄積を実行
      const [slackResult, notionResult] = await Promise.allSettled([
        sendSlackNotification(contact),
        createNotionPage(contact),
      ])

      // 結果をデータベースに更新
      const updateData: any = {}
      if (slackResult.status === 'fulfilled') {
        updateData.slackMessageTs = slackResult.value.ts
      }
      if (notionResult.status === 'fulfilled') {
        updateData.notionPageId = notionResult.value.id
      }

      if (Object.keys(updateData).length > 0) {
        await ctx.db.update(Contact).set(updateData).where(eq(Contact.id, contact.id))
      }

      return {
        id: contact.id,
        success: true,
        message: 'お問い合わせを受け付けました。通常24時間以内にご返信いたします。',
      }
    } catch (error) {
      console.error('Contact creation failed:', error)
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'お問い合わせの送信に失敗しました。しばらく経ってから再度お試しください。',
      })
    }
  }),

  // 問い合わせ一覧取得（管理者のみ）
  list: protectedProcedure
    .input(
      z.object({
        status: z.enum(['unread', 'reading', 'replied', 'completed']).optional(),
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const whereConditions = input.status ? eq(Contact.status, input.status) : undefined

      const [contacts, [{ count }]] = await Promise.all([
        ctx.db.query.Contact.findMany({
          where: whereConditions,
          orderBy: desc(Contact.createdAt),
          limit: input.limit,
          offset: input.offset,
        }),
        ctx.db.select({ count: count() }).from(Contact).where(whereConditions),
      ])

      return {
        contacts,
        total: count,
        hasMore: input.offset + input.limit < count,
      }
    }),

  // 問い合わせ詳細取得（管理者のみ）
  byId: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const contact = await ctx.db.query.Contact.findFirst({
        where: eq(Contact.id, input.id),
      })

      if (!contact) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: '指定された問い合わせが見つかりません',
        })
      }

      return contact
    }),

  // ステータス更新（管理者のみ）
  updateStatus: protectedProcedure
    .input(UpdateContactStatusSchema)
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.db
        .update(Contact)
        .set({
          status: input.status,
          updatedAt: new Date(),
        })
        .where(eq(Contact.id, input.id))
        .returning()

      if (result.length === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: '指定された問い合わせが見つかりません',
        })
      }

      return { success: true }
    }),
} satisfies TRPCRouterRecord

// レート制限チェック関数
async function checkRateLimit(ctx: any, email: string, ipAddress?: string) {
  const now = new Date()
  const emailCooldown = new Date(now.getTime() - 10 * 60 * 1000) // 10分前
  const ipCooldown = new Date(now.getTime() - 1 * 60 * 1000) // 1分前

  // メールアドレスによるレート制限チェック（10分間に1回）
  const emailLimit = await ctx.db.query.RateLimit.findFirst({
    where: and(eq(RateLimit.email, email), gte(RateLimit.lastAttemptAt, emailCooldown)),
  })

  if (emailLimit) {
    // 既存レコードの試行回数を更新
    await ctx.db
      .update(RateLimit)
      .set({
        attemptCount: emailLimit.attemptCount + 1,
        lastAttemptAt: now,
      })
      .where(eq(RateLimit.id, emailLimit.id))

    throw new TRPCError({
      code: 'TOO_MANY_REQUESTS',
      message: '同じメールアドレスからの連続送信は10分間制限されています。',
    })
  }

  // IPアドレスによるレート制限チェック（1分間に3回）
  if (ipAddress) {
    const ipLimits = await ctx.db.query.RateLimit.findMany({
      where: and(eq(RateLimit.ipAddress, ipAddress), gte(RateLimit.lastAttemptAt, ipCooldown)),
    })

    if (ipLimits.length >= 3) {
      throw new TRPCError({
        code: 'TOO_MANY_REQUESTS',
        message: '短時間での連続送信は制限されています。1分間お待ちください。',
      })
    }
  }

  // レート制限記録の追加
  await ctx.db.insert(RateLimit).values({
    email,
    ipAddress,
    attemptCount: 1,
    firstAttemptAt: now,
    lastAttemptAt: now,
  })
}
```

## 5. 外部サービス実装

### 5.1 Slack通知サービス

```typescript
// packages/api/src/services/slack.ts
interface SlackMessage {
  text: string
  blocks: any[]
}

export async function sendSlackNotification(contact: any) {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL

  if (!webhookUrl) {
    console.warn('SLACK_WEBHOOK_URL not configured')
    return { ts: 'mock-ts' }
  }

  const message: SlackMessage = {
    text: '新しい問い合わせが届きました',
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: '📬 新しい問い合わせ',
        },
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*お名前:*\n${contact.name}`,
          },
          {
            type: 'mrkdwn',
            text: `*種別:*\n${contact.subject}`,
          },
          {
            type: 'mrkdwn',
            text: `*メール:*\n${contact.email}`,
          },
          {
            type: 'mrkdwn',
            text: `*受信時刻:*\n${contact.createdAt.toLocaleString('ja-JP')}`,
          },
        ],
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*メッセージ:*\n${contact.message}`,
        },
      },
      {
        type: 'divider',
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `ID: ${contact.id}`,
          },
        ],
      },
    ],
  }

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(message),
  })

  if (!response.ok) {
    throw new Error(`Slack notification failed: ${response.statusText}`)
  }

  return { ts: 'sent' }
}
```

### 5.2 Notion蓄積サービス

```typescript
// packages/api/src/services/notion.ts
import { Client } from '@notionhq/client'

const notion = new Client({
  auth: process.env.NOTION_API_TOKEN,
})

export async function createNotionPage(contact: any) {
  const databaseId = process.env.NOTION_PARENT_PAGE_ID

  if (!databaseId || !process.env.NOTION_API_TOKEN) {
    console.warn('Notion configuration missing')
    return { id: 'mock-page-id' }
  }

  try {
    const response = await notion.pages.create({
      parent: { database_id: databaseId },
      properties: {
        名前: {
          title: [
            {
              text: {
                content: contact.name,
              },
            },
          ],
        },
        メールアドレス: {
          email: contact.email,
        },
        種別: {
          select: {
            name: contact.subject,
          },
        },
        メッセージ: {
          rich_text: [
            {
              text: {
                content: contact.message,
              },
            },
          ],
        },
        ステータス: {
          select: {
            name: 'unread',
          },
        },
        受信日時: {
          date: {
            start: contact.createdAt.toISOString(),
          },
        },
        ID: {
          rich_text: [
            {
              text: {
                content: contact.id,
              },
            },
          ],
        },
      },
    })

    return { id: response.id }
  } catch (error) {
    console.error('Notion page creation failed:', error)
    throw error
  }
}
```

## 6. フロントエンド実装詳細

### 6.1 tRPC Client統合

```typescript
// apps/nextjs/src/components/Contact.tsx（改良版）
'use client'

import { useState } from 'react'

import type { CreateContactInput } from '@aromarious/validators/contact'
import { CreateContactSchema } from '@aromarious/validators/contact'

import { api } from '~/trpc/react'

export default function Contact() {
  const [formData, setFormData] = useState<CreateContactInput>({
    name: '',
    email: '',
    subject: 'お仕事のご相談',
    message: '',
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  const createContact = api.contact.create.useMutation({
    onSuccess: (data) => {
      // 成功処理
      setFormData({ name: '', email: '', subject: 'お仕事のご相談', message: '' })
      setErrors({})
      // 成功メッセージ表示
    },
    onError: (error) => {
      // エラー処理
      if (error.data?.zodError) {
        // バリデーションエラー
        const fieldErrors: Record<string, string> = {}
        Object.entries(error.data.zodError.fieldErrors).forEach(([field, messages]) => {
          if (messages?.[0]) {
            fieldErrors[field] = messages[0]
          }
        })
        setErrors(fieldErrors)
      } else {
        // その他のエラー
        setErrors({ general: error.message })
      }
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // クライアントサイドバリデーション
    const result = CreateContactSchema.safeParse(formData)
    if (!result.success) {
      const fieldErrors: Record<string, string> = {}
      result.error.errors.forEach((error) => {
        if (error.path[0]) {
          fieldErrors[error.path[0].toString()] = error.message
        }
      })
      setErrors(fieldErrors)
      return
    }

    createContact.mutate(formData)
  }

  // UI実装...
}
```

## 7. 環境設定

### 7.1 必要なパッケージ

```json
{
  "dependencies": {
    "@notionhq/client": "^2.2.0"
  }
}
```

### 7.2 環境変数設定

```bash
# .env.example に追加
SLACK_WEBHOOK_URL=''
NOTION_API_TOKEN=''
NOTION_PARENT_PAGE_ID=''
```

### 7.3 direnv設定更新

各OS用の.envrcファイルに環境変数の取得ロジックを追加

## 8. テスト戦略

### 8.1 ユニットテスト

- バリデーションスキーマのテスト
- tRPCプロシージャのテスト（モック使用）
- 外部サービス関数のテスト

### 8.2 統合テスト

- データベース操作のテスト
- API全体のフローテスト

### 8.3 E2Eテスト

- フロントエンドからバックエンドまでの完全なテスト
- 外部サービス連携の動作確認

## 9. 運用・監視

### 9.1 ログ設定

- 問い合わせ受信ログ
- 外部サービス連携の成功/失敗ログ
- エラーログ

### 9.2 メトリクス

- 問い合わせ受信数
- 外部サービス連携成功率
- レスポンス時間

### 9.3 アラート設定

- 外部サービス連携失敗時のアラート
- 異常に多い問い合わせ受信時のアラート
