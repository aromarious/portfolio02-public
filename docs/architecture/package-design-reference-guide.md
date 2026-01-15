# T3 Turbo Monorepo パッケージ設計リファレンスガイド

## はじめに

このドキュメントは、同じプロジェクト構造（T3 Turbo monorepo）を使用するが、異なるドメイン・テーブル構造を持つプロジェクトの開発者向けのリファレンスガイドです。

元プロジェクトは**ポートフォリオサイトの問い合わせシステム**（Person、Contact、RateLimit）ですが、この設計パターンは任意のドメインに適用可能です。

## アーキテクチャパターンの概要

### Hexagonal Architecture + DDD

```text
Presentation → Application → Domain ← Infrastructure
                              ↑
                        ポート（インターフェース）
                           ↓
                    アダプター（実装）
```

**核心原則**:

- **ドメインが中心**: ビジネスロジックが技術詳細から独立
- **依存性逆転**: 外側（インフラ）が内側（ドメイン）に依存
- **ポート&アダプター**: インターフェース定義とその実装を分離

## パッケージ構成テンプレート

### 1. ドメイン中心の構成

```text
packages/
├── domain/           # ビジネスロジック（あなたのドメインエンティティ）
├── db/              # データ永続化（あなたのテーブル構造）
├── validators/      # UI-API契約（あなたのフォーム・API）
├── api/            # tRPCエンドポイント（あなたのAPIロジック）
├── external/       # 外部サービス統合（あなたの外部連携）
├── ui/             # 共通UIコンポーネント
└── auth/           # 認証基盤（必要に応じて）
```

### 2. ドメイン置き換えの例

| 元プロジェクト（問い合わせシステム） | 他ドメインの例             |
| ------------------------------------ | -------------------------- |
| Person, Contact, RateLimit           | User, Order, Product       |
| Person, Contact, RateLimit           | Author, Article, Comment   |
| Person, Contact, RateLimit           | Customer, Ticket, Category |

## パッケージ別実装ガイド

### @yourproject/domain

あなたのビジネスエンティティを定義します。

```typescript
// src/entities/your-main-entity.ts
export class YourMainEntity extends DDDEntity<YourMainEntityProps> {
  static create(props: CreateYourMainEntityProps): YourMainEntity {
    // あなたのビジネスルールをここに
    return new YourMainEntity({ id: generateId(), ...props })
  }

  // ビジネスメソッド
  public yourBusinessMethod(): void {
    // ドメインロジック
  }
}

// src/ports/your-repository.port.ts
export interface YourRepositoryPort {
  save(entity: YourMainEntity): Promise<YourMainEntity>
  findById(id: string): Promise<YourMainEntity | null>
  // あなたのビジネス要件に必要なメソッド
}
```

### @yourproject/db

あなたのテーブル構造を定義します

```typescript
// src/schema.ts
export const YourMainTable = createTable(
  'your_main_table',
  (t: any) => ({
    id: t.uuid('id').notNull().primaryKey().defaultRandom(),
    // あなたのフィールド定義
    name: t.varchar('name', { length: 256 }).notNull(),
    status: t.varchar('status', { length: 50 }).notNull(),

    // 共通パターン（推奨）
    createdAt: t.timestamp('created_at').defaultNow().notNull(),
    updatedAt: t
      .timestamp('updated_at')
      .defaultNow()
      .notNull()
      .$onUpdateFn(() => new Date()),
  }),
  (table: any) => [
    // あなたのインデックス
    index('your_main_name_idx').on(table.name),
  ]
)

// src/repository/your-repository.ts
export class YourRepository implements YourRepositoryPort {
  // ドメインポートの実装
  async save(entity: YourMainEntity): Promise<YourMainEntity> {
    const persistenceModel = this.toPersistence(entity)
    // データベース保存
    return this.toDomain(saved)
  }
}
```

### @yourproject/validators

あなたのUI-API契約を定義します

```typescript
// src/your-form.schema.ts
import { CreateYourMainEntityPropsSchema } from '@yourproject/domain'

export const yourFormInputSchema = z.object({
  // ドメインスキーマから必要フィールドを選択
  ...CreateYourMainEntityPropsSchema.pick({
    name: true,
    status: true,
  }).shape,

  // UI固有の要件を追加
  agreeToTerms: z.literal(true),
  captchaToken: z.string().optional(),
})

export type YourFormInput = z.infer<typeof yourFormInputSchema>
```

### @yourproject/api

あなたのAPIエンドポイントを定義します

