# 問い合わせバックエンドドメインサービス設計書

## 概要
Linear ARO-36の実装に向けた問い合わせシステムのバックエンド設計と実装方針をまとめた文書。

**基本コンセプト**: 
- DB = 問い合わせ**受付専用**システム
- 管理・対応 = **Notion**で実施
- 一方向同期（DB → Notion）でシンプルに構成

## DBスキーマ構造

### コアビジネスドメインテーブル

#### 1. Person テーブル - 問い合わせ者マスター
```sql
person (
  id UUID PRIMARY KEY,
  name VARCHAR(256) NOT NULL,
  email VARCHAR(256) NOT NULL UNIQUE,
  company VARCHAR(256),
  twitter_handle VARCHAR(50),
  first_contact_at TIMESTAMP DEFAULT NOW() NOT NULL,
  last_contact_at TIMESTAMP DEFAULT NOW() NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
)
```
- **役割**: 問い合わせ者の基本情報と連絡先
- **キーフィールド**: email（ユニーク制約）
- **連絡先**: twitter_handle（優先連絡手段）
- **統計情報**: contact_count削除 → 必要時にCOUNTクエリで取得

#### 2. Contact テーブル - 問い合わせ受付記録
```sql
contact (
  id UUID PRIMARY KEY,
  person_id UUID NOT NULL → person(id),
  subject VARCHAR(256) NOT NULL,
  message TEXT NOT NULL,
  
  -- 技術メタデータ（分析用）
  ip_address, user_agent, browser_name, browser_version,
  os_name, device_type, screen_resolution, timezone,
  language, referer,
  
  -- セッション情報
  session_id VARCHAR(256),
  form_duration INTEGER,
  previous_visit_at TIMESTAMP,
  
  -- 外部連携状況（同期確認用）
  notion_synced BOOLEAN DEFAULT FALSE,
  slack_notified BOOLEAN DEFAULT FALSE,
  notion_synced_at TIMESTAMP,
  slack_notified_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
)
```
- **役割**: 問い合わせの受付記録のみ
- **外部キー**: person_id → Person
- **連絡方法**: Personテーブルのtwitter_handleを参照
- **削除項目**: status, assigned_to, response_required, responded_at （Notionで管理）
- **特徴**: 受付と外部連携の記録に特化

#### 3. Rate Limit テーブル - スパム対策
```sql
rate_limit (
  id UUID PRIMARY KEY,
  ip_address INET,
  email VARCHAR(254),
  attempt_count INTEGER DEFAULT 1,
  first_attempt_at TIMESTAMP DEFAULT NOW(),
  last_attempt_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
)
```

### 削除されたテーブル
- ❌ **Contact Response テーブル**: Notionで管理するため削除

### リレーションシップ構造
```
Person (1) ←→ (N) Contact
Rate Limit (独立)
```

## 初回問い合わせユースケースフロー

### Step 1: レート制限チェック
```
Rate Limit テーブルをチェック
- IPアドレスベースの制限確認
- emailベースの制限確認（既存の場合）
- 制限に引っかかる場合はエラーレスポンス
```

**制限設定の参照先**: 
- 設定ファイル (`packages/api/src/config/rate-limit.config.ts`) で制限値管理
- Rate Limitテーブルで実際の試行履歴を追跡

### Step 2: Person レコードの作成/取得
```
email で Person テーブルを検索
- 存在しない場合（初回）:
  - 新しい Person レコードを作成
  - name, email, company, twitter_handle を保存
  - first_contact_at = 現在時刻
  - last_contact_at = 現在時刻  
- 存在する場合:
  - twitter_handle を更新（新しい情報がある場合）
  - last_contact_at を更新
```

### Step 3: Contact レコードの作成
```
Contact テーブルに新規レコード作成
- person_id = Step 2で取得/作成したPersonのID
- 基本情報: subject, message
- 技術メタデータ: ip_address, user_agent, browser情報等
- セッション情報: session_id, form_duration, previous_visit_at
- 外部連携フラグ: notion_synced = false, slack_notified = false
```

### Step 4: Rate Limit レコードの更新
```
Rate Limit テーブルの更新
- IPアドレス・emailの組み合わせで既存レコード検索
- 存在しない場合: 新規作成
- 存在する場合: attempt_count++, last_attempt_at更新
```

### Step 5: 外部サービス連携（非同期処理）
```
連絡方法の優先順位（Personテーブルのtwitter_handleを参照）:
1. person.twitter_handle が存在する場合:
   - Twitter DM での連絡準備
   - Notion同期（連絡方法: Twitter）
2. person.twitter_handle が存在しない場合:
   - メール対応準備  
   - Notion同期（連絡方法: Email）

共通処理:
- Slack 通知の送信
  - 成功時: slack_notified = true, slack_notified_at = 現在時刻
```

