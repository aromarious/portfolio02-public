# 問い合わせシステム仕様書

## 1. 概要

### 1.1 目的

ポートフォリオサイトに問い合わせフォーム機能を追加し、訪問者からの問い合わせを効率的に管理する。Slack通知とNotion蓄積により、リアルタイムな対応と体系的な管理を実現する。

### 1.2 システム全体像

```
[フロントエンド] → [tRPC API] → [データベース]
                            ↓
                    [Slack通知] & [Notion蓄積]
```

## 2. 機能要件

### 2.1 基本機能

- 問い合わせフォームの表示・入力
- フォームデータのバリデーション
- データベースへの保存
- Slack通知の送信
- Notionデータベースへの蓄積
- 管理者向け問い合わせ一覧表示

### 2.2 フォーム項目

| 項目             | 種類     | 必須 | バリデーション |
| ---------------- | -------- | ---- | -------------- |
| お名前           | text     | ✅   | 1-50文字       |
| メールアドレス   | email    | ✅   | RFC5322準拠    |
| お問い合わせ種別 | select   | ✅   | 定義済み選択肢 |
| メッセージ       | textarea | ✅   | 10-2000文字    |

### 2.3 問い合わせ種別

- お仕事のご相談
- 技術メンタリング
- 技術相談・アドバイス
- 講演・執筆依頼
- その他

## 3. データベース設計

### 3.1 contactsテーブル

```sql
CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL,
  email VARCHAR(254) NOT NULL,
  subject VARCHAR(100) NOT NULL,
  message TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'unread',
  notion_page_id VARCHAR(100),
  slack_message_ts VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### 3.2 ステータス定義

- `unread`: 未読
- `reading`: 対応中
- `replied`: 返信済み
- `completed`: 完了

## 4. API仕様

### 4.1 tRPCプロシージャ

#### 4.1.1 問い合わせ作成

```typescript
contact.create
Input: {
  name: string (1-50文字)
  email: string (メール形式)
  subject: string (定義済み選択肢)
  message: string (10-2000文字)
}
Output: {
  id: string
  success: boolean
  message: string
}
```

#### 4.1.2 問い合わせ一覧取得（管理者向け）

```typescript
contact.list
Input: {
  status?: string
  limit?: number
  offset?: number
}
Output: {
  contacts: Contact[]
  total: number
}
```

#### 4.1.3 問い合わせ詳細取得

```typescript
contact.byId
Input: {
  id: string
}
Output: Contact | null
```

#### 4.1.4 ステータス更新

```typescript
contact.updateStatus
Input: {
  id: string
  status: 'unread' | 'reading' | 'replied' | 'completed'
}
Output: {
  success: boolean
}
```

## 5. 外部サービス連携

### 5.1 Slack通知

#### 5.1.1 通知方式

- **使用API**: Slack Incoming Webhook API
- **通知タイミング**: 問い合わせ受信時にリアルタイム送信
- **成功判定**: HTTPレスポンス200で成功とみなす
- **制限事項**: メッセージIDの取得不可、配信確認不可

#### 5.1.2 通知内容

```json
{
  "text": "📧 新しい問い合わせが届きました",
  "attachments": [
    {
      "color": "good",
      "fields": [
        {
          "title": "名前",
          "value": "山田太郎",
          "short": true
        },
        {
          "title": "メールアドレス",
          "value": "example@example.com",
          "short": true
        },
        {
          "title": "問い合わせ種別",
          "value": "お仕事のご相談",
          "short": true
        },
        {
          "title": "メッセージ",
          "value": "プロジェクトについてご相談があります...",
          "short": false
        },
        {
          "title": "受信日時",
          "value": "2024-01-01 12:00:00",
          "short": true
        }
      ],
      "footer": "Portfolio Contact Form",
      "ts": "1640995200"
    }
  ]
}
```

#### 5.1.3 エラーハンドリング

- Webhook URL未設定: 通知スキップ（エラーログ出力）
- ネットワークエラー: リトライなし、ログ記録のみ
- Slack側エラー: ユーザー体験に影響させずログ記録

#### 5.1.4 必要な環境変数

- `SLACK_WEBHOOK_URL`: Slack Incoming Webhook URL

### 5.2 Notion同期

#### 5.2.1 同期戦略

- **Person-Contact分離**: 初回問い合わせ時にPersonを作成、Contact作成時にリレーション
- **検証フロー**: 作成後に検索可能性を確認（2秒Wait & Retry）
- **エラー処理**: 作成成功でも検証失敗時は`notionSynced: false`でマーク

#### 5.2.2 データベース構造

**Personデータベース**:
| プロパティ名 | 種類 | 設定 |
| -------------- | -------- | -------------- |
| name | タイトル | Person名 |
| email | Email | 一意キー |
| website | URL | Twitter URL |

**Contactデータベース**:
| プロパティ名 | 種類 | 設定 |
| -------------- | -------- | ---------------------- |
| name | タイトル | 名前 - メールアドレス |
| email | Email | メールアドレス |
| subject | Select | 問い合わせ種別 |
| message | Rich Text| メッセージ内容 |
| status | Select | New/In Progress/Done |
| person | Relation | PersonデータベースID |

#### 5.2.3 同期フロー

```
1. Person処理（初回問い合わせのみ）
   ├─ Person作成 via Notion API
   ├─ Person検証（email検索）
   ├─ 失敗時: 2秒待機→再検証
   └─ 最終失敗: 警告ログ、処理続行

