# Dependabot手動確認ガイド

## 概要

このドキュメントは、Dependabotが作成したPRのうち、自動マージされないものを手動で確認する際の手順書です。

## 自動マージされないPR

以下のPRは手動確認が必要です：

### プロダクト依存関係

- **minor/major アップデート**: API変更の可能性
- **セキュリティ関連**: zod、@upstash/redis など
- **コア依存**: Next.js、React など

### 開発ツール

- **major アップデート**: ビルド・テスト設定変更の可能性
- **Breaking Changes**: 設定ファイル変更が必要

## 手動確認の手順

### 1. PR内容の確認

```bash
# PR詳細を確認
gh pr view PR番号

# 変更内容を確認
gh pr diff PR番号
```

**チェックポイント**:

- バージョン変更の種類（patch/minor/major）
- Breaking Changes の有無
- CHANGELOG やリリースノートの確認

### 2. 影響範囲の分析

```bash
# 依存関係の使用箇所を確認
grep -r "import.*パッケージ名" . --include="*.ts" --include="*.js"
grep -r "from.*パッケージ名" . --include="*.ts" --include="*.js"

# 型定義の使用確認（TypeScript）
grep -r "パッケージ固有の記号" . --include="*.ts"
```

**例：Zod の場合**

```bash
grep -r "import.*zod" . --include="*.ts" --include="*.js"
grep -r "from.*zod" . --include="*.ts" --include="*.js"
grep -r "z\." . --include="*.ts"  # Zod スキーマ定義
```

### 3. 安全なブランチでテスト

```bash
# PRブランチをチェックアウト
gh pr checkout PR番号

# または
git fetch origin pull/PR番号/head:test-branch
git checkout test-branch
```

### 4. 包括的テスト実行

```bash
# 基本テスト
pnpm test

# ビルド確認
pnpm build

# 型チェック・lint
pnpm lint

# カバレッジ確認
pnpm test:coverage
```

### 5. 実際の使用例でテスト

新しいテストケースを追加して互換性を確認：

```typescript
// edge-security/__tests__/dependency-compatibility.test.ts
import { 新しいバージョンのパッケージ } from 'パッケージ名'

describe('依存関係 v新バージョン 互換性', () => {
  test('既存のAPIが動作する', () => {
    // 既存コードと同じ使用方法でテスト
    expect(() => 既存の使用方法()).not.toThrow()
  })

  test('新機能が利用可能', () => {
    // 新機能のテスト（必要に応じて）
  })
})
```

### 6. Breaking Changes の具体的確認

#### リリースノート確認

```bash
# GitHub リリースページを確認
open https://github.com/作者/パッケージ名/releases/tag/v新バージョン

# npm パッケージページを確認
open https://www.npmjs.com/package/パッケージ名
```

#### Migration Guide の確認

- 公式ドキュメントのマイグレーションガイド
- Breaking Changes の詳細
- 推奨される対応方法

### 7. 段階的マージ戦略

#### A. 安全確認後にマージ

```bash
gh pr merge PR番号 --squash
```

#### B. 問題発見時はクローズ

```bash
gh pr close PR番号 --comment "互換性問題発見: 詳細は#issue番号"
```

#### C. 部分的対応が必要な場合

```bash
gh pr checkout PR番号
# 必要な修正を追加
git add . && git commit -m "fix: パッケージ名 v新バージョン compatibility"
git push
```

## 具体的な確認例

### Zod 4.0.5 アップデート確認

```bash
# 1. リリースノート確認
# Breaking Changes:
# - `.parse()` error format changed
# - `.refine()` behavior updated

# 2. 影響箇所特定
grep -r "\.parse\|\.refine\|\.safeParse" edge-security/

# 3. テストケース追加
# __tests__/zod-v4-compatibility.test.ts
describe('Zod v4 compatibility', () => {
  test('existing schema validation works', () => {
    const schema = z.object({
      path: z.string(),
      method: z.enum(['GET', 'POST'])
    })

    expect(() => schema.parse({ path: '/api', method: 'GET' })).not.toThrow()
  })

  test('error handling still works', () => {
    const schema = z.string()
    const result = schema.safeParse(123)
    expect(result.success).toBe(false)
  })
})

# 4. 動作確認
pnpm test
pnpm build

# 5. 問題なければマージ
```

### Redis 5.6.0 アップデート確認

```bash
# 1. 使用箇所確認
grep -r "redis\|Redis" edge-security/ --include="*.ts"

# 2. 接続・操作メソッド確認
grep -r "\.get\|\.set\|\.zadd\|\.zcount" edge-security/

# 3. 実際の Redis 操作テスト
# __tests__/redis-v5-compatibility.test.ts で確認

# 4. 型定義の互換性確認
pnpm lint
```

### @types/node 24.0.14 アップデート確認

```bash
# 1. Node.js API使用箇所確認
grep -r "process\|Buffer\|setTimeout" edge-security/ --include="*.ts"

# 2. 型チェック
pnpm lint

# 3. ビルド確認
pnpm build

# 4. 型定義の変更確認
# TypeScript コンパイラエラーがないか確認
```

## 問題発生時の対応

### ロールバック

```bash
# 直前のコミットを取り消し
git revert HEAD

# 特定のコミットを取り消し
git revert コミットハッシュ
```

### 部分的修正

```bash
# 修正ブランチを作成
git checkout -b fix/dependency-compatibility

# 修正実装
# ...

# コミット
git add .
git commit -m "fix: 依存関係 v新バージョン compatibility issues"

# プルリクエスト作成
gh pr create --title "fix: 依存関係互換性修正" --body "依存関係更新に伴う互換性問題を修正"
```

## 利用者への影響を考慮

### パッケージ提供者として

- **利用者環境でのテスト**: 様々な環境での動作確認
- **互換性マトリックス**: 対応バージョン範囲の更新
- **ドキュメント更新**: 新しい依存関係要件の明記

### peerDependencies の更新

```json
{
  "peerDependencies": {
    "zod": "^3.0.0 || ^4.0.0",
    "redis": "^4.0.0 || ^5.0.0"
  }
}
```

### CHANGELOG の更新

```markdown
## [Unreleased]

### Changed

- Update zod from 3.25.76 to 4.0.5
- Update redis from 4.7.1 to 5.6.0

### Breaking Changes

- Zod v4 のエラーフォーマット変更に対応
- Redis v5 の新しいAPI使用
```

## 緊急時の対応

### 本番環境での問題発生

```bash
# 1. 即座にロールバック
git revert HEAD
git push origin main

# 2. hotfix ブランチ作成
git checkout -b hotfix/dependency-issue

# 3. 修正・テスト
# ...

# 4. 緊急マージ
gh pr create --title "hotfix: 依存関係緊急修正"
```

### 利用者からの問題報告

1. **問題の再現**: 報告された環境での確認
2. **原因特定**: 依存関係更新との関連確認
3. **修正方針決定**: ロールバック vs 修正
4. **迅速な対応**: 問題解決とコミュニケーション

## まとめ

手動確認が必要なDependabot PRは「**利用者に影響する可能性が高い**」ものです。以下の原則で対応します：

1. **慎重な確認**: テスト・ビルド・実際の使用例での確認
2. **段階的対応**: 問題発見時は無理にマージしない
3. **利用者視点**: パッケージ提供者として利用者環境への影響を考慮
4. **迅速な対応**: 問題発生時は素早くロールバック・修正

この手順に従うことで、安全で信頼性の高い依存関係管理が可能になります。
