import React from 'react'
import { Code, Globe, Settings, Shield } from 'lucide-react'

const TechFeatures = () => {
  const features = [
    {
      id: 'rag-implementation',
      title: 'RAG Implementation',
      description:
        'pgvectorを用いたベクトル検索とOpenAIのEmbeddingを組み合わせ、文脈を考慮した高精度な回答生成を実現。',
      tech: ['pgvector', 'OpenAI Embeddings', 'Cosine Similarity'],
      icon: <Code className="h-6 w-6 text-blue-600" />,
    },
    {
      id: 'hono-backend',
      title: 'Lightweight Backend',
      description:
        'Web標準に準拠したHono.jsを採用し、エッジ環境でも動作可能な軽量かつ高速なバックエンドAPIを構築。',
      tech: ['Hono', 'Zod OpenAPI', 'Edge Compatible'],
      icon: <Shield className="h-6 w-6 text-green-600" />,
    },
    {
      id: 'modern-auth',
      title: 'Secure Authentication',
      description:
        'BetterAuthを採用し、Githubアカウント連携を含むセキュアでモダンな認証フローを実装。',
      tech: ['BetterAuth', 'GitHub OAuth', 'Secure Session'],
      icon: <Settings className="h-6 w-6 text-purple-600" />,
    },
    {
      id: 'data-pipeline',
      title: 'Robust Data Pipeline',
      description:
        'dbtを用いたデータ変換プロセスにより、生データから分析・検索に適した形式への変換を効率化。',
      tech: ['dbt', 'Data Transformation', 'SQL', 'Python'],
      icon: <Globe className="h-6 w-6 text-orange-600" />,
    },
  ]

  return (
    <section
      id="tech-features"
      className="bg-gradient-to-br from-gray-50 to-purple-50 py-20 dark:from-gray-800 dark:to-purple-900"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-16 text-center">
          <h2 className="mb-4 text-3xl font-bold text-gray-900 dark:text-gray-100 md:text-4xl">
            Key Engineering Features
          </h2>
          <p className="mx-auto max-w-3xl text-xl text-gray-600 dark:text-gray-300">
            RAGアプリケーションを支える技術要素
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
                    className="rounded-full bg-purple-100 px-3 py-1 text-sm font-medium text-purple-800 dark:bg-purple-900 dark:text-purple-200"
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
