import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { AppState } from '../app-store'
import { useAppStore } from '../app-store'

// localStorageをモック
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value.toString()
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      store = {}
    }),
    // zustand persist middlewareが期待するプロパティ
    length: 0,
    key: vi.fn((index: number) => null),
  }
})()

// DOM環境のシミュレーション
if (typeof window === 'undefined') {
  // @ts-ignore
  global.window = {}
}

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})

describe('App Store (統合ストア) - Simple', () => {
  beforeEach(() => {
    // localStorageをクリア
    localStorageMock.clear()
    vi.clearAllMocks()

    // 各テスト前にストア状態をリセット
    const store = useAppStore.getState()
    store.setIsMenuOpen(false)
    store.setIsScrolled(false)
    store.setIsSubmitted(false)
    store.clearSubmitError()
  })

  describe('ストア統合', () => {
    it('UISliceとFormSliceが統合されている', () => {
      const state = useAppStore.getState()

      // UISliceの状態が存在する
      expect(state.isMenuOpen).toBeDefined()
      expect(state.isScrolled).toBeDefined()
      expect(typeof state.toggleMenu).toBe('function')
      expect(typeof state.closeMenu).toBe('function')
      expect(typeof state.setIsScrolled).toBe('function')

      // FormSliceの状態が存在する
      expect(state.isSubmitted).toBeDefined()
      expect(state.submitError).toBeDefined()
      expect(typeof state.setIsSubmitted).toBe('function')
      expect(typeof state.resetSubmitted).toBe('function')
      expect(typeof state.setSubmitError).toBe('function')
      expect(typeof state.clearSubmitError).toBe('function')
    })

    it('統合ストアの初期状態が正しい', () => {
      const state = useAppStore.getState()

      // UISliceの初期状態
      expect(state.isMenuOpen).toBe(false)
      expect(state.isScrolled).toBe(false)

      // FormSliceの初期状態
      expect(state.isSubmitted).toBe(false)
      expect(state.submitError).toBeNull()
    })

    it('異なるスライスの状態が独立して動作する', () => {
      const store = useAppStore

      // UI状態を変更
      store.getState().toggleMenu()
      store.getState().setIsScrolled(true)

      // Form状態を変更
      store.getState().setIsSubmitted(true)
      store.getState().setSubmitError('テストエラー')

      // すべての状態が正しく設定されている
      expect(store.getState().isMenuOpen).toBe(true)
      expect(store.getState().isScrolled).toBe(true)
      expect(store.getState().isSubmitted).toBe(true)
      expect(store.getState().submitError).toBe('テストエラー')

      // UI状態をリセット
      store.getState().closeMenu()
      store.getState().setIsScrolled(false)

      // UI状態のみリセットされ、Form状態は保持される
      expect(store.getState().isMenuOpen).toBe(false)
      expect(store.getState().isScrolled).toBe(false)
      expect(store.getState().isSubmitted).toBe(true)
      expect(store.getState().submitError).toBe('テストエラー')
    })
  })

  describe('状態更新の通知', () => {
    it('状態変更時にサブスクライバーに通知される', () => {
      const store = useAppStore
      const mockCallback = vi.fn()

      // サブスクライブ
      const unsubscribe = store.subscribe(mockCallback)

      // 状態を変更
      store.getState().toggleMenu()

      // コールバックが呼ばれることを確認
      expect(mockCallback).toHaveBeenCalled()

      // クリーンアップ
      unsubscribe()
    })

    it('状態の読み取りが正しく動作する', () => {
      const store = useAppStore

      // 初期状態を確認
      expect(store.getState().isMenuOpen).toBe(false)
      expect(store.getState().isScrolled).toBe(false)

      // 状態を変更
      store.getState().toggleMenu()
      store.getState().setIsScrolled(true)

      // 変更後の状態を確認
      expect(store.getState().isMenuOpen).toBe(true)
      expect(store.getState().isScrolled).toBe(true)
    })
  })

  describe('型安全性', () => {
    it('AppState型が正しく統合されている', () => {
      const state = useAppStore.getState()

      // TypeScript型チェックが通ることを確認
      const typedState: AppState = state

      // UI関連のプロパティ
      const isMenuOpen: boolean = typedState.isMenuOpen
      const isScrolled: boolean = typedState.isScrolled

      // Form関連のプロパティ
      const isSubmitted: boolean = typedState.isSubmitted
      const submitError: string | null = typedState.submitError

      // 型が正しく推論されることを確認
      expect(typeof isMenuOpen).toBe('boolean')
      expect(typeof isScrolled).toBe('boolean')
      expect(typeof isSubmitted).toBe('boolean')
      expect(submitError === null || typeof submitError === 'string').toBe(true)
    })
  })

  describe('パフォーマンス特性', () => {
    it('状態の部分的な取得が可能', () => {
      const store = useAppStore

      // UI状態のみを取得
      const uiState = {
        isMenuOpen: store.getState().isMenuOpen,
        isScrolled: store.getState().isScrolled,
      }

      // Form状態のみを取得
      const formState = {
        isSubmitted: store.getState().isSubmitted,
        submitError: store.getState().submitError,
      }

      expect(uiState.isMenuOpen).toBe(false)
      expect(uiState.isScrolled).toBe(false)
      expect(formState.isSubmitted).toBe(false)
      expect(formState.submitError).toBeNull()
    })

    it('複数の状態変更を効率的に処理できる', () => {
      const store = useAppStore
      const mockCallback = vi.fn()

      const unsubscribe = store.subscribe(mockCallback)

      // 複数の状態を一度に変更
      const state = store.getState()
      state.setIsMenuOpen(true)
      state.setIsScrolled(true)
      state.setIsSubmitted(true)
      state.setSubmitError('テストエラー')

      // 通知が適切に処理されることを確認
      expect(mockCallback).toHaveBeenCalled()

      // 最終状態を確認
      expect(store.getState().isMenuOpen).toBe(true)
      expect(store.getState().isScrolled).toBe(true)
      expect(store.getState().isSubmitted).toBe(true)
      expect(store.getState().submitError).toBe('テストエラー')

      unsubscribe()
    })
  })
})
