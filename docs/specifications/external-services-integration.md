# 外部サービス統合仕様書

## 1. 概要

### 1.1 目的

問い合わせシステムにおける外部サービス（Notion、Slack）との統合について、堅牢性とユーザー体験を両立させる設計・実装方針を定める。

### 1.2 設計思想

- **ユーザー体験第一**: 外部サービス障害がユーザーの問い合わせ送信を阻害しない
- **最終的整合性**: 即座の同期失敗は後処理で解決
- **可観測性**: 同期状況を追跡・監視可能
- **Graceful Degradation**: 部分的障害でも主要機能は継続

## 2. 外部サービス統合アーキテクチャ

### 2.1 統合フロー概要

```
[問い合わせ受信]
      ↓
[PostgreSQL保存] ← 必ず成功
      ↓
[Person作成・検証] ← 初回のみ
      ↓
[Contact作成・検証] ← 毎回
      ↓
[Slack通知] ← 並行実行
      ↓
[同期状態DB更新] ← 結果記録
      ↓
[ユーザーに成功レスポンス] ← 常に成功
```

### 2.2 非同期処理設計

- メイン処理（ユーザー応答）と外部サービス処理の分離
- 外部サービス障害時も即座にユーザーに成功応答
- 障害時は後処理での復旧を前提

## 3. Notion統合詳細仕様

### 3.1 データモデル設計

#### 3.1.1 Person-Contact分離方式

```
Person (人物情報)
├─ 一人につき一つのレコード
├─ Email addresses で一意性確保
└─ 複数のContactからリレーション

Contact (個別問い合わせ)
├─ 問い合わせごとに一つのレコード
├─ Personへのリレーション
└─ 問い合わせ内容・状態管理
```

**利点**:

- 同一人物からの複数問い合わせを効率的に管理
- Person情報の重複排除
- 問い合わせ履歴の追跡が容易

### 3.2 同期処理フロー

#### 3.2.1 Person処理（初回問い合わせのみ）

```typescript
1. Person.findByEmail(email) で既存チェック
   └─ 既存: PersonのNotionIDを取得して使用

2. 新規の場合: Person作成
   ├─ notionService.createPersonRecord()
   ├─ 作成成功: PersonのNotionIDを取得
   └─ 失敗: エラーログ、Person ID = null

3. Person検証（NotionIDがある場合のみ）
   ├─ notionService.findPersonByEmail()
   ├─ 失敗: 2秒待機 → 再検証
   └─ 最終失敗: 警告ログ、処理続行
```

#### 3.2.2 Contact処理（全問い合わせ）

```typescript
1. Contact作成
   ├─ notionService.createContactRecord(personNotionId)
   └─ PersonのNotionIDがあればリレーション設定

2. Contact検証
   ├─ notionService.findContactById()
   ├─ 失敗: 2秒待機 → 再検証
   └─ 最終失敗: notionSynced = false

3. 最終的同期状態判定
   ├─ Contact作成成功 AND Contact検証成功 AND Person検証成功
   │   → notionSynced = true
   └─ いずれか失敗
       → notionSynced = false（落穂拾い対象）
```

### 3.3 検証・リトライロジック

#### 3.3.1 Wait & Retry パターン

```typescript
async function verifyWithRetry<T>(
  verifyFn: () => Promise<T>,
  entityName: string,
  entityId: string
): Promise<T | null> {
  // 即座の検証
  let result = await verifyFn()
  if (result) return result

  // 2秒待機後の再検証
  console.warn(`${entityName} ${entityId} not yet queryable, waiting 2 seconds...`)
  await new Promise((resolve) => setTimeout(resolve, 2000))

  result = await verifyFn()
  if (result) {
    console.log(`${entityName} verified after wait`)
    return result
  }

  // 最終失敗
  console.error(`${entityName} ${entityId} still not queryable after wait`)
  return null
}
```

#### 3.3.2 検証失敗時の対応

- **Person検証失敗**: Contact作成は継続（PersonなしのContact）
- **Contact検証失敗**: `notionSynced: false`でマーク、落穂拾い対象

### 3.4 NotionAPI制限と対策

#### 3.4.1 既知の制限

