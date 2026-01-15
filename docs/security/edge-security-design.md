# エッジセキュリティ設計ドキュメント

## 概要

Next.js 15 Middleware を使用したエッジセキュリティシステムの設計。Arcjet風の宣言的設定API、LIVE/DRY_RUNモード、高性能な判定順序を特徴とする。

## アーキテクチャ

### 全体構成

```
Next.js Middleware
├── SecurityEngine (実行エンジン)
├── SecurityRules (ルール定義)
├── SecurityConfig (宣言的設定)
└── SecurityLogger (ログ・監視)

外部サービス
├── Upstash Redis (レート制限)
├── Slack Webhook (アラート)
└── Vercel Logs (本番ログ)
```

### 判定順序とパフォーマンス最適化

#### 1. パスベースの除外判定（最速）

- 静的リソース（`/_next/static`, `/_next/image`, `favicon.ico`, 画像ファイル）
- コスト: ほぼゼロ（文字列マッチング）
- 目的: 不要な処理を最初に除外

#### 2. 軽量判定をまとめて実行

- 空User-Agent拒否
- Bot名称検出（known-bot-patterns）
- Accept-Language未設定拒否
- コスト: 低（全て文字列マッチング、ヘッダー読み取りのみ）
- 目的: 明らかな攻撃を早期に検出

#### 3. IP別レート制限（Redis操作）

- 一般リクエスト: 100req/min
- 認証系リクエスト: 10req/min
- API系リクエスト: 50req/min
- コスト: 中（Redis読み書き）
- 目的: 大量アクセス攻撃の防御

#### 4. 認証失敗連続監視（条件付きRedis操作）

- 認証系エンドポイント（`/api/auth/`）のみ対象
- 5回失敗で5分間遮断
- コスト: 中（条件付きRedis操作）
- 目的: ブルートフォース攻撃の防御

### 判定順序の論理的根拠

1. **パフォーマンス優先**: 最も軽量な判定を最初に実行
2. **早期リターン**: 不要な処理を避けてレスポンス時間を短縮
3. **コスト効率**: Redis操作は必要最小限に抑制
4. **セキュリティ重要度**: 攻撃対象を特定してから詳細判定を実行

## 宣言的設定API設計

### 設定構造

```typescript
const securityConfig = createSecurityConfig({
  mode: 'LIVE' | 'DRY_RUN',
  rules: [
    // レート制限ルール
    rateLimit({
      name: 'general',
      window: '1m',
      max: 100,
      keyGenerator: (req) => getClientIP(req),
      skip: (req) => isStaticResource(req),
    }),

    rateLimit({
      name: 'auth',
      window: '1m',
      max: 10,
      keyGenerator: (req) => getClientIP(req),
      matcher: (req) => req.nextUrl.pathname.startsWith('/api/auth'),
    }),

    rateLimit({
      name: 'api',
      window: '1m',
      max: 50,
      keyGenerator: (req) => getClientIP(req),
      matcher: (req) => req.nextUrl.pathname.startsWith('/api'),
    }),

    // Bot検出ルール
    botProtection({
      mode: 'LIVE',
      rules: ['empty-user-agent', 'known-bot-patterns', 'no-accept-language'],
      allowList: ['googlebot', 'bingbot'],
    }),

    // 認証失敗監視
    authFailureProtection({
      maxAttempts: 5,
      windowMs: 60000,
      blockDurationMs: 300000,
      matcher: (req) => req.nextUrl.pathname.startsWith('/api/auth'),
    }),
  ],
})
```

### ルール定義の特徴

- **name**: ルールの識別子（ログ・監視で使用）
- **mode**: 'LIVE' または 'DRY_RUN'
- **matcher**: 適用条件（パス、ヘッダー等）
- **skip**: 除外条件（静的リソース等）
- **keyGenerator**: レート制限キーの生成方法

## LIVE/DRY_RUN運用モデル

### DRY_RUNモード

- **目的**: 本番運用前のテスト・調整
- **動作**: 判定結果をログ出力するが、実際にはブロックしない
- **用途**: 閾値調整、誤検知の確認、影響範囲の把握

### LIVEモード

- **目的**: 本番運用でのセキュリティ防御
- **動作**: 判定結果に基づいて実際にリクエストをブロック
- **用途**: 攻撃の実際の防御

### 切り替え方法

#### 環境変数による制御

```bash
# 開発・テスト環境
SECURITY_MODE=DRY_RUN

# 本番環境
SECURITY_MODE=LIVE
```

#### ルール別の制御

