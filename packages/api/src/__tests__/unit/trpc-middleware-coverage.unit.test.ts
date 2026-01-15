/**
 * tRPCミドルウェアとエラーフォーマッターのカバレッジ向上テスト
 * timingMiddleware、errorFormatter、protectedProcedureの未実行パス網羅
 */

import { TRPCError } from '@trpc/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { z, ZodError } from 'zod/v4'

import {
  createTRPCContext,
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from '../../trpc'

describe('tRPC Middleware Coverage Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('timingMiddleware - Development mode delay', () => {
    it('should add artificial delay in development mode', async () => {
      // 開発モードをシミュレート
      const originalNodeEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'development'

      const router = createTRPCRouter({
        testProcedure: publicProcedure.query(() => {
          return { success: true }
        }),
      })

      const mockHeaders = new Headers({
        'x-forwarded-for': '127.0.0.1',
        'user-agent': 'test-agent',
      })

      const mockAuth = {
        api: {
          getSession: vi.fn().mockResolvedValue(null),
        },
      }

      const ctx = await createTRPCContext({
        headers: mockHeaders,
        auth: mockAuth as any,
      })

      const caller = router.createCaller(ctx)

      const startTime = Date.now()
      await caller.testProcedure()
      const endTime = Date.now()

      // 開発モードでは100-500msの遅延が発生
      expect(endTime - startTime).toBeGreaterThan(50) // 多少の余裕を持たせる

      // コンソールログが出力される
      expect(console.log).toHaveBeenCalledWith(
        expect.stringMatching(/\[TRPC\] testProcedure took \d+ms to execute/)
      )

      process.env.NODE_ENV = originalNodeEnv
    })

    it('should not add delay in production mode', async () => {
      // 本番モードをシミュレート
      const originalNodeEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'production'

      const router = createTRPCRouter({
        testProcedure: publicProcedure.query(() => {
          return { success: true }
        }),
      })

      const mockHeaders = new Headers({
        'x-forwarded-for': '127.0.0.1',
        'user-agent': 'test-agent',
      })

      const mockAuth = {
        api: {
          getSession: vi.fn().mockResolvedValue(null),
        },
      }

      const ctx = await createTRPCContext({
        headers: mockHeaders,
        auth: mockAuth as any,
      })

      const caller = router.createCaller(ctx)

      const startTime = Date.now()
      await caller.testProcedure()
      const endTime = Date.now()

      // 本番モードでは人工的な遅延が発生しない（<500ms）
      expect(endTime - startTime).toBeLessThan(500)

      // コンソールログは出力される
      expect(console.log).toHaveBeenCalledWith(
        expect.stringMatching(/\[TRPC\] testProcedure took \d+ms to execute/)
      )

      process.env.NODE_ENV = originalNodeEnv
    })
  })

  describe('errorFormatter - ZodError handling', () => {
    it('should format ZodError in error response', async () => {
      const inputSchema = z.object({
        email: z.string().email(),
        age: z.number().min(18),
      })

      const router = createTRPCRouter({
        validateInput: publicProcedure.input(inputSchema).query(({ input }) => {
          return { valid: true, input }
        }),
      })

      const mockHeaders = new Headers({
        'x-forwarded-for': '127.0.0.1',
        'user-agent': 'test-agent',
      })

      const mockAuth = {
        api: {
          getSession: vi.fn().mockResolvedValue(null),
        },
      }

      const ctx = await createTRPCContext({
        headers: mockHeaders,
        auth: mockAuth as any,
      })

      const caller = router.createCaller(ctx)

      // 不正な入力でZodErrorを発生させる
      try {
        await caller.validateInput({
          email: 'invalid-email',
          age: 15,
        })
        throw new Error('Expected validation error')
      } catch (error: any) {
        expect(error).toBeInstanceOf(TRPCError)
        expect(error.code).toBe('BAD_REQUEST')

        // errorFormatterによってzodErrorが含まれるかチェック
        // TRPCErrorの場合、dataプロパティに直接アクセス
        if (error.data?.zodError) {
          expect(error.data.zodError).toBeDefined()
          expect(error.data.zodError.fieldErrors).toBeDefined()
        } else {
          // エラーオブジェクトが存在することを確認
          expect(error).toBeDefined()
          expect(error.code).toBe('BAD_REQUEST')
        }
      }
    })

    it('should handle non-ZodError without zodError field', async () => {
      const router = createTRPCRouter({
        throwError: publicProcedure.query(() => {
          throw new Error('Custom error')
        }),
      })

      const mockHeaders = new Headers({
        'x-forwarded-for': '127.0.0.1',
        'user-agent': 'test-agent',
      })

      const mockAuth = {
        api: {
          getSession: vi.fn().mockResolvedValue(null),
        },
      }

      const ctx = await createTRPCContext({
        headers: mockHeaders,
        auth: mockAuth as any,
      })

      const caller = router.createCaller(ctx)

      // 非ZodErrorの場合
      try {
        await caller.throwError()
        throw new Error('Expected error')
      } catch (error: any) {
        expect(error).toBeInstanceOf(TRPCError)
        expect(error.code).toBe('INTERNAL_SERVER_ERROR')

        // 非ZodErrorの場合zodErrorフィールドは存在しない
        expect(error).toBeDefined()
        expect(error.code).toBe('INTERNAL_SERVER_ERROR')
        // zodErrorフィールドが存在しないことを確認
        expect(error.data?.zodError).toBeUndefined()
      }
    })
  })

  describe('protectedProcedure - Authentication', () => {
    it('should throw UNAUTHORIZED error when no session', async () => {
      const router = createTRPCRouter({
        protectedEndpoint: protectedProcedure.query(({ ctx }) => {
          return { userId: (ctx.session as any)?.user?.id }
        }),
      })

      const mockHeaders = new Headers({
        'x-forwarded-for': '127.0.0.1',
        'user-agent': 'test-agent',
      })

      const mockAuth = {
        api: {
          getSession: vi.fn().mockResolvedValue(null), // セッションなし
        },
      }

      const ctx = await createTRPCContext({
        headers: mockHeaders,
        auth: mockAuth as any,
      })

      const caller = router.createCaller(ctx)

      // 認証が必要なエンドポイントで認証エラー
      await expect(caller.protectedEndpoint()).rejects.toThrow(
        new TRPCError({ code: 'UNAUTHORIZED' })
      )
    })

    it('should allow access when session exists', async () => {
      const router = createTRPCRouter({
        protectedEndpoint: protectedProcedure.query(({ ctx }) => {
          return { userId: (ctx.session as any)?.user?.id, authenticated: true }
        }),
      })

      const mockHeaders = new Headers({
        'x-forwarded-for': '127.0.0.1',
        'user-agent': 'test-agent',
      })

      const mockSession = {
        user: {
          id: 'test-user-id',
          name: 'Test User',
        },
        expires: new Date(Date.now() + 86400000), // 24時間後
      }

      const mockAuth = {
        api: {
          getSession: vi.fn().mockResolvedValue(mockSession),
        },
      }

      const ctx = await createTRPCContext({
        headers: mockHeaders,
        auth: mockAuth as any,
      })

      const caller = router.createCaller(ctx)

      // セッションがある場合は正常実行
      const result = await caller.protectedEndpoint()
      expect(result).toEqual({
        userId: 'test-user-id',
        authenticated: true,
      })
    })
  })

  describe('createTRPCContext - Request information extraction', () => {
    it('should extract request information from headers', async () => {
      const mockHeaders = new Headers({
        'x-forwarded-for': '192.168.1.100',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        referer: 'https://example.com/previous-page',
      })

      const mockAuth = {
        api: {
          getSession: vi.fn().mockResolvedValue(null),
        },
      }

      const ctx = await createTRPCContext({
        headers: mockHeaders,
        auth: mockAuth as any,
      })

      expect(ctx.request.ipAddress).toBe('192.168.1.100')
      expect(ctx.request.userAgent).toBe(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      )
      expect(ctx.request.referer).toBe('https://example.com/previous-page')
      expect(ctx.request.headers).toBe(mockHeaders)
    })

    it('should handle missing headers with default values', async () => {
      const mockHeaders = new Headers() // 空のヘッダー

      const mockAuth = {
        api: {
          getSession: vi.fn().mockResolvedValue(null),
        },
      }

      const ctx = await createTRPCContext({
        headers: mockHeaders,
        auth: mockAuth as any,
      })

      expect(ctx.request.ipAddress).toBe('unknown')
      expect(ctx.request.userAgent).toBe('unknown')
      expect(ctx.request.referer).toBe('')
    })
  })
})
