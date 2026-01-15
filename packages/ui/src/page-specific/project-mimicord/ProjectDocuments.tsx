import { Book, Database, ExternalLink, FileText } from 'lucide-react'

const ProjectDocuments = () => {
  const documents = [
    {
      title: 'Project Overview',
      description: 'プロジェクトの概要、機能一覧、セットアップ手順などの全体像。',
      icon: <Book className="h-6 w-6 text-slate-600" />,
      href: 'https://github.com/aromarious/mimicord-portfolio/blob/main/README.md',
      type: 'GitHub',
    },
    {
      title: 'Technical Spec',
      description: '技術要件・アーキテクチャ設計書。Webアプリ全体の設計思想。',
      icon: <FileText className="h-6 w-6 text-indigo-600" />,
      href: 'https://github.com/aromarious/mimicord-portfolio/blob/main/docs/technical_spec.md',
      type: 'GitHub',
    },
    {
      title: 'API Design & Standards',
      description: 'API設計ガイドラインとHono実装標準。バージョニング戦略含む。',
      icon: <FileText className="h-6 w-6 text-purple-600" />,
      href: 'https://github.com/aromarious/mimicord-portfolio/blob/main/docs/api_design_guidelines.md',
      type: 'GitHub',
    },
    {
      title: 'API Reference',
      description:
        'ScalarによるインタラクティブなAPIリファレンス。エンドポイントの仕様確認と実行テストが可能。',
      icon: <FileText className="h-6 w-6 text-cyan-600" />,
      href: 'https://mimicord.aromarious.com/api/reference',
      type: 'Scalar',
    },
    {
      title: 'CI/CD & Testing',
      description: 'GitHub ActionsによるCI/CD運用ガイドラインとテスト戦略。',
      icon: <FileText className="h-6 w-6 text-orange-600" />,
      href: 'https://github.com/aromarious/mimicord-portfolio/blob/main/docs/ci_guideline.md',
      type: 'GitHub',
    },
    {
      title: 'Data Pipeline (dbt)',
      description: 'MotherDuck + pgvector によるRAG用データ構築フロー。',
      icon: <Database className="h-6 w-6 text-green-600" />,
      href: 'https://github.com/aromarious/mimicord-portfolio/blob/main/dbt/README.md',
      type: 'GitHub',
    },
  ]

  return (
    <section id="project-documents" className="bg-white py-20 dark:bg-gray-900">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-16 text-center">
          <h2 className="mb-4 text-3xl font-bold text-gray-900 dark:text-gray-100 md:text-4xl">
            Design Documents
          </h2>
          <p className="mx-auto max-w-3xl text-xl text-gray-600 dark:text-gray-300">
            設計・仕様に関するドキュメント
          </p>
          <p className="mx-auto mt-6 max-w-3xl text-base text-gray-600 dark:text-gray-300">
            個人開発のプロジェクトでも、このプロジェクトにジョインすることになる新人がスムーズに開発に移れるよう、システムの説明やクイックスタートガイド、開発ガイドラインなどを書くようにしています。
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {documents.map((doc) => (
            <a
              key={doc.title}
              href={doc.href}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-6 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-xl dark:border-gray-700 dark:bg-gray-800"
            >
              <div className="absolute right-4 top-4 opacity-0 transition-opacity group-hover:opacity-100">
                <ExternalLink className="h-5 w-5 text-gray-400" />
              </div>

              <div className="mb-4 inline-flex rounded-xl bg-gray-50 p-3 dark:bg-gray-700">
                {doc.icon}
              </div>

              <h3 className="mb-2 text-xl font-bold text-gray-900 group-hover:text-blue-600 dark:text-gray-100 dark:group-hover:text-blue-400">
                {doc.title}
              </h3>

              <p className="mb-4 text-sm text-gray-600 dark:text-gray-300">{doc.description}</p>

              <div className="flex items-center">
                <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                  {doc.type}
                </span>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  )
}

export default ProjectDocuments
