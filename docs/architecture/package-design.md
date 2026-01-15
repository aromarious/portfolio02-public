# パッケージ設計とアーキテクチャ

## 1. プロジェクト概要

このプロジェクトは、T3 Turbo monorepoテンプレートをベースとした、ポートフォリオサイト用の問い合わせシステムです。Clean Architecture とDomain-Driven Design（DDD）の原則に従い、以下の設計思想で構築されています。

### 1.1 設計思想

- **Hexagonal Architecture (Ports & Adapters)**: ドメインを中心とした依存性逆転
- **関心の分離**: 各パッケージが明確な責務を持つ
- **依存関係の制御**: 外側から内側への一方向依存（依存性逆転の原則）
- **テスト容易性**: 各層が独立してテスト可能
- **型安全性**: TypeScriptとtRPCによるend-to-endの型安全性
- **External Services Integration**: 外部サービス障害がユーザー体験を阻害しないGraceful Degradation

## 2. パッケージ構成とアーキテクチャ

### 2.1 Hexagonal Architecture 依存関係図

```text
                    ┌─────────────────────────────────────┐
                    │           Presentation              │
                    │  ┌─────────────────┐                │
                    │  │ @aromarious/ui  │                │
                    │  └─────────────────┘                │
                    │  ┌─────────────────┐                │
                    │  │ apps/nextjs     │                │
                    │  └─────────────────┘                │
                    └─────────────────┬───────────────────┘
                                      │
                    ┌─────────────────┼───────────────────┐
                    │     Application │                   │
                    │  ┌──────────────▼──┐                │
                    │  │ @aromarious/api │                │
                    │  └─────────────────┘                │
                    └─────────────────┬───────────────────┘
                                      │
    ┌─────────────────────────────────▼─────────────────────────────────┐
    │                          DOMAIN CORE                              │
    │  ┌─────────────────┐                                              │
    │  │@aromarious/     │                                              │
    │  │domain           │                                              │
    │  │                 │                                              │
    │  │ ┌─────────────┐ │                                              │
    │  │ │   Ports     │ │                                              │
    │  │ │(Interfaces) │ │                                              │
    │  │ │ + Business  │ │                                              │
    │  │ │   Rules     │ │                                              │
    │  │ └─────────────┘ │                                              │
    │  └─────────────────┘                                              │
    └─────────────▲─────────────────────────────▲─────────────────────┘
                  │                             │
                  │ (Dependency Inversion)      │ (Contract)
                  │ インフラ→ドメイン            │ UI-API契約
    ┌─────────────┴─────────────┐    ┌─────────┴─────────┐
    │      Infrastructure       │    │   Interface       │
    │   ┌─────────────────┐     │    │ ┌─────────────────┐│
    │   │ @aromarious/db  │     │    │ │@aromarious/     ││
    │   │                 │     │    │ │validators       ││
    │   │ ┌─────────────┐ │     │    │ │                 ││
    │   │ │  Adapters   │ │     │    │ │ ┌─────────────┐ ││
    │   │ │(Repository  │ │     │    │ │ │ UI-API      │ ││
    │   │ │Impl)        │ │     │    │ │ │ Contract    │ ││
    │   │ └─────────────┘ │     │    │ │ └─────────────┘ ││
    │   └─────────────────┘     │    │ └─────────────────┘│
    └───────────────────────────┘    └───────────────────┘

    ┌─────────────▲─────────────┐
    │      Infrastructure       │
    │   ┌─────────────────┐     │
    │   │@aromarious/     │     │
    │   │external         │     │
    │   │                 │     │
    │   │ ┌─────────────┐ │     │
    │   │ │  Adapters   │ │     │
    │   │ │(Notion/     │ │     │
    │   │ │Slack)       │ │     │
    │   │ └─────────────┘ │     │
    │   └─────────────────┘     │
    └───────────────────────────┘
```

### 2.2 依存性逆転の実装

#### 重要な原則: インフラ層がドメイン層に依存する

従来のレイヤーアーキテクチャでは「上位層が下位層に依存」しますが、Hexagonal Architectureでは**依存性逆転の原則**により、**外側の層（インフラ）が内側の層（ドメイン）に依存**します。

