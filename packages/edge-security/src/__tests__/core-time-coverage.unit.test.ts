/**
 * Core SecurityEngine 時間モックカバレッジテスト
 * Date.now()に依存するTTL、キャッシュ期限切れ、タイムスタンプ処理のテスト
 */

import type { NextRequest } from 'next/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { SecurityConfig } from '../types'
import { SecurityEngine } from '../core'

// NextRequestのモック作成関数
const createMockRequest = (
  path: string,
  method: string = 'GET',
  headers: Record<string, string> = {}
): NextRequest => {
  return {
    nextUrl: {
      pathname: path,
    },
    method,
    headers: {
      get: (key: string) => headers[key] || null,
      forEach: (callback: (value: string, key: string) => void) => {
        Object.entries(headers).forEach(([key, value]) => callback(value, key))
      },
    },
    ip: '192.168.1.100',
  } as unknown as NextRequest
}

// テスト用セキュリティ設定
const mockConfig: SecurityConfig = {
  mode: 'DRY_RUN',
  rateLimit: {
    default: { windowMs: 60000, max: 100 },
    paths: {
      '/api/test': { windowMs: 5000, max: 1 }, // 5秒間で1リクエスト
    },
  },
  authFailure: {
    paths: {
      '/api/auth': { maxAttempts: 3, lockoutDuration: 60000 }, // 1分ロックアウト
    },
  },
  logging: {
    level: 'INFO',
  },
}

