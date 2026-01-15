# Redis Key Design and Security Rules

エッジセキュリティシステムのRedisキー設計とセキュリティルール実装の包括的ドキュメント

## 🗂️ Redisキー設計パターン

### 階層的命名規則

**基本パターン**: `security:<機能カテゴリ>:<識別子>`

### キーカテゴリ別パターン

#### 1. レート制限キー
```
security:ratelimit:{type}:{identifier}
```
**例**: `security:ratelimit:path:/api/auth:192.168.1.100`

- **type**: `path` (パス別制限)
- **identifier**: `{パス}:{IP}` の組み合わせ
- **データ構造**: String (カウンタ)
- **TTL**: 時間窓に応じて動的設定

#### 2. 認証失敗追跡キー
```
security:authfail:{ip}
```
**例**: `security:authfail:192.168.1.100`

- **データ構造**: String (JSON)
- **内容**: 失敗回数、最終失敗時刻、ロック状態
- **TTL**: ロックアウト期間に応じて設定

#### 3. Bot検知キー

**タイミング分析**:
```
security:timing:{ip}
```

**行動分析**:
```
security:behavior:{ip}
```

**フィンガープリント**:
```
security:fingerprint:{ip}
```

- **データ構造**: String (JSON)
- **TTL**: 3600秒 (1時間)

#### 4. DDoS防護キー

**IP別**:
```
security:ddos:{ip}
```

**グローバル**:
```
security:ddos:global
```

**パス別**:
```
security:ddos:path:{normalizedPath}
```

**メソッド別**:
```
security:ddos:method:{method}:{ip}
```

- **データ構造**: Sorted Set (時系列データ)
- **TTL**: 監視時間窓に応じて動的設定

#### 5. イベントログキー

**個別イベント**:
```
security:event:{eventId}
```

**イベントリスト**:
```
security:events
```

- **データ構造**: String (JSON) / List
- **TTL**: 86400秒 (24時間)

#### 6. メトリクスキー

**統計データ**:
```
security:metrics
```

**日別統計**:
```
security:stats:{date}
```

- **データ構造**: Hash (複数カウンタ)
- **TTL**: 86400秒 (24時間)

## 🚫 セキュリティ制限設定

### 1. レート制限（パス別）

```typescript
rateLimit: {
  // デフォルト制限 (全パス)
  default: { windowMs: 60_000, max: 100 },    // 1分間に100回
  
  // パス別制限 (エンドポイント別戦略)
  paths: {
    '/api/auth': { windowMs: 300_000, max: 5 },    // 5分間に5回 (厳格)
    '/api/cron': { windowMs: 60_000, max: 2 },     // 1分間に2回 (超厳格)
    '/api/trpc': { windowMs: 60_000, max: 50 },    // 1分間に50回 (通常)
  }
}
```

**特徴**:
- **最長マッチング**: より具体的なパスが優先される
- **IP別カウント**: 各IPアドレスで独立してカウント
- **時間窓ベース**: 指定時間内でのリクエスト数を制限

### 2. 認証失敗防御

```typescript
authFailure: {
  paths: {
    '/api/cron': { 
      maxAttempts: 3,           // 最大失敗回数
      lockoutDuration: 1_800_000 // 30分ロック (ミリ秒)
    }
  }
}
```

**機能**:
- **段階的ロックアウト**: 失敗回数に応じてロック時間延長
- **IP別追跡**: IPアドレス単位での失敗回数管理
- **自動解除**: TTL期限でロック自動解除

### 3. Bot検知 (5つのルール)

```typescript
bot: {
  // ハニーポット (隠しフィールドでBot検知)
  honeypot: { fieldName: 'website' },
  
  // User-Agent検査 (疑わしいUser-Agentをブロック)
  userAgent: { 
    suspicious: ['bot', 'crawler', 'spider', 'scraper', 'wget', 'curl'] 
  },
  
  // タイミング解析 (リクエスト間隔分析)
  timing: { 
    minMs: 1_000,     // 最小間隔 (1秒未満はBot疑い)
    maxMs: 300_000    // 最大間隔 (5分以上は人間疑い)
  }
}
```

**検知ルール**:
1. **ハニーポット**: 隠しフィールド入力検知
2. **User-Agent**: 疑わしいUser-Agent文字列
3. **タイミング分析**: リクエスト間隔の異常検知
4. **行動分析**: アクセスパターンの分析
5. **フィンガープリント**: ブラウザ特性の整合性

### 4. DDoS防護 (4つのスコープ)

