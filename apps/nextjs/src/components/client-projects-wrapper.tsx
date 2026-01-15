'use client'

import { Projects } from '@aromarious/ui'

import ClientThemeProvider from './client-theme-provider'

export default function ClientProjectsWrapper() {
  return (
    <ClientThemeProvider>
      {(stableTheme) => <Projects resolvedTheme={stableTheme} />}
    </ClientThemeProvider>
  )
}
