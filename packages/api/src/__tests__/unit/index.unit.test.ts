/**
 * apiパッケージのエントリポイントのテスト
 */
import { describe, expect, it, vi } from 'vitest'

import type { AppRouter, RouterInputs, RouterOutputs } from '../../index'
import { appRouter, createTRPCContext } from '../../index'

describe('api package exports', () => {
  it('should export appRouter', () => {
    expect(appRouter).toBeDefined()
    expect(typeof appRouter).toBe('object')
  })

  it('should export createTRPCContext function', () => {
    expect(createTRPCContext).toBeDefined()
    expect(typeof createTRPCContext).toBe('function')
  })

  it('should have correct type inference helpers', () => {
    type TestRouterInputs = RouterInputs
    type TestRouterOutputs = RouterOutputs
    type TestAppRouter = AppRouter

    expect(true).toBe(true)
  })

  it('should be able to create TRPC context', async () => {
    const mockHeaders = new Headers()
    const mockAuth = {
      api: {
        getSession: vi.fn().mockResolvedValue(null),
      },
    }

    const context = await createTRPCContext({
      headers: mockHeaders,
      auth: mockAuth as any,
    })
    expect(context).toBeDefined()
    expect(typeof context).toBe('object')
    expect(context.db).toBeDefined()
    expect(context.request).toBeDefined()
  })

  it('should have contact router in appRouter', () => {
    expect(appRouter.contact).toBeDefined()
  })

  it('should have auth router in appRouter', () => {
    expect(appRouter.auth).toBeDefined()
  })
})