### データフロー全体
```
1. フォーム送信 → DB保存（受付記録 + Twitter情報）
2. 連絡方法判定:
   - Twitter Handle あり → Twitter DM優先
   - Twitter Handle なし → メール対応
3. DB → Notion同期（管理・対応はNotion側）
4. DB → Slack通知（アラート用）
5. 実際の返信・管理作業 → Notion上で完結
6. DBには対応結果を保存しない（受付特化）
```

## 問い合わせフォーム設計

### フォーム項目
```typescript
// 基本情報
name: string          // お名前（必須）
email: string         // メールアドレス（必須）
company?: string      // 会社名・組織名（任意）

// 連絡方法
twitterHandle?: string // Twitter/X アカウント（任意、優先連絡手段）

// 問い合わせ内容
subject: string       // 件名（必須）
message: string       // メッセージ（必須）

// 自動取得情報
sessionId?: string
formDuration?: number
previousVisitAt?: Date
```

### 連絡優先度
```
1. Twitter Handle 入力あり → Twitter DM で迅速対応
2. Twitter Handle なし → メールでの従来対応
3. 緊急度はNotion側で管理（DBには保存しない）
```

### バリデーションルール
```typescript
// Twitter Handle の検証
twitterHandle: z.string()
  .optional()
  .refine(
    (val) => !val || val.match(/^@?[A-Za-z0-9_]{1,15}$/),
    'Twitterアカウント名の形式が正しくありません'
  )

// urgencyLevel 削除（Notionで管理）
```

## 設定ファイル配置方針

### 技術的設定 vs ビジネス的設定の分離

#### 技術的設定 → `packages/api/src/config/`
- **レート制限設定**: システム的制約、パフォーマンス関連
- **DB接続設定**: インフラ関連設定
- **責任**: エンジニアが調整

```typescript
// packages/api/src/config/rate-limit.config.ts
export const RATE_LIMIT_CONFIG = {
  contact: {
    ip: { windowMs: 60 * 60 * 1000, max: 5 },    // 1時間5回
    email: { windowMs: 60 * 60 * 1000, max: 3 }, // 1時間3回
  },
} as const
```

#### ビジネス的設定 → `packages/content/`（将来）
- **文言・メッセージ**: ユーザー体験、ブランドトーン
- **テンプレート**: 外部通知、メール文面
- **責任**: コンテンツ担当者が調整

### 配置理由
1. **関心の分離**: 技術的関心とビジネス的関心の適切な分離
2. **保守性**: 変更時の影響範囲が明確
3. **責任分担**: 各チームが適切な領域を担当
4. **拡張性**: 将来的な多言語対応等への備え

## 実装アーキテクチャ決定

### Next.js Middleware vs tRPC Router 比較検討

#### Next.js Middleware
**メリット**: 早期リジェクト、パフォーマンス、広範囲対応
**デメリット**: DB接続制限、tRPC Context不足、柔軟性不足

#### tRPC Router（採用）
**メリット**: DB接続自由、Context活用、エンドポイント固有制御、ビジネスロジック統合
**デメリット**: 処理遅延、リソース消費

### 採用理由
1. **DB制約**: rate_limitテーブルアクセスが必要
2. **Email制限**: POSTボディの情報が必要
3. **実装simplicity**: 一箇所での完結した処理
4. **デバッグ容易性**: ログ・トレースが統一

### 実装構造
```
packages/api/src/
├── config/
│   └── rate-limit.config.ts    ← レート制限設定
├── middleware/
│   └── rate-limit.ts           ← レート制限実装
├── router/
│   └── contact.ts              ← メイン処理、rate-limitを使用
└── utils/
    └── error-handling.ts
```

### 実装フロー
```typescript
// packages/api/src/router/contact.ts
export const contactRouter = createTRPCRouter({
  create: publicProcedure
    .input(contactCreateSchema)
    .mutation(async ({ input, ctx }) => {
      // 1. レート制限チェック
      await checkContactRateLimit(ctx.req.ip, input.email)
      
      // 2. Person作成/取得（contact_count不要）
      // 3. Contact作成（ステータス関連フィールド不要）
      // 4. Rate Limit更新
      // 5. Notion/Slack連携（非同期、管理はNotion側）
    })
})
```

## エラーハンドリング

### 想定エラーケース
- レート制限超過 → 429 Too Many Requests
- 必須項目不足 → 400 Bad Request  
- email形式不正 → 400 Bad Request
- 外部サービス連携失敗 → ログ記録、リトライ機構
- DB接続エラー → 500 Internal Server Error