```text
従来の依存関係:
ドメイン → インフラ (✗ 技術詳細に依存)

Hexagonal Architecture:
インフラ → ドメイン (✓ ビジネスロジックが技術から独立)
```

#### Ports（ポート）- ドメイン層で定義されるインターフェース

ドメイン層が「何が必要か」を定義し、インフラ層がそれに従って実装します：

```typescript
// packages/domain/src/ports/contact.repository.port.ts
// ドメインが「データ永続化に何が必要か」を定義
export interface ContactRepositoryPort {
  save(contact: Contact): Promise<Contact>
  findById(id: string): Promise<Contact | null>
  findByEmail(email: string): Promise<Contact[]>
  // ↑ ビジネス要件に基づいたメソッド定義
}

// packages/domain/src/ports/notification.service.port.ts
// ドメインが「通知に何が必要か」を定義
export interface NotificationServicePort {
  notify(contact: Contact): Promise<NotificationResult>
  // ↑ SlackやDiscordなど技術詳細は関係なし
}
```

#### Adapters（アダプター）- インフラ層での実装

インフラ層がドメインの要求に**従って**実装します：

```typescript
// packages/db/src/repository/contact.repository.ts
// ドメインのポートインターフェースに「従って」実装
export class ContactRepository implements ContactRepositoryPort {
  constructor(private db: DrizzleDb) {}

  async save(contact: Contact): Promise<Contact> {
    // ↓ ドメインエンティティを永続化形式に変換
    const persistenceModel = this.toPersistence(contact)
    const saved = await this.db.insert(contactSchema).values(persistenceModel)
    // ↓ 永続化形式をドメインエンティティに変換して返却
    return this.toDomain(saved)
  }

  // ドメインが要求するインターフェース通りに実装
  async findById(id: string): Promise<Contact | null> {
    /* ... */
  }
  async findByEmail(email: string): Promise<Contact[]> {
    /* ... */
  }
}

// packages/external/src/slack/slack-service.ts
// ドメインの通知ポートに「従って」Slack固有の実装
export class SlackService implements NotificationServicePort {
  async notify(contact: Contact): Promise<NotificationResult> {
    // ↓ ドメインオブジェクトをSlack形式に変換
    const slackMessage = this.toSlackFormat(contact)
    // ↓ Slack固有のAPI呼び出し
    const response = await this.sendToSlack(slackMessage)
    // ↓ ドメインが期待する形式で結果を返却
    return this.toNotificationResult(response)
  }
}
```

#### 依存性逆転がもたらす利点

1. **技術の独立性**: Drizzle ORMからPrismaに変更してもドメインは影響を受けない
2. **テスト容易性**: モックを注入してドメインロジックを独立テスト
3. **交換可能性**: SlackからDiscordに変更してもポートは同じ
4. **決定の遅延**: データベース技術を決める前にドメインロジックを実装可能

### 2.3 依存性注入とテスト容易性

#### アプリケーション層での依存性注入

```typescript
// packages/api/src/application/services/contact-application.service.ts
export class ContactApplicationService {
  constructor(
    // ポートに依存（具象実装には依存しない）
    private contactRepository: ContactRepositoryPort,
    private personRepository: PersonRepositoryPort,
    private notificationService: NotificationServicePort,
    private contactDomainService: ContactDomainService
  ) {}
}

// DIコンテナでの組み立て（実行時にインフラをドメインに注入）
export function createContactApplicationService(db: DrizzleDb): ContactApplicationService {
  // アダプター（具象実装）をポートに注入
  const contactRepository = new ContactRepository(db) // ← インフラがドメインポートを実装
  const personRepository = new PersonRepository(db) // ← インフラがドメインポートを実装
  const notificationService = new ExternalNotificationOrchestrator(
    new SlackService(), // ← インフラがドメインポートを実装
    new NotionService() // ← インフラがドメインポートを実装
  )

  return new ContactApplicationService(
    contactRepository, // ← ドメインポートとして注入
    personRepository, // ← ドメインポートとして注入
    notificationService, // ← ドメインポートとして注入
    new ContactDomainService()
  )
}
```

#### テスト時のモック注入

