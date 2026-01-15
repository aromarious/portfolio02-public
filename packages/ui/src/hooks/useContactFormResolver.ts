import type { Resolver } from 'react-hook-form'

import type { ContactFormInput } from '@aromarious/validators'
import { contactFormInputSchema } from '@aromarious/validators'

export const useContactFormResolver = (): Resolver<ContactFormInput> => {
  return async (data) => {
    try {
      // safeParse を使用してエラーハンドリングを改善
      const result = contactFormInputSchema.safeParse(data)

      if (result.success) {
        return {
          values: result.data,
          errors: {},
        }
      }

      console.log('Validation errors:', result.error.issues)

      const formErrors: Record<string, { type: string; message: string }> = {}

      for (const issue of result.error.issues) {
        if (issue.path && issue.path.length > 0) {
          const fieldName = issue.path[0] as string
          formErrors[fieldName] = {
            type: issue.code || 'validation',
            message: issue.message || 'バリデーションエラー',
          }
        }
      }

      return {
        values: {},
        errors: formErrors,
      }
    } catch (error) {
      console.error('Unexpected validation error:', error)
      return {
        values: {},
        errors: {
          root: {
            type: 'server',
            message: '予期しないバリデーションエラーが発生しました',
          },
        },
      }
    }
  }
}