### レスポンス仕様

#### 成功時
```json
{
  "success": true,
  "contactId": "uuid",
  "message": "お問い合わせを受け付けました",
  "estimatedResponseTime": "1-2営業日"
}
```

#### 失敗時
```json
{
  "success": false,
  "error": "RATE_LIMIT_EXCEEDED",
  "message": "短時間での連続投稿は制限されています",
  "retryAfter": 300
}
```

## Vercel Cron Jobs による自動復旧

### Vercel Cron Jobs の設定

#### **vercel.json 設定**
```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "crons": [
    {
      "path": "/api/sync-failed-contacts",
      "schedule": "0 * * * *"  // 1時間おき
    },
    {
      "path": "/api/cleanup-old-rate-limits",
      "schedule": "0 2 * * *"  // 毎日2時
    }
  ]
}
```

#### **スケジュール精度**
- **Hobby プラン**: 時間単位の精度（例: `0 * * * *` は xx:00:00-xx:59:59 の間）
- **Pro/Enterprise プラン**: 分単位の精度（例: `5 * * * *` は xx:05:00-xx:05:59 の間）

### 同期漏れ修復 Cron Job

#### **実装例 (apps/nextjs/app/api/sync-failed-contacts/route.ts)**
```typescript
export async function GET(request: Request) {
  // セキュリティチェック（2層防御）
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }
  
  // User-Agent チェック（追加セキュリティ）
  const userAgent = request.headers.get('user-agent') || '';
  if (!userAgent.startsWith('vercel-cron')) {
    return new Response('Forbidden', { status: 403 });
  }

  // Notion同期失敗分を修復
  const failedNotionContacts = await db.contact.findMany({
    where: {
      notion_synced: false,
      created_at: { lt: new Date(Date.now() - 60 * 60 * 1000) } // 1時間前
    }
  });

  const results = { synced: 0, failed: [] };
  
  for (const contact of failedNotionContacts) {
    try {
      await syncToNotion(contact);
      await db.contact.update({
        where: { id: contact.id },
        data: { notion_synced: true, notion_synced_at: new Date() }
      });
      results.synced++;
    } catch (error) {
      results.failed.push({ id: contact.id, error: error.message });
    }
  }

  // Slack通知失敗分も同様に修復
  // ...

  // 問題があったらSlackアラート
  if (results.failed.length > 0) {
    await slackService.notify(`同期エラー: ${results.failed.length}件`);
  }

  return Response.json({
    success: true,
    processed: failedNotionContacts.length,
    results
  });
}
```

### Rate Limit クリーンアップ Cron Job

#### **実装例 (apps/nextjs/app/api/cleanup-old-rate-limits/route.ts)**
```typescript
export async function GET(request: Request) {
  // セキュリティチェック
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }
  
  const userAgent = request.headers.get('user-agent') || '';
  if (!userAgent.startsWith('vercel-cron')) {
    return new Response('Forbidden', { status: 403 });
  }

  // 7日以上古いrate limitレコードを削除
  const result = await db.rateLimit.deleteMany({
    where: {
      created_at: { lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
    }
  });

  return Response.json({
    success: true,
    deleted: result.count,
    message: `${result.count}件の古いrate limitレコードを削除しました`
  });
}
```

### セキュリティ設計

#### **2層防御アプローチ**
1. **CRON_SECRET チェック**: Vercelが自動設定する認証トークン
2. **User-Agent チェック**: `vercel-cron`からのアクセスのみ許可

#### **攻撃者への対策**
- URLを知られてもアクセス不可
- Secretが漏洩してもUser-Agentで二重防御
- 「面倒な家」認定で攻撃対象から外れやすい

### 運用フロー

```
1. 問い合わせ送信 → DB保存（確実）
2. 外部連携試行 → 失敗時はフラグfalse
3. 1時間後にCron実行 → 失敗分を自動修復
4. 問題検出時 → Slackアラート
5. 管理者確認 → 必要に応じて手動対応（Drizzle Studio）
```

### 環境変数設定

```bash
# Vercel Dashboard > Environment Variables
CRON_SECRET=vercel-generated-secret-key  # Vercelが自動生成
```

## 今後の拡張計画

### Phase 1: 基本実装
- tRPC Router内でのレート制限実装
- 基本的な問い合わせフロー
- Vercel Cron Jobsによる自動復旧

### Phase 2: 監視強化
- より詳細なエラー分類
- 復旧成功率の監視
- アラート条件の最適化

### Phase 3: 機能拡張
- 文言管理パッケージ作成
- 多言語対応
- 高度な分析機能