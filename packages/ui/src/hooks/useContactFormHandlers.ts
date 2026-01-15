import type { FieldErrors, UseFormReset } from 'react-hook-form'

import type { ContactFormInput } from '@aromarious/validators'

import { toast } from '../primitives/toast'
import { useAppStore } from '../stores/app-store'

// Google Analytics tracking function
const trackContactFormEvent = (eventName: string, parameters?: Record<string, unknown>) => {
  if (
    typeof window !== 'undefined' &&
    'gtag' in window &&
    typeof (window as unknown as { gtag: unknown }).gtag === 'function'
  ) {
    const gtag = (
      window as unknown as {
        gtag: (command: string, eventName: string, config: Record<string, unknown>) => void
      }
    ).gtag
    gtag('event', eventName, {
      event_category: 'engagement',
      ...parameters,
    })
  }
}

// コンタクトフォーム成功時のレスポンス型
interface ContactFormSuccessResponse {
  message?: string
  id?: string
  status?: string
}

// エラーレスポンスの型
interface ContactFormErrorResponse {
  message?: string
  code?: string
  details?: unknown
}

export const useContactFormHandlers = () => {
  const { setIsSubmitted, resetSubmitted, setSubmitError, clearSubmitError } = useAppStore()

  // デフォルトの成功・エラーハンドリング
  const handleSuccess = (
    data?: ContactFormSuccessResponse,
    watchedData?: ContactFormInput,
    reset?: UseFormReset<ContactFormInput>
  ) => {
    const message = data?.message || 'お問い合わせを送信しました'
    console.log('Success:', message)

    // Google Analytics: 送信成功をトラッキング
    trackContactFormEvent('contact_form_success', {
      event_label: 'form_submission_success',
      contact_method: 'portfolio_form',
      page_location: typeof window !== 'undefined' ? window.location.href : undefined,
    })

    // toast通知を表示
    toast.success(message)

    setIsSubmitted(true)
    clearSubmitError()
    // フォームをリセット（技術情報は保持）
    if (reset && watchedData) {
      reset({
        name: '',
        email: '',
        subject: '',
        message: '',
        // 技術情報はそのまま保持
        ...Object.fromEntries(
          Object.entries(watchedData).filter(
            ([key]) => !['name', 'email', 'subject', 'message'].includes(key)
          )
        ),
      })
    }
    setTimeout(() => resetSubmitted(), 3000)
  }

  const handleError = (error: ContactFormErrorResponse | Error) => {
    const errorMessage = error instanceof Error ? error.message : error?.message
    const displayMessage = errorMessage || '送信に失敗しました。もう一度お試しください。'
    console.error('Error:', errorMessage || error)

    // Google Analytics: 送信エラーをトラッキング
    trackContactFormEvent('contact_form_error', {
      event_label: 'form_submission_error',
      error_message: errorMessage || 'unknown_error',
      page_location: typeof window !== 'undefined' ? window.location.href : undefined,
    })

    // toast通知を表示
    toast.error(displayMessage)

    setSubmitError(displayMessage)
  }

  // バリデーションエラー時のハンドラー
  const handleValidationError = (errors: FieldErrors<ContactFormInput>, isSubmitting: boolean) => {
    console.error('Form validation errors:', errors)

    // Google Analytics: バリデーションエラーをトラッキング
    trackContactFormEvent('contact_form_validation_error', {
      event_label: 'form_validation_error',
      error_fields: Object.keys(errors).join(','),
      field_count: Object.keys(errors).length,
      page_location: typeof window !== 'undefined' ? window.location.href : undefined,
    })

    // エラー情報をより詳細にログ出力
    for (const fieldName of Object.keys(errors)) {
      const error = errors[fieldName as keyof ContactFormInput]
      console.log(`Field: ${fieldName}, Error:`, error)
    }

    // 最初のエラーフィールドにフォーカスする
    const firstErrorField = Object.keys(errors)[0]
    if (firstErrorField) {
      const fieldError = errors[firstErrorField as keyof ContactFormInput]
      const errorMessage = fieldError?.message || 'バリデーションエラーが発生しました'
      const displayMessage = `入力内容をご確認ください: ${errorMessage}`

      // toast通知を表示
      toast.error(displayMessage)

      setSubmitError(displayMessage)
    }

    // フォームが送信状態のままにならないようにする
    // isSubmittingは自動的にfalseになるが、念のため確認
    console.log('Form submitting state:', isSubmitting)
  }

  return {
    handleSuccess,
    handleError,
    handleValidationError,
    clearSubmitError,
  }
}