```typescript
// src/router/your-main.ts
export const yourMainRouter = {
  create: publicProcedure.input(yourFormInputSchema).mutation(async ({ input }) => {
    // アプリケーションサービス呼び出し
    return await yourApplicationService.create(input)
  }),

  getById: publicProcedure.input(z.object({ id: z.string() })).query(async ({ input }) => {
    return await yourApplicationService.getById(input.id)
  }),
}

// src/application/services/your-application.service.ts
export class YourApplicationService {
  constructor(
    private yourRepository: YourRepositoryPort,
    private externalService: YourExternalServicePort
  ) {}

  async create(dto: YourCreateDto): Promise<YourResponseDto> {
    // 1. ドメインエンティティ作成
    const entity = YourMainEntity.create(dto)

    // 2. 永続化
    const saved = await this.yourRepository.save(entity)

    // 3. 外部サービス連携（必要に応じて）
    await this.externalService.notify(saved)

    return YourResponseDto.fromEntity(saved)
  }
}
```

### @yourproject/external（必要に応じて）

あなたの外部サービス統合

```typescript
// src/your-service/your-external-service.ts
export class YourExternalService implements YourExternalServicePort {
  async notify(entity: YourMainEntity): Promise<NotificationResult> {
    // 外部API呼び出し（Slack、メール、Webhook等）
    try {
      const response = await this.callExternalAPI(entity)
      return { success: true, data: response }
    } catch (error) {
      // Graceful Degradation - ユーザー体験を阻害しない
      return { success: false, error: error.message }
    }
  }
}
```

## 重要な設計パターン

### 1. 依存性逆転パターン

```typescript
// ❌ 悪い例: ドメインがインフラに依存
class YourDomainService {
  constructor(private database: DrizzleDB) {} // インフラ依存
}

// ✅ 良い例: インフラがドメインに依存
class YourDomainService {
  constructor(private repository: YourRepositoryPort) {} // ポート依存
}

class YourRepository implements YourRepositoryPort {
  constructor(private database: DrizzleDB) {} // アダプターで技術詳細
}
```

### 2. ドメインスキーマの再利用パターン

```typescript
// Domain層でビジネスルール定義
export const CreateYourEntityPropsSchema = z.object({
  name: z.string().max(256), // ビジネス制約
  type: z.enum(['typeA', 'typeB']), // ビジネスルール
})

// Validators層でUI契約作成
export const yourFormSchema = z.object({
  ...CreateYourEntityPropsSchema.shape, // ドメインルール継承
  uiSpecificField: z.string().optional(), // UI固有要件
})
```

### 3. Graceful Degradationパターン

```typescript
export class YourApplicationService {
  async processRequest(data: YourData): Promise<YourResponse> {
    // 1. コア機能（必ず成功させる）
    const result = await this.coreProcess(data)

    // 2. 付加機能（失敗してもOK）
    try {
      await this.optionalExternalService(result)
    } catch (error) {
      // ログ記録だけして続行
      logger.warn('External service failed', { error })
    }

    // ユーザーには成功を返す
    return { success: true, data: result }
  }
}
```

## テンプレート作成手順

### 1. ドメイン分析

- あなたのビジネスエンティティは何か？
- エンティティ間の関係は？
- 主要なビジネスルールは？

### 2. テーブル設計

- エンティティをどう永続化するか？
- 外部キー関係の設計
- インデックス戦略

### 3. API契約設計

- フロントエンドからどんなデータが送信されるか？
- バックエンドからどんなレスポンスを返すか？
- バリデーションルールは？

### 4. 外部サービス検討

- 統合が必要な外部サービスは？
- 障害時の処理方針は？
- 同期/非同期処理の選択

## 共通的な実装パターン

### データベース環境切り替え

```typescript
// あなたのプロジェクトでも使える環境切り替えパターン
const isLocal = POSTGRES_URL.includes('localhost')

export const db = drizzle(isLocal ? postgres(POSTGRES_URL) : vercelPostgres, { schema: yourSchema })
```

### tRPCルーター構成

```typescript
// src/root.ts
export const appRouter = {
  yourMain: yourMainRouter,
  yourSub: yourSubRouter,
  auth: authRouter, // 共通
}

export type AppRouter = typeof appRouter
```

### テスト構成

```typescript
// あなたのプロジェクト用のテスト戦略
describe('YourDomain', () => {
  // Unit: ドメインロジックのテスト
  // Integration: リポジトリ + DB のテスト
  // E2E: API + UI の完全テスト
})
```

## まとめ

このパッケージ設計パターンを使用することで：

1. **ドメイン駆動**: あなたのビジネスロジックが中心
2. **技術非依存**: データベースやライブラリ変更に強い
3. **テスト容易**: 各層を独立してテスト可能
4. **拡張性**: 新機能・外部サービス追加が容易
5. **保守性**: 明確な責任分離で理解しやすい

どんなドメインでも、このパターンに従って実装することで、堅牢で保守性の高いシステムを構築できます。
