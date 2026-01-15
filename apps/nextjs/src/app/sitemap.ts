import type { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  // カスタムドメインがある場合は NEXT_PUBLIC_SITE_URL を設定してください
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3200')

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 1,
    },
  ]
}
