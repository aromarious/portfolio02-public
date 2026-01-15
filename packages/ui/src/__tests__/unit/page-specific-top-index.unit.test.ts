/**
 * page-specific/top index.tsのテスト
 */
import { describe, expect, it } from 'vitest'

describe('page-specific top index exports', () => {
  it('should export all page components', async () => {
    const { Hero, About, Skills, Experience, Projects, Contact, Footer } =
      await import('../../page-specific/top/index')

    expect(Hero).toBeDefined()
    expect(About).toBeDefined()
    expect(Skills).toBeDefined()
    expect(Experience).toBeDefined()
    expect(Projects).toBeDefined()
    expect(Contact).toBeDefined()
    expect(Footer).toBeDefined()
  })

  it('should export React components', async () => {
    const { Hero, About, Skills, Experience, Projects, Contact, Footer } =
      await import('../../page-specific/top/index')

    expect(typeof Hero).toBe('function')
    expect(typeof About).toBe('function')
    expect(typeof Skills).toBe('function')
    expect(typeof Experience).toBe('function')
    expect(typeof Projects).toBe('function')
    expect(typeof Contact).toBe('function')
    expect(typeof Footer).toBe('function')
  })

  it('should have the same exports as individual files', async () => {
    const pageIndex = await import('../../page-specific/top/index')
    const hero = await import('../../page-specific/top/Hero')

    expect(pageIndex.Hero).toBe(hero.default)
  })
})
