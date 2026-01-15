import {
  getE2EConfig,
  isNotionE2EConfigured,
  isRealApiTestEnabled,
} from './src/__tests__/e2e/e2e-config.js'

console.log('Config:', getE2EConfig())
console.log('isRealApiTestEnabled:', isRealApiTestEnabled())
console.log('isNotionE2EConfigured:', isNotionE2EConfigured())
