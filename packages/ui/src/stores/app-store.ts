import { create } from 'zustand'
import { persist, subscribeWithSelector } from 'zustand/middleware'

import type { FormSlice } from './slices/form-slice'
import type { UISlice } from './slices/ui-slice'
import { createFormSlice } from './slices/form-slice'
import { createUISlice } from './slices/ui-slice'

// 統合されたアプリケーション状態の型定義
export type AppState = UISlice & FormSlice

// 統合ストアの作成（スライシングパターン + SSR対応）
export const useAppStore = create<AppState>()(
  persist(
    subscribeWithSelector((...a) => ({
      ...createUISlice(...a),
      ...createFormSlice(...a),
    })),
    {
      name: 'app-store',
      storage:
        typeof window !== 'undefined'
          ? {
              getItem: (name) => {
                const value = localStorage.getItem(name)
                return value ? JSON.parse(value) : null
              },
              setItem: (name, value) => {
                localStorage.setItem(name, JSON.stringify(value))
              },
              removeItem: (name) => {
                localStorage.removeItem(name)
              },
            }
          : undefined,
      // SSR中はハイドレーションをスキップ
      skipHydration: true,
      // 永続化するステートを選択（isSubmittedなどの一時的な状態は除外）
      partialize: (state) =>
        Object.fromEntries(
          Object.entries(state).filter(
            ([key]) => !['isSubmitted', 'submitError', 'isMenuOpen'].includes(key)
          )
        ) as AppState,
    }
  )
)
