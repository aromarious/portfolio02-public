# DB Package - DDD + Hexagonal Architecture

dbパッケージはDomain-Driven Design（DDD）とHexagonal Architecture（ヘキサゴナルアーキテクチャ）を実装したデータベース層です。

## アーキテクチャ構造

```
src/
├── domain/           # ドメイン層
│   ├── entities/     # エンティティ（集約ルート）
│   └── value-objects/ # 値オブジェクト
├── ports/           # ポート（インターフェース）
├── repository/      # アダプター（リポジトリ実装）
└── schema.ts        # データベーススキーマ
```

## 主要コンポーネント

### Value Objects (値オブジェクト)

- **Email**: メールアドレスの検証とフォーマット
  - 必須チェック、長さ制限、正規表現バリデーション
  - 自動的に小文字・トリムで正規化

### Entities (エンティティ)

- **Person**: 連絡先管理の集約ルート
  - ドメインイベント発行（PersonCreated, PersonContacted）
  - ビジネスロジック（頻繁連絡先判定、最近連絡チェック）
  - 不変性保持（privateコンストラクタ、静的ファクトリーメソッド）

### Repository Pattern (リポジトリパターン)

- **Port**: PersonRepositoryPort（インターフェース）
- **Adapter**: PersonRepository（Drizzle ORM実装）
- **機能**: CRUD、検索、フィルタリング、ページネーション

## 使用例

```typescript
// 値オブジェクトの作成
const email = Email.create('user@example.com')

// エンティティの作成
const person = Person.create({
  name: '田中太郎',
  email: 'tanaka@example.com',
  company: '株式会社サンプル',
})

// リポジトリの使用
const repository = new PersonRepository(db)
const savedPerson = await repository.save(person)

// ビジネスロジック
person.recordNewContact()
console.log(person.isFrequentContact()) // false (初回)
```

## 設計原則

1. **不変性**: エンティティと値オブジェクトは作成後の状態変更を制御
2. **ドメイン駆動**: ビジネスロジックはエンティティ内に集約
3. **依存性逆転**: ポートを通じてインフラ層との結合度を下げる
4. **テスタビリティ**: モックによる単体テスト、統合テストの分離

## ネーミングルール & ファイル構成

### ファイル名規則

#### エンティティ

```
src/domain/entities/{entity-name}.entity.ts
例: person.entity.ts, contact.entity.ts, rate-limit.entity.ts
```

#### バリューオブジェクト

```
src/domain/value-objects/{value-object-name}.vo.ts
例: email.vo.ts, contact-status.vo.ts, urgency-level.vo.ts
```

#### リポジトリ実装

```
src/repository/{entity-name}.repository.ts
例: person.repository.ts, contact.repository.ts
```

#### ポート（インターフェース）

```
src/ports/{entity-name}.repository.port.ts
例: person.repository.port.ts, contact.repository.port.ts
```

### クラス・型名規則

#### クラス名

```typescript
// エンティティ・アグリゲートルート
export class Person extends AggregateRoot<PersonProps> { ... }
export class Contact extends AggregateRoot<ContactProps> { ... }

// バリューオブジェクト
export class Email extends ValueObject<EmailProps> { ... }
export class ContactStatus extends ValueObject<ContactStatusProps> { ... }

// リポジトリ
export class PersonRepository implements PersonRepositoryPort { ... }

// ドメインイベント
export class PersonCreatedEvent extends BaseDomainEvent { ... }
export class PersonContactedEvent extends BaseDomainEvent { ... }
```

#### インターフェース名

```typescript
// エンティティプロパティ
interface PersonProps { ... }
interface CreatePersonProps { ... }

// リポジトリポート
export interface PersonRepositoryPort { ... }

// フィルター・オプション
export interface PersonFilter { ... }
export interface PaginationOptions { ... }
```

### 命名パターン

- **ファイル名**: kebab-case
- **クラス名**: PascalCase
- **プロパティ・メソッド**: camelCase
- **接尾辞ルール**:
  - `.entity.ts` - エンティティ
  - `.vo.ts` - バリューオブジェクト
  - `.repository.ts` - リポジトリ実装
  - `.port.ts` - ポート（インターフェース）
  - `Event` - ドメインイベント
  - `Props` - プロパティインターフェース
  - `Port` - ポートインターフェース

### DDD固有の命名

- **AggregateRoot**: `Person`, `Contact`
- **Entity**: `ContactResponse`, `RateLimit`
- **ValueObject**: `Email`, `ContactStatus`, `UrgencyLevel`
- **DomainEvent**: `PersonCreatedEvent`, `ContactStatusChangedEvent`
- **Repository**: `PersonRepository` (実装クラス)
- **Port**: `PersonRepositoryPort` (インターフェース)

このアーキテクチャにより、ビジネスロジックの複雑性を管理し、拡張性と保守性を確保しています。

## イベント駆動アーキテクチャ（サンプル実装）

### 概要

DDD の重要な要素であるドメインイベントの基本的な実装を含んでいます。現在は**サンプル実装**として、イベントディスパッチャーとPersonCreatedEventのハンドラーが実装されています。

