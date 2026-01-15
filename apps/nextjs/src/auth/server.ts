import 'server-only'

import { cache } from 'react'

// Disabled auth implementation
const createDisabledAuth = () => ({
  api: {
    getSession: async () => null,
  },
  handler: () => new Response('Auth disabled', { status: 404 }),
})

export const auth = createDisabledAuth()

export const getSession = cache(async () => auth.api.getSession())
