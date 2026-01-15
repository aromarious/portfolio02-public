import { cx } from 'class-variance-authority'
import { twMerge } from 'tailwind-merge'

const cn = (...inputs: Parameters<typeof cx>) => twMerge(cx(inputs))

export { cn }

// Zustand stores
export { useAppStore } from './stores/app-store'
export type { AppState } from './stores/app-store'

// Generic components
export { DiagramViewer } from './components/DiagramViewer'
export { default as Header } from './components/Header'

// Page-specific components
export { default as Hero } from './page-specific/top/Hero'
export { default as About } from './page-specific/top/About'
export { default as Skills } from './page-specific/top/Skills'
export { default as Experience } from './page-specific/top/Experience'
export { default as Projects } from './page-specific/top/Projects'
export { default as Contact } from './page-specific/top/Contact'
export { default as Footer } from './page-specific/top/Footer'
export { SystemFlowDiagram } from './page-specific/top/SystemFlowDiagram'
export { TechEcosystemDiagram } from './page-specific/top/TechEcosystemDiagram'

export * as ProjectPortfolio from './page-specific/project-portfolio'
export * as ProjectMimicord from './page-specific/project-mimicord'

// Primitives
export * from './primitives'

// Skeleton components
export { ProjectsSkeleton, ContactSkeleton, PageSkeleton } from './primitives/skeleton'
