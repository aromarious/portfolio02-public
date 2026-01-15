'use client'

import { useCallback, useEffect, useRef } from 'react'
import Image from 'next/image'
import { Sparkles } from 'lucide-react'

import { useAppStore } from '../../stores/app-store'

const Hero = () => {
  const heroRef = useRef<HTMLElement>(null)
  const { setIsHeroPassed } = useAppStore()

  const handleScroll = useCallback(() => {
    if (heroRef.current) {
      const heroRect = heroRef.current.getBoundingClientRect()
      const heroHeight = heroRect.height
      const isPassed = heroRect.top + heroHeight * 0.2 < 0
      setIsHeroPassed(isPassed)
    }
  }, [setIsHeroPassed])

  useEffect(() => {
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [handleScroll])
  return (
    <section
      ref={heroRef}
      className="relative flex min-h-[85vh] items-center justify-center overflow-hidden py-20 sm:min-h-screen"
    >
      {/* Background Image */}
      <div className="absolute inset-0">
        <Image
          src="/images/discussion.jpeg"
          alt="Discussion and collaboration background"
          fill
          className="object-cover opacity-60 dark:opacity-50"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-br from-pink-400/85 via-purple-500/60 to-indigo-600/85 dark:from-pink-600/80 dark:via-purple-700/60 dark:to-indigo-800/80" />
      </div>

      <div className="relative z-10 mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          {/* Badge */}
          <div className="mb-6 inline-flex items-center rounded-full border border-white/30 bg-white/90 px-4 py-2 backdrop-blur-sm dark:border-gray-300/30 dark:bg-gray-800/90">
            <Sparkles className="mr-2 h-4 w-4 text-pink-600 dark:text-pink-400" />
            <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
              Fullstack System Engineer
            </span>
          </div>

          {/* Main Heading */}
          <h1 className="mb-4 text-3xl font-bold leading-normal text-white md:text-4xl lg:text-5xl">
            <span className="block">Aromarious Portfolio</span>
          </h1>

          {/* Subtitle */}
          <p className="mb-6 text-base leading-relaxed text-white/90 md:text-lg">
            運用・保守の観点を持ちながら、リリース後も安全に継続運用できるシステムの開発を心がけています
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col justify-center gap-3 sm:flex-row">
            <a
              href="#projects"
              className="inline-flex transform items-center justify-center rounded-full bg-white/20 px-6 py-3 font-semibold text-white backdrop-blur-sm transition-all duration-200 hover:scale-105 hover:bg-white/30"
            >
              プロジェクトを見る
            </a>
            <a
              href="#contact"
              className="inline-flex transform items-center justify-center rounded-full border border-white/30 bg-transparent px-6 py-3 font-semibold text-white transition-all duration-200 hover:scale-105 hover:bg-white/10"
            >
              お問い合わせ
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}

export default Hero
