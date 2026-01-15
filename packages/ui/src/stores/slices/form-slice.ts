import type { StateCreator } from 'zustand'

export interface FormSlice {
  // フォーム送信状態
  isSubmitted: boolean
  setIsSubmitted: (isSubmitted: boolean) => void
  resetSubmitted: () => void

  // フォーム送信エラー状態
  submitError: string | null
  setSubmitError: (error: string | null) => void
  clearSubmitError: () => void
}

export const createFormSlice: StateCreator<FormSlice> = (set) => ({
  // フォーム送信状態の初期値と操作
  isSubmitted: false,
  setIsSubmitted: (isSubmitted) => set({ isSubmitted }),
  resetSubmitted: () => set({ isSubmitted: false }),

  // フォーム送信エラー状態の初期値と操作
  submitError: null,
  setSubmitError: (error) => set({ submitError: error }),
  clearSubmitError: () => set({ submitError: null }),
})
