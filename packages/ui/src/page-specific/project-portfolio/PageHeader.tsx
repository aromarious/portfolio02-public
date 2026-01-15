import { Sparkles } from 'lucide-react'

type PageHeaderProps = {
  badge?: string
  title: React.ReactNode
  description: React.ReactNode
}

const PageHeader = ({
  badge = 'System Engineering Showcase',
  title,
  description,
}: PageHeaderProps) => {
  return (
    <section className="relative flex min-h-[50vh] items-center justify-center overflow-hidden bg-gray-50 py-20 dark:bg-gray-900">
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-100 via-indigo-200 to-slate-200 dark:from-gray-900 dark:via-gray-800 dark:to-blue-900" />

      {/* Overlay Pattern (optional) */}
      <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center opacity-40 dark:opacity-20" />

      <div className="relative z-10 mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          {/* Badge */}
          <div className="mb-6 inline-flex items-center rounded-full border border-blue-200 bg-blue-100/50 px-4 py-2 backdrop-blur-sm dark:border-blue-500/30 dark:bg-blue-500/10">
            <Sparkles className="mr-2 h-4 w-4 text-blue-600 dark:text-blue-400" />
            <span className="text-sm font-medium text-blue-700 dark:text-blue-200">{badge}</span>
          </div>

          {/* Main Heading */}
          <h1 className="mb-6 text-4xl font-bold leading-normal text-gray-900 dark:text-white md:text-6xl lg:text-7xl">
            {title}
          </h1>

          {/* Description */}
          <p className="mx-auto max-w-2xl text-base leading-relaxed text-gray-600 dark:text-gray-300 md:text-lg">
            {description}
          </p>
        </div>
      </div>
    </section>
  )
}

export default PageHeader
