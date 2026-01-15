import React from 'react'
import { Code, Globe, Settings, Shield } from 'lucide-react'

const TechFeatures = () => {
  const features = [
    {
      id: 'fullstack-safety',
      title: 'Full-stack Type Safety',
      description:
        'FrontendからDBまで、完全に型付けされた開発体験。APIの変更は即座にクライアント側の型エラーとして検知され、実行時エラーを未然に防ぎます。',
      tech: ['Next.js', 'tRPC', 'Drizzle ORM'],
      icon: <Code className="h-6 w-6 text-blue-600" />,
    },
    {
      id: 'edge-security',
      title: 'Edge Security & Performance',
      description:
        'リクエストはEdgeで即座に処理。Redisを用いたRate LimitingとBot検知により、サーバーリソースを保護しつつ、ユーザーには高速なレスポンスを提供します。',
      tech: ['Vercel Edge Runtime', 'Upstash Redis'],
      icon: <Shield className="h-6 w-6 text-green-600" />,
    },
    {
      id: 'quality-assurance',
      title: 'Quality Assurance Strategy',
      description:
        '単体テストからE2Eテストまで、5層のテスト戦略（Unit, DB, External, UI, E2E）を実装。PR作成時に全てのチェックが自動実行され、品質低下を許しません。',
      tech: ['Vitest', 'Playwright', 'Github Actions'],
      icon: <Settings className="h-6 w-6 text-purple-600" />,
    },
    {
      id: 'modern-devops',
      title: 'Modern DevOps Ecosystem',
      description:
        'Monorepoによる効率的なコード管理と、Dependabotによる依存関係の自律的な更新。開発者が「開発」のみに集中できる環境を整備しています。',
      tech: ['Turborepo', 'Dependabot', 'Biome'],
      icon: <Globe className="h-6 w-6 text-orange-600" />,
    },
  ]

  return (
    <section
      id="tech-features"
      className="bg-gradient-to-br from-gray-50 to-blue-50 py-20 dark:from-gray-800 dark:to-blue-900"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-16 text-center">
          <h2 className="mb-4 text-3xl font-bold text-gray-900 dark:text-gray-100 md:text-4xl">
            Key Engineering Features
          </h2>
          <p className="mx-auto max-w-3xl text-xl text-gray-600 dark:text-gray-300">
            このシステムを支える主要な技術的特徴
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          {features.map((feature) => (
            <div
              key={feature.id}
              className="rounded-2xl border border-gray-100 bg-white p-8 shadow-lg transition-all duration-300 hover:shadow-xl dark:border-gray-700 dark:bg-gray-800"
            >
              <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center">
                  <div className="mr-4 rounded-full bg-gray-50 p-3 dark:bg-gray-700">
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                    {feature.title}
                  </h3>
                </div>
              </div>

              <p className="mb-6 leading-relaxed text-gray-600 dark:text-gray-300">
                {feature.description}
              </p>

              <div className="flex flex-wrap gap-2">
                {feature.tech.map((tech, techIndex) => (
                  <span
                    key={`${feature.id}-tech-${techIndex}`}
                    className="rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                  >
                    {tech}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default TechFeatures
