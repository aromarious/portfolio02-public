/**
 * 許可されるコミットメッセージの例:
 *
 * ✅ 良い例:
 * - ✨ feat: add user authentication feature
 * - 🐛 fix: fix memory leak in user service
 * - ♻️ refactor: refactor database connection logic
 * - 📝 docs: update API documentation
 * - ✅ test: add unit tests for user repository
 * - ⚡ perf: improve query performance
 * - ⏪ revert: revert previous commit changes
 * - 💄 style: format code with prettier
 * - 👷 build: update webpack configuration
 * - 💚 ci: update GitHub Actions workflow
 * - 🚧 wip: work in progress on payment module
 * - 🔧 chore: update dependencies
 * - 🌍 env: add production environment variables
 *
 * ❌ 悪い例:
 * - feat: add user authentication feature (絵文字なし)
 * - feat: ✨ Add User Authentication Feature (subject が大文字)
 * - ✨ FEAT: add user authentication feature (大文字タイプ)
 * - ✨ update: add new feature (許可されていないタイプ)
 * - ✨ feat: Add User Authentication Feature (subject が大文字)
 */

import type { UserConfig } from '@commitlint/types'

export const name = 'commitlint'

const config: UserConfig = {
  name,
  extends: ['gitmoji'],
  parserPreset: 'conventional-changelog-gitmoji-config',
  rules: {
    /**
     * header-max-length: GitHubで省略されない文字数制限
     * 72文字を超えるとGitHubで「...」で省略される
     */
    'header-max-length': [2, 'always', 72],
    /**
     * type-enum: コミットタイプの制限ルール
     * [エラーレベル, 適用条件, 許可されるタイプの配列]
     * エラーレベル: 0=無効, 1=警告, 2=エラー（コミット拒否）
     * 適用条件: 'always'=常に適用, 'never'=適用しない
     */
    'type-enum': [
      2, // エラーレベル: 違反時はコミットを拒否
      'always', // 常にこのルールを適用
      [
        'feat', // ✨ 新機能の追加
        'fix', // 🐛 バグ修正
        'refactor', // ♻️ リファクタリング（機能変更なし）
        'docs', // 📝 ドキュメントの追加・更新
        'test', // ✅ テストの追加・修正
        'perf', // ⚡ パフォーマンス改善
        'revert', // ⏪ 以前のコミットの取り消し
        'style', // 💄 コードフォーマット・スタイル修正
        'build', // 👷 ビルドシステム・外部依存関係の変更
        'ci', // 💚 CI設定ファイルやスクリプトの変更
        'wip', // 🚧 作業中（Work In Progress）
        'chore', // 🔧 その他のメンテナンス作業
        'env', // 🌍 環境設定・環境変数の変更（カスタム追加）
      ],
    ],
    /**
     * subject-case: コミットメッセージ件名のケース制限を無効化
     * gitmojiプリセットと競合するため無効にする
     */
    'subject-case': [0],
  },
}

export default config

// 設定を追加したければオーバーライドしてもよい
// export default {
//   ...config,
//   rules: {
//     ...config.rules,
//     // ここに追加のルールを定義できます
//   },
// } as UserConfig
