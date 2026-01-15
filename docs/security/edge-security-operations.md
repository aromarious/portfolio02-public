# エッジセキュリティ運用ガイド

## 運用概要

エッジセキュリティシステムのDRY_RUN→LIVE移行、監視、トラブルシューティングの実用的なガイド。

## 環境設定

### 必要な環境変数

```bash
# .env.local
# セキュリティ設定
SECURITY_MODE=DRY_RUN                    # DRY_RUN または LIVE

# Redis設定（Upstash）
KV_REST_API_URL=https://your-redis-url
KV_REST_API_TOKEN=your-redis-token

# Slack通知（任意）
SLACK_SECURITY_WEBHOOK=https://hooks.slack.com/services/...
```

### Redis設定手順

1. **Upstash アカウント作成**

   - https://upstash.com でアカウント作成
   - Redis データベース作成
   - REST API credentials取得

2. **接続テスト**
   ```bash
   # Redis接続確認
   curl -H "Authorization: Bearer YOUR_TOKEN" \
        "https://YOUR_REDIS_URL/ping"
   ```

## 段階的導入手順

### Phase 1: DRY_RUN開始

1. **設定確認**

   ```bash
   # 設定ファイル確認
   cat security.config.ts
   
   # 環境変数確認
   echo $SECURITY_MODE
   echo $KV_REST_API_URL
   ```

2. **DRY_RUN開始**

   ```bash
   # 環境変数設定
   SECURITY_MODE=DRY_RUN

   # 開発サーバー起動
   pnpm dev
   ```

3. **監視開始**
   ```bash
   # 別ターミナルで監視
   pnpm security:watch
   ```

### Phase 2: データ収集・分析

1. **24時間のデータ収集**

   - 通常のトラフィックパターンを観察
   - 誤検知の有無を確認
   - 攻撃パターンの検出確認

2. **統計分析**

   ```bash
   # セキュリティイベント確認
   pnpm security:events

   # メトリクス確認
   pnpm security:metrics
   
   # Redisデータ確認
   pnpm redis:keys
   ```

3. **閾値調整**
   - 誤検知が多い場合は閾値を調整
   - `security.config.ts`で設定変更
   - 再度DRY_RUNで検証

### Phase 3: LIVE移行

1. **LIVE移行**

   ```bash
   # security.config.tsでモード変更
   mode: 'LIVE'  // DRY_RUNから変更
   
   # または環境変数で制御
   SECURITY_MODE=LIVE
   ```

2. **本番監視**
   ```bash
   # 本番環境での監視
   pnpm security:watch
   
   # メトリクス定期確認
   pnpm security:metrics
   ```

## 監視・分析

### CLI監視ツール

#### 実装済みコマンド

```bash
# リアルタイム監視
pnpm security:watch

# セキュリティイベント表示
pnpm security:events

# メトリクス表示
pnpm security:metrics

# セキュリティデータクリア
pnpm security:clear

# Redis操作
pnpm redis:keys           # Redis キー一覧
pnpm redis:get <key>      # 特定キー値取得
```

#### 監視データの確認方法

```bash
# 最近のセキュリティイベント確認
pnpm security:events

# 統計データ確認
pnpm security:metrics

# 特定Redisキーの内容確認
pnpm redis:get "security:ratelimit:path:/api/auth:192.168.1.100"
pnpm redis:get "security:metrics"
```

### セキュリティデータの理解

#### TTL (Time To Live) について

**TTL**とは、Redisでデータが自動削除されるまでの時間（秒）です。

```bash
# TTL確認例
pnpm redis:get "security:ratelimit:path:/api/auth:192.168.1.100"
# → レート制限データ（windowMs後に自動削除）

pnpm redis:get "security:authfail:192.168.1.100" 
# → 認証失敗データ（lockoutDuration後に自動削除）

pnpm redis:get "security:timing:192.168.1.100"
# → Bot検知データ（1時間後に自動削除）
```

#### 主要なTTL設定

- **レート制限**: 60-300秒（時間窓に応じて）
- **認証失敗**: 30分-1時間（ロック期間に応じて）
- **Bot検知**: 1-5分（分析期間に応じて）
- **セキュリティイベント**: 24時間
- **メトリクス**: 24時間

## 設定調整

### レート制限調整

```typescript
// security.config.ts
rateLimit: {
  default: { windowMs: 60_000, max: 150 },    // ← 調整：100→150に増加
  paths: {
    '/api/auth': { windowMs: 300_000, max: 10 },    // ← 調整：5→10に増加
    '/api/cron': { windowMs: 60_000, max: 2 },
    '/api/trpc': { windowMs: 60_000, max: 80 },     // ← 調整：50→80に増加
  }
}
```

### Bot検出調整

```typescript
// security.config.ts
bot: {
  honeypot: { fieldName: 'website' },
  userAgent: { 
    suspicious: [
      'bot', 'crawler', 'spider', 'scraper', 
      // 'wget', 'curl'  // ← 開発ツールを許可する場合は削除
    ]
  },
  timing: { 
    minMs: 500,      // ← 調整：1000→500に緩和
    maxMs: 300_000 
  }
}
```

### 認証失敗調整

```typescript
// security.config.ts
authFailure: {
  paths: {
    '/api/cron': { 
      maxAttempts: 5,           // ← 調整：3→5に増加
      lockoutDuration: 900_000  // ← 調整：30分→15分に短縮
    }
  }
}
```

## アラート設定

### Slack通知設定

1. **Slack Webhook作成**

   - Slack App作成
   - Incoming Webhook設定
   - Webhook URL取得

