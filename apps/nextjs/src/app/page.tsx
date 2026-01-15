import type { Metadata } from 'next'
import { Suspense } from 'react'
import { SpeedInsights } from '@vercel/speed-insights/next'

import {
  About,
  ContactSkeleton,
  Experience,
  Footer,
  Header,
  Hero,
  ProjectsSkeleton,
  Skills,
} from '@aromarious/ui'

import ClientContactWrapper from '~/components/client-contact-wrapper'
import ClientProjectsWrapper from '~/components/client-projects-wrapper'

export const metadata: Metadata = {
  title: 'Aromarious Portfolio - 課題解決/技術指導エンジニア',
  description:
    'フルスタック設計・開発と技術指導を行うエンジニアのポートフォリオサイト。React、Next.js、TypeScriptを使った企業レベルシステム開発の実績と技術力をご紹介。',
  keywords: [
    'Aromarious',
    'ポートフォリオ',
    'フルスタック開発',
    '技術指導',
    'エンジニア',
    'React',
    'Next.js',
    'TypeScript',
    'システム設計',
    'メンタリング',
  ],
  authors: [{ name: 'Aromarious', url: 'https://portfolio.aromarious.com' }],
  creator: 'Aromarious',
  publisher: 'Aromarious',
  openGraph: {
    type: 'website',
    locale: 'ja_JP',
    url: 'https://portfolio.aromarious.com',
    title: 'Aromarious Portfolio - 課題解決/技術指導エンジニア',
    description:
      'フルスタック設計・開発と技術指導を行うエンジニアのポートフォリオサイト。企業レベルシステム開発の実績をご紹介。',
    siteName: 'Aromarious Portfolio',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Aromarious Portfolio - 課題解決/技術指導エンジニア',
    description:
      'フルスタック設計・開発と技術指導を行うエンジニアのポートフォリオサイト。企業レベルシステム開発の実績をご紹介。',
    creator: '@aromarious',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
}

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <SpeedInsights />
      <Header />
      <Hero />
      <About />
      <Suspense fallback={<ProjectsSkeleton />}>
        <ClientProjectsWrapper />
      </Suspense>
      <Skills />
      <Experience />
      <Suspense fallback={<ContactSkeleton />}>
        <ClientContactWrapper />
      </Suspense>
      <Footer />
    </div>
  )
}
