/**
 * theme.tsxのテスト
 */
import { describe, expect, it, vi } from 'vitest'

describe('Theme exports', () => {
  it('should export ThemeProvider', async () => {
    const { ThemeProvider } = await import('../../theme')
    expect(ThemeProvider).toBeDefined()
    expect(typeof ThemeProvider).toBe('function')
  })

  it('should export ThemeToggle component', async () => {
    const { ThemeToggle } = await import('../../theme')
    expect(ThemeToggle).toBeDefined()
    expect(typeof ThemeToggle).toBe('function')
  })
})

describe('ThemeToggle component structure', () => {
  it('should be a React component', async () => {
    const { ThemeToggle } = await import('../../theme')

    // Mock next-themes hook
    vi.doMock('next-themes', () => ({
      useTheme: () => ({
        setTheme: vi.fn(),
        theme: 'light',
      }),
    }))

    expect(typeof ThemeToggle).toBe('function')
    expect(ThemeToggle.name).toBe('ThemeToggle')
  })

  it('should have correct component props', async () => {
    const { ThemeToggle } = await import('../../theme')

    expect(ThemeToggle).toBeDefined()
    expect(ThemeToggle.length).toBe(0) // No props
  })
})
