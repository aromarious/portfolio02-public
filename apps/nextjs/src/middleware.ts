import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { waitUntil } from '@vercel/functions'

import { SecurityEngine } from '@aromarious/edge-security'

import { getSecurityConfig } from './security.config'

export async function middleware(request: NextRequest): Promise<NextResponse> {
  // Apply EdgeSecurity protection (Arcjet-style)
  // Vercel環境ではwaitUntilでバックグラウンド処理を保証
  const decision = await SecurityEngine.protect(request, getSecurityConfig(), waitUntil)

  if (decision.isDenied()) {
    if (decision.reason.isRateLimit()) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    if (decision.reason.isBot()) {
      return NextResponse.json({ error: 'Bot detected' }, { status: 403 })
    }

    if (decision.reason.isAuthFailure()) {
      return NextResponse.json({ error: 'Authentication failed' }, { status: 401 })
    }

    if (decision.reason.isDdos()) {
      return NextResponse.json({ error: 'DDoS attack detected' }, { status: 503 })
    }

    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  return NextResponse.next()
}

// 全ページ・API保護、静的リソース・画像・メタデータファイルはCDNに任せる
export const config = {
  matcher: [
    // 静的ファイル（画像、フォント、アイコンなど）はセキュリティチェックを除外してTTFBを改善
    '/((?!_next/static|_next/image|images/|icons/|fonts/|favicon/|favicon.ico|robots.txt|sitemap.xml|manifest.json|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)',
  ],
}
