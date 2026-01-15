import { createJiti } from 'jiti'

const jiti = createJiti(import.meta.url)

// Import env files to validate at build time. Use jiti so we can load .ts files in here.
// await jiti.import('./src/env') // Temporarily disabled for debugging

/** @type {import("next").NextConfig} */
const config = {
  /** Enables hot reloading for local packages without a build step */
  transpilePackages: [
    '@aromarious/api',
    '@aromarious/db',
    '@aromarious/edge-security',
    '@aromarious/ui',
    '@aromarious/validators',
  ],

  /** Configure external image domains */
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.pexels.com',
        port: '',
        pathname: '/**',
      },
    ],
  },

  /** Environment variables for Edge Runtime (Middleware) */
  env: {
    SECURITY_MODE: process.env.SECURITY_MODE,
    KV_REST_API_URL: process.env.KV_REST_API_URL,
    KV_REST_API_TOKEN: process.env.KV_REST_API_TOKEN,
    SLACK_SECURITY_WEBHOOK: process.env.SLACK_SECURITY_WEBHOOK,
  },

  /** Webpack configuration for polyfills */
  webpack: (config, { isServer, dev }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        crypto: 'crypto-browserify',
      }
    }

    // 開発時のキャッシュ最適化（128kiB警告対策）
    if (dev) {
      config.cache = {
        ...config.cache,
        maxMemoryGenerations: 1, // メモリキャッシュを制限
      }

      // 大きな文字列のシリアライゼーション警告を抑制
      config.infrastructureLogging = {
        ...config.infrastructureLogging,
        level: 'error',
      }
    }

    return config
  },

  /** Security Headers */
  headers: async () => {
    // 開発環境では厳格なセキュリティヘッダーを緩和
    const isDevelopment = process.env.NODE_ENV === 'development' || !process.env.VERCEL
    const isPreview = process.env.VERCEL_ENV === 'preview'

    // Preview環境用のVercelツールバー対応ヘッダー
    const previewHeaders = isPreview
      ? [
          // Content Security Policy (Vercelツールバー対応)
          // Vercelツールバー表示に必要なドメイン: vercel.live, vercel.com, *.pusher.com
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self' https://vercel.live https://*.vercel.live https://vercel.com", // Vercelツールバー対応: default-srcにvercel.liveを追加
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://vercel.live https://*.vercel.live https://vercel.com https://va.vercel-scripts.com https://*.vercel.app https://*.vercel.com https://www.googletagmanager.com", // Vercelツールバースクリプト対応 + Google Analytics
              "style-src 'self' 'unsafe-inline' https://vercel.live https://*.vercel.live https://vercel.com", // Vercelツールバースタイル対応
              "img-src 'self' data: https: blob: https://vercel.live https://*.vercel.live https://vercel.com https://sockjs-mt1.pusher.com", // Vercelツールバー画像対応
              "font-src 'self' data: https://vercel.live https://*.vercel.live", // Vercelツールバーフォント対応
              "connect-src 'self' https://vercel.live https://*.vercel.live https://vercel.com https://vitals.vercel-insights.com https://sockjs-mt1.pusher.com https://*.pusher.com wss://ws-mt1.pusher.com wss://*.pusher.com https://va.vercel-scripts.com https://*.vercel.app https://*.vercel.com wss://*.vercel.live https://www.google-analytics.com https://analytics.google.com", // Vercelツールバー通信対応（WebSocket含む） + Google Analytics
              "frame-src 'self' https://vercel.live https://*.vercel.live https://vercel.com", // Vercelツールバーフレーム対応（重要）
              "media-src 'self'",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'none'",
            ].join('; '),
          },
        ]
      : []

    // 本番環境用のセキュリティヘッダー
    const productionHeaders =
      isDevelopment || isPreview
        ? []
        : [
            // Content Security Policy (本番環境用 - 厳格)
            {
              key: 'Content-Security-Policy',
              value: [
                "default-src 'self'",
                "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com",
                "style-src 'self' 'unsafe-inline'",
                "img-src 'self' data: https: blob:",
                "font-src 'self' data:",
                "connect-src 'self' https://www.google-analytics.com https://analytics.google.com",
                "media-src 'self'",
                "object-src 'none'",
                "base-uri 'self'",
                "form-action 'self'",
                "frame-ancestors 'none'",
                'upgrade-insecure-requests',
              ].join('; '),
            },
            // Cross-Origin Embedder Policy (本番環境のみ)
            {
              key: 'Cross-Origin-Embedder-Policy',
              value: 'credentialless',
            },
          ]

    return [
      {
        source: '/(.*)',
        headers: [
          // Preview環境専用ヘッダー
          ...previewHeaders,
          // 本番環境専用ヘッダー
          ...productionHeaders,
          // Strict Transport Security (本番環境のみ)
          ...(isDevelopment
            ? []
            : [
                {
                  key: 'Strict-Transport-Security',
                  value: 'max-age=31536000; includeSubDomains; preload',
                },
              ]),
          // 共通セキュリティヘッダー
          // Prevent clickjacking
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          // XSS Protection
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          // Prevent MIME type sniffing
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          // Referrer Policy
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          // Permissions Policy
          {
            key: 'Permissions-Policy',
            value:
              'geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()',
          },
          // Cross-Origin Opener Policy (開発環境では緩和)
          {
            key: 'Cross-Origin-Opener-Policy',
            value: isDevelopment ? 'unsafe-none' : 'same-origin',
          },
          // Cross-Origin Resource Policy
          {
            key: 'Cross-Origin-Resource-Policy',
            value: 'cross-origin',
          },
        ],
      },
    ]
  },

  /** Turbopack configuration (Next.js 16+ default) */
  turbopack: {},
}

export default config
