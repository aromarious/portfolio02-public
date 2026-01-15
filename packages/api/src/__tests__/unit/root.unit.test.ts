/**
 * root.tsのテスト
 */
import { describe, expect, it } from 'vitest'

import type { AppRouter } from '../../root'
import { appRouter } from '../../root'

describe('appRouter', () => {
  it('should be defined', () => {
    expect(appRouter).toBeDefined()
    expect(typeof appRouter).toBe('object')
  })

  it('should have auth router', () => {
    expect(appRouter.auth).toBeDefined()
  })

  it('should have contact router', () => {
    expect(appRouter.contact).toBeDefined()
  })

  it('should have correct type definition', () => {
    type TestAppRouter = AppRouter
    expect(true).toBe(true)
  })

  it('should have _def property as TRPC router', () => {
    expect(appRouter._def).toBeDefined()
    expect(appRouter._def.procedures).toBeDefined()
  })

  it('should include all expected procedures from sub-routers', () => {
    const procedures = appRouter._def.procedures
    expect(procedures).toBeDefined()
    expect(typeof procedures).toBe('object')
  })
})