```typescript
ddos: {
  threshold: 200,      // 閾値 (1分間に200回以上でDDoS疑い)
  windowMs: 60_000,    // 監視時間窓 (1分間)
}
```

**検知スコープ**:
1. **IP別検知**: 単一IPからの大量リクエスト
2. **グローバル検知**: 全体的なトラフィック急増
3. **パス別検知**: 特定エンドポイントへの集中攻撃
4. **メソッド別検知**: 特定HTTPメソッドの濫用

## 🕒 TTL戦略

### 短期TTL (秒〜分単位)

- **Bot タイミング**: 300秒 (5分)
- **DDoS検知**: 時間窓に応じて動的設定
- **レート制限**: 時間窓終了時に自動削除

### 中期TTL (時間単位)

- **認証失敗**: ロックアウト期間に応じて設定
- **Bot行動分析**: 3600秒 (1時間)
- **Bot フィンガープリント**: 3600秒 (1時間)

### 長期TTL (日単位)

- **セキュリティイベント**: 86400秒 (24時間)
- **メトリクス**: 86400秒 (24時間)
- **統計データ**: 86400秒 (24時間)

## 📊 データ構造使い分け

### String型 (JSON格納)

**用途**: 複雑なオブジェクト保存
- 認証失敗データ
- Bot行動分析
- セキュリティイベント

**例**:
```json
{
  "attempts": 2,
  "lastFailure": 1751673365807,
  "locked": false
}
```

### Sorted Set (時系列データ)

**用途**: 時間窓ベースの攻撃検知
- DDoS検知
- 時系列アクセスパターン分析

**例**:
```
ZADD security:ddos:192.168.1.100 1751673365807 "request_1751673365807"
```

### Hash (複数カウンタ)

**用途**: メトリクス収集
- セキュリティ統計
- パフォーマンス指標

**例**:
```
HSET security:metrics totalRequests 1000 blockedRequests 50
```

### List (イベントログ)

**用途**: 時系列順イベント追跡
- セキュリティイベント履歴
- 監査ログ

**例**:
```
LPUSH security:events '{"type":"RATE_LIMIT","ip":"192.168.1.100"}'
```

## 🎯 技術的特徴

### 階層的セキュリティレイヤー

**4段階のセキュリティチェック**:
1. **レート制限** - 基本的な頻度制御
2. **認証失敗追跡** - 段階的ロックアウト
3. **Bot検知** - 5つのルールによる総合判定
4. **DDoS防護** - 4つのスコープでの検知

### パス別最長マッチング

```typescript
const matchedPath = Object.keys(rateLimit.paths)
  .filter(path => context.path.startsWith(path))
  .sort((a, b) => b.length - a.length)[0] // 最も長いパスを選択
```

### Edge Runtime対応

- **Upstash Redis REST API**: TCP接続不要
- **5秒タイムアウト**: Edge環境での安定性
- **Fail-open設計**: Redis障害時もサービス継続

## 🔧 監視・運用ツール

### リアルタイム監視

```bash
# セキュリティイベント表示
pnpm security:events

# メトリクス表示  
pnpm security:metrics

# リアルタイム監視
pnpm security:watch

# Redis キー確認
pnpm redis:keys

# 特定キー値取得
pnpm redis:get <key>
```

### 設定管理

**環境変数での動的制御**:
- `SECURITY_MODE`: `DRY_RUN` / `LIVE`
- `SLACK_SECURITY_WEBHOOK`: Slack通知設定
- `KV_REST_API_URL` / `KV_REST_API_TOKEN`: Redis接続

**設定駆動型設計**:
- `security.config.ts`でのパラメータ調整
- 環境別設定の切り替え
- ホットリロード対応

## 📈 スケーラビリティ設計

### 効率的なキー分散

- **IP別分散**: ホットキー問題の回避
- **パス別分離**: リソース最適化
- **時間窓ベース**: 自動クリーンアップ

### メモリ効率

- **適切なTTL**: 不要データの自動削除
- **データ構造最適化**: 用途別最適な構造選択
- **圧縮**: JSON文字列での効率的格納

## 🛡️ セキュリティ考慮事項

### プライバシー保護

- **IPアドレスハッシュ化**: 必要に応じてハッシュ化検討
- **データ保持期間**: 適切なTTL設定
- **ログ記録**: 必要最小限の情報のみ

### 攻撃耐性

- **キー予測困難**: セキュアなキー設計
- **レート制限回避対策**: 複数指標での検知
- **偽装対策**: フィンガープリンティング

---

**最終更新**: 2025-01-05  
**実装状況**: 本番デプロイ準備完了