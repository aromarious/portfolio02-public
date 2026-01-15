import type { FieldErrors, UseFormRegister } from 'react-hook-form'

import type { ContactFormInput } from '@aromarious/validators'

interface ContactFormFieldsProps {
  register: UseFormRegister<ContactFormInput>
  errors: FieldErrors<ContactFormInput>
}

export const ContactFormFields = ({ register, errors }: ContactFormFieldsProps) => {
  return (
    <>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div>
          <label
            htmlFor="name"
            className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            お名前 *
          </label>
          <input
            type="text"
            id="name"
            data-testid="name-input"
            {...register('name')}
            className={`w-full rounded-lg border bg-white px-4 py-3 text-gray-900 transition-all duration-200 focus:border-transparent focus:ring-2 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400 ${
              errors.name
                ? 'border-red-300 focus:ring-red-500'
                : 'border-gray-300 focus:ring-blue-500'
            }`}
            placeholder="山田太郎"
          />
          {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>}
        </div>
        <div>
          <label
            htmlFor="company"
            className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            会社名 *
          </label>
          <input
            type="text"
            id="company"
            data-testid="company-input"
            {...register('company')}
            className={`w-full rounded-lg border bg-white px-4 py-3 text-gray-900 transition-all duration-200 focus:border-transparent focus:ring-2 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400 ${
              errors.company
                ? 'border-red-300 focus:ring-red-500'
                : 'border-gray-300 focus:ring-blue-500'
            }`}
            placeholder="株式会社サンプル"
          />
          {errors.company && <p className="mt-1 text-sm text-red-600">{errors.company.message}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div>
          <label
            htmlFor="email"
            className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            メールアドレス *
          </label>
          <input
            type="email"
            id="email"
            data-testid="email-input"
            {...register('email')}
            className={`w-full rounded-lg border bg-white px-4 py-3 text-gray-900 transition-all duration-200 focus:border-transparent focus:ring-2 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400 ${
              errors.email
                ? 'border-red-300 focus:ring-red-500'
                : 'border-gray-300 focus:ring-blue-500'
            }`}
            placeholder="your.email@example.com"
          />
          {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>}
        </div>
        <div>
          <label
            htmlFor="twitterHandle"
            className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Twitterハンドル
          </label>

          <div className="flex">
            <span className="inline-flex items-center rounded-l-lg border border-r-0 border-gray-300 bg-gray-200 px-3 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-600 dark:text-gray-400">
              @
            </span>
            <input
              type="text"
              id="twitterHandle"
              {...register('twitterHandle')}
              className={`block w-full min-w-0 flex-1 rounded-none rounded-r-lg border bg-white px-4 py-3 text-gray-900 transition-all duration-200 focus:border-blue-500 focus:border-transparent focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-blue-500 dark:focus:ring-blue-500 ${
                errors.twitterHandle ? 'border-red-300 focus:ring-red-500' : 'border-gray-300'
              }`}
              placeholder="username"
            />
          </div>
          {errors.twitterHandle && (
            <p className="mt-1 text-sm text-red-600">{errors.twitterHandle.message}</p>
          )}
        </div>
      </div>

      <div>
        <label
          htmlFor="message"
          className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          メッセージ *
        </label>
        <textarea
          id="message"
          data-testid="message-textarea"
          {...register('message')}
          rows={6}
          className={`resize-vertical w-full rounded-lg border bg-white px-4 py-3 text-gray-900 transition-all duration-200 focus:border-transparent focus:ring-2 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400 ${
            errors.message
              ? 'border-red-300 focus:ring-red-500'
              : 'border-gray-300 focus:ring-blue-500'
          }`}
          placeholder="お問い合わせ内容をご記入ください..."
        />
        {errors.message && <p className="mt-1 text-sm text-red-600">{errors.message.message}</p>}
      </div>
    </>
  )
}