2. Contact処理（全問い合わせ）
   ├─ Contact作成 via Notion API
   ├─ Contact検証（ID検索）
   ├─ 失敗時: 2秒待機→再検証
   └─ 最終失敗: notionSynced=false

3. DB状態更新
   ├─ Person検証結果を考慮
   ├─ Contact検証結果を考慮
   └─ 最終的なnotionSyncedフラグ設定
```

#### 5.2.4 必要な環境変数

- `NOTION_API_TOKEN`: Notion Integration Token
- `NOTION_PARENT_PAGE_ID`: 親ページID（PersonとContactデータベースを含む）

### 5.3 同期状態管理

#### 5.3.1 データベースフラグ

**`notionSynced`フラグ**:

- `true`: Notion同期完了・検証済み（Person + Contact両方）
- `false`: **落穂拾いAPIでのチェックが必要**
  - 初期作成失敗
  - Person検証失敗
  - Contact検証失敗
  - API通信エラー

**`slackNotified`フラグ**:

- `true`: Slack webhook成功（HTTP 200受信）
- `false`: Slack webhook失敗
- `notionSyncedAt`: 成功時のタイムスタンプ
- `slackNotifiedAt`: 成功時のタイムスタンプ

#### 5.3.2 エラーハンドリング方針

**Non-blocking設計**:

- 外部サービス障害がユーザー体験を阻害しない
- 問い合わせ受付は常に成功レスポンス
- 同期問題は後処理で対応

**Graceful Degradation**:

- Person作成失敗 → ContactをPersonなしで作成
- Contact検証失敗 → 落穂拾いターゲットとしてマーク
- Slack通知失敗 → ログ記録、Notion同期は継続

#### 5.3.3 落穂拾い・復旧戦略

**対象レコード**: `notionSynced: false`のContact
**チェック内容**:

1. PersonがNotionに存在するか
2. ContactがNotionに存在するか
3. Person-Contactリレーションが正しいか

**復旧アクション**:

- 欠損レコードの再作成
- リレーションの修復
- 成功時: `notionSynced: true`に更新

### 5.4 監視・可観測性

#### 5.4.1 追跡すべき指標

- **同期精度**: PostgreSQL vs Notion レコード数一致率
- **落穂拾い待ち**: `notionSynced: false`レコード数
- **通知成功率**: `slackNotified: true`の割合
- **検証成功率**: Person/Contact検証の成功率

#### 5.4.2 利用可能レポート

- データ一致性レポート（PostgreSQL vs Notion統計）
- 同期精度パーセンテージ計算
- 期間別外部サービス成功率
- 個別レコード同期状況追跡

## 6. セキュリティ要件

### 6.1 入力検証

- フロントエンド・バックエンド双方でのバリデーション
- XSS対策（入力値のサニタイゼーション）
- SQLインジェクション対策（Drizzle ORMのパラメータ化クエリ使用）

### 6.2 レート制限

- 同一IPアドレスからの連続送信制限（1分間に3回まで）
- 同一メールアドレスからの連続送信制限（10分間に1回まで）

### 6.3 データ保護

- 個人情報の適切な取り扱い
- 不要になった問い合わせデータの定期削除（1年後）

## 7. エラーハンドリング

### 7.1 バリデーションエラー

- 必須項目未入力
- 文字数制限違反
- メール形式エラー
- 不正な選択肢

### 7.2 システムエラー

- データベース接続エラー
- 外部API通信エラー
- 認証エラー

### 7.3 ユーザーへの表示

- 分かりやすいエラーメッセージ
- 入力項目ごとのエラー表示
- 送信成功・失敗の明確なフィードバック

## 8. パフォーマンス要件

### 8.1 レスポンス時間

- フォーム送信: 3秒以内
- 一覧表示: 2秒以内

### 8.2 可用性

- 稼働率: 99.9%以上
- 外部サービス障害時の graceful degradation

## 9. 環境変数一覧

```bash
# 必須
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
NOTION_API_TOKEN=secret_...
NOTION_PARENT_PAGE_ID=...

# オプション（開発環境）
CONTACT_DEBUG=true
CONTACT_MOCK_EXTERNAL=true
```

## 10. 実装における注意事項

### 10.1 既存コンポーネントの活用

- `apps/nextjs/src/components/Contact.tsx` をベースとして改良
- 既存のデザインシステムとの整合性を保持

### 10.2 T3 Turboアーキテクチャ準拠

- tRPCによるtype-safe API
- Drizzle ORMによるデータベース操作
- Zodによるバリデーション

### 10.3 開発・テスト環境

- 外部サービスのモック機能
- テストデータの自動生成
- E2Eテストシナリオの定義
