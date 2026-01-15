import { describe, expect, it } from 'vitest'
import { create } from 'zustand'

import type { UISlice } from '../slices/ui-slice'
import { createUISlice } from '../slices/ui-slice'

// テスト用のストア作成
const createTestStore = () => create<UISlice>()(createUISlice)

describe('UI Slice (Simple)', () => {
  describe('メニュー状態管理', () => {
    it('初期状態でメニューが閉じている', () => {
      const store = createTestStore()
      const state = store.getState()

      expect(state.isMenuOpen).toBe(false)
    })

    it('setIsMenuOpenでメニューの開閉を設定できる', () => {
      const store = createTestStore()

      store.getState().setIsMenuOpen(true)
      expect(store.getState().isMenuOpen).toBe(true)

      store.getState().setIsMenuOpen(false)
      expect(store.getState().isMenuOpen).toBe(false)
    })

    it('toggleMenuでメニューの開閉を切り替えできる', () => {
      const store = createTestStore()

      expect(store.getState().isMenuOpen).toBe(false)

      store.getState().toggleMenu()
      expect(store.getState().isMenuOpen).toBe(true)

      store.getState().toggleMenu()
      expect(store.getState().isMenuOpen).toBe(false)
    })

    it('closeMenuでメニューを閉じることができる', () => {
      const store = createTestStore()

      // まずメニューを開く
      store.getState().setIsMenuOpen(true)
      expect(store.getState().isMenuOpen).toBe(true)

      // closeMenuでメニューを閉じる
      store.getState().closeMenu()
      expect(store.getState().isMenuOpen).toBe(false)
    })

    it('closeMenuは既に閉じているメニューに対しても安全に実行できる', () => {
      const store = createTestStore()

      expect(store.getState().isMenuOpen).toBe(false)

      store.getState().closeMenu()
      expect(store.getState().isMenuOpen).toBe(false)
    })
  })

  describe('スクロール状態管理', () => {
    it('初期状態でスクロールがfalse', () => {
      const store = createTestStore()
      const state = store.getState()

      expect(state.isScrolled).toBe(false)
    })

    it('setIsScrolledでスクロール状態を設定できる', () => {
      const store = createTestStore()

      store.getState().setIsScrolled(true)
      expect(store.getState().isScrolled).toBe(true)

      store.getState().setIsScrolled(false)
      expect(store.getState().isScrolled).toBe(false)
    })
  })

  describe('状態の独立性', () => {
    it('メニュー状態とスクロール状態は独立して管理される', () => {
      const store = createTestStore()

      // メニューを開く
      store.getState().setIsMenuOpen(true)
      expect(store.getState().isMenuOpen).toBe(true)
      expect(store.getState().isScrolled).toBe(false)

      // スクロール状態を変更
      store.getState().setIsScrolled(true)
      expect(store.getState().isMenuOpen).toBe(true)
      expect(store.getState().isScrolled).toBe(true)

      // メニューを閉じる
      store.getState().closeMenu()
      expect(store.getState().isMenuOpen).toBe(false)
      expect(store.getState().isScrolled).toBe(true)
    })
  })
})
