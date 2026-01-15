import { Monitor, Network, Server, Wrench } from 'lucide-react'

const TechStackDetails = () => {
  const stackCategories = [
    {
      icon: <Monitor className="h-8 w-8" />,
      title: 'Frontend Ecosystem',
      color: 'from-blue-500 to-cyan-500',
      items: [
        {
          name: 'Next.js (App Router) & React',
          why: 'App Router (Server Components)によるバンドル削減とSEO最適化。React 19への早期適応。',
        },
        {
          name: 'Tailwind CSS & PostCSS',
          why: 'クラス名管理からの解放と、Design System構築の容易さ。コンポーネントとの高いポータビリティ。',
        },
        {
          name: 'Radix UI & Lucide React',
          why: 'アクセシビリティ(a11y)への配慮と、ヘッドレスUIによるデザインの自由度確保。',
        },
        {
          name: 'Zustand & Nuqs (URL State)',
          why: 'Reduxより軽量でボイラープレート不要。URL State管理により「共有可能なUI状態」を実現。',
        },
      ],
    },
    {
      icon: <Server className="h-8 w-8" />,
      title: 'Backend & Data',
      color: 'from-green-500 to-emerald-500',
      items: [
        {
          name: 'tRPC v11 (Server Actions)',
          why: 'APIスキーマ定義不要で、バックエンドの型をフロントエンドで直接利用可能。開発効率が向上。',
        },
        {
          name: 'Supabase (PostgreSQL)',
          why: 'リレーショナルデータの一貫性担保と、フルマネージドによる運用コストの最小化。',
        },
        {
          name: 'Drizzle ORM',
          why: 'Prismaより軽量で、SQLの表現力を損なわない薄い抽象化レイヤー。Cold Start対策。',
        },
        {
          name: 'Upstash Redis',
          why: 'サーバーレス環境と相性の良いHTTPベースのRedis。Rate Limitingの状態管理に最適。',
        },
      ],
    },
    {
      icon: <Network className="h-8 w-8" />,
      title: 'Infrastructure & DevOps',
      color: 'from-indigo-500 to-purple-500',
      items: [
        {
          name: 'Vercel (Edge Network)',
          why: 'グローバル分散とゼロコンフィグデプロイ。Edge Middlewareによるセキュリティ層の実現。',
        },
        {
          name: 'GitHub Actions',
          why: 'コードベースと統合された自動化。PRごとのプレビュー環境構築と品質チェックの強制。',
        },
        {
          name: 'Vercel Analytics & Speed Insights',
          why: 'ユーザー体験(CWV)のリアルタイム可視化と、ボトルネックの即時特定。',
        },
        {
          name: 'audit-ci & Gitleaks',
          why: '脆弱性ライブラリの混入と機密情報の流出を、コミット段階で自動的にブロック。',
        },
      ],
    },
    {
      icon: <Wrench className="h-8 w-8" />,
      title: 'Developer Experience',
      color: 'from-purple-500 to-pink-500',
      items: [
        {
          name: 'Turborepo (Monorepo)',
          why: '複数パッケージ（Web, DB, Config）の依存関係管理と、ビルドキャッシュによる高速化。',
        },
        {
          name: 'Biome (Ultra fast)',
          why: 'Prettier/ESLintより高速。大規模コードベースでも待機時間の少ない開発体験。',
        },
        {
          name: 'Vitest, Playwright, Testing Library',
          why: 'Web標準に準拠したテスト環境。実際のユーザー操作をシミュレートし、リグレッションを防止。',
        },
      ],
    },
  ]

  return (
    <section id="tech-stack" className="bg-white py-20 dark:bg-gray-900">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-16 text-center">
          <h2 className="mb-4 text-3xl font-bold text-gray-900 dark:text-gray-100 md:text-4xl">
            Comprehensive Tech Stack
          </h2>
          <p className="mx-auto max-w-3xl text-xl text-gray-600 dark:text-gray-300">
            採用されている技術とその選定理由
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
