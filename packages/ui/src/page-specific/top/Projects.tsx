'use client'

import React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, Calendar, Code, ExternalLink } from 'lucide-react'

import { SystemFlowDiagram } from './SystemFlowDiagram'

interface ProjectsProps {
  resolvedTheme?: string
}

const Projects = ({ resolvedTheme }: ProjectsProps) => {
  const currentProjects = [
    {
      id: 'portfolio-contact-system',
      title: 'Portfolio Site with Contact System',
      description:
        'フルスタック開発の実績として、このサイト自体に問い合わせシステムとエッジセキュリティを実装。外部API連携の失敗時処理とフォールバック機能まで含む実用レベルの開発です。',
      tech: ['Next.js', 'TypeScript', 'PostgreSQL', 'Drizzle', 'Notion API', 'Slack webhook'],
      status: '完成済み',
      progress: 100,
      links: {
        tech: '/project-portfolio',
      },
      systemFlow: {
        lightImageSrc: '/images/projects/portfolio/portfolio-contact.drawio.light.svg',
        darkImageSrc: '/images/projects/portfolio/portfolio-contact.drawio.dark.svg',
        alt: 'System Flow Diagram',
        linkUrl: '/project-portfolio',
        description: (
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            <div>
              <h3 className="mb-3 text-lg font-semibold text-gray-800 dark:text-gray-200">
                データフロー
              </h3>
              <ol className="list-decimal space-y-2 pl-5 text-sm text-gray-600 dark:text-gray-400">
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
              <ul className="list-disc space-y-1 pl-5 text-sm text-gray-600 dark:text-gray-400">
                <li>Next.js + React</li>
                <li>TypeScript + tRPC</li>
                <li>Supabase + Drizzle ORM</li>
                <li>Notion API + Slack API</li>
              </ul>
            </div>
          </div>
        ),
      },
    },
    {
      id: 'mimicord-rag-app',
      title: 'Mimicord - Discord Conversation RAG App',
      description:
        'Discordの会話履歴をRAG (Retrieval-Augmented Generation) で要約・検索できるフルスタックWebアプリケーション。pgvectorとOpenAIによるベクトル検索、Hono + BetterAuthによる堅牢なバックエンド実装が特徴。',
      tech: ['Next.js', 'Hono', 'BetterAuth', 'Drizzle', 'pgvector', 'OpenAI', 'dbt'],
      status: '完成済み',
      progress: 100,
      features: ['会話要約(RAG)', 'ベクトル検索', 'GitHub認証', 'OpenAPI仕様書自動生成'],
      images: [
        {
          light: '/images/projects/mimicord/mimicord-app-architecture.light.svg',
          dark: '/images/projects/mimicord/mimicord-app-architecture.dark.svg',
          alt: 'Mimicord System Architecture',
        },
      ],
      links: {
        tech: '/project-mimicord',
      },
      systemFlow: {
        lightImageSrc: '/images/projects/mimicord/mimicord-app-architecture.light.svg',
        darkImageSrc: '/images/projects/mimicord/mimicord-app-architecture.dark.svg',
        alt: 'Mimicord System Architecture',
        linkUrl: '/project-mimicord',
        description: (
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
        ),
      },
    },
  ]

  const pastProjects = [
    {
      id: 'daiichi-provider-support',
      title: 'インターネットプロバイダ事業の技術/ヘルプデスク',
      company: '株式会社ダイイチ（現エディオン）',
      description:
        '1995年、Windows95発売と同時期のインターネット商用利用開始直後。主要業務はSolarisサーバ管理・運用。加えて一般ユーザー向けWindows用（95,3.1）/Mac用接続説明書作成やヘルプデスク対応も担当。',
      tech: ['Solaris', 'サーバ管理・運用', 'ユーザーサポート', 'ドキュメント作成'],
      period: 'プロバイダ時代',
    },
    {
      id: 'secom-rental-server',
      title: 'インターネットレンタルサーバ事業インフラ構築',
      company: 'セコム情報システム株式会社',
      description:
        '1996年、Windows95発売翌年のインターネット黎明期。企業向けレンタルサーバ事業立ち上げにおいて、Solaris環境でのインフラ技術選定・検証・導入を担当。',
      tech: ['Solaris', 'UNIX', 'インターネット関連ミドルウェア'],
      period: 'セコム情報時代',
    },
    {
      id: 'mazda-systems',
      title: 'マツダ全社インターネット向けサーバ運用・DMZ保守',
      company: '日本IBM中国ソリューション株式会社（以下IBM子会社）',
      description:
        '大規模企業の全社メールサーバ、会員サイト等のインターネット向けサーバ全般の運用・保守を担当。DMZ（非武装地帯）のセキュリティ管理・監視も実施。会員サイトではPerl開発も担当。',
      tech: [
        'Solaris',
        'Sendmail',
        'apache',
        'DMZ設計・運用',
        'セキュリティ管理',
        'HTML/JavaScript',
        'Perl',
      ],
      period: 'IBM子会社時代',
    },
    {
      id: 'mainframe-resource-system',
      title: '開発部向けメインフレームリソース管理システム',
      company: 'IBM子会社',
      description:
        '開発支援インフラとして、メインフレームが使用するリソースの登録・管理システムを開発（3人チーム、役割:メンバー）。HTMLとJavaScriptによるWebベースのシステムを構築し、UIデザインからJavaScript実装まで担当。',
      tech: ['HTML', 'JavaScript', 'UIデザイン', 'イントラシステム開発', 'メインフレーム連携'],
      period: 'IBM子会社時代',
    },
    {
      id: 'toyota-parts-system',
      title: 'トヨタ部品管理システム刷新プロジェクト',
      company: 'IBM子会社',
      description:
        '自動車メーカーの部品管理システムの刷新プロジェクトに参画。大規模な開発チームを率いるため、自社担当範囲のアーキテクチャ設計、パーツモジュール設計のガイドライン策定と仕様書ガイドライン策定を担当。',
      tech: ['Java', '基盤フレームワーク設計', 'アーキテクチャ策定'],
      period: 'IBM子会社時代',
    },
    {
      id: 'java-migration-framework',
      title: '全社Java移行基盤フレームワーク策定',
      company: 'IBM子会社',
      description:
        'テックリード部署において、全社のVB→Java移行に向けた基盤フレームワーク策定プロジェクトに技術アドバイザーとして参画。技術的意見提供や設計会議での議論を担当。',
      tech: ['Java', '基盤フレームワーク設計', 'アーキテクチャ策定'],
      period: 'IBM子会社時代',
    },
    {
      id: 'daiichi-insurance-system',
      title: '第一生命保険金支払システム開発・保守',
      company: '第一生命情報システム',
      description:
        '保険金支払に関わる基幹システムの開発・保守を担当。高い信頼性が求められるシステム。',
      tech: ['VB', '金融システム'],
      period: 'DLS時代',
    },
  ]

  const publications = [
    {
      id: 'cvs-book-translation',
      title: 'Open Source Development with CVS 翻訳',
      description:
        '当時最先端だったバージョン管理システムCVSの公式ドキュメントを翻訳した（オープンソース部分のみ）。公式サイトにも日本語訳として掲載。',
      year: '2000年',
      type: '翻訳',
    },
    {
      id: 'ruby-book-2001',
      title: 'Rubyを256倍使うための本 網道編（アスキー出版）',
      description:
        '第8章を執筆。後にRuby on Rails のテンプレートエンジンにもなった eRuby について解説。',
      year: '2001年',
      type: '技術書執筆',
    },
  ]

  return (
    <section id="projects" className="bg-white py-20 dark:bg-gray-800">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-16 text-center">
          <h2 className="mb-4 text-3xl font-bold text-gray-900 dark:text-gray-100 md:text-4xl">
            Projects & Achievements
          </h2>
          <p className="mx-auto max-w-3xl text-xl text-gray-600 dark:text-gray-300">
            現在進行中のプロジェクトから過去の大規模システム開発まで
          </p>
        </div>

        {/* Current Projects */}
        <div className="mb-16">
          <h3 className="mb-8 flex items-center text-2xl font-bold text-gray-900 dark:text-gray-100">
            <Code className="mr-3 h-6 w-6 text-blue-600" />
            Current Projects
          </h3>
          <div className="grid grid-cols-1 gap-8">
            {currentProjects.map((project) => (
              <div
                key={project.id}
                className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50 p-8 transition-all duration-300 hover:shadow-lg dark:border-gray-700 dark:from-gray-900 dark:to-gray-800"
              >
                <div className="mb-6 flex flex-col lg:flex-row lg:items-center lg:justify-between">
                  <h4 className="mb-2 text-xl font-bold text-gray-900 dark:text-gray-100 lg:mb-0">
                    {project.title}
                  </h4>
                  <div className="flex items-center space-x-4">
                    <span
                      className={`rounded-full px-3 py-1 text-sm font-medium ${
                        project.status === '完成済み'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {project.status}
                    </span>
                  </div>
                </div>

                <p className="mb-6 leading-relaxed text-gray-600 dark:text-gray-300">
                  {project.description}
                </p>

                {/* Tech Stack */}
                <div className="mb-6">
                  <p className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-200">
                    Tech Stack:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {project.tech.map((tech, techIndex) => (
                      <span
                        key={`${project.id}-tech-${techIndex}`}
                        className="rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-800"
                      >
                        {tech}
                      </span>
                    ))}
                  </div>
                </div>

                {/* System Flow Diagram */}
                {project.systemFlow && (
                  <div className="mb-6">
                    <SystemFlowDiagram
                      resolvedTheme={resolvedTheme}
                      lightImageSrc={project.systemFlow.lightImageSrc}
                      darkImageSrc={project.systemFlow.darkImageSrc}
                      alt={project.systemFlow.alt}
                      description={project.systemFlow.description}
                      linkUrl={project.systemFlow.linkUrl}
                    />
                  </div>
                )}

                {/* Generic Image Rendering (Skip if specific diagram exists) */}
                {project.images?.map((image) => {
                  if (project.systemFlow) return null

                  return (
                    <div
                      key={image.light}
                      className="mb-6 overflow-hidden rounded-lg border border-gray-100 bg-gray-50 dark:border-gray-700 dark:bg-gray-900"
                    >
                      <div className="relative aspect-[16/9] w-full">
                        {/* Light Mode Image */}
                        <div className="dark:hidden">
                          <Image
                            src={image.light}
                            alt={image.alt}
                            fill
                            className="object-contain p-2"
                            unoptimized
                          />
                        </div>
                        {/* Dark Mode Image */}
                        <div className="hidden dark:block">
                          <Image
                            src={image.dark || image.light}
                            alt={image.alt}
                            fill
                            className="object-contain p-2"
                            unoptimized
                          />
                        </div>
                      </div>
                    </div>
                  )
                })}

                {/* Links for Portfolio Site */}
                {project.links && (
                  <div className="flex flex-col gap-3 border-t border-blue-200 pt-4 dark:border-gray-700 sm:flex-row">
                    {project.links.tech &&
                      (project.links.tech.startsWith('/') ? (
                        <Link
                          href={project.links.tech}
                          className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-800"
                        >
                          <ArrowRight className="mr-1 h-4 w-4" />
                          詳細を見る
                        </Link>
                      ) : (
                        <a
                          href={project.links.tech}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-800"
                        >
                          <ExternalLink className="mr-1 h-4 w-4" />
                          技術仕様を見る
                        </a>
                      ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Past Projects */}
        <div className="mb-16">
          <h3 className="mb-8 flex items-center text-2xl font-bold text-gray-900 dark:text-gray-100">
            <Calendar className="mr-3 h-6 w-6 text-purple-600" />
            主要なシステム経験
          </h3>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            {pastProjects.map((project) => (
              <div
                key={project.id}
                className="rounded-2xl border border-gray-200 bg-white p-6 transition-all duration-300 hover:border-purple-200 hover:shadow-lg dark:border-gray-700 dark:bg-gray-900 dark:hover:border-gray-600"
              >
                <div className="mb-4 flex items-center justify-between">
                  <h4 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                    {project.title}
                  </h4>
                  <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-medium text-purple-800">
                    {project.period}
                  </span>
                </div>

                <p className="mb-3 text-sm font-medium text-gray-500 dark:text-gray-400">
                  {project.company}
                </p>

                <p className="mb-4 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
                  {project.description}
                </p>

                <div className="flex flex-wrap gap-2">
                  {project.tech.map((tech, techIndex) => (
                    <span
                      key={`${project.id}-tech-${techIndex}`}
                      className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-700 dark:bg-gray-800 dark:text-gray-200"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Publications */}
        <div>
          <h3 className="mb-8 flex items-center text-2xl font-bold text-gray-900 dark:text-gray-100">
            <ExternalLink className="mr-3 h-6 w-6 text-green-600" />
            執筆・発信活動
          </h3>
          <div className="grid grid-cols-1 gap-6">
            {publications.map((publication) => (
              <div
                key={publication.id}
                className="rounded-2xl border border-green-100 bg-gradient-to-r from-green-50 to-emerald-50 p-6 dark:border-gray-700 dark:from-gray-900 dark:to-gray-800"
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                  <div>
                    <h4 className="mb-2 text-lg font-bold text-gray-900 dark:text-gray-100">
                      {publication.title}
                    </h4>
                    <p className="mb-2 text-gray-600 dark:text-gray-300">
                      {publication.description}
                    </p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800">
                      {publication.type}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {publication.year}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

export default Projects
