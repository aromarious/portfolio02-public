/**
 * primitives index.tsのテスト
 */
import { describe, expect, it } from 'vitest'

describe('primitives index exports', () => {
  it('should export Button component', async () => {
    const { Button } = await import('../../primitives/index')
    expect(Button).toBeDefined()
    expect(typeof Button).toBe('function')
  })

  it('should export Input component', async () => {
    const { Input } = await import('../../primitives/index')
    expect(Input).toBeDefined()
    expect(typeof Input).toBe('function')
  })

  it('should export Label component', async () => {
    const { Label } = await import('../../primitives/index')
    expect(Label).toBeDefined()
    expect(typeof Label).toBe('function')
  })

  it('should export Form components', async () => {
    const { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } =
      await import('../../primitives/index')

    expect(Form).toBeDefined()
    expect(FormControl).toBeDefined()
    expect(FormDescription).toBeDefined()
    expect(FormField).toBeDefined()
    expect(FormItem).toBeDefined()
    expect(FormLabel).toBeDefined()
    expect(FormMessage).toBeDefined()
  })

  it('should export DropdownMenu components', async () => {
    const { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } =
      await import('../../primitives/index')

    expect(DropdownMenu).toBeDefined()
    expect(DropdownMenuContent).toBeDefined()
    expect(DropdownMenuItem).toBeDefined()
    expect(DropdownMenuTrigger).toBeDefined()
  })

  it('should export Toast components', async () => {
    const { toast, Toaster } = await import('../../primitives/index')
    expect(toast).toBeDefined()
    expect(Toaster).toBeDefined()
  })
})