```typescript
// 特定のルールのみDRY_RUNで検証
botProtection({
  mode: 'DRY_RUN',  // このルールのみテスト
  rules: ['empty-user-agent'],
}),

rateLimit({
  mode: 'LIVE',     // このルールは本番運用
  name: 'general',
  max: 100,
}),
```

## 実行エンジン設計

### SecurityEngine

```typescript
interface SecurityEngine {
  protect(req: NextRequest): Promise<SecurityResult>
}

interface SecurityResult {
  allow: boolean
  reason?: string
  rule?: string
  metadata?: Record<string, any>
}
```

### 実行フロー

1. **設定読み込み**: 環境変数とルール設定を読み込み
2. **ルール順次実行**: 判定順序に従ってルールを実行
3. **条件判定**: matcher/skip条件でルール適用を制御
4. **結果判定**:
   - DRY_RUN: ログ出力のみ、処理継続
   - LIVE: ブロック判定時は即座に停止
5. **レスポンス**: 最終的な許可/拒否判定を返す

### エラーハンドリング

- **Redis接続エラー**: レート制限を無効化、警告ログ出力
- **設定エラー**: 起動時に検証、不正な設定は拒否
- **外部サービス障害**: 機能を無効化、代替手段へ切り替え

## ログ・監視システム設計

### ログ出力戦略

#### 開発環境

- **出力先**: ローカルファイル + console.log
- **レベル**: debug（全詳細）
- **形式**: JSON構造化ログ

#### 本番環境

- **出力先**: Vercel Logs + Slack重要通知
- **レベル**: info（重要イベントのみ）
- **形式**: JSON構造化ログ

### 監視機能

#### CLI監視ツール

```bash
# リアルタイム監視
pnpm security:watch

# 統計レポート
pnpm security:stats --window=1h

# ルール別分析
pnpm security:analyze --rule=bot-protection

# 設定テスト
pnpm security:test-config
```

#### 監視API

- **エンドポイント**: `/api/security/stats`
- **認証**: 環境変数トークンによる保護
- **データ**: 統計情報、DRY_RUN結果、リアルタイム状況

### アラート設定

#### 重要度別通知

- **高**: 大量攻撃検知、システム異常
- **中**: 設定変更、閾値超過
- **低**: 日次統計、定期レポート

#### 通知チャネル

- **Slack**: 重要イベントのリアルタイム通知
- **ログファイル**: 全イベントの詳細記録
- **CLI**: 開発者向けリアルタイム監視

## セキュリティ仕様

### 対象攻撃

#### 対応する攻撃

- **HTTP Flood**: レート制限による防御
- **POST攻撃**: APIレート制限による防御
- **Bot攻撃**: User-Agent、Accept-Language検証
- **ブルートフォース**: 認証失敗連続監視

#### 対応しない攻撃

- **UDP, SYN, ICMP**: Vercel Firewallによる自動DDoS軽減機能に委託
- **Slowloris**: 完全対処困難、今回は対応しない
- **複雑な行動分析**: 実装コストが高く、今回は対応しない

### 設定可能な閾値

#### レート制限

- **一般リクエスト**: 100req/min（調整可能）
- **認証リクエスト**: 10req/min（調整可能）
- **APIリクエスト**: 50req/min（調整可能）

#### 認証失敗監視

- **失敗回数閾値**: 5回（調整可能）
- **監視期間**: 1分（調整可能）
- **遮断期間**: 5分（調整可能）

#### Bot検出

- **空User-Agent**: 即座に拒否
- **既知Bot名**: 設定可能リスト
- **Accept-Language未設定**: 拒否

## 拡張性・保守性

### 新ルール追加

```typescript
// 新しいセキュリティルール
customProtection({
  name: 'geo-blocking',
  matcher: (req) => isBlockedCountry(req),
  execute: async (req) => {
    // カスタム判定ロジック
  },
})
```

### 設定の階層化

- **全体設定**: 共通のmode、logging設定
- **ルール設定**: 個別のルール固有設定
- **環境設定**: 開発/本番環境別の設定

### テスト戦略

- **単体テスト**: 各ルールの動作テスト
- **統合テスト**: SecurityEngineの動作テスト
- **負荷テスト**: 大量リクエスト時の性能確認
- **セキュリティテスト**: 実際の攻撃パターンでのテスト

## 次のステップ

1. **実装仕様書の作成**: 詳細な実装仕様を定義
2. **運用ガイドの作成**: 実際の運用手順を整理
3. **プロトタイプ実装**: 核心機能の実装・検証
4. **テスト・調整**: DRY_RUNモードでの動作確認
5. **本番運用**: LIVEモードでの段階的導入
