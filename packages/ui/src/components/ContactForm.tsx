'use client'

import type React from 'react'
import type { FieldErrors } from 'react-hook-form'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'

import type { ContactFormInput } from '@aromarious/validators'

import { useBrowserInfo } from '../hooks/useBrowserInfo'
import { useContactFormHandlers } from '../hooks/useContactFormHandlers'
import { useContactFormResolver } from '../hooks/useContactFormResolver'
import { useAppStore } from '../stores/app-store'
import { ContactFormButton } from './ContactFormButton'
import { ContactFormFields } from './ContactFormFields'

// 成功・エラーレスポンスの型定義
interface ContactFormSuccessResponse {
  message?: string
  id?: string
  status?: string
}

interface ContactFormErrorResponse {
  message?: string
  code?: string
  details?: unknown
}

// tRPC mutation の型定義
export interface ContactMutation {
  mutate: (
    data: ContactFormData,
    options?: {
      onSuccess?: (data: ContactFormSuccessResponse) => void
      onError?: (error: ContactFormErrorResponse | Error) => void
    }
  ) => void
  isLoading?: boolean
  isPending?: boolean
  isSuccess?: boolean
  isError?: boolean
}

type ContactFormData = ContactFormInput

// ContactFormのプロップス
interface ContactFormProps {
  onSubmit?: (data: ContactFormData) => void
  mutation?: ContactMutation
}

const ContactForm = ({ onSubmit: onSubmitProp, mutation }: ContactFormProps = {}) => {
  // カスタムフックから必要な機能を取得
  const { browserInfo, sessionInfo, isLoading } = useBrowserInfo()
  const resolver = useContactFormResolver()
  const { handleSuccess, handleError, handleValidationError, clearSubmitError } =
    useContactFormHandlers()

  // Zustandストアからフォーム状態を取得
  const { isSubmitted, submitError } = useAppStore()

  // React Hook Form設定
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setValue,
    watch,
  } = useForm<ContactFormInput>({
    resolver,
    mode: 'onBlur',
    reValidateMode: 'onChange',
    defaultValues: {
      name: '',
      email: '',
      subject: '',
      message: '',
      deviceType: 'desktop',
      browserName: '',
      browserVersion: '',
      osName: '',
      screenResolution: '',
      language: '',
      timezone: '',
      formDuration: 0,
      userAgent: '',
      referer: '',
      sessionId: '',
      previousVisitAt: new Date(),
    },
  })

  // フォームデータの監視
  const watchedData = watch()

  // ブラウザ情報をフォームに設定
  useEffect(() => {
    if (!isLoading && browserInfo && sessionInfo) {
      setValue('userAgent', sessionInfo.userAgent)
      setValue('referer', sessionInfo.referer)
      setValue('sessionId', sessionInfo.sessionId)
      setValue('previousVisitAt', sessionInfo.previousVisitAt)
      setValue('browserName', browserInfo.browserName)
      setValue('browserVersion', browserInfo.browserVersion)
      setValue('osName', browserInfo.osName)
      setValue('deviceType', browserInfo.deviceType)
      setValue('screenResolution', browserInfo.screenResolution)
      setValue('language', browserInfo.language)
      setValue('timezone', browserInfo.timezone)
    }
  }, [setValue, isLoading, browserInfo, sessionInfo])

  const onSubmit = (data: ContactFormData) => {
    // エラーをクリア
    clearSubmitError()

    // Google Analytics: フォーム送信開始をトラッキング
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
      gtag('event', 'contact_form_submit_start', {
        event_category: 'engagement',
        event_label: 'form_submission_start',
        contact_method: 'portfolio_form',
        page_location: window.location.href,
      })
    }

    // フォーム入力時間の計算
    const duration = sessionInfo ? Math.floor((Date.now() - sessionInfo.formStartTime) / 1000) : 0

    // 最終的なフォームデータの準備
    const finalFormData = {
      ...data,
      formDuration: duration,
    }

    try {
      // プロップス経由のonSubmitがあれば使用
      if (onSubmitProp) {
        onSubmitProp(finalFormData)
      }
      // mutation プロップスがあれば使用
      else if (mutation) {
        mutation.mutate(finalFormData, {
          onSuccess: (data) => {
            handleSuccess(data, watchedData, reset)
          },
          onError: (error) => {
            handleError(error)
          },
        })
      }
      // どちらもない場合はデフォルトの成功処理
      else {
        handleSuccess(undefined, watchedData, reset)
      }
    } catch (error) {
      handleError(error as Error)
    }
  }

  // バリデーションエラー時のハンドラー
  const onError = (errors: FieldErrors<ContactFormInput>) => {
    handleValidationError(errors, isSubmitting)
  }

  return (
    <div data-testid="contact-form">
      <h3 className="mb-4 text-2xl font-bold text-gray-900 dark:text-gray-100">Send Message</h3>
      <p className="mb-8 text-sm text-gray-600 dark:text-gray-400">* は必須項目です</p>

      <form
        data-testid="contact-form-element"
        onSubmit={handleSubmit(onSubmit, onError)}
        className="space-y-6"
      >
        <ContactFormFields register={register} errors={errors} />
        <ContactFormButton
          isSubmitted={isSubmitted}
          isSubmitting={isSubmitting}
          isPending={mutation?.isPending}
          submitError={submitError}
        />
      </form>
    </div>
  )
}

export { ContactForm }
export default ContactForm
