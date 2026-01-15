# セキュリティドキュメント

このディレクトリには、プロジェクトのセキュリティ関連ドキュメントが格納されています。

## エッジセキュリティシステム

### メインドキュメント

- **[edge-security-design.md](./edge-security-design.md)** - 全体アーキテクチャと設計思想
- **[edge-security-implementation.md](./edge-security-implementation.md)** - 実装仕様とファイル構成
- **[edge-security-operations.md](./edge-security-operations.md)** - 運用ガイドとトラブルシューティング
- **[redis-key-design.md](./redis-key-design.md)** - Redisキー設計とセキュリティルール詳細

### 開発経緯

- **[edge-security-development-log.md](./edge-security-development-log.md)** - 検討・設計・実装の全過程記録

## セキュリティガイドライン

### 開発ルール

- **[security-development-rules.md](./security-development-rules.md)** - 開発時のセキュリティルール
- **[security-guide.md](./security-guide.md)** - 一般的なセキュリティガイド

### プラットフォーム固有

- **[vercel-security-coverage.md](./vercel-security-coverage.md)** - Vercelセキュリティカバレッジ分析

## 攻撃パターン分析

**[attacks/](./attacks/)** ディレクトリには、各種攻撃パターンの分析と対策が格納されています：

- **[ddos-attacks.md](./attacks/ddos-attacks.md)** - DDoS攻撃の分析と対策
- **[bot-attacks.md](./attacks/bot-attacks.md)** - Bot攻撃の分析と対策
- **[api-attacks.md](./attacks/api-attacks.md)** - API攻撃の分析と対策
- **[auth-attacks.md](./attacks/auth-attacks.md)** - 認証攻撃の分析と対策
- **[injection-attacks.md](./attacks/injection-attacks.md)** - インジェクション攻撃の分析と対策

## 実装優先度

### Phase 1（必須）

1. Next.js Middleware実装
2. Upstash Redis設定とレート制限
3. Bot検出機能
4. 認証失敗連続監視
5. セキュリティヘッダー設定
6. 入力検証・サニタイゼーション強化

### Phase 2（拡張）

- 詳細な統計・分析機能
- 高度な攻撃パターン検出
- 地理的制限機能

## 関連ドキュメント

- **[../CLAUDE.local.md](../CLAUDE.local.md)** - 実装進捗と決定事項の記録
- **[../architecture/](../architecture/)** - システムアーキテクチャ全般
- **[../specifications/](../specifications/)** - 各機能の詳細仕様
