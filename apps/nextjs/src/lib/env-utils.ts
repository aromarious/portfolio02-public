import { env } from '~/env'

/**
 * Environment utility functions for consistent environment detection
 */

// 基本環境判定
export const isDevelopment = () => env.NODE_ENV === 'development'
export const isProduction = () => env.NODE_ENV === 'production'
export const isTest = () => env.NODE_ENV === 'test'

// Vercel環境判定
export const isVercelProduction = () => env.VERCEL_ENV === 'production'
export const isVercelPreview = () => env.VERCEL_ENV === 'preview'
export const isVercelDevelopment = () => env.VERCEL_ENV === 'development'

// 複合環境判定
export const isLocalDevelopment = () => isDevelopment() && !env.VERCEL_ENV
export const isSecurityLiveMode = () => env.SECURITY_MODE === 'LIVE'

// Redis接続判定
export const shouldUseLocalRedis = (url?: string) => {
  return isLocalDevelopment() && url && (url.includes('localhost') || url.includes('127.0.0.1'))
}

// デバッグ出力用
export const getEnvironmentInfo = () => ({
  NODE_ENV: env.NODE_ENV,
  VERCEL_ENV: env.VERCEL_ENV,
  SECURITY_MODE: env.SECURITY_MODE,
  isDevelopment: isDevelopment(),
  isProduction: isProduction(),
  isLocalDevelopment: isLocalDevelopment(),
  isVercelProduction: isVercelProduction(),
  isSecurityLiveMode: isSecurityLiveMode(),
})
