import { Suspense } from 'react'
import { SpeedInsights } from '@vercel/speed-insights/next'

import { ContactSkeleton, Footer, Header } from '@aromarious/ui'
import {
  DevProcess,
  PageHeader,
  ProjectDocuments,
  TechFeatures,
  TechOverview,
  TechStackDetails,
} from '@aromarious/ui/page-specific/project-mimicord'

// Reuse Contact Wrapper from the app
import ClientContactWrapper from '~/components/client-contact-wrapper'

export default function ProjectMimicordPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <SpeedInsights />
      <Header />

      <main>
        <PageHeader
          badge="RAG Application Showcase"
          title={
            <>
              Mimicord <br />
              <span className="bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent dark:from-purple-400 dark:to-indigo-400">
                System Architecture
              </span>
            </>
          }
          description={
            <>
              pgvectorとOpenAIを活用した、Discord会話履歴のRAG検索アプリケーション。
              <br />
              ベクトル検索技術による「文脈を理解する」検索体験と、要約生成機能を提供します。
            </>
          }
        />
        <TechOverview />
        <ProjectDocuments />
        <TechFeatures />
        <TechStackDetails />
        <DevProcess />

        {/* Contact Section (Reused) */}
        <section id="contact" className="bg-white dark:bg-gray-900">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
            <div className="mb-12 text-center">
              <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100 sm:text-4xl">
                Contact
              </h2>
              <p className="mt-4 text-lg leading-6 text-gray-600 dark:text-gray-300">
                技術的な詳細、ソースコードの確認、または採用に関するお問い合わせはこちらから受け付けています。
                <br />
                このフォーム自体も、上記のアーキテクチャ（tRPC + Edge + Notion
                API連携）で動作しています。
              </p>
            </div>
            <Suspense fallback={<ContactSkeleton />}>
              <ClientContactWrapper />
            </Suspense>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
