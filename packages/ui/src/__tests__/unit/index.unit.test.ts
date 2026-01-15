/**
 * uiパッケージのエントリポイントのテスト
 */
import { describe, expect, it } from 'vitest'

describe('ui package exports', () => {
  it('should export cn utility function', async () => {
    const { cn } = await import('../../index')
    expect(cn).toBeDefined()
    expect(typeof cn).toBe('function')
  })

  it('should export Zustand store functions', async () => {
    const { useAppStore } = await import('../../index')
    expect(useAppStore).toBeDefined()
    expect(typeof useAppStore).toBe('function')
  })

  it('should export DiagramViewer component', async () => {
    const { DiagramViewer } = await import('../../index')
    expect(DiagramViewer).toBeDefined()
    expect(typeof DiagramViewer).toBe('function')
  })

  it('should export page-specific components', async () => {
    const { Hero, About, Skills, Experience, Projects, Contact, Footer } =
      await import('../../index')

    expect(Hero).toBeDefined()
    expect(About).toBeDefined()
    expect(Skills).toBeDefined()
    expect(Experience).toBeDefined()
    expect(Projects).toBeDefined()
    expect(Contact).toBeDefined()
    expect(Footer).toBeDefined()
  })

  it('should have working cn function', async () => {
    const { cn } = await import('../../index')

    const result = cn('class1', 'class2')
    expect(typeof result).toBe('string')
    expect(result).toContain('class1')
    expect(result).toContain('class2')
  })

  it('should have working cn function with conditionals', async () => {
    const { cn } = await import('../../index')

    const result = cn('base', true && 'active', false && 'disabled')
    expect(typeof result).toBe('string')
    expect(result).toContain('base')
    expect(result).toContain('active')
    expect(result).not.toContain('disabled')
  })
})
