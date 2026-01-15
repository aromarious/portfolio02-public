import { createEnv } from '@t3-oss/env-nextjs'
import { vercel } from '@t3-oss/env-nextjs/presets-zod'
import { z } from 'zod/v4'

export const env = createEnv({
  extends: [vercel()],
  shared: {
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  },
  /**
   * Specify your server-side environment variables schema here.
   * This way you can ensure the app isn't built with invalid env vars.
   */
  server: {
    POSTGRES_URL: z.string().url(),
    SLACK_WEBHOOK_URL: z.string().url().optional(),
    NOTION_API_TOKEN: z.string().min(1).optional(),
    NOTION_PARENT_PAGE_ID: z.string().min(1).optional(),

    // Auth (disabled but kept for compatibility)
    AUTH_SECRET: z.string().min(1).optional(),

    // Security configuration
    SECURITY_MODE: z.enum(['LIVE', 'DRY_RUN']).default('DRY_RUN'),

    // Upstash Redis (KV store)
    KV_REST_API_URL: z.string().url().optional(),
    KV_REST_API_TOKEN: z.string().min(1).optional(),

    SLACK_SECURITY_WEBHOOK: z.string().url().optional(),
  },

  /**
   * Specify your client-side environment variables schema here.
   * For them to be exposed to the client, prefix them with `NEXT_PUBLIC_`.
   */
  client: {
    NEXT_PUBLIC_GA_MEASUREMENT_ID: z.string().min(1).optional(),
    // NEXT_PUBLIC_CLIENTVAR: z.string(),
  },
  /**
   * Destructure all variables from `process.env` to make sure they aren't tree-shaken away.
   */
  experimental__runtimeEnv: {
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_GA_MEASUREMENT_ID: process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID,

    // NEXT_PUBLIC_CLIENTVAR: process.env.NEXT_PUBLIC_CLIENTVAR,
  },
  skipValidation: !!process.env.CI || process.env.npm_lifecycle_event === 'lint',
})
