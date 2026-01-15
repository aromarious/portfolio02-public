import { describe, expect, it } from 'vitest'
import { create } from 'zustand'

import type { FormSlice } from '../slices/form-slice'
import { createFormSlice } from '../slices/form-slice'

// テスト用のストア作成
const createTestStore = () => create<FormSlice>()(createFormSlice)

describe('Form Slice (Simple)', () => {
  describe('フォーム送信状態管理', () => {
    it('初期状態で送信状態がfalse', () => {
      const store = createTestStore()
      const state = store.getState()

      expect(state.isSubmitted).toBe(false)
    })

    it('setIsSubmittedで送信状態を設定できる', () => {
      const store = createTestStore()

      store.getState().setIsSubmitted(true)
      expect(store.getState().isSubmitted).toBe(true)

      store.getState().setIsSubmitted(false)
      expect(store.getState().isSubmitted).toBe(false)
    })

    it('resetSubmittedで送信状態をリセットできる', () => {
      const store = createTestStore()

      // まず送信状態をtrueにする
      store.getState().setIsSubmitted(true)
      expect(store.getState().isSubmitted).toBe(true)

      // リセット実行
      store.getState().resetSubmitted()
      expect(store.getState().isSubmitted).toBe(false)
    })

    it('resetSubmittedは既にfalseの状態でも安全に実行できる', () => {
      const store = createTestStore()

      expect(store.getState().isSubmitted).toBe(false)

      store.getState().resetSubmitted()
      expect(store.getState().isSubmitted).toBe(false)
    })
  })

  describe('フォーム送信エラー状態管理', () => {
    it('初期状態でエラーがnull', () => {
      const store = createTestStore()
      const state = store.getState()

      expect(state.submitError).toBeNull()
    })

    it('setSubmitErrorでエラーメッセージを設定できる', () => {
      const store = createTestStore()
      const errorMessage = '送信に失敗しました'

      store.getState().setSubmitError(errorMessage)
      expect(store.getState().submitError).toBe(errorMessage)
    })

    it('setSubmitErrorでnullを設定してエラーをクリアできる', () => {
      const store = createTestStore()
      const errorMessage = 'ネットワークエラー'

      // エラーを設定
      store.getState().setSubmitError(errorMessage)
      expect(store.getState().submitError).toBe(errorMessage)

      // nullでクリア
      store.getState().setSubmitError(null)
      expect(store.getState().submitError).toBeNull()
    })

    it('clearSubmitErrorでエラーをクリアできる', () => {
      const store = createTestStore()
      const errorMessage = 'バリデーションエラー'

      // エラーを設定
      store.getState().setSubmitError(errorMessage)
      expect(store.getState().submitError).toBe(errorMessage)

      // clearSubmitErrorでクリア
      store.getState().clearSubmitError()
      expect(store.getState().submitError).toBeNull()
    })

    it('clearSubmitErrorは既にnullの状態でも安全に実行できる', () => {
      const store = createTestStore()

      expect(store.getState().submitError).toBeNull()

      store.getState().clearSubmitError()
      expect(store.getState().submitError).toBeNull()
    })

    it('複数の異なるエラーメッセージを順次設定できる', () => {
      const store = createTestStore()
      const firstError = '最初のエラー'
      const secondError = '2番目のエラー'

      store.getState().setSubmitError(firstError)
      expect(store.getState().submitError).toBe(firstError)

      store.getState().setSubmitError(secondError)
      expect(store.getState().submitError).toBe(secondError)
    })
  })

  describe('状態の独立性', () => {
    it('送信状態とエラー状態は独立して管理される', () => {
      const store = createTestStore()
      const errorMessage = 'テストエラー'

      // エラーを設定
      store.getState().setSubmitError(errorMessage)
      expect(store.getState().submitError).toBe(errorMessage)
      expect(store.getState().isSubmitted).toBe(false)

      // 送信状態をtrueにする
      store.getState().setIsSubmitted(true)
      expect(store.getState().submitError).toBe(errorMessage)
      expect(store.getState().isSubmitted).toBe(true)

      // エラーをクリア
      store.getState().clearSubmitError()
      expect(store.getState().submitError).toBeNull()
      expect(store.getState().isSubmitted).toBe(true)

      // 送信状態をリセット
      store.getState().resetSubmitted()
      expect(store.getState().submitError).toBeNull()
      expect(store.getState().isSubmitted).toBe(false)
    })
  })

  describe('典型的な使用フロー', () => {
    it('フォーム送信成功フローをシミュレート', () => {
      const store = createTestStore()

      // 初期状態確認
      expect(store.getState().isSubmitted).toBe(false)
      expect(store.getState().submitError).toBeNull()

      // エラーをクリア（送信前）
      store.getState().clearSubmitError()

      // 送信成功
      store.getState().setIsSubmitted(true)
      store.getState().clearSubmitError()

      expect(store.getState().isSubmitted).toBe(true)
      expect(store.getState().submitError).toBeNull()

      // 3秒後にリセット（setTimeout相当）
      store.getState().resetSubmitted()

      expect(store.getState().isSubmitted).toBe(false)
      expect(store.getState().submitError).toBeNull()
    })

    it('フォーム送信エラーフローをシミュレート', () => {
      const store = createTestStore()
      const errorMessage = '送信に失敗しました。もう一度お試しください。'

      // 初期状態確認
      expect(store.getState().isSubmitted).toBe(false)
      expect(store.getState().submitError).toBeNull()

      // エラーをクリア（送信前）
      store.getState().clearSubmitError()

      // 送信エラー
      store.getState().setSubmitError(errorMessage)

      expect(store.getState().isSubmitted).toBe(false)
      expect(store.getState().submitError).toBe(errorMessage)

      // 再送信前にエラークリア
      store.getState().clearSubmitError()

      expect(store.getState().isSubmitted).toBe(false)
      expect(store.getState().submitError).toBeNull()
    })
  })
})
