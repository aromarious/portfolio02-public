'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { X } from 'lucide-react'

interface DiagramViewerBaseProps {
  resolvedTheme?: string
  lightImageSrc: string
  darkImageSrc: string
  title?: string // optionalに変更
  alt: string
  description?: React.ReactNode // ここを修正
  width?: number
  height?: number
  priority?: boolean
}

interface DiagramViewerExpandProps extends DiagramViewerBaseProps {
  clickAction?: 'expand'
}

interface DiagramViewerLinkProps extends DiagramViewerBaseProps {
  clickAction: 'link'
  linkUrl: string
  linkTarget?: '_blank' | '_self'
}

type DiagramViewerProps = DiagramViewerExpandProps | DiagramViewerLinkProps

export function DiagramViewer(props: DiagramViewerProps) {
  const {
    resolvedTheme,
    lightImageSrc,
    darkImageSrc,
    title, // optional
    alt,
    description,
    width = 800,
    height = 600,
    priority = false,
  } = props

  const clickAction = props.clickAction ?? 'expand'
  const linkUrl = props.clickAction === 'link' ? props.linkUrl : undefined
  const linkTarget = props.clickAction === 'link' ? (props.linkTarget ?? '_blank') : '_blank'
  const [mounted, setMounted] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsExpanded(false)
      }
    }

    if (isExpanded) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [isExpanded])

  if (!mounted) {
    return (
      <div>
        {/* タイトルがあれば表示 */}
        {title && (
          <div className="mb-8">
            <h2 className="text-center text-2xl font-semibold text-gray-800">{title}</h2>
          </div>
        )}
        <div className="mb-8 flex justify-center">
          <div className="animate-pulse rounded bg-gray-200" style={{ width, height }} />
        </div>
        {/* descriptionがあればそのまま描画 */}
        {description && <div className="mt-8">{description}</div>}
      </div>
    )
  }

  const isDark = resolvedTheme === 'dark'

  return (
    <div>
      {/* タイトルがあれば表示 */}
      {title && (
        <div className="mb-8">
          <h2 className="text-center text-2xl font-semibold text-gray-800 dark:text-gray-200">
            {title}
          </h2>
        </div>
      )}

      <div className="mb-8 flex justify-center">
        {clickAction === 'link' && linkUrl ? (
          <a
            href={linkUrl}
            target={linkTarget}
            rel={linkTarget === '_blank' ? 'noopener noreferrer' : undefined}
            className="group relative transition-transform hover:scale-105"
            aria-label={`${title}の詳細ページを開く`}
          >
            <Image
              src={isDark ? darkImageSrc : lightImageSrc}
              alt={alt}
              width={width}
              height={height}
              className="h-auto max-w-full cursor-pointer rounded-lg"
              style={{ width: 'auto', height: 'auto' }}
              priority={priority}
            />
            <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/0 opacity-0 transition-opacity group-hover:bg-black/10 group-hover:opacity-100">
              <span className="rounded bg-white/90 px-3 py-1 text-sm font-medium text-gray-900 shadow-sm">
                詳細ページを開く
              </span>
            </div>
          </a>
        ) : (
          <button
            type="button"
            onClick={() => setIsExpanded(true)}
            className="group relative transition-transform hover:scale-105"
            aria-label="システム図を拡大表示"
          >
            <Image
              src={isDark ? darkImageSrc : lightImageSrc}
              alt={alt}
              width={width}
              height={height}
              className="h-auto max-w-full cursor-pointer rounded-lg"
              style={{ width: 'auto', height: 'auto' }}
              priority={priority}
            />
            <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/0 opacity-0 transition-opacity group-hover:bg-black/10 group-hover:opacity-100">
              <span className="rounded bg-white/90 px-3 py-1 text-sm font-medium text-gray-900 shadow-sm">
                クリックで拡大
              </span>
            </div>
          </button>
        )}
      </div>

      {/* descriptionがあればそのまま描画 */}
      {description && <div className="mt-8">{description}</div>}

      {clickAction === 'expand' && isExpanded && (
        // biome-ignore lint/a11y/useSemanticElements: dialog要素はスタイリングが困難なためdivを使用
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="diagram-modal"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-lg" // 背景をボカしてモーダル効果を出す blur-sm < blur < blur-lg < blur-xl
          onClick={() => setIsExpanded(false)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              setIsExpanded(false)
            }
          }}
        >
          <div className="relative flex h-screen w-screen items-center justify-center">
            <div className="relative">
              <Image
                src={isDark ? darkImageSrc : lightImageSrc}
                alt={`${alt} (拡大表示)`}
                width={width * 3}
                height={height * 3}
                className="w-screen rounded-lg bg-white object-contain shadow-2xl dark:bg-gray-900"
                style={{ width: '100vw', height: 'auto', maxHeight: '85vh' }}
                onClick={() => setIsExpanded(false)}
              />
              <button
                type="button"
                onClick={() => setIsExpanded(false)}
                className="absolute -right-4 -top-4 z-10 rounded-full bg-white p-2 shadow-lg transition-colors hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700"
                aria-label="閉じる"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