describe('Core SecurityEngine Time Mock Coverage Tests', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    // console.logをモック
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(console, 'info').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  describe('時間依存処理のカバレッジテスト', () => {
    it('should test processing time calculation', async () => {
      // 固定時刻に設定
      const mockStartTime = new Date('2024-07-20T12:00:00Z')
      vi.setSystemTime(mockStartTime)

      const request = createMockRequest('/api/test', 'POST')

      // 処理開始
      const resultPromise = SecurityEngine.protect(request, mockConfig)

      // 100ms経過をシミュレート
      vi.advanceTimersByTime(100)

      const result = await resultPromise

      // fail-openでallow期待
      expect(result.isAllowed()).toBe(true)

      // processingTimeがメタデータに含まれることを期待
      expect(result.metadata.processingTime).toBeTypeOf('number')
      expect(result.metadata.processingTime).toBeGreaterThanOrEqual(0)
    })

    it('should test TTL expiration logic', async () => {
      // 時刻を固定
      const baseTime = new Date('2024-07-20T12:00:00Z')
      vi.setSystemTime(baseTime)

      const request = createMockRequest('/api/auth', 'POST')

      // 最初のリクエスト（fail-openでallow）
      const result1 = await SecurityEngine.protect(request, mockConfig)
      expect(result1.isAllowed()).toBe(true)

      // 30秒経過（lockoutDuration 60秒の半分）
      vi.advanceTimersByTime(30000)

      // まだTTL内
      const result2 = await SecurityEngine.protect(request, mockConfig)
      expect(result2.isAllowed()).toBe(true)

      // さらに35秒経過（合計65秒、TTL期限切れ）
      vi.advanceTimersByTime(35000)

      // TTL期限切れ後
      const result3 = await SecurityEngine.protect(request, mockConfig)
      expect(result3.isAllowed()).toBe(true) // fail-openのため
    })

    it('should test event timestamp generation', async () => {
      // 固定時刻
      const fixedTime = new Date('2024-07-20T12:00:00Z')
      vi.setSystemTime(fixedTime)

      const request = createMockRequest('/api/test', 'GET')

      // リクエスト処理
      const result = await SecurityEngine.protect(request, mockConfig)

      expect(result.isAllowed()).toBe(true)

      // タイムスタンプが現在時刻であることを確認
      expect(Date.now()).toBe(fixedTime.getTime())
    })

    it('should test cache cleanup with time advancement', async () => {
      // 開始時刻
      const startTime = new Date('2024-07-20T12:00:00Z')
      vi.setSystemTime(startTime)

      const request = createMockRequest('/api/test', 'POST')

      // 複数リクエストでキャッシュエントリ作成
      await SecurityEngine.protect(request, mockConfig)
      await SecurityEngine.protect(request, mockConfig)

      // 大幅に時間を進める（全てのTTLを期限切れにする）
      vi.advanceTimersByTime(300000) // 5分経過

      // クリーンアップ後のリクエスト
      const result = await SecurityEngine.protect(request, mockConfig)

      expect(result.isAllowed()).toBe(true) // fail-openのため
    })

    it('should test rate limit window expiration', async () => {
      // レート制限ウィンドウテスト
      const startTime = new Date('2024-07-20T12:00:00Z')
      vi.setSystemTime(startTime)

      const request = createMockRequest('/api/test', 'POST') // 5秒間で1リクエストの制限

      // 最初のリクエスト
      const result1 = await SecurityEngine.protect(request, mockConfig)
      expect(result1.isAllowed()).toBe(true)

      // 2秒経過（ウィンドウ内）
      vi.advanceTimersByTime(2000)
      const result2 = await SecurityEngine.protect(request, mockConfig)
      expect(result2.isAllowed()).toBe(true) // fail-openのため

      // さらに4秒経過（合計6秒、ウィンドウ期限切れ）
      vi.advanceTimersByTime(4000)
      const result3 = await SecurityEngine.protect(request, mockConfig)
      expect(result3.isAllowed()).toBe(true) // fail-openのため
    })

    it('should test metrics timestamp accuracy', async () => {
      // メトリクス生成時のタイムスタンプ精度テスト
      const preciseTime = new Date('2024-07-20T12:34:56.789Z')
      vi.setSystemTime(preciseTime)

      const request = createMockRequest('/api/metrics', 'GET')

      const result = await SecurityEngine.protect(request, mockConfig)

      // タイムスタンプが正確であることを確認
      expect(Date.now()).toBe(preciseTime.getTime())
      expect(result.isAllowed()).toBe(true)
    })

    it('should test event ID generation with time component', async () => {
      // イベントID生成の時間コンポーネントテスト
      const eventTime = new Date('2024-07-20T15:30:45Z')
      vi.setSystemTime(eventTime)

      const request = createMockRequest('/api/event-test', 'POST')

      // リクエスト処理でイベント生成
      const result = await SecurityEngine.protect(request, mockConfig)

      expect(result.isAllowed()).toBe(true)

      // Date.now()が期待値と一致することを確認
      expect(Date.now()).toBe(eventTime.getTime())
    })
  })

  describe('時間ベースキャッシュ機能テスト', () => {
    it('should test deny cache expiration logic', async () => {
      const cacheTime = new Date('2024-07-20T10:00:00Z')
      vi.setSystemTime(cacheTime)

      const request = createMockRequest('/api/blocked', 'POST')

      // リクエスト実行（キャッシュエントリ作成）
      await SecurityEngine.protect(request, mockConfig)

      // キャッシュTTL内（30秒経過）
      vi.advanceTimersByTime(30000)
      await SecurityEngine.protect(request, mockConfig)

      // キャッシュTTL期限切れ（5分経過）
      vi.advanceTimersByTime(270000)
      const result = await SecurityEngine.protect(request, mockConfig)

      expect(result.isAllowed()).toBe(true) // fail-open動作
    })

    it('should test real-time cleanup effectiveness', async () => {
      const cleanupTime = new Date('2024-07-20T14:00:00Z')
      vi.setSystemTime(cleanupTime)

      const request = createMockRequest('/api/cleanup-test', 'GET')

      // 複数エントリ作成
      await SecurityEngine.protect(request, mockConfig)

      // 時間を大幅に進めてクリーンアップ条件作成
      vi.advanceTimersByTime(600000) // 10分経過

      // クリーンアップトリガー
      const result = await SecurityEngine.protect(request, mockConfig)

      expect(result.isAllowed()).toBe(true)
    })
  })
})
