import { authRouter } from './router/auth'
import { contactRouter } from './router/contact'
import { createTRPCRouter } from './trpc'

export const appRouter = createTRPCRouter({
  auth: authRouter,
  contact: contactRouter,
})

// export type definition of API
export type AppRouter = typeof appRouter