```typescript
// テスト時はモックアダプターを注入
describe('ContactApplicationService', () => {
  let service: ContactApplicationService
  let mockRepository: jest.Mocked<ContactRepositoryPort>
  let mockNotificationService: jest.Mocked<NotificationServicePort>

  beforeEach(() => {
    mockRepository = createMockContactRepository()
    mockNotificationService = createMockNotificationService()

    service = new ContactApplicationService(
      mockRepository,
      mockPersonRepository,
      mockNotificationService,
      new ContactDomainService()
    )
  })

  test('should handle external service failure gracefully', async () => {
    // 外部サービスの失敗をモック
    mockNotificationService.notify.mockRejectedValue(new Error('Service down'))

    const result = await service.createContact(validData)

    // ドメインロジックは正常に動作
    expect(result.success).toBe(true)
    expect(mockRepository.save).toHaveBeenCalled()
  })
})
```

### 2.4 レイヤー構造

#### Infrastructure Layer（インフラ層）

- **@aromarious/db**: データベース接続、リポジトリ実装
- **@aromarious/external**: 外部サービス統合（Notion、Slack）
- **@aromarious/auth**: 認証基盤

#### Domain Layer（ドメイン層）

- **@aromarious/domain**: ビジネスロジック、エンティティ、ドメインサービス
- **@aromarious/validators**: ビジネスルール、バリデーション

#### Application Layer（アプリケーション層）

- **@aromarious/api**: tRPCルーター、アプリケーションサービス

#### Presentation Layer（プレゼンテーション層）

- **@aromarious/ui**: 共通UIコンポーネント
- **apps/nextjs**: Next.jsアプリケーション

## 3. 各パッケージの責務詳細

### 3.1 @aromarious/domain

**役割**: ビジネスロジックの中核

**責務**:

- エンティティの定義（Contact、Person、RateLimit）
- ドメインサービスの実装
- ビジネスルールの定義
- ドメインイベントの管理
- Value Objectsの実装

**主要コンポーネント**:

```typescript
// エンティティ
entities/
├── contact.entity.ts     // 問い合わせエンティティ
├── person.entity.ts      // 人物エンティティ
└── rate-limit.entity.ts  // レート制限エンティティ

// ドメインサービス
services/
└── contact-domain.service.ts  // 問い合わせドメインサービス

// Value Objects
value-objects/
└── email.vo.ts          // Emailバリューオブジェクト

// ポート（インターフェース）
ports/
├── contact.repository.port.ts
├── person.repository.port.ts
└── rate-limit.repository.port.ts

// ドメインイベント
events/
├── event-dispatcher.ts
├── handlers/
│   ├── contact-created.handler.ts
│   └── person-created.handler.ts
└── examples.ts
```

**設計原則**:

- 外部依存なし（Pure Business Logic）
- インフラ層への依存はポートインターフェースを通じて抽象化
- DDDパターンの厳密な実装

### 3.2 @aromarious/db

**役割**: データ永続化とドメイン実装の橋渡し

**責務**:

- Drizzle ORMによるデータベーススキーマ定義
- リポジトリパターンの実装
- データベースクライアント管理
- マイグレーション管理
- テスト用データベース設定

**主要コンポーネント**:

```typescript
// スキーマ定義
schema.ts                 // Drizzleスキーマ定義
auth-schema.ts           // better-auth用スキーマ

// データベースクライアント
client.ts                // 本番用DBクライアント
test-client.ts          // テスト用DBクライアント

// リポジトリ実装
repository/
├── contact.repository.ts
├── person.repository.ts
└── rate-limit.repository.ts

// ドメイン層の再エクスポート
domain/
└── index.ts             // ドメイン要素の集約
```

**環境対応**:

```typescript
// 自動環境検出によるドライバー切り替え
const isLocal = POSTGRES_URL.includes('localhost') || POSTGRES_URL.includes('127.0.0.1')

if (isLocal) {
  // ローカル/テスト環境: postgres-js
  driver = postgres(POSTGRES_URL)
} else {
  // 本番環境: @vercel/postgres (Edge対応)
  driver = sql
}
```

### 3.3 @aromarious/validators

**役割**: 型安全なバリデーション

**責務**:

- Zodスキーマによる入力検証
- フロントエンド・バックエンド間の共通バリデーション
- 型定義の生成
- ビジネスルールの表現

