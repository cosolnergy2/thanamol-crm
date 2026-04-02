import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { Elysia } from 'elysia'
import { fmsDisasterPlansRoutes } from './disaster-plans'

const TEST_PROJECT_ID = 'test-project-disaster-plans'

const app = new Elysia().use(fmsDisasterPlansRoutes)

describe('fmsDisasterPlansRoutes', () => {
  describe('GET /api/fms/disaster-plans', () => {
    it('returns 401 when not authenticated', async () => {
      const response = await app.handle(
        new Request('http://localhost/api/fms/disaster-plans')
      )
      expect(response.status).toBe(401)
    })
  })

  describe('POST /api/fms/disaster-plans', () => {
    it('returns 401 when not authenticated', async () => {
      const response = await app.handle(
        new Request('http://localhost/api/fms/disaster-plans', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: 'Fire Emergency Plan',
            planType: 'FIRE',
            projectId: TEST_PROJECT_ID,
          }),
        })
      )
      expect(response.status).toBe(401)
    })
  })

  describe('GET /api/fms/disaster-plans/:id', () => {
    it('returns 401 when not authenticated', async () => {
      const response = await app.handle(
        new Request('http://localhost/api/fms/disaster-plans/nonexistent-id')
      )
      expect(response.status).toBe(401)
    })
  })

  describe('PUT /api/fms/disaster-plans/:id', () => {
    it('returns 401 when not authenticated', async () => {
      const response = await app.handle(
        new Request('http://localhost/api/fms/disaster-plans/nonexistent-id', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: 'Updated Plan' }),
        })
      )
      expect(response.status).toBe(401)
    })
  })

  describe('DELETE /api/fms/disaster-plans/:id', () => {
    it('returns 401 when not authenticated', async () => {
      const response = await app.handle(
        new Request('http://localhost/api/fms/disaster-plans/nonexistent-id', {
          method: 'DELETE',
        })
      )
      expect(response.status).toBe(401)
    })
  })
})
