/**
 * trpc.tsのテスト
 */
import { describe, expect, it, vi } from 'vitest'

import { createTRPCRouter, protectedProcedure, publicProcedure } from '../../trpc'

describe('TRPC utilities', () => {
  it('should export createTRPCRouter function', () => {
    expect(createTRPCRouter).toBeDefined()
    expect(typeof createTRPCRouter).toBe('function')
  })

  it('should export publicProcedure', () => {
    expect(publicProcedure).toBeDefined()
    expect(typeof publicProcedure).toBe('object')
  })

  it('should export protectedProcedure', () => {
    expect(protectedProcedure).toBeDefined()
    expect(typeof protectedProcedure).toBe('object')
  })

  it('should be able to create a router with createTRPCRouter', () => {
    const testRouter = createTRPCRouter({
      test: publicProcedure.query(() => 'test'),
    })

    expect(testRouter).toBeDefined()
    expect(testRouter._def).toBeDefined()
    expect(testRouter._def.procedures).toBeDefined()
    expect(testRouter._def.procedures.test).toBeDefined()
  })

  it('should have correct procedure structure', () => {
    expect(publicProcedure._def).toBeDefined()
    expect(protectedProcedure._def).toBeDefined()
  })

  it('should create router with multiple procedures', () => {
    const testRouter = createTRPCRouter({
      publicTest: publicProcedure.query(() => 'public'),
      protectedTest: protectedProcedure.query(() => 'protected'),
    })

    expect(testRouter._def.procedures.publicTest).toBeDefined()
    expect(testRouter._def.procedures.protectedTest).toBeDefined()
  })
})
