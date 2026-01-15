/**
 * stores index.tsのテスト
 */
import { describe, expect, it } from 'vitest'

describe('stores index exports', () => {
  it('should export useAppStore hook', async () => {
    const { useAppStore } = await import('../../stores/index')
    expect(useAppStore).toBeDefined()
    expect(typeof useAppStore).toBe('function')
  })

  it('should export slices', async () => {
    const stores = await import('../../stores/index')
    expect(stores).toBeDefined()
    expect(typeof stores).toBe('object')
  })

  it('should have the same exports as app-store', async () => {
    const storesIndex = await import('../../stores/index')
    const appStore = await import('../../stores/app-store')

    expect(storesIndex.useAppStore).toBe(appStore.useAppStore)
  })
})
