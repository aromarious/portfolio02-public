import { Github, Sparkles } from 'lucide-react'

type PageHeaderProps = {
  badge?: string
  title: React.ReactNode
  description: React.ReactNode
}

const PageHeader = ({
  badge = 'RAG Application Showcase',
  title,
  description,
}: PageHeaderProps) => {
  return (
    <section className="relative flex min-h-[50vh] items-center justify-center overflow-hidden bg-gray-50 py-20 dark:bg-gray-900">
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-300 via-purple-300 to-slate-200 dark:from-indigo-900 dark:via-purple-900 dark:to-slate-900" />

      {/* Overlay Pattern (optional) */}
      <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center opacity-40 dark:opacity-20" />

      <div className="relative z-10 mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          {/* Badge */}
          <div className="mb-6 inline-flex items-center rounded-full border border-purple-200 bg-purple-100/50 px-4 py-2 backdrop-blur-sm dark:border-purple-500/30 dark:bg-purple-500/10">
            <Sparkles className="mr-2 h-4 w-4 text-purple-600 dark:text-purple-400" />
            <span className="text-sm font-medium text-purple-700 dark:text-purple-200">
              {badge}
            </span>
          </div>

          {/* Main Heading */}
          <h1 className="mb-6 text-4xl font-bold leading-normal text-gray-900 dark:text-white md:text-6xl lg:text-7xl">
            {title}
          </h1>

          {/* Description */}
          <p className="mx-auto mb-10 max-w-2xl text-base leading-relaxed text-gray-600 dark:text-gray-300 md:text-lg">
            {description}
          </p>

          {/* CTA Button */}
          <div className="flex justify-center gap-4">
            <a
              href="https://mimicord.aromarious.com"
              target="_blank"
              rel="noopener noreferrer"
              className="group relative inline-flex items-center gap-2 overflow-hidden rounded-full bg-gray-900 px-8 py-3 text-base font-semibold text-white shadow-lg transition-all duration-300 hover:scale-105 hover:bg-gray-800 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-white dark:bg-white dark:text-gray-900 dark:hover:bg-gray-50 dark:focus:ring-offset-gray-900"
            >
              <span className="relative z-10">Visit Website</span>
              <Sparkles className="h-4 w-4 transition-transform group-hover:rotate-12" />
              <div className="absolute inset-0 -z-10 bg-gradient-to-r from-indigo-500 to-purple-500 opacity-0 transition-opacity group-hover:opacity-100 dark:from-indigo-50 dark:to-purple-50" />
            </a>
            <a
              href="https://github.com/aromarious/mimicord-portfolio"
              target="_blank"
              rel="noopener noreferrer"
              className="group relative inline-flex items-center gap-2 overflow-hidden rounded-full border border-gray-200 bg-white px-8 py-3 text-base font-semibold text-gray-900 shadow-sm transition-all duration-300 hover:scale-105 hover:bg-gray-50 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-white dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700 dark:focus:ring-offset-gray-900"
            >
              <span className="relative z-10">View Source</span>
              <Github className="h-4 w-4 transition-transform group-hover:rotate-12" />
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}

export default PageHeader
