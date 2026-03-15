import { describe, it, expect } from 'vitest'

describe('shared package', () => {
  it('exports without errors', async () => {
    const mod = await import('./index')
    expect(mod).toBeDefined()
  })
})
