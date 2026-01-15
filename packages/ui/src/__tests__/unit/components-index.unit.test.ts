/**
 * components index.tsのテスト
 */
import { describe, expect, it } from 'vitest'

describe('components index exports', () => {
  it('should export ContactForm component', async () => {
    const { ContactForm } = await import('../../components/index')
    expect(ContactForm).toBeDefined()
    expect(typeof ContactForm).toBe('function')
  })

  it('should export Header component', async () => {
    const { Header } = await import('../../components/index')
    expect(Header).toBeDefined()
    expect(typeof Header).toBe('function')
  })

  it('should export DiagramViewer component', async () => {
    const { DiagramViewer } = await import('../../components/index')
    expect(DiagramViewer).toBeDefined()
    expect(typeof DiagramViewer).toBe('function')
  })

  it('should export icons', async () => {
    const { ZennIcon } = await import('../../components/index')
    expect(ZennIcon).toBeDefined()
    expect(typeof ZennIcon).toBe('function')
  })

  it('should have the same exports as individual components', async () => {
    const componentsIndex = await import('../../components/index')
    const contactForm = await import('../../components/ContactForm')
    const header = await import('../../components/Header')
    const diagramViewer = await import('../../components/DiagramViewer')

    expect(componentsIndex.ContactForm).toBe(contactForm.ContactForm)
    expect(componentsIndex.Header).toBe(header.Header)
    expect(componentsIndex.DiagramViewer).toBe(diagramViewer.DiagramViewer)
  })
})