**主要コンポーネント**:

```typescript
// スキーマ定義
contact - form.schema.ts // フォーム全体のスキーマ
contact.field.schema.ts // Contact関連フィールド
person.field.schema.ts // Person関連フィールド
rateLimit.field.schema.ts // レート制限関連
```

**設計特徴**:

- ドメイン層と密接に連携
- エラーメッセージの多言語対応
- クライアント・サーバー両方で使用可能

### 3.4 @aromarious/api

**役割**: tRPCによるAPIエンドポイント提供

**責務**:

- tRPCルーターの定義
- アプリケーションサービスの実装
- 認証・認可の制御
- 外部サービス統合の調整
- エラーハンドリング

**主要コンポーネント**:

```typescript
// tRPCルーター
router/
├── auth.ts              // 認証関連API
└── contact.ts           // 問い合わせ関連API

// アプリケーションサービス
application/
├── services/
│   ├── contact-application.service.ts
│   └── person-application.service.ts
└── dtos/
    ├── contact.dto.ts
    └── person.dto.ts

// tRPC設定
trpc.ts                  // tRPCクライアント設定
root.ts                  // ルーター統合
```

**依存関係**:

```json
{
  "dependencies": {
    "@aromarious/auth": "workspace:*",
    "@aromarious/db": "workspace:*",
    "@aromarious/domain": "workspace:*",
    "@aromarious/validators": "workspace:*"
  },
  "devDependencies": {
    "@aromarious/external": "workspace:*"
  }
}
```

### 3.5 @aromarious/external

**役割**: 外部サービス統合の抽象化

**責務**:

- Notion API統合
- Slack Webhook統合
- 外部サービス障害時のGraceful Degradation
- 同期状態管理
- リトライ・バックオフ制御

**主要コンポーネント**:

```typescript
// サービス実装
notion/
└── notion-service.ts     // Notion API抽象化

slack/
└── slack-service.ts      // Slack Webhook抽象化

// オーケストレーション
orchestrator/
└── external-notification-orchestrator.ts  // 外部サービス統合調整

// 共通機能
shared/
├── error.ts             // エラー型定義
└── types.ts             // 共通型定義

// 設定
config/
└── env.ts               // 環境変数管理
```

**Graceful Degradation戦略**:

```typescript
// 外部サービス障害がユーザー体験を阻害しない設計
export class ExternalNotificationOrchestrator {
  async notifyAll(contact: Contact): Promise<SyncResults> {
    const results = await Promise.allSettled([
      this.notionService.syncContact(contact),
      this.slackService.notify(contact),
    ])

    // ユーザーには常に成功を返す
    // 障害は内部ログとDB状態で管理
    return this.processSyncResults(results)
  }
}
```

### 3.6 @aromarious/ui

**役割**: 再利用可能UIコンポーネント

**責務**:

- shadcn/ui基盤の共通コンポーネント
- デザインシステムの実装
- アクセシビリティ対応
- テーマ管理

**主要コンポーネント**:

```typescript
// UIコンポーネント
button.tsx // ボタンコンポーネント
form.tsx // フォーム関連
input.tsx // 入力フィールド
label.tsx // ラベル
dropdown - menu.tsx // ドロップダウンメニュー
toast.tsx // 通知
theme.tsx // テーマプロバイダー
```

### 3.7 @aromarious/auth

**役割**: 認証・認可基盤

**責務**:

- better-auth統合
- Discord OAuth設定
- セッション管理
- 認証ミドルウェア

**主要コンポーネント**:

```typescript
src/
└── index.ts             // better-auth設定

// 環境設定
env.ts                   // 認証関連環境変数
```

## 4. 詳細依存関係図

### 4.1 パッケージ内要素の依存関係

