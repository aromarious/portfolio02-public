import { Monitor, Network, Server, Wrench } from 'lucide-react'

const TechStackDetails = () => {
  const stackCategories = [
    {
      icon: <Monitor className="h-8 w-8" />,
      title: 'Frontend',
      color: 'from-blue-500 to-cyan-500',
      items: [
        {
          name: 'Next.js (App Router)',
          why: 'React Server Componentsによる効率的なデータフェッチとSEO最適化。',
        },
        {
          name: 'React',
          why: '最新のReact機能（Actions, useOptimistic等）を活用したモダンなUI構築。',
        },
      ],
    },
    {
      icon: <Server className="h-8 w-8" />,
      title: 'Backend & Data',
      color: 'from-green-500 to-emerald-500',
      items: [
        {
          name: 'Hono.js',
          why: 'Web標準に基づいた軽量・高速なWebフレームワーク。',
        },
        {
          name: 'pgvector & PostgreSQL',
          why: 'リレーショナルデータとベクトルデータを単一のDBで効率的に管理。',
        },
        {
          name: 'Drizzle ORM',
          why: 'TypeScriptファーストなORMによる型安全なDB操作。',
        },
      ],
    },
    {
      icon: <Network className="h-8 w-8" />,
      title: 'AI & Pipeline',
      color: 'from-indigo-500 to-purple-500',
      items: [
        {
          name: 'OpenAI API',
          why: 'Embedding（ベクトル化）およびChat Completion（回答生成）に使用。',
        },
        {
          name: 'dbt (Data Build Tool)',
          why: 'SQLベースのデータ変換パイプライン管理。データの信頼性を担保。',
        },
      ],
    },
    {
      icon: <Wrench className="h-8 w-8" />,
      title: 'DevOps',
      color: 'from-purple-500 to-pink-500',
      items: [
        {
          name: 'Vercel',
          why: 'フロントエンドおよびEdge関数のホスティングプラットフォーム。',
        },
        {
          name: 'Neon (PostgreSQL)',
          why: 'サーバーレスPostgreSQL。開発・本番環境の分離とスケーリングが容易。',
        },
      ],
    },
  ]

  return (
    <section id="tech-stack" className="bg-white py-20 dark:bg-gray-900">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-16 text-center">
          <h2 className="mb-4 text-3xl font-bold text-gray-900 dark:text-gray-100 md:text-4xl">
            Technology Stack
          </h2>
          <p className="mx-auto max-w-3xl text-xl text-gray-600 dark:text-gray-300">
            Mimicordで採用している主要技術
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          {stackCategories.map((category) => (
            <div
              key={category.title}
              className="rounded-2xl border border-gray-100 bg-white p-6 shadow-lg dark:border-gray-700 dark:bg-gray-800"
            >
              <div className="mb-6 flex items-center">
                <div
                  className={`rounded-xl bg-gradient-to-r p-2 ${category.color} mr-3 text-white`}
                >
                  {category.icon}
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  {category.title}
                </h3>
              </div>

              <div className="space-y-4">
                {category.items.map((item) => (
                  <div
                    key={item.name}
                    className="rounded-lg bg-gray-50 p-4 transition-colors hover:bg-gray-100 dark:bg-gray-700/50 dark:hover:bg-gray-700"
                  >
                    <div className="mb-1 flex items-center justify-between">
                      <span className="font-semibold text-gray-900 dark:text-gray-100">
                        {item.name}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300">{item.why}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default TechStackDetails
