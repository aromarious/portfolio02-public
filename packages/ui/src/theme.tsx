'use client'

import { useEffect, useState } from 'react'
import { DesktopIcon, MoonIcon, SunIcon } from '@radix-ui/react-icons'
import { useTheme } from 'next-themes'

import { Button } from './primitives/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './primitives/dropdown-menu'

export { ThemeProvider } from 'next-themes'

export function ThemeToggle() {
  const { setTheme, theme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleThemeChange = () => {
    if (theme === 'light') {
      setTheme('dark')
    } else if (theme === 'dark') {
      setTheme('system')
    } else {
      setTheme('light')
    }
  }

  return (
    <button
      type="button"
      onClick={handleThemeChange}
      className="fixed bottom-4 right-4 z-50 flex items-center justify-center rounded-full border border-gray-300 bg-white p-3 shadow-lg hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:hover:bg-gray-700"
      style={{ width: '50px', height: '50px' }}
    >
      <div className="relative">
        {!mounted ? (
          <SunIcon className="size-5" />
        ) : theme === 'system' ? (
          <DesktopIcon className="size-5" />
        ) : (
          <>
            <SunIcon className="size-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <MoonIcon className="absolute left-0 top-0 size-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </>
        )}
      </div>
    </button>
  )
}
