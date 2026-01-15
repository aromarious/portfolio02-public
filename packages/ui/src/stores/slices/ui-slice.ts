import type { StateCreator } from 'zustand'

export interface UISlice {
  // メニュー状態
  isMenuOpen: boolean
  setIsMenuOpen: (isOpen: boolean) => void
  toggleMenu: () => void
  closeMenu: () => void

  // スクロール状態
  isScrolled: boolean
  setIsScrolled: (isScrolled: boolean) => void

  // Heroセクション通過状態
  isHeroPassed: boolean
  setIsHeroPassed: (isPassed: boolean) => void
}

export const createUISlice: StateCreator<UISlice> = (set) => ({
  // メニュー状態の初期値と操作
  isMenuOpen: false,
  setIsMenuOpen: (isOpen) => set({ isMenuOpen: isOpen }),
  toggleMenu: () => set((state) => ({ isMenuOpen: !state.isMenuOpen })),
  closeMenu: () => set({ isMenuOpen: false }),

  // スクロール状態の初期値と操作
  isScrolled: false,
  setIsScrolled: (isScrolled) => set({ isScrolled }),

  // Heroセクション通過状態の初期値と操作
  isHeroPassed: false,
  setIsHeroPassed: (isPassed) => set({ isHeroPassed: isPassed }),
})
