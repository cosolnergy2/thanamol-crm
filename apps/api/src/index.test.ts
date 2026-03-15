import { describe, it, expect } from 'vitest'
import { Elysia } from 'elysia'

describe('API health endpoint', () => {
  it('returns status ok', async () => {
    const app = new Elysia()
      .get('/api/health', () => ({ status: 'ok', timestamp: new Date().toISOString() }))

    const response = await app.handle(new Request('http://localhost/api/health'))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.status).toBe('ok')
    expect(typeof body.timestamp).toBe('string')
  })
})