```text
┌─────────────────────────────────────────────────────────────────┐
│                    @aromarious/ui                               │
│  ┌─────────────────┐                                            │
│  │ ContactForm.tsx │ ────────────────────────┐                  │
│  │ (フォーム)      │                         │                  │
│  └─────────────────┘                         │                  │
└───────────────────────────────────────────────┼─────────────────┘
                                                │
┌───────────────────────────────────────────────▼─────────────────┐
│                @aromarious/validators                           │
│  ┌─────────────────────────────────────┐                       │
│  │ contactFormInputSchema              │◄──────────────┐       │
│  │ (フォーム入力検証スキーマ)           │               │       │
│  └─────────────────────────────────────┘               │       │
└───────────────────────────────────────────────┼───────┼───────┘
                                                │       │
┌───────────────────────────────────────────────▼─────────────────┐
│                    @aromarious/api                              │
│                                                                 │
│  ┌─────────────────────────────────────┐                       │
│  │ contactRouter                       │                       │
│  │ (tRPCエンドポイント定義)            │                       │
│  └─────────────────────────────────────┘                       │
│                    │                                            │
│                    ▼                                            │
│  ┌─────────────────────────────────────┐                       │
│  │ ContactApplicationService           │                       │
│  │ (アプリケーションサービス)          │                       │
│  └─────────────────────────────────────┘                       │
│                    │                                            │
│                    ▼                                            │
│  ┌─────────────────────────────────────┐                       │
│  │ SubmitInquiryInput (DTO)           │◄──────────────────────┘
│  │ = ContactFormInput                  │
│  └─────────────────────────────────────┘
│                    │                                            │
└────────────────────┼────────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────────┐
│                 @aromarious/domain                              │
│                                                                 │
│  ┌─────────────────────────────────────┐                       │
│  │ CreatePersonPropsSchema             │                       │
│  │ CreateContactPropsSchema            │◄──────────────────────┘
│  │ (エンティティスキーマ定義)          │
│  └─────────────────────────────────────┘
│                    │                                            │
│                    ▼                                            │
│  ┌─────────────────────────────────────┐                       │
│  │ Person.entity                       │                       │
│  │ Contact.entity                      │                       │
│  │ (ドメインエンティティ)              │                       │
│  └─────────────────────────────────────┘                       │
│                    │                                            │
│                    ▼                                            │
│  ┌─────────────────────────────────────┐                       │
│  │ ContactRepositoryPort               │                       │
│  │ PersonRepositoryPort                │                       │
│  │ NotificationServicePort             │                       │
│  │ (Ports - インターフェース定義)      │                       │
│  └─────────────────────────────────────┘                       │
└────────────────────┼────────────────────┼────────────────────────┘
                     │                    │
        ┌────────────▼─────────────┐     │
        │    @aromarious/db        │     │
        │                          │     │
        │ ┌─────────────────────┐  │     │
        │ │ ContactRepository   │  │     │
        │ │ PersonRepository    │  │     │
        │ │ (Adapter実装)       │  │     │
        │ └─────────────────────┘  │     │
        └──────────────────────────┘     │
                                         │
                    ┌────────────────────▼─────────────┐
                    │    @aromarious/external          │
                    │                                  │
                    │ ┌─────────────────────────────┐  │
                    │ │ SlackService                │  │
                    │ │ NotionService               │  │
                    │ │ (Adapter実装)               │  │
                    │ └─────────────────────────────┘  │
                    └──────────────────────────────────┘
```

### 4.2 依存関係の詳細説明

#### **データフロー（上から下）**:

1. **ContactForm** → `contactFormInputSchema` を使用してバリデーション
2. **contactFormInputSchema** → `CreatePersonPropsSchema.pick()` でドメイン定義を参照
3. **tRPCルーター** → `contactFormInputSchema` を入力検証に使用
4. **SubmitInquiryInput** → `ContactFormInput` を型エイリアスで参照
5. **ApplicationService** → ドメインエンティティとポートを使用
6. **Repository/External** → ドメインポートを実装

#### **依存性逆転（下から上）**:

- **db/external** → **domain**のポートを実装
- **api** → **validators**の契約を使用
- **ui** → **validators**のスキーマを使用

## 5. UI-API間契約とデータフロー

### 4.1 tRPCによる型安全な契約

このプロジェクトでは、UI（Next.js）とAPI間の契約を**tRPC**で実現しています。従来のREST APIとは異なり、**end-to-endの型安全性**を提供します。

#### 契約の階層構造