2. **通知レベル設定**

   ```bash
   # 重要なイベントのみ通知
   SLACK_SECURITY_WEBHOOK=https://hooks.slack.com/services/...
   ```
   
   ```typescript
   // security.config.ts
   logging: {
     level: 'INFO',
     slack: {
       webhook: process.env.SLACK_SECURITY_WEBHOOK,
       levels: ['ERROR']  // ERROR レベルのみ通知
     }
   }
   ```

3. **通知内容**
   - 大量アクセス検知
   - 新しい攻撃パターン
   - システムエラー
   - 設定変更

### アラート条件

#### 高重要度（即座に通知）

- 認証失敗連続ブロック
- 大量Bot攻撃検知
- Redis接続エラー
- セキュリティシステム障害

#### 中重要度（1時間毎に通知）

- レート制限超過
- 新規攻撃パターン
- 設定変更

#### 低重要度（日次レポート）

- 統計サマリー
- 定期健全性チェック

## トラブルシューティング

### よくある問題

#### 1. Redis接続エラー

```
Error: Redis connection failed
```

**解決方法:**

1. 環境変数確認

   ```bash
   echo $KV_REST_API_URL
   echo $KV_REST_API_TOKEN
   ```

2. 手動接続テスト

   ```bash
   curl -H "Authorization: Bearer $KV_REST_API_TOKEN" \
        "$KV_REST_API_URL/ping"
   ```

3. Fallback動作確認
   - Redis無効時はレート制限が無効になる
   - 警告ログが出力される

#### 2. 誤検知が多い

```
Too many legitimate requests blocked
```

**解決方法:**

1. DRY_RUNで分析

   ```bash
   # セキュリティイベント確認
   pnpm security:events
   
   # 特定IPの状況確認
   pnpm redis:get "security:ratelimit:path:/api/auth:192.168.1.100"
   ```

2. 閾値調整

   - レート制限: max値を増加
   - Bot検出: suspicious配列から除外
   - 認証失敗: maxAttemptsを増加

3. 段階的調整
   - security.config.tsで設定変更
   - DRY_RUNで再検証

#### 3. パフォーマンス低下

```
Request response time increased
```

**解決方法:**

1. 監視データ確認

   ```bash
   # メトリクス確認
   pnpm security:metrics
   
   # X-Processing-Timeヘッダーで処理時間確認
   curl -I http://localhost:3200/
   ```

2. 最適化確認

   - middleware.tsの処理時間ログを確認
   - Redis操作のタイムアウト設定を確認

3. 一時的無効化
   ```bash
   # 緊急時：セキュリティチェックを無効化
   SECURITY_MODE=DRY_RUN
   ```

#### 4. Redisメモリ使用量増加

```
Redis memory usage high
```

**解決方法:**

1. Redisデータ確認

   ```bash
   # 現在のキー確認
   pnpm redis:keys
   
   # 特定キーのデータサイズ確認
   pnpm redis:get "security:metrics"
   ```

2. 古いデータクリア

   ```bash
   # セキュリティデータ全クリア（注意して実行）
   pnpm security:clear
   ```

3. TTL設定の確認
   - 各キーのTTLが適切に設定されているか確認
   - 大量のキーが蓄積されていないか確認

### 緊急時対応

#### セキュリティシステム全体無効化

```bash
# 緊急時：全セキュリティ無効
SECURITY_MODE=DISABLED

# または middleware.ts を一時的にリネーム
mv middleware.ts middleware.ts.disabled
```

#### 特定IPの緊急遮断

```bash
# Redis で手動ブロック
redis-cli -u $KV_REST_API_URL \
  SET "emergency_block:1.2.3.4" "1" EX 3600
```

#### 攻撃中の緊急対応

1. **攻撃パターン確認**

   ```bash
   # リアルタイム監視
   pnpm security:watch
   
   # セキュリティイベント確認
   pnpm security:events
   ```

2. **一時的な厳格化**

   ```bash
   # security.config.ts でレート制限を厳格化
   # max値を半分に設定して再デプロイ
   ```

3. **攻撃源の特定**
   ```bash
   # 特定IPのRedisデータ確認
   pnpm redis:get "security:ddos:192.168.1.100"
   pnpm redis:get "security:ratelimit:path:/api/auth:192.168.1.100"
   ```

## 定期メンテナンス

### 日次作業

```bash
# セキュリティ状況確認
pnpm security:events
pnpm security:metrics

# Redis状況確認
pnpm redis:keys
```

### 週次作業

```bash
# 設定ファイル確認
cat security.config.ts

# 長期間のRedisデータクリア（必要に応じて）
pnpm security:clear
```

### 月次作業

```bash
# 環境変数確認
echo $SECURITY_MODE
echo $KV_REST_API_URL

# セキュリティ設定見直し
# - security.config.tsの閾値調整
# - 攻撃パターンの変化に応じた調整
```

## 本番運用チェックリスト

### 導入前チェック

- [ ] Redis接続確認
- [ ] 環境変数設定完了
- [ ] DRY_RUNでの動作確認
- [ ] 24時間のデータ収集完了
- [ ] 誤検知の確認・調整完了
- [ ] 監視体制整備完了
- [ ] 緊急時対応手順確認完了

### 導入後チェック

- [ ] LIVE移行完了
- [ ] 監視正常動作確認
- [ ] アラート正常動作確認
- [ ] パフォーマンス影響確認
- [ ] ログ出力確認
- [ ] 統計データ確認

### 継続監視項目

- [ ] 攻撃検知状況
- [ ] 誤検知発生状況
- [ ] システムパフォーマンス
- [ ] Redis使用量
- [ ] ログファイルサイズ
