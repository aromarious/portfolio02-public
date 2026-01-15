/**
 * Polyfills for older browsers
 * iOS Safari 13.4未満対応
 */

// String.prototype.matchAll polyfill for iOS Safari 13.4未満
if (!String.prototype.matchAll) {
  String.prototype.matchAll = function (regexp: RegExp) {
    if (!regexp.global) {
      throw new TypeError('String.prototype.matchAll called with a non-global RegExp argument')
    }

    const str = this.toString()
    const matches: RegExpExecArray[] = []
    let match: RegExpExecArray | null

    // RegExpの状態をリセット
    regexp.lastIndex = 0

    // biome-ignore lint/suspicious/noAssignInExpressions: polyfill implementation requires assignment in expression
    while ((match = regexp.exec(str)) !== null) {
      // matchをコピーして、indexを確実に数値にする
      const matchCopy = [...match] as RegExpExecArray
      matchCopy.index = match.index ?? 0
      matchCopy.input = match.input ?? str
      matchCopy.groups = match.groups

      matches.push(matchCopy)

      // 無限ループ防止
      if (match.index === regexp.lastIndex) {
        regexp.lastIndex++
      }
    }

    return matches[Symbol.iterator]()
  }
}

// その他の必要なpolyfillがあれば追加
export {}
