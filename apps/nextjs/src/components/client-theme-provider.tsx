'use client'

import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'

interface ClientThemeProviderProps {
  children: (theme: string | undefined) => React.ReactNode
}

export default function ClientThemeProvider({ children }: ClientThemeProviderProps) {
  const [mounted, setMounted] = useState(false)
  const { resolvedTheme } = useTheme()

  useEffect(() => {
    setMounted(true)
  }, [])

  // マウント後にのみテーマを使用し、安定化
  const stableTheme = mounted ? resolvedTheme : undefined

  return <>{children(stableTheme)}</>
}
