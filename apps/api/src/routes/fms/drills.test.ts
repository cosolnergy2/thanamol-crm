import { describe, it, expect } from 'vitest'
import { Elysia } from 'elysia'
import { fmsDrillsRoutes } from './drills'

const app = new Elysia().use(fmsDrillsRoutes)

describe('fmsDrillsRoutes', () => {
  describe('GET /api/fms/drills', () => {
    it('returns 401 when not authenticated', async () => {
      const response = await app.handle(
        new Request('http://localhost/api/fms/drills')
      )
      expect(response.status).toBe(401)
    })
  })

  describe('POST /api/fms/drills', () => {
    it('returns 401 when not authenticated', async () => {
      const response = await app.handle(
        new Request('http://localhost/api/fms/drills', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            planId: 'test-plan-id',
            drillType: 'Fire Evacuation',
            scheduledDate: '2026-06-01',
            projectId: 'test-project-id',
          }),
        })
      )
      expect(response.status).toBe(401)
    })
  })

  describe('GET /api/fms/drills/:id', () => {
    it('returns 401 when not authenticated', async () => {
      const response = await app.handle(
        new Request('http://localhost/api/fms/drills/nonexistent-id')
      )
      expect(response.status).toBe(401)
    })
  })

  describe('PUT /api/fms/drills/:id', () => {
    it('returns 401 when not authenticated', async () => {
      const response = await app.handle(
        new Request('http://localhost/api/fms/drills/nonexistent-id', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ drillType: 'Earthquake Response' }),
        })
      )
      expect(response.status).toBe(401)
    })
  })

  describe('PATCH /api/fms/drills/:id/complete', () => {
    it('returns 401 when not authenticated', async () => {
      const response = await app.handle(
        new Request('http://localhost/api/fms/drills/nonexistent-id/complete', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ actualDate: '2026-06-01' }),
        })
      )
      expect(response.status).toBe(401)
    })
  })

  describe('DELETE /api/fms/drills/:id', () => {
    it('returns 401 when not authenticated', async () => {
      const response = await app.handle(
        new Request('http://localhost/api/fms/drills/nonexistent-id', {
          method: 'DELETE',
        })
      )
      expect(response.status).toBe(401)
    })
  })
})
