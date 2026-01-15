# E2Eテスト基盤実装計画

## 概要

ARO-94: E2Eテスト基盤実装とシナリオ作成のタスクリストと実装計画

## 実装フェーズ

### Phase 1: 基盤構築

- [ ] Playwright設定とブラウザテスト環境構築
- [ ] テストデータベース分離（E2E専用環境）
- [ ] External API テスト用アカウント・環境設定
- [ ] テスト実行後のクリーンアップ機能

### Phase 2: テストシナリオ実装

- [ ] Contact Form送信フローE2Eテスト
  - フォーム入力→送信→成功メッセージ表示
  - Database への保存確認
  - Notion DB 連携確認（テスト環境）
  - Slack 通知送信確認（テスト環境）
- [ ] エラーハンドリングE2Eテスト
  - 無効データ送信時の適切なエラー表示
  - External API 障害時の Graceful Degradation

### Phase 3: CI/CD方針策定

**Unit Test専用CI/CD**: 高速・安定・シンプルなパイプライン

- [ ] 既存CI/CDからE2E除外確認
- [ ] Unit Test CI/CD最適化（目標: ~110秒）
  - `pnpm lint` (~30秒)
  - `pnpm typecheck` (~15秒)
  - `pnpm test:unit` (~5秒)
  - `pnpm build` (~60秒)

**E2E Test**: ローカル実行専用

- [ ] ローカル実行コマンド整備（`pnpm test:e2e`）
- [ ] 開発ワークフロー文書化

## 技術要件

### Playwright環境構築

- 依存関係追加：`@playwright/test`, `playwright`
- ブラウザドライバー自動管理
- ヘッドレス・ヘッドフルモード切り替え

### テスト環境分離

- E2E専用PostgreSQLコンテナ（ポート5434）
- 独立した環境変数設定（`.env.e2e.local`）
- テストデータの自動生成・クリーンアップ

### External API テスト環境

- Slack Test Webhook設定
- Notion Test Database設定
- 本番環境と完全分離

## 期待される成果

- 本番環境同等の動作保証（ローカル環境）
- リグレッション検出能力向上
- 開発効率とコード品質の向上
- シンプルで高速なCI/CDパイプライン維持
- デプロイ前手動検証プロセス確立

## 受け入れ条件

- Contact Form の完全なE2Eフローがローカルで自動テスト可能
- Unit Test CI/CD パイプラインが高速実行（~110秒）
- テスト環境とプロダクション環境の完全分離
- E2E実行コマンドが整備され、開発ワークフローに組み込み済み
