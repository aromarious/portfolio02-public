import { describe, expect, it } from 'vitest'

import type { SecurityCheck, SecurityResult } from '../types'
import { createSecurityDecision } from '../types'

describe('SecurityDecision API', () => {
  describe('createSecurityDecision', () => {
    it('ALLOWEDの場合、isDenied()がfalse、isAllowed()がtrueを返す', () => {
      const result: SecurityResult = {
        allowed: true,
        checks: [],
        metadata: {
          processingTime: 10,
          ruleCount: 3,
          cacheHit: false,
        },
      }

      const decision = createSecurityDecision(result)

      expect(decision.isDenied()).toBe(false)
      expect(decision.isAllowed()).toBe(true)
      expect(decision.reason.isRateLimit()).toBe(false)
      expect(decision.reason.isBot()).toBe(false)
      expect(decision.reason.isAuthFailure()).toBe(false)
      expect(decision.reason.isDdos()).toBe(false)
    })

    it('RATE_LIMITブロックの場合、適切な理由を返す', () => {
      const blockedCheck: SecurityCheck = {
        type: 'RATE_LIMIT',
        severity: 'HIGH',
        blocked: true,
        reason: 'Too many requests',
        ruleId: 'rate-limit-1',
        conclusion: 'DENY',
      }

      const result: SecurityResult = {
        allowed: false,
        checks: [blockedCheck],
        metadata: {
          processingTime: 15,
          ruleCount: 3,
          cacheHit: false,
        },
      }

      const decision = createSecurityDecision(result)

      expect(decision.isDenied()).toBe(true)
      expect(decision.isAllowed()).toBe(false)
      expect(decision.reason.isRateLimit()).toBe(true)
      expect(decision.reason.isBot()).toBe(false)
      expect(decision.reason.isAuthFailure()).toBe(false)
      expect(decision.reason.isDdos()).toBe(false)
    })

    it('BOT_DETECTIONブロックの場合、適切な理由を返す', () => {
      const blockedCheck: SecurityCheck = {
        type: 'BOT_DETECTION',
        severity: 'MEDIUM',
        blocked: true,
        reason: 'Suspicious user agent detected',
        ruleId: 'bot-detection-ua',
        conclusion: 'DENY',
      }

      const result: SecurityResult = {
        allowed: false,
        checks: [blockedCheck],
        metadata: {
          processingTime: 20,
          ruleCount: 4,
          cacheHit: false,
        },
      }

      const decision = createSecurityDecision(result)

      expect(decision.isDenied()).toBe(true)
      expect(decision.isAllowed()).toBe(false)
      expect(decision.reason.isRateLimit()).toBe(false)
      expect(decision.reason.isBot()).toBe(true)
      expect(decision.reason.isAuthFailure()).toBe(false)
      expect(decision.reason.isDdos()).toBe(false)
    })

    it('AUTH_FAILUREブロックの場合、適切な理由を返す', () => {
      const blockedCheck: SecurityCheck = {
        type: 'AUTH_FAILURE',
        severity: 'HIGH',
        blocked: true,
        reason: 'Too many failed authentication attempts',
        ruleId: 'auth-failure-1',
        conclusion: 'DENY',
      }

      const result: SecurityResult = {
        allowed: false,
        checks: [blockedCheck],
        metadata: {
          processingTime: 5,
          ruleCount: 2,
          cacheHit: false,
        },
      }

      const decision = createSecurityDecision(result)

      expect(decision.isDenied()).toBe(true)
      expect(decision.isAllowed()).toBe(false)
      expect(decision.reason.isRateLimit()).toBe(false)
      expect(decision.reason.isBot()).toBe(false)
      expect(decision.reason.isAuthFailure()).toBe(true)
      expect(decision.reason.isDdos()).toBe(false)
    })

    it('DDOS_PROTECTIONブロックの場合、適切な理由を返す', () => {
      const blockedCheck: SecurityCheck = {
        type: 'DDOS_PROTECTION',
        severity: 'CRITICAL',
        blocked: true,
        reason: 'DDoS attack pattern detected',
        ruleId: 'ddos-protection-1',
        conclusion: 'DENY',
      }

      const result: SecurityResult = {
        allowed: false,
        checks: [blockedCheck],
        metadata: {
          processingTime: 30,
          ruleCount: 5,
          cacheHit: false,
        },
      }

      const decision = createSecurityDecision(result)

      expect(decision.isDenied()).toBe(true)
      expect(decision.isAllowed()).toBe(false)
      expect(decision.reason.isRateLimit()).toBe(false)
      expect(decision.reason.isBot()).toBe(false)
      expect(decision.reason.isAuthFailure()).toBe(false)
      expect(decision.reason.isDdos()).toBe(true)
    })

    it('複数のブロックされたチェックがある場合、最初のものを理由とする', () => {
      const rateLimitCheck: SecurityCheck = {
        type: 'RATE_LIMIT',
        severity: 'HIGH',
        blocked: true,
        reason: 'Too many requests',
        ruleId: 'rate-limit-1',
        conclusion: 'DENY',
      }

      const botCheck: SecurityCheck = {
        type: 'BOT_DETECTION',
        severity: 'MEDIUM',
        blocked: true,
        reason: 'Bot detected',
        ruleId: 'bot-detection-1',
        conclusion: 'DENY',
      }

      const result: SecurityResult = {
        allowed: false,
        checks: [rateLimitCheck, botCheck], // rate-limitが最初
        metadata: {
          processingTime: 25,
          ruleCount: 4,
          cacheHit: false,
        },
      }

      const decision = createSecurityDecision(result)

      expect(decision.isDenied()).toBe(true)
      expect(decision.reason.isRateLimit()).toBe(true) // 最初のブロックされたチェック
      expect(decision.reason.isBot()).toBe(false)
    })

    it('ブロックされていないチェックは理由として使用されない', () => {
      const allowedCheck: SecurityCheck = {
        type: 'RATE_LIMIT',
        severity: 'LOW',
        blocked: false,
        reason: 'Within rate limit',
        ruleId: 'rate-limit-1',
        conclusion: 'ALLOW',
      }

      const blockedCheck: SecurityCheck = {
        type: 'BOT_DETECTION',
        severity: 'HIGH',
        blocked: true,
        reason: 'Bot detected',
        ruleId: 'bot-detection-1',
        conclusion: 'DENY',
      }

      const result: SecurityResult = {
        allowed: false,
        checks: [allowedCheck, blockedCheck], // allowedが最初だが、blockedのみが理由となる
        metadata: {
          processingTime: 20,
          ruleCount: 4,
          cacheHit: false,
        },
      }

      const decision = createSecurityDecision(result)

      expect(decision.isDenied()).toBe(true)
      expect(decision.reason.isRateLimit()).toBe(false) // ブロックされていないため除外
      expect(decision.reason.isBot()).toBe(true) // ブロックされたチェック
    })

    it('元のSecurityResultのデータを保持する', () => {
      const check: SecurityCheck = {
        type: 'RATE_LIMIT',
        severity: 'HIGH',
        blocked: true,
        reason: 'Too many requests',
        ruleId: 'rate-limit-1',
        conclusion: 'DENY',
        details: { customData: 'test' },
      }

      const result: SecurityResult = {
        allowed: false,
        checks: [check],
        metadata: {
          processingTime: 100,
          ruleCount: 3,
          cacheHit: true,
        },
      }

      const decision = createSecurityDecision(result)

      // 元のデータがそのまま保持されている
      expect(decision.allowed).toBe(false)
      expect(decision.checks).toEqual([check])
      expect(decision.metadata.processingTime).toBe(100)
      expect(decision.metadata.ruleCount).toBe(3)
      expect(decision.metadata.cacheHit).toBe(true)
    })

    it('空のchecks配列でも正常に動作する', () => {
      const result: SecurityResult = {
        allowed: true,
        checks: [],
        metadata: {
          processingTime: 1,
          ruleCount: 0,
          cacheHit: false,
        },
      }

      const decision = createSecurityDecision(result)

      expect(decision.isDenied()).toBe(false)
      expect(decision.isAllowed()).toBe(true)
      expect(decision.reason.isRateLimit()).toBe(false)
      expect(decision.reason.isBot()).toBe(false)
      expect(decision.reason.isAuthFailure()).toBe(false)
      expect(decision.reason.isDdos()).toBe(false)
    })
  })

  describe('Arcjetスタイル互換性', () => {
    it('Arcjetライクなメソッドチェーンが可能', () => {
      const rateLimitCheck: SecurityCheck = {
        type: 'RATE_LIMIT',
        severity: 'HIGH',
        blocked: true,
        reason: 'Too many requests',
        ruleId: 'rate-limit-1',
        conclusion: 'DENY',
      }

      const result: SecurityResult = {
        allowed: false,
        checks: [rateLimitCheck],
        metadata: {
          processingTime: 15,
          ruleCount: 3,
          cacheHit: false,
        },
      }

      const decision = createSecurityDecision(result)

      // Arcjetスタイルのチェック
      if (decision.isDenied()) {
        if (decision.reason.isRateLimit()) {
          expect(true).toBe(true) // レート制限による拒否
        } else if (decision.reason.isBot()) {
          expect.fail('Should not be bot detection')
        } else if (decision.reason.isAuthFailure()) {
          expect.fail('Should not be auth failure')
        } else if (decision.reason.isDdos()) {
          expect.fail('Should not be DDoS')
        }
      } else {
        expect.fail('Should be denied')
      }
    })
  })
})