```typescript
// 1. ドメイン層: ビジネスルールの定義
// packages/domain/src/entities/contact.entity.ts
export const CreateContactPropsSchema = z.object({
  subject: z.enum(['仕事の相談', '技術相談', 'その他']),
  message: z.string().min(10).max(2000),
  // ... その他のビジネスルール
})

// 2. バリデーター層: UI-API間の契約
// packages/validators/src/contact-form.schema.ts
export const contactFormInputSchema = z.object({
  // ドメインスキーマから必要なフィールドを選択
  ...CreateContactPropsSchema.pick({
    subject: true,
    message: true,
  }).shape,
  // UI固有のバリデーション追加
  email: z.string().email('有効なメールアドレスを入力してください'),
})

// 3. API層: tRPCルーターでの使用
// packages/api/src/router/contact.ts
export const contactRouter = {
  create: publicProcedure
    .input(contactFormInputSchema) // ← UI契約を入力として使用
    .mutation(async ({ input }) => {
      // ビジネスロジック実行
      return { success: true, id: '...' }
    }),
}

// 4. UI層: 自動型推論
// apps/nextjs/src/components/ContactForm.tsx
const createContact = api.contact.create.useMutation()
//    ↑ 自動で型が推論される：
//    input: ContactFormInput
//    output: { success: boolean, id: string }
```

#### tRPCによる契約のメリット

```typescript
// packages/api/src/index.ts - 型エクスポート
export type { AppRouter, RouterInputs, RouterOutputs }

// Next.jsアプリでの利用
import type { RouterInputs, RouterOutputs } from '@aromarious/api'

type CreateContactInput = RouterInputs['contact']['create']
//   ↑ コンパイル時に型安全性を保証

type CreateContactOutput = RouterOutputs['contact']['create']
//   ↑ APIレスポンスの型も自動推論
```

**従来のREST API契約との比較**:

| 項目             | REST API         | tRPC               |
| ---------------- | ---------------- | ------------------ |
| 型安全性         | ランタイムエラー | コンパイル時エラー |
| 契約管理         | OpenAPI/Swagger  | TypeScript型定義   |
| 同期メンテナンス | 手動             | 自動               |
| バリデーション   | 二重実装         | 共通スキーマ       |

## 4.2 データフロー

### 4.2 バリデーション層での契約統合

**ドメインルール → UI契約への変換**:

```typescript
// packages/validators/src/contact-form.schema.ts
import { CreateContactPropsSchema, CreatePersonPropsSchema } from '@aromarious/domain'

// ドメインスキーマから必要なフィールドを選択
const personSchema = CreatePersonPropsSchema.pick({
  name: true,
  email: true,
  company: true,
})

const contactSchema = CreateContactPropsSchema.pick({
  subject: true,
  message: true,
})

// UI固有の要求事項を追加
export const contactFormInputSchema = z.object({
  ...personSchema.shape,
  ...contactSchema.shape,
  // UI固有のバリデーション強化
  email: z
    .string()
    .email('有効なメールアドレスを入力してください')
    .max(256, 'メールアドレスは256文字以内で入力してください'),
})
```

**バリデーションの階層と責務分担**:

#### 1. **Domain層（エンティティ・VO）**: ビジネス不変条件

```typescript
// packages/domain/src/entities/person.entity.ts
export const PersonFields = {
  name: z
    .string()
    .trim()
    .max(256, '名前は256文字以内で入力してください') // ← ビジネス要件
    .refine((val) => val.length > 0, '名前は必須です'), // ← ドメイン制約

  email: z.custom<Email>((val) => val instanceof Email), // ← ドメインオブジェクト制約

  company: z
    .string()
    .trim()
    .max(256, '会社名は256文字以内で入力してください') // ← ビジネス仕様
    .optional(),
}
```

**責務**: ドメインエキスパートが定義した**ビジネス不変条件**

- 「名前は必ず必要」（ビジネス要件）
- 「会社名は256文字まで」（仕様制限）
- 「EmailはValueObjectであること」（ドメインモデル制約）

#### 2. **Validators層**: UI-API間の技術的契約

