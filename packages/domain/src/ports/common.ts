// Common types used across multiple repository ports
import { z } from 'zod/v4'

export const PaginationOptionsSchema = z.object({
  offset: z.number().int().min(0).optional(),
  limit: z.number().int().min(1).max(1000).optional(),
  orderBy: z
    .enum(['createdAt', 'updatedAt', 'name', 'contactCount', 'lastContactAt', 'urgencyLevel'])
    .optional(),
  orderDirection: z.enum(['asc', 'desc']).optional(),
})

export type PaginationOptions = z.infer<typeof PaginationOptionsSchema>
