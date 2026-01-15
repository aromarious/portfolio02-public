import { ArrowRight, Database, Globe, Layers, MessageSquare } from 'lucide-react'

const DevProcess = () => {
  const steps = [
    {
      step: 'Step 1',
      title: 'User Input',
      icon: <MessageSquare className="h-6 w-6" />,
      color: 'bg-blue-500',
      description: 'ユーザーからの質問・検索',
      details: [
        'Discord風のUIから自然言語で質問を入力',
        '入力内容をOpenAI Embedding APIへ送信',
        '質問文をベクトル表現に変換',
      ],
    },
    {
      step: 'Step 2',
      title: 'Vector Search',
      icon: <Database className="h-6 w-6" />,
      color: 'bg-green-500',
      description: '関連情報の検索',
      details: [
        'pgvectorを用いてコサイン類似度検索を実行',
        '過去の会話ログから関連性の高いチャンクを抽出',
        '類似度の高い順にコンテキストを取得',
      ],
    },
    {
      step: 'Step 3',
      title: 'Context Generation',
      icon: <Layers className="h-6 w-6" />,
      color: 'bg-purple-500',
      description: 'プロンプト構築',
      details: [
        '検索された会話コンテキストをプロンプトに注入',
        'LLMへの指示（システムプロンプト）と結合',
        'トークン数制限を考慮した最適化',
      ],
    },
    {
      step: 'Step 4',
      title: 'LLM Response',
      icon: <Globe className="h-6 w-6" />,
      color: 'bg-orange-500',
      description: '回答の生成と返却',
      details: [
        'OpenAI Chat Completion APIへリクエスト送信',
        '文脈を踏まえた回答をストリーミングで生成',
        'UIへリアルタイムに表示',
      ],
    },
  ]

  return (
    <section
      id="dev-process"
      className="bg-gradient-to-br from-gray-50 to-purple-50 py-20 dark:from-gray-900 dark:to-gray-800"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-16 text-center">
          <h2 className="mb-4 text-3xl font-bold text-gray-900 dark:text-gray-100 md:text-4xl">
            RAG Process Flow
          </h2>
          <p className="mx-auto max-w-3xl text-xl text-gray-600 dark:text-gray-300">
            質問から回答生成までの処理フロー
          </p>
        </div>

        <div className="relative">
          {/* Connecting Line (Desktop) */}
          <div className="hidden lg:absolute lg:left-1/2 lg:block lg:h-full lg:w-0.5 lg:-translate-x-1/2 lg:bg-gray-200 lg:dark:bg-gray-700" />

          <div className="space-y-12">
            {steps.map((step, index) => (
              <div key={step.title} className="relative">
                <div
                  className={`flex flex-col items-center lg:flex-row ${
                    index % 2 === 0 ? 'lg:flex-row-reverse' : ''
                  }`}
                >
                  {/* Content Card */}
                  <div className="w-full lg:w-5/12">
                    <div className="rounded-2xl bg-white p-6 shadow-lg transition-all duration-300 hover:shadow-xl dark:bg-gray-800">
                      <div className="mb-4 flex items-center justify-between">
                        <div className={`rounded-xl p-3 text-white ${step.color}`}>{step.icon}</div>
                        <span className={`text-sm font-bold ${step.color.replace('bg-', 'text-')}`}>
                          {step.step}
                        </span>
                      </div>
                      <h3 className="mb-2 text-xl font-bold text-gray-900 dark:text-gray-100">
                        {step.title}
                      </h3>
                      <p className="mb-4 font-medium text-gray-600 dark:text-gray-300">
                        {step.description}
                      </p>
                      <ul className="space-y-2">
                        {step.details.map((detail, i) => (
                          <li key={`${step.title}-detail-${i}`} className="flex items-start">
                            <ArrowRight className="mr-2 mt-1 h-4 w-4 flex-shrink-0 text-gray-400" />
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              {detail}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Center Dot */}
                  <div className="my-4 flex w-full justify-center lg:my-0 lg:w-2/12">
                    <div
                      className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-4 border-white dark:border-gray-900 ${step.color}`}
                    >
                      <div className="h-2 w-2 rounded-full bg-white" />
                    </div>
                  </div>

                  {/* Empty Space for Grid Layout */}
                  <div className="w-full lg:w-5/12" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

export default DevProcess
