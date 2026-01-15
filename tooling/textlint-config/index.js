module.exports = {
  filters: {
    'node-types': {
      nodeTypes: ['Code', 'BlockQuote'],
    },
  },
  rules: {
    // 日本語技術文書の基本ルール（詳細設定）
    'textlint-rule-preset-ja-technical-writing': {
      // 一文の長さ制限
      'sentence-length': {
        max: 100,
      },
      // 漢字の連続制限
      'max-kanji-continuous-len': {
        max: 10,
      },
      // 助詞の連続使用制限
      'no-doubled-joshi': true,
      // 冗長な敬語表現の回避
      'no-doubled-conjunctive-particle-ga': true,
      // 半角カナの禁止
      'no-hankaku-kana': true,
      // 疑問符・感嘆符の統一
      'no-mixed-period': true,
      // 読点と句点の統一
      'ja-no-mixed-period': true,
      // 空白文字の統一
      'ja-no-space-between-full-width': true,
      // カタカナ語尾の統一
      'katakana-unify-long-vowel-mark': true,
      // 数字表記の統一
      'arabic-kanji-numbers': true,
      // 全角文字と半角文字の統一
      'no-mix-dearu-desumasu': true,
    },

    // AI生成テキスト特有の問題を検出
    '@textlint-ja/textlint-rule-preset-ai-writing': {
      // 機械的なリスト表現の検出
      'no-ai-list-formatting': true,
      // 誇張表現の抑制
      'no-ai-hyperbole': {
        severity: 2, // エラーレベルを警告からエラーに引き上げ
        allowWords: [], // 許可する例外単語を空に
        strictCheck: true, // より厳格なチェックを有効化
      },
      // 不自然な強調パターンの修正
      'no-ai-emphasis': true,
      // コロン使用法の改善
      'no-ai-colon-continuation': true,
      // 反復的な表現の検出
      'no-ai-repetitive-patterns': true,
    },

    // 表記ゆれ統一（専門用語辞書）
    prh: {
      rulePaths: [
        require('node:path').resolve(
          require('node:child_process')
            .execSync('git rev-parse --show-toplevel', { encoding: 'utf8' })
            .trim(),
          'tooling/textlint-config/prh-rules.yml'
        ),
      ],
    },
  },
}
