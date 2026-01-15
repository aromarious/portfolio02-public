import Image from 'next/image'
import { Brain, Code, RefreshCw, Zap } from 'lucide-react'

const About = () => {
  const strengths = [
    {
      icon: <Code className="h-8 w-8" />,
      title: '技術適応力',
      description:
        'プロバイダ時代のサーバー管理からマツダのPerl/CGI、IBM子会社のJava J2EE、現在のT3 Stackまで、様々な技術環境に素早く適応し、実用的なシステムを構築。',
    },
    {
      icon: <Brain className="h-8 w-8" />,
      title: 'アーキテクチャ設計力',
      description:
        '与えられた技術スタック内で最適な構成を判断。ユーザー要求の理解、適切な責任分割、拡張性を考慮した設計により、保守しやすいシステムを実現。',
    },
    {
      icon: <RefreshCw className="h-8 w-8" />,
      title: '既存システム理解・改善力',
      description:
        '長年の経験により、他人が書いたコードや既存システムの構造を素早く把握。問題点を特定し、段階的な改善提案と実装が可能。',
    },
    {
      icon: <Zap className="h-8 w-8" />,
      title: '効率的な開発実践',
      description:
        'CI/CDパイプライン構築とAIツール活用により開発効率を向上。チーム開発における実践的な改善提案と実装で生産性に貢献。',
    },
  ]

  return (
    <section id="about" className="bg-white py-20 dark:bg-gray-900">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-16 text-center">
          <h2 className="mb-4 text-3xl font-bold text-gray-900 dark:text-gray-100 md:text-4xl">
            About Me
          </h2>
          <p className="mx-auto max-w-3xl text-lg font-medium text-gray-600 dark:text-gray-300">
            1995年からの知見を、最新の技術スタックへ。
          </p>
        </div>

        <div className="mb-16 grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
          {/* Profile Image */}
          <div className="relative">
            <div className="relative overflow-hidden rounded-2xl shadow-xl">
              <Image
                src="https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg?auto=compress&cs=tinysrgb&w=800"
                alt="Professional working on laptop in modern office"
                width={800}
                height={400}
                className="h-[400px] w-full object-cover"
                style={{ width: 'auto', height: 'auto' }}
                priority={false}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent" />
            </div>
          </div>

          {/* About Text */}
          <div>
            <div className="space-y-6 leading-relaxed text-gray-600 dark:text-gray-300">
              <div>
                <h3 className="mb-2 text-sm font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                  Bridging Eras of Tech
                </h3>
                <p>
                  プロバイダ黎明期のサーバー管理から、Perl/CGI、Javaフレームワーク設計まで。技術の激しい変遷を最前線で経験する中で、「不変のシステム設計思想」を学びました。
                </p>
              </div>

              <div>
                <h3 className="mb-2 text-sm font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                  Variable Perspectives
                </h3>
                <p>
                  2011年からの育児期間は、一歩引いた視点で技術動向を見つめ直す時間でした。そして2020年からは、技術への探求心に突き動かされ、モダンな開発環境のキャッチアップを本格化させました。
                  T3 StackやGitHub
                  Actions、生成AIといった最新技術を、単なる流行としてではなく、確かな設計眼を持って実践に取り入れています。
                </p>
              </div>

              <div>
                <h3 className="mb-2 text-sm font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                  Engineering in AI Era
                </h3>
                <p>
                  技術が好きだからこそ、過去と現在のベストプラクティスを柔軟に組み合わせられる。AI時代のエンジニアとして、ビジネスの要件を最適なアーキテクチャへと翻訳し、持続可能なシステムを提供します。
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-16 grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
          {strengths.map((strength) => (
            <div
              key={strength.title}
              className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50 p-6 transition-all duration-300 hover:scale-105 hover:transform hover:shadow-lg dark:border-blue-800 dark:from-blue-900/20 dark:to-indigo-900/20"
            >
              <div className="mb-4 text-blue-600 dark:text-blue-400">{strength.icon}</div>
              <h3 className="mb-3 text-lg font-semibold text-gray-900 dark:text-gray-100">
                {strength.title}
              </h3>
              <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300">
                {strength.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default About