- **Eventual Consistency**: 作成後すぐに検索できない場合がある
- **Rate Limiting**: API呼び出し頻度制限
- **Database Query Limitations**: 複雑な条件での検索制限

#### 3.4.2 対策

- 2秒間隔でのリトライ
- バッチ処理時の遅延制御
- 検証失敗時の後処理対応

## 4. Slack統合詳細仕様

### 4.1 Webhook API使用方針

#### 4.1.1 Webhook選択理由

- **設定の簡便性**: URLのみで設定完了
- **権限管理の簡素化**: Bot token/scope管理が不要
- **障害対応の容易さ**: 単純なHTTP POST

#### 4.1.2 制限事項の受容

- **メッセージID取得不可**: 後追い確認ができない
- **配信確認不可**: HTTP 200 = 受付確認のみ
- **メッセージ操作不可**: 編集・削除・リアクション不可

**受容理由**: Notionで詳細確認可能、通知としての役割は十分

### 4.2 通知内容設計

#### 4.2.1 情報の優先順位

1. **必須情報**: 名前、メールアドレス、問い合わせ種別
2. **重要情報**: メッセージ内容、受信日時
3. **補助情報**: システム識別情報

#### 4.2.2 フォーマット設計

```typescript
{
  text: '📧 新しい問い合わせが届きました',
  attachments: [{
    color: 'good',
    fields: [
      { title: '名前', value: contactData.name, short: true },
      { title: 'メールアドレス', value: contactData.email, short: true },
      { title: '問い合わせ種別', value: contactData.subject, short: true },
      { title: 'メッセージ', value: contactData.message, short: false },
      { title: '受信日時', value: formatDateTime(contactData.createdAt), short: true }
    ],
    footer: 'Portfolio Contact Form',
    ts: Math.floor(contactData.createdAt.getTime() / 1000).toString()
  }]
}
```

### 4.3 エラーハンドリング

#### 4.3.1 失敗パターンと対応

| 失敗原因           | 検出方法          | 対応                   |
| ------------------ | ----------------- | ---------------------- |
| URL未設定          | 初期化時          | 通知スキップ、ログ出力 |
| ネットワークエラー | HTTP例外          | エラーログ、処理続行   |
| Slack側エラー      | 4xx/5xx応答       | エラーログ、処理続行   |
| タイムアウト       | Promise rejection | エラーログ、処理続行   |

#### 4.3.2 Non-blocking原則

- いかなるSlack関連エラーもユーザー体験に影響させない
- 問い合わせ受付成功レスポンスを優先
- エラー詳細はログで追跡

## 5. 同期状態管理仕様

### 5.1 データベースフラグ設計

#### 5.1.1 `notionSynced`フラグ

```typescript
type NotionSyncStatus = boolean

// true: 完全同期完了
//   - Person存在確認 ✅
//   - Person作成・検証成功 ✅
//   - Contact作成・検証成功 ✅

// false: 落穂拾いが必要
//   - 初期作成失敗
//   - Person検証失敗
//   - Contact検証失敗
//   - API通信エラー
```

#### 5.1.2 `slackNotified`フラグ

```typescript
type SlackNotifyStatus = boolean

// true: Webhook呼び出し成功（HTTP 200）
// false: Webhook呼び出し失敗
```

#### 5.1.3 タイムスタンプ管理

```typescript
type ServiceTimestamps = {
  notionSyncedAt?: Date // Notion同期成功時刻
  slackNotifiedAt?: Date // Slack通知成功時刻
}
```

### 5.2 フラグ更新ロジック

#### 5.2.1 最終判定フロー

```typescript
function determineFinalSyncStatus(
  contactCreated: boolean,
  contactVerified: boolean,
  personVerified: boolean,
  isFirstTime: boolean
): boolean {
  // Contact作成失敗 → 即座にfalse
  if (!contactCreated) return false

  // Contact検証失敗 → false
  if (!contactVerified) return false

  // 初回 && Person検証失敗 → false
  if (isFirstTime && !personVerified) return false

  // 全て成功 → true
  return true
}
```

### 5.3 落穂拾い戦略

#### 5.3.1 対象レコード特定

```sql
SELECT * FROM contacts
WHERE notion_synced = false
ORDER BY created_at ASC
```