```typescript
// packages/validators/src/contact-form.schema.ts
export const contactFormInputSchema = z.object({
  // ドメインルールを参照
  ...CreatePersonPropsSchema.pick({
    name: true,
    company: true,
  }).shape,

  // UI固有のバリデーション追加
  email: z
    .string()
    .email('有効なメールアドレスを入力してください') // ← UI表示用エラー
    .max(256, 'メールアドレスは256文字以内で入力してください'), // ← フォーム制限

  // フォーム固有の制約
  privacyPolicyAccepted: z.literal(true, {
    message: 'プライバシーポリシーに同意してください', // ← UI専用要件
  }),
})
```

**責務**: フロントエンド・バックエンド間の**技術的契約**

- ドメインルールを**再利用**（二重実装を避ける）
- **UI固有の制約**（「プライバシーポリシー同意必須」）
- **フォーム表示用エラーメッセージ**
- **通信データ形式**の定義

#### 3. **tRPC層**: 実行時型安全通信

```typescript
export const contactRouter = {
  create: publicProcedure
    .input(contactFormInputSchema) // ← UI契約を使用
    .mutation(async ({ input }) => {
      // ビジネスロジック実行
      const person = Person.create(input) // ← ドメインバリデーション再実行
    }),
}
```

#### バリデーションの二重実行の意味

```typescript
// 1. UI層: ユーザビリティのためのバリデーション
const formData = contactFormInputSchema.parse(userInput) // ← フォーム検証

// 2. Domain層: ビジネス整合性のためのバリデーション
const person = Person.create(formData) // ← ドメイン制約チェック
```

**なぜ二重にするのか**:

- **UI層**: 「ユーザーが正しく入力できるため」
- **Domain層**: 「ビジネス整合性を保証するため」
- **セキュリティ**: フロントエンドバリデーションは迂回可能

**重要な区別**:

- **Domain**: 「このビジネスでは名前は必須」（ビジネスルール）
- **Validators**: 「このフォームでは名前欄は必須」（UI制約）

#### `@aromarious/validators`の本質

「フォームとエンドポイントの間でどう渡すかという話」

```typescript
// packages/validators/src/contact-form.schema.ts
export const contactFormInputSchema = z.object({
  // フォームから送られてくるデータの形式
  name: z.string().trim().min(1),
  email: z.string().email(),
  subject: z.enum(['仕事の相談', '技術相談', 'その他']),
  message: z.string().min(10),

  // フォーム固有のデータ（APIに渡す必要がある）
  sessionId: z.string().optional(),
  deviceType: z.string().optional(),
  // ...
})
```

**責務の明確化**:

- ❌ **ビジネスルールの定義場所ではない**
- ✅ **フォーム入力 → API呼び出しの変換契約**
- ✅ **UI特有の制約** (「プライバシーポリシー同意」など)
- ✅ **通信データの形式定義** (JSON Schema的役割)
- ✅ **tRPCの入力型として使用**

この視点で見ると、`@aromarious/validators`は**データ転送契約**であり、ビジネスロジックとは独立した**インターフェース定義**であることが明確になります。

### 4.3 問い合わせ作成フロー

```text
1. [Frontend] Contact Form Submit
   ↓ (tRPC mutation)
2. [API] contact.create プロシージャ
   ↓ (validation)
3. [Validators] CreateContactSchema
   ↓ (business logic)
4. [Domain] ContactEntity.create()
   ↓ (persistence)
5. [DB] ContactRepository.save()
   ↓ (external integration)
6. [External] NotionService + SlackService
   ↓ (response)
7. [Frontend] Success/Error Handling
```

### 4.2 レイヤー間通信

```typescript
// アプリケーション層での統合例
export class ContactApplicationService {
  constructor(
    private contactRepository: ContactRepositoryPort, // DB層
    private personRepository: PersonRepositoryPort, // DB層
    private externalOrchestrator: ExternalOrchestrator, // External層
    private contactDomainService: ContactDomainService // Domain層
  ) {}

  async createContact(dto: CreateContactDto): Promise<ContactResponseDto> {
    // 1. ドメインロジック実行
    const contact = await this.contactDomainService.createContact(dto)

    // 2. 永続化
    const savedContact = await this.contactRepository.save(contact)

    // 3. 外部サービス連携（非同期）
    const syncResults = await this.externalOrchestrator.notifyAll(savedContact)

    // 4. 同期状態更新
    await this.contactRepository.updateSyncStatus(savedContact.id, syncResults)

    return ContactResponseDto.fromEntity(savedContact)
  }
}
```