### 実装済みコンポーネント

#### イベントシステムの基盤

```
src/domain/events/
├── event-handler.interface.ts    # EventHandlerインターフェース
├── event-dispatcher.ts           # EventDispatcherクラス
├── index.ts                      # セットアップ関数・エクスポート
├── examples.ts                   # 使用例・サンプルコード
└── handlers/
    └── person-created.handler.ts # PersonCreatedEventのサンプルハンドラー
```

#### テスト

```
src/__tests__/domain/events/
└── event-dispatcher.test.ts      # EventDispatcherのテスト
```

### 基本的な使い方

```typescript
import { setupEventHandlers } from './domain/events'

// 1. イベントディスパッチャーをセットアップ
const eventDispatcher = setupEventHandlers()

// 2. Personを作成（PersonCreatedEventが蓄積される）
const person = Person.create({
  name: '田中太郎',
  email: 'tanaka@example.com',
  company: '株式会社サンプル',
})

// 3. 蓄積されたイベントを処理
await eventDispatcher.dispatch(person.domainEvents)
person.clearDomainEvents()
```

### 現在のサンプルハンドラー

- **PersonCreatedEventHandler**: Person作成時のコンソールログ出力
  - 実際のアプリケーションでは、ウェルカムメール送信やSlack通知などを実装

### 拡張方法

新しいイベントハンドラーを追加する場合：

1. **ハンドラークラスを作成**

```typescript
// src/domain/events/handlers/person-contacted.handler.ts
export class PersonContactedEventHandler implements EventHandler<PersonContactedEvent> {
  async handle(event: PersonContactedEvent): Promise<void> {
    // 連絡記録時の処理
  }
}
```

2. **セットアップ関数に登録**

```typescript
// src/domain/events/index.ts
dispatcher.subscribe('PersonContacted', new PersonContactedEventHandler())
```

### 設計思想

- **疎結合**: ドメインロジックとインフラ層の分離
- **拡張性**: 新しいイベントハンドラーを簡単に追加可能
- **テスタビリティ**: モックによる単体テスト対応
- **エラーハンドリング**: Promise.allSettledによる堅牢な処理

この基盤により、将来的に本格的なイベント駆動システムへの拡張が可能です。

## データベーススキーマ管理ワークフロー

### 🔧 開発環境 - 迅速開発ワークフロー

開発中のスキーマ変更には`push`コマンドを使用します：

```bash
# 1. スキーマファイルを編集
vim packages/db/src/schema.ts

# 2. 直接データベースに適用
pnpm push                 # dbパッケージ内から実行
# または
pnpm db:push             # プロジェクトルートから実行

# 3. データベース確認（必要に応じて）
pnpm studio              # dbパッケージ内から実行
# または
pnpm db:studio          # プロジェクトルートから実行
```

**特徴**：

- ✅ マイグレーションファイルなしで瞬時に適用
- ✅ 開発中の試行錯誤に最適
- ❌ マイグレーション履歴は残らない
- ❌ 本番環境では非推奨

### 🚀 本番環境 - 安全なマイグレーションワークフロー

**注意**: 現在マイグレーション用のコマンドは未実装です。本番展開時には以下の追加が必要：

```bash
# 1. スキーマファイルを編集
vim packages/db/src/schema.ts

# 2. マイグレーションファイル生成（要実装）
pnpm db:generate        # drizzle-kit generate

# 3. マイグレーション実行（要実装）
pnpm db:migrate         # drizzle-kit migrate

# 4. 確認
pnpm db:studio
```

### 📋 スキーマ編集の具体例

#### 新しいテーブル作成

```typescript
// packages/db/src/schema.ts
export const newTable = pgTable('new_table', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})
```

#### 既存テーブル修正

```typescript
// カラム追加例
export const personTable = pgTable('person', {
  // 既存カラム...
  newColumn: varchar('new_column', { length: 100 }), // 新規追加
})

// インデックス追加例
export const personEmailIndex = index('person_email_idx').on(personTable.email)
```

#### リレーション追加

```typescript
export const newTableRelations = relations(newTable, ({ one }) => ({
  person: one(personTable, {
    fields: [newTable.personId],
    references: [personTable.id],
  }),
}))
```

### ⚠️ 今後の改善予定

本番環境対応のため、以下のスクリプト追加を推奨：

```json
// packages/db/package.json
{
  "scripts": {
    "generate": "drizzle-kit generate",
    "migrate": "drizzle-kit migrate"
  }
}

// package.json (root)
{
  "scripts": {
    "db:generate": "turbo -F @aromarious/db generate",
    "db:migrate": "turbo -F @aromarious/db migrate"
  }
}
```

### 利用可能なコマンド

**現在利用可能**：

- `pnpm push` / `pnpm db:push` - 開発用直接適用
- `pnpm studio` / `pnpm db:studio` - データベース管理UI

**今後実装予定**：

- `pnpm generate` / `pnpm db:generate` - マイグレーションファイル生成
- `pnpm migrate` / `pnpm db:migrate` - マイグレーション実行
