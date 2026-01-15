import { authFailureRules } from './auth-failure'
import { botDetectionRules } from './bot-detection'
import { ddosProtectionRules } from './ddos-protection'
import { rateLimitRules } from './rate-limit'

export { rateLimitRules } from './rate-limit'
export { authFailureRules } from './auth-failure'
export { botDetectionRules } from './bot-detection'
export { ddosProtectionRules } from './ddos-protection'

export const allSecurityRules = [
  ...rateLimitRules,
  ...authFailureRules,
  ...botDetectionRules,
  ...ddosProtectionRules,
]
