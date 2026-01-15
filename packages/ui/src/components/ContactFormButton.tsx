import { AlertCircle, CheckCircle, Send } from 'lucide-react'

interface ContactFormButtonProps {
  isSubmitted: boolean
  isSubmitting: boolean
  isPending?: boolean
  submitError?: string | null
}

export const ContactFormButton = ({
  isSubmitted,
  isSubmitting,
  isPending,
  submitError,
}: ContactFormButtonProps) => {
  const isDisabled = isSubmitted || isSubmitting || isPending

  return (
    <>
      {/* 送信エラーの表示 */}
      {submitError && (
        <div className="flex items-center rounded-lg bg-red-50 p-4 text-red-700 dark:bg-red-900/20 dark:text-red-400">
          <AlertCircle className="mr-2 h-5 w-5" />
          <span>{submitError}</span>
        </div>
      )}

      <button
        type="submit"
        data-testid="submit-button"
        disabled={isSubmitted || isSubmitting || isPending}
        className={`flex w-full items-center justify-center rounded-lg px-8 py-4 font-semibold transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-blue-500 focus:ring-offset-2 ${
          isSubmitted
            ? 'bg-green-500 text-white'
            : isSubmitting || isPending
              ? 'cursor-not-allowed bg-gray-400 text-white'
              : 'transform bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg hover:scale-105 hover:from-blue-700 hover:to-purple-700 hover:shadow-xl'
        }`}
      >
        {isSubmitted ? (
          <>
            <CheckCircle className="mr-2 h-5 w-5" />
            送信完了
          </>
        ) : isSubmitting || isPending ? (
          <>
            <div className="mr-2 h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
            送信中...
          </>
        ) : (
          <>
            <Send className="mr-2 h-5 w-5" />
            メッセージを送信
          </>
        )}
      </button>

      <p className="mt-4 text-sm text-gray-500">* 通常24時間以内にご返信いたします</p>
    </>
  )
}
