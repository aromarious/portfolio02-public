import type { ReactNode } from 'react'

import { DiagramViewer } from '../../components/DiagramViewer'

interface SystemFlowDiagramProps {
  resolvedTheme?: string
  lightImageSrc: string
  darkImageSrc: string
  alt: string
  description: ReactNode
  clickAction?: 'expand' | 'link'
  linkUrl?: string
}

export function SystemFlowDiagram({
  resolvedTheme,
  lightImageSrc,
  darkImageSrc,
  alt,
  description,
  clickAction = 'link',
  linkUrl,
}: SystemFlowDiagramProps) {
  return (
    <DiagramViewer
      resolvedTheme={resolvedTheme}
      lightImageSrc={lightImageSrc}
      darkImageSrc={darkImageSrc}
      alt={alt}
      description={description}
      width={800}
      height={600}
      priority={true}
      clickAction={clickAction}
      linkUrl={linkUrl ?? ''}
    />
  )
}
