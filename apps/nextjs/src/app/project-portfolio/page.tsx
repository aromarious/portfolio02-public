import { Suspense } from 'react'
import { SpeedInsights } from '@vercel/speed-insights/next'

import { ContactSkeleton, Footer, Header } from '@aromarious/ui'
// Import new page-specific components
import {
  DevProcess,
  PageHeader,
  TechFeatures,
  TechOverview,
  TechStackDetails,
} from '@aromarious/ui/page-specific/project-portfolio'

// Reuse Contact Wrapper from the app
import ClientContactWrapper from '~/components/client-contact-wrapper'

export default function ProjectPortfolioPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <SpeedInsights />
      <Header />

      <main>
        <PageHeader
          badge="Portfolio02 Engineering Showcase"
          title={
            <>
              Aromarious Portfolio <br />
              <span className="bg-gradient-to-r from-blue-600 to-emerald-600 bg-clip-text text-transparent dark:from-blue-400 dark:to-emerald-400">
                System Architecture
              </span>
            </>
          }
          description={
            <>
              実務運用を前提とした、モダンで堅牢なフルスタックWebアプリケーション。
              <br />
              保守性・拡張性・安全性を個人開発で実証するための技術的ショーケースとして構築しました。
            </>
          }
        />
        <TechOverview />
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
