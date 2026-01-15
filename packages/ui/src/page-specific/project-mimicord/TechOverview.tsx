'use client'

import { Bot, Database, Search } from 'lucide-react'
import { useTheme } from 'next-themes'

import { SystemFlowDiagram } from '../top/SystemFlowDiagram'

const TechOverview = () => {
  const { resolvedTheme } = useTheme()
  const points = [
    {
      icon: <Bot className="h-8 w-8" />,
      title: '会話履歴の要約 (RAG)',
      description:
        'Discordの膨大な会話ログを、LLM (OpenAI) が文脈を理解して要約。過去の議論を瞬時に振り返ることが可能です。',
    },
    {
      icon: <Database className="h-8 w-8" />,
      title: 'ベクトル検索の実装',
      description:
        'PostgreSQL + pgvector を用いて会話内容をベクトル化。キーワード一致だけでなく、意味的な類似性による高度な検索を実現。',
    },
    {
      icon: <Search className="h-8 w-8" />,
      title: 'OpenAPI Schema',
      description: (
        <>
          Hono + Zod OpenAPI により、
          <a
            href="https://mimicord.aromarious.com/api/reference"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline dark:text-blue-400"
          >
            APIリファレンス
          </a>
          を自動生成。実装とドキュメントの乖離を防ぎ、メンテナンスコストを最小化します。
        </>
      ),
    },
  ]

  return (
    <section id="tech-overview" className="bg-white py-20 dark:bg-gray-900">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-16 text-center">
          <h2 className="mb-4 text-3xl font-bold text-gray-900 dark:text-gray-100 md:text-4xl">
            System Architecture
          </h2>
          <p className="mx-auto max-w-3xl text-lg text-gray-600 dark:text-gray-300">
            pgvectorとOpenAIを活用したRAG (Retrieval-Augmented Generation) アーキテクチャ。
            Discord会話データのベクトル化から検索、要約生成までのフローを最新のスタックで構築しています。
          </p>
        </div>

        <div className="mb-16">
          {/* Architecture Diagram */}
          <div className="relative mb-12">
            <div className="relative overflow-hidden rounded-2xl bg-gray-50 p-4 shadow-xl dark:bg-gray-800">
              <SystemFlowDiagram
                resolvedTheme={resolvedTheme}
                lightImageSrc="/images/projects/mimicord/mimicord-app-architecture.light.svg"
                darkImageSrc="/images/projects/mimicord/mimicord-app-architecture.dark.svg"
                alt="Mimicord System Architecture"
                linkUrl="https://mimicord.aromarious.com"
                clickAction="expand"
                description={
                  <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
                    <div>
                      <h3 className="mb-3 text-lg font-semibold text-gray-800 dark:text-gray-200">
                        データフロー
                      </h3>
                      <ol className="list-decimal space-y-2 pl-5 text-sm text-gray-600 dark:text-gray-400">
                        <li>ユーザーがDiscordチャット履歴をアップロード</li>
                        <li>Next.jsがデータを処理し、pgvectorにベクトル化して保存</li>
                        <li>ユーザーが質問を入力 → pgvectorで関連コンテキストを検索</li>
                        <li>OpenAI APIを使用して回答を生成し、ユーザーに提示</li>
                      </ol>
                    </div>
                    <div>
                      <h3 className="mb-3 text-lg font-semibold text-gray-800 dark:text-gray-200">
                        技術スタック
                      </h3>
                      <ul className="list-disc space-y-1 pl-5 text-sm text-gray-600 dark:text-gray-400">
                        <li>Next.js + Hono (Backend)</li>
                        <li>BetterAuth (Authentication)</li>
                        <li>PostgreSQL + pgvector (Vector Database)</li>
                        <li>OpenAI API (Embeddings & Completion)</li>
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
                  className="rounded-2xl border border-purple-100 bg-gradient-to-br from-purple-50 to-indigo-50 p-6 transition-all duration-300 hover:scale-105 hover:transform hover:shadow-lg dark:border-purple-800 dark:from-purple-900/20 dark:to-indigo-900/20"
                >
                  <div className="mb-4 text-purple-600 dark:text-purple-400">{point.icon}</div>
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
