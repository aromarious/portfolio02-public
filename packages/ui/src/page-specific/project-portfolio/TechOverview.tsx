'use client'

import Image from 'next/image'
import { Cog, ShieldCheck, Zap } from 'lucide-react'
import { useTheme } from 'next-themes'

import { SystemFlowDiagram } from '../top/SystemFlowDiagram'

const TechOverview = () => {
  const { resolvedTheme } = useTheme()
  const points = [
    {
      icon: <ShieldCheck className="h-8 w-8" />,
      title: '実務レベルの堅牢性',
      description:
        '型安全性と自動テストによる品質担保。使い捨てではなく、長期運用に耐えうるコードベース。',
    },
    {
      icon: <Cog className="h-8 w-8" />,
      title: '自動化の推進',
      description:
        'CI/CD、依存関係更新、品質監視の自動化により、開発者が本来の業務に集中できる環境を整備。',
    },
    {
      icon: <Zap className="h-8 w-8" />,
      title: 'グローバル・パフォーマンス',
      description: 'Vercel Edge NetworkとRedisを活用し、世界中どこからでも低遅延・高可用性を実現。',
    },
  ]

  return (
    <section id="tech-overview" className="bg-white py-20 dark:bg-gray-900">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-16 text-center">
          <h2 className="mb-4 text-3xl font-bold text-gray-900 dark:text-gray-100 md:text-4xl">
            Why this architecture?
          </h2>
          <p className="mx-auto max-w-3xl text-lg text-gray-600 dark:text-gray-300">
            Web開発技術の進化のスピードは非常に速いですが、実務で重要視される「チーム開発」「長期運用」という本質は変わりません。
            このプロジェクトでは、実務レベルの開発・運用フローを個人開発で実践・実証しています。
          </p>
        </div>

        <div className="mb-16">
          {/* Architecture Diagram */}
          <div className="relative mb-12">
            <div className="relative overflow-hidden rounded-2xl bg-gray-50 p-4 shadow-xl dark:bg-gray-800">
              <SystemFlowDiagram
                resolvedTheme={resolvedTheme}
                lightImageSrc="/images/projects/portfolio/portfolio-contact.drawio.light.svg"
                darkImageSrc="/images/projects/portfolio/portfolio-contact.drawio.dark.svg"
                alt="Portfolio Contact System Flow"
                clickAction="expand"
                description={
                  <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
                    <div>
                      <h3 className="mb-3 text-lg font-semibold text-gray-800 dark:text-gray-200">
                        データフロー
                      </h3>
                      <ol className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                        <li>訪問者が問い合わせフォーム送信 → Next.js</li>
                        <li>Next.jsがデータ保存 → Supabase (PostgreSQL)</li>
                        <li>Next.jsがデータ同期 → Notion & Slack</li>
                        <li>aromariousがNotion & Slack通知を確認</li>
                      </ol>
                    </div>
                    <div>
                      <h3 className="mb-3 text-lg font-semibold text-gray-800 dark:text-gray-200">
                        技術スタック
                      </h3>
                      <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                        <li>Next.js + React</li>
                        <li>TypeScript + tRPC</li>
                        <li>Supabase + Drizzle ORM</li>
                        <li>Notion API + Slack API</li>
                      </ul>
                    </div>
                  </div>
                }
              />
            </div>
          </div>

          {/* Points */}
          <div>
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
              {points.map((point) => (
                <div
                  key={point.title}
                  className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50 p-6 transition-all duration-300 hover:scale-105 hover:transform hover:shadow-lg dark:border-blue-800 dark:from-blue-900/20 dark:to-indigo-900/20"
                >
                  <div className="mb-4 text-blue-600 dark:text-blue-400">{point.icon}</div>
                  <h3 className="mb-3 text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {point.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300">
                    {point.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default TechOverview
