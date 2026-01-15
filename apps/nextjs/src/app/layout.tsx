import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'

import { cn, Header, Toaster } from '@aromarious/ui'
import { ThemeProvider, ThemeToggle } from '@aromarious/ui/theme'

import { TRPCReactProvider } from '~/trpc/react'

import '~/app/globals.css'
import '~/lib/polyfills'

import { env } from '~/env'

// カスタムドメインがある場合は NEXT_PUBLIC_SITE_URL を設定してください
const baseUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (env.VERCEL_ENV === 'production' ? 'https://portfolio.aromarious.com' : 'http://localhost:3200')

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: 'Aromarious Portfolio - 課題解決/技術指導エンジニア',
  description: 'フルスタック設計・開発と技術指導を行うエンジニアのポートフォリオサイト。',
  icons: {
    icon: [
      { url: '/favicon/favicon.ico' },
      { url: '/favicon/favicon-96x96.png', sizes: '96x96', type: 'image/png' },
    ],
    apple: [{ url: '/favicon/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
    other: [{ url: '/favicon/favicon.svg', type: 'image/svg+xml' }],
  },
  manifest: '/favicon/site.webmanifest',
  openGraph: {
    title: 'Aromarious Portfolio - 課題解決/技術指導エンジニア',
    description: 'フルスタック設計・開発とメンタリングを行うエンジニアのポートフォリオサイト',
    url: baseUrl,
    siteName: 'Aromarious Portfolio',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Aromarious Portfolio - 課題解決/技術指導エンジニア',
    description: 'フルスタック設計・開発と技術指導を行うエンジニアのポートフォリオサイト',
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: 'white' },
    { media: '(prefers-color-scheme: dark)', color: 'black' },
  ],
}

const geistSans = Geist({
  subsets: ['latin'],
  variable: '--font-geist-sans',
})
const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-geist-mono',
})

export default function RootLayout(props: { children: React.ReactNode }) {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: 'Aromarious',
    jobTitle: '課題解決/技術指導エンジニア',
    description: 'フルスタック設計・開発と技術指導を行うエンジニア',
    url: baseUrl,
    sameAs: [
      'https://github.com/aromarious',
      'https://twitter.com/aromarious',
      'https://linkedin.com/in/aromarious',
    ],
    knowsAbout: [
      'TypeScript',
      'React',
      'Next.js',
      'Node.js',
      'PostgreSQL',
      'フルスタック開発',
      '技術指導',
      'システム設計',
    ],
    worksFor: {
      '@type': 'Organization',
      name: 'Aromarious',
      url: baseUrl,
    },
  }

  return (
    <html lang="ja" suppressHydrationWarning>
      <head>
        {env.NEXT_PUBLIC_GA_MEASUREMENT_ID && (
          <>
            <script
              async
              src={`https://www.googletagmanager.com/gtag/js?id=${env.NEXT_PUBLIC_GA_MEASUREMENT_ID}`}
            />
            <script
              // biome-ignore lint/security/noDangerouslySetInnerHtml: Google Analytics requires inline script for gtag setup
              dangerouslySetInnerHTML={{
                __html: `
                  window.dataLayer = window.dataLayer || [];
                  function gtag(){dataLayer.push(arguments);}
                  gtag('js', new Date());
                  gtag('config', '${env.NEXT_PUBLIC_GA_MEASUREMENT_ID}');
                `,
              }}
            />
          </>
        )}
        <script
          type="application/ld+json"
          // biome-ignore lint/security/noDangerouslySetInnerHtml: SEO structured data requires JSON-LD injection
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(structuredData),
          }}
        />
      </head>
      <body
        className={cn(
          'min-h-screen bg-background font-sans text-foreground antialiased',
          geistSans.variable,
          geistMono.variable
        )}
      >
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <Header />
          <TRPCReactProvider>{props.children}</TRPCReactProvider>
          <div className="absolute bottom-4 right-4">
            <ThemeToggle />
          </div>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