## 5. テスト戦略

### 5.1 層別テスト

```typescript
// ドメイン層（Pure Unit Tests）
describe('ContactEntity', () => {
  test('should create valid contact', () => {
    const contact = ContactEntity.create(validData)
    expect(contact.isValid()).toBe(true)
  })
})

// インフラ層（Integration Tests）
describe('ContactRepository', () => {
  test('should save and retrieve contact', async () => {
    const contact = await repository.save(contactData)
    const retrieved = await repository.findById(contact.id)
    expect(retrieved).toEqual(contact)
  })
})

// アプリケーション層（Service Tests）
describe('ContactApplicationService', () => {
  test('should handle external service failure gracefully', async () => {
    mockExternalService.mockRejectedValue(new Error('Service down'))

    const result = await service.createContact(validData)

    expect(result.success).toBe(true) // ユーザーには成功
    expect(result.syncStatus).toBe(false) // 内部では失敗記録
  })
})

// E2E Tests
describe('Contact Form E2E', () => {
  test('complete user journey', async () => {
    // フロントエンドからバックエンドまでの完全テスト
  })
})
```

### 5.2 テスト設定

```typescript
// packages/db/src/test-client.ts
export const testDb = drizzle(new Pool({ connectionString: TEST_DATABASE_URL }), {
  schema: testSchema,
})

// Vitestワークスペース設定
export default defineWorkspace([
  'packages/*/vitest.config.ts',
  {
    test: {
      name: 'integration',
      include: ['**/*.integration.test.ts'],
    },
  },
])
```

## 6. 開発ワークフロー

### 6.1 パッケージ間開発フロー

```bash
# 1. 新機能開発順序
# Domain → Validators → DB → API → UI → Apps

# 2. ドメイン層から開始
cd packages/domain
# エンティティ・ドメインサービス実装

# 3. バリデーション追加
cd packages/validators
# Zodスキーマ定義

# 4. データベース層
cd packages/db
# スキーマ・リポジトリ実装

# 5. API層
cd packages/api
# tRPCルーター実装

# 6. UI・アプリケーション
cd packages/ui && cd apps/nextjs
# コンポーネント・ページ実装
```

### 6.2 品質保証

```bash
# 型チェック（全パッケージ）
pnpm typecheck

# リント・フォーマット
pnpm lint:fix
pnpm format:fix

# テスト実行
pnpm test:unit       # ユニットテスト
pnpm test:integration # 統合テスト
pnpm test:e2e        # E2Eテスト

# ビルド確認
pnpm build
```

## 7. 拡張可能性

### 7.1 新パッケージ追加

```bash
# 新パッケージ生成
pnpm turbo gen init

# 依存関係設定
# package.jsonで適切なworkspace参照設定
```

### 7.2 外部サービス追加

```typescript
// packages/external/src/discord/discord-service.ts
export class DiscordService implements NotificationService {
  async notify(contact: Contact): Promise<NotificationResult> {
    // Discord Webhook実装
  }
}

// packages/external/src/orchestrator/
// 新サービスをオーケストレーターに追加
```

## 8. 運用考慮事項

### 8.1 監視・ログ

```typescript
// 各層でのログ出力
export class ContactApplicationService {
  async createContact(dto: CreateContactDto) {
    logger.info('Contact creation started', { email: dto.email })

    try {
      const result = await this.processContact(dto)
      logger.info('Contact created successfully', { id: result.id })
      return result
    } catch (error) {
      logger.error('Contact creation failed', { error, dto })
      throw error
    }
  }
}
```

### 8.2 パフォーマンス最適化

- **データベース**: 適切なインデックス設定
- **外部API**: バッチ処理・レート制限対応
- **キャッシュ**: 適切なレベルでのキャッシュ戦略

### 8.3 セキュリティ

- **入力検証**: 各層での適切なバリデーション
- **認証・認可**: 適切な権限管理
- **データ保護**: 個人情報の適切な取り扱い

---

このパッケージ設計により、保守性・拡張性・テスト容易性を兼ね備えたロバストなシステムを実現しています。
