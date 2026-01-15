import React from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useAppStore } from '../../stores/app-store'
import Header from '../Header'

// Zustandストアをモック
vi.mock('../../stores/app-store', () => ({
  useAppStore: vi.fn(),
}))

const mockUseAppStore = vi.mocked(useAppStore)

// アイコンコンポーネントをモック
vi.mock('lucide-react', () => ({
  Github: vi.fn(() => <div data-testid="github-icon" />),
  Mail: vi.fn(() => <div data-testid="mail-icon" />),
  Menu: vi.fn(() => <div data-testid="menu-icon" />),
  X: vi.fn(() => <div data-testid="x-icon" />),
}))

vi.mock('../icons/ZennIcon', () => ({
  default: vi.fn(() => <div data-testid="zenn-icon" />),
}))

// useAppStoreのモック関数群
const mockToggleMenu = vi.fn()
const mockCloseMenu = vi.fn()
const mockSetIsScrolled = vi.fn()

describe('Header Component', () => {
  beforeEach(() => {
    // Global window オブジェクトをモック
    Object.defineProperty(global, 'window', {
      value: {
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        scrollY: 0,
      },
      writable: true,
    })

    // スクロールイベントリスナーをモック
    Object.defineProperty(window, 'addEventListener', {
      value: vi.fn(),
      writable: true,
    })
    Object.defineProperty(window, 'removeEventListener', {
      value: vi.fn(),
      writable: true,
    })
    Object.defineProperty(window, 'scrollY', {
      value: 0,
      writable: true,
    })

    vi.clearAllMocks()

    // useAppStoreモックのデフォルト設定
    mockUseAppStore.mockReturnValue({
      isMenuOpen: false,
      isScrolled: false,
      toggleMenu: mockToggleMenu,
      closeMenu: mockCloseMenu,
      setIsScrolled: mockSetIsScrolled,
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('基本レンダリング', () => {
    it('ヘッダーが正しくレンダリングされる', () => {
      render(<Header />)

      expect(screen.getByText('Aromarious Portfolio')).toBeInTheDocument()
    })

    it('ナビゲーションメニューが表示される', () => {
      mockUseAppStore.mockReturnValue({
        isMenuOpen: false,
        isScrolled: false,
        toggleMenu: mockToggleMenu,
        closeMenu: mockCloseMenu,
        setIsScrolled: mockSetIsScrolled,
      })

      render(<Header />)

      expect(screen.getByText('About')).toBeInTheDocument()
      expect(screen.getByText('Projects')).toBeInTheDocument()
      expect(screen.getByText('Skills')).toBeInTheDocument()
      expect(screen.getByText('Experience')).toBeInTheDocument()
      expect(screen.getByText('Contact')).toBeInTheDocument()
    })

    it('ソーシャルアイコンが表示される', () => {
      mockUseAppStore.mockReturnValue({
        isMenuOpen: false,
        isScrolled: false,
        toggleMenu: mockToggleMenu,
        closeMenu: mockCloseMenu,
        setIsScrolled: mockSetIsScrolled,
      })

      render(<Header />)

      expect(screen.getAllByTestId('github-icon')).toHaveLength(1) // デスクトップのみ（モバイルメニューは閉じている）
      expect(screen.getAllByTestId('zenn-icon')).toHaveLength(1)
      expect(screen.getAllByTestId('mail-icon')).toHaveLength(1)
    })
  })

  describe('スクロール状態管理', () => {
    it('非スクロール状態で透明な背景を表示', () => {
      mockUseAppStore.mockReturnValue({
        isMenuOpen: false,
        isScrolled: false,
        toggleMenu: mockToggleMenu,
        closeMenu: mockCloseMenu,
        setIsScrolled: mockSetIsScrolled,
      })

      render(<Header />)

      const header = screen.getByRole('banner')
      expect(header).toHaveClass('bg-transparent')
      expect(header).not.toHaveClass('bg-white/90')
      expect(header).not.toHaveClass('shadow-lg')
      expect(header).not.toHaveClass('backdrop-blur-md')
    })

    it('スクロール状態で背景とエフェクトを表示', () => {
      mockUseAppStore.mockReturnValue({
        isMenuOpen: false,
        isScrolled: true,
        toggleMenu: mockToggleMenu,
        closeMenu: mockCloseMenu,
        setIsScrolled: mockSetIsScrolled,
      })

      render(<Header />)

      const header = screen.getByRole('banner')
      expect(header).toHaveClass('bg-white/90')
      expect(header).toHaveClass('shadow-lg')
      expect(header).toHaveClass('backdrop-blur-md')
      expect(header).not.toHaveClass('bg-transparent')
    })

    it('スクロールイベントリスナーが正しく設定される', () => {
      mockUseAppStore.mockReturnValue({
        isMenuOpen: false,
        isScrolled: false,
        toggleMenu: mockToggleMenu,
        closeMenu: mockCloseMenu,
        setIsScrolled: mockSetIsScrolled,
      })

      render(<Header />)

      // addEventListener が 'scroll' イベントで呼ばれることを確認
      expect(window.addEventListener).toHaveBeenCalledWith('scroll', expect.any(Function))
    })

    it('コンポーネントアンマウント時にイベントリスナーが削除される', () => {
      mockUseAppStore.mockReturnValue({
        isMenuOpen: false,
        isScrolled: false,
        toggleMenu: mockToggleMenu,
        closeMenu: mockCloseMenu,
        setIsScrolled: mockSetIsScrolled,
      })

      const { unmount } = render(<Header />)
      unmount()

      // removeEventListener が呼ばれることを確認
      expect(window.removeEventListener).toHaveBeenCalledWith('scroll', expect.any(Function))
    })

    it('スクロール量が50px以上でsetIsScrolled(true)が呼ばれる', () => {
      mockUseAppStore.mockReturnValue({
        isMenuOpen: false,
        isScrolled: false,
        toggleMenu: mockToggleMenu,
        closeMenu: mockCloseMenu,
        setIsScrolled: mockSetIsScrolled,
      })

      render(<Header />)

      // スクロールイベントハンドラーを取得
      const scrollHandler = (window.addEventListener as any).mock.calls.find(
        (call: any) => call[0] === 'scroll'
      )[1]

      // window.scrollY を 60px に設定
      Object.defineProperty(window, 'scrollY', { value: 60, writable: true })

      act(() => {
        scrollHandler()
      })

      expect(mockSetIsScrolled).toHaveBeenCalledWith(true)
    })

    it('スクロール量が50px未満でsetIsScrolled(false)が呼ばれる', () => {
      mockUseAppStore.mockReturnValue({
        isMenuOpen: false,
        isScrolled: true,
        toggleMenu: mockToggleMenu,
        closeMenu: mockCloseMenu,
        setIsScrolled: mockSetIsScrolled,
      })

      render(<Header />)

      // スクロールイベントハンドラーを取得
      const scrollHandler = (window.addEventListener as any).mock.calls.find(
        (call: any) => call[0] === 'scroll'
      )[1]

      // window.scrollY を 30px に設定
      Object.defineProperty(window, 'scrollY', { value: 30, writable: true })

      act(() => {
        scrollHandler()
      })

      expect(mockSetIsScrolled).toHaveBeenCalledWith(false)
    })
  })

  describe('モバイルメニュー機能', () => {
    it('メニューが閉じている時にMenuアイコンを表示', () => {
      mockUseAppStore.mockReturnValue({
        isMenuOpen: false,
        isScrolled: false,
        toggleMenu: mockToggleMenu,
        closeMenu: mockCloseMenu,
        setIsScrolled: mockSetIsScrolled,
      })

      render(<Header />)

      expect(screen.getByTestId('menu-icon')).toBeInTheDocument()
      expect(screen.queryByTestId('x-icon')).not.toBeInTheDocument()
    })

    it('メニューが開いている時にXアイコンを表示', () => {
      mockUseAppStore.mockReturnValue({
        isMenuOpen: true,
        isScrolled: false,
        toggleMenu: mockToggleMenu,
        closeMenu: mockCloseMenu,
        setIsScrolled: mockSetIsScrolled,
      })

      render(<Header />)

      expect(screen.getByTestId('x-icon')).toBeInTheDocument()
      expect(screen.queryByTestId('menu-icon')).not.toBeInTheDocument()
    })

    it('ハンバーガーメニューボタンクリックでtoggleMenuが呼ばれる', () => {
      mockUseAppStore.mockReturnValue({
        isMenuOpen: false,
        isScrolled: false,
        toggleMenu: mockToggleMenu,
        closeMenu: mockCloseMenu,
        setIsScrolled: mockSetIsScrolled,
      })

      render(<Header />)

      const menuButton = screen.getByRole('button')
      fireEvent.click(menuButton)

      expect(mockToggleMenu).toHaveBeenCalledTimes(1)
    })

    it('メニューが開いている時にモバイルメニューを表示', () => {
      mockUseAppStore.mockReturnValue({
        isMenuOpen: true,
        isScrolled: false,
        toggleMenu: mockToggleMenu,
        closeMenu: mockCloseMenu,
        setIsScrolled: mockSetIsScrolled,
      })

      render(<Header />)

      // モバイルメニュー内のナビゲーション要素を確認
      const mobileMenuContainer = screen.getByRole('banner')
      expect(mobileMenuContainer).toBeInTheDocument()

      // モバイルメニュー内のリンクを確認（デスクトップメニューと別）
      const allAboutLinks = screen.getAllByText('About')
      expect(allAboutLinks.length).toBeGreaterThan(1) // デスクトップ + モバイル
    })

    it('メニューが閉じている時にモバイルメニューを非表示', () => {
      mockUseAppStore.mockReturnValue({
        isMenuOpen: false,
        isScrolled: false,
        toggleMenu: mockToggleMenu,
        closeMenu: mockCloseMenu,
        setIsScrolled: mockSetIsScrolled,
      })

      render(<Header />)

      // モバイルメニューのスタイルクラスが適用されていないことを確認
      const mobileMenuContainer = screen.getByRole('banner')
      expect(mobileMenuContainer.innerHTML).not.toMatch(/mt-2 rounded-lg bg-white\/95/)
    })

    it('モバイルメニュー項目クリックでcloseMenuが呼ばれる', () => {
      mockUseAppStore.mockReturnValue({
        isMenuOpen: true,
        isScrolled: false,
        toggleMenu: mockToggleMenu,
        closeMenu: mockCloseMenu,
        setIsScrolled: mockSetIsScrolled,
      })

      render(<Header />)

      // モバイルメニュー内のAboutリンクをクリック（複数あるので最後の要素を取得）
      const aboutLinks = screen.getAllByText('About')
      const mobileAboutLink = aboutLinks[aboutLinks.length - 1]
      fireEvent.click(mobileAboutLink!)

      expect(mockCloseMenu).toHaveBeenCalledTimes(1)
    })
  })

  describe('Zustandストア統合', () => {
    it('useAppStoreから正しい状態とアクションを取得', () => {
      const mockStoreState = {
        isMenuOpen: true,
        isScrolled: true,
        toggleMenu: mockToggleMenu,
        closeMenu: mockCloseMenu,
        setIsScrolled: mockSetIsScrolled,
      }
      mockUseAppStore.mockReturnValue(mockStoreState)

      render(<Header />)

      // useAppStoreが呼ばれることを確認
      expect(useAppStore).toHaveBeenCalled()
    })

    it('ストア状態の変更に応じてUIが更新される', () => {
      // 最初は閉じた状態
      mockUseAppStore.mockReturnValue({
        isMenuOpen: false,
        isScrolled: false,
        toggleMenu: mockToggleMenu,
        closeMenu: mockCloseMenu,
        setIsScrolled: mockSetIsScrolled,
      })

      const { rerender } = render(<Header />)
      expect(screen.getByTestId('menu-icon')).toBeInTheDocument()

      // 開いた状態に変更
      mockUseAppStore.mockReturnValue({
        isMenuOpen: true,
        isScrolled: false,
        toggleMenu: mockToggleMenu,
        closeMenu: mockCloseMenu,
        setIsScrolled: mockSetIsScrolled,
      })

      rerender(<Header />)
      expect(screen.getByTestId('x-icon')).toBeInTheDocument()
    })
  })

  describe('アクセシビリティ', () => {
    it('ヘッダーにbannerロールが適用されている', () => {
      mockUseAppStore.mockReturnValue({
        isMenuOpen: false,
        isScrolled: false,
        toggleMenu: mockToggleMenu,
        closeMenu: mockCloseMenu,
        setIsScrolled: mockSetIsScrolled,
      })

      render(<Header />)

      expect(screen.getByRole('banner')).toBeInTheDocument()
    })

    it('メニューボタンにtype="button"が設定されている', () => {
      mockUseAppStore.mockReturnValue({
        isMenuOpen: false,
        isScrolled: false,
        toggleMenu: mockToggleMenu,
        closeMenu: mockCloseMenu,
        setIsScrolled: mockSetIsScrolled,
      })

      render(<Header />)

      const menuButton = screen.getByRole('button')
      expect(menuButton).toHaveAttribute('type', 'button')
    })

    it('ナビゲーションリンクが正しいhref属性を持つ', () => {
      mockUseAppStore.mockReturnValue({
        isMenuOpen: false,
        isScrolled: false,
        toggleMenu: mockToggleMenu,
        closeMenu: mockCloseMenu,
        setIsScrolled: mockSetIsScrolled,
      })

      render(<Header />)

      expect(screen.getAllByRole('link', { name: 'About' })[0]).toHaveAttribute('href', '#about')
      expect(screen.getAllByRole('link', { name: 'Projects' })[0]).toHaveAttribute(
        'href',
        '#projects'
      )
      expect(screen.getAllByRole('link', { name: 'Skills' })[0]).toHaveAttribute('href', '#skills')
      expect(screen.getAllByRole('link', { name: 'Experience' })[0]).toHaveAttribute(
        'href',
        '#experience'
      )
      expect(screen.getAllByRole('link', { name: 'Contact' })[0]).toHaveAttribute(
        'href',
        '#contact'
      )
    })
  })
})