#### 5.3.2 復旧処理フロー

1. **Person存在確認**: `findPersonByEmail()`
2. **Person復旧**: 不存在時の再作成
3. **Contact存在確認**: `findContactById()`
4. **Contact復旧**: 不存在時の再作成
5. **リレーション確認**: Person-Contact間リンク
6. **最終検証**: 全体整合性チェック
7. **状態更新**: `notionSynced: true`に修正

## 6. 監視・可観測性

### 6.1 追跡すべき指標

#### 6.1.1 システム健全性指標

- **同期精度**: `(PostgreSQL件数 - 差分件数) / PostgreSQL件数 * 100`
- **落穂拾い待ち件数**: `COUNT(notion_synced = false)`
- **通知成功率**: `COUNT(slack_notified = true) / COUNT(*) * 100`

#### 6.1.2 パフォーマンス指標

- **Person検証成功率**: 即座の成功 vs 2秒後成功 vs 失敗
- **Contact検証成功率**: 即座の成功 vs 2秒後成功 vs 失敗
- **外部API応答時間**: Notion/Slack各種API呼び出し時間

### 6.2 利用可能レポート

#### 6.2.1 データ一致性レポート

```typescript
type DataMatchingReport = {
  postgres: { contacts: number; persons: number }
  notion: { contacts: number; persons: number; isConfigured: boolean }
  matching: {
    contactsMatch: boolean
    personsMatch: boolean
    contactsDifference: number
    personsDifference: number
  }
  summary: {
    isFullyMatched: boolean
    totalDiscrepancies: number
    syncAccuracy: number // 0-100%
  }
}
```

#### 6.2.2 期間別成功率レポート

- 日次/週次/月次の外部サービス成功率
- 時間帯別のAPI応答性能
- エラーパターン分析

## 7. 環境・設定管理

### 7.1 必須環境変数

#### 7.1.1 Notion関連

```bash
NOTION_API_TOKEN=secret_xxxxx          # Integration Token
NOTION_PARENT_PAGE_ID=xxxxxxx          # 親ページID
```

#### 7.1.2 Slack関連

```bash
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/xxx  # Webhook URL
```

### 7.2 テスト環境設定

#### 7.2.1 E2Eテスト用変数

```bash
# .env.e2e.local
ENABLE_REAL_API_TESTS=true
SLACK_TEST_WEBHOOK_URL=https://hooks.slack.com/services/test/xxx
NOTION_TEST_API_TOKEN=secret_test_xxxxx
NOTION_TEST_PARENT_PAGE_ID=test_database_id
```

#### 7.2.2 設定取得方法

1. Notion Database ID取得:
   - NotionでデータベースページのURLをコピー
   - `https://notion.so/{database_id}?v=...`の`{database_id}`部分を使用
2. Slack Webhook URL取得:
   - Slack App設定でIncoming Webhookを有効化
   - 生成されたWebhook URLを使用

## 8. 実装における注意事項

### 8.1 エラーハンドリング原則

- **ユーザー体験を最優先**: 外部サービスエラーでユーザー操作を失敗させない
- **詳細ログ記録**: 問題分析のための十分な情報を記録
- **Graceful Degradation**: 部分的機能停止でもコア機能は維持

### 8.2 パフォーマンス考慮事項

- **バッチ処理時の配慮**: 大量データ処理時のAPI制限対策
- **タイムアウト設定**: 適切なタイムアウト値での応答性確保
- **リソース管理**: メモリ・ネットワーク接続の適切な管理

### 8.3 セキュリティ要件

- **認証情報の保護**: 環境変数での機密情報管理
- **ログ出力の制御**: 個人情報・認証情報の漏洩防止
- **権限の最小化**: 必要最小限のAPI権限設定

## 9. 今後の拡張可能性

### 9.1 Slack Web API移行

将来的にメッセージID取得が必要になった場合：

- Bot tokenベースの認証追加
- チャンネルID管理の追加
- メッセージ更新・削除機能の実装

### 9.2 他外部サービス統合

- Discord通知
- Microsoft Teams統合
- Webhook形式での任意システム連携

### 9.3 リアルタイム同期

- Notion Webhook受信による双方向同期
- Slack Event APIによるリアルタイム状態更新
