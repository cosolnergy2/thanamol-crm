import { test, expect } from '@playwright/test'

const API_BASE = 'http://localhost:3000'

/**
 * Smoke-tests for T-073: all 17 previously-unregistered route groups.
 *
 * A registered route behind the auth guard responds 401 Unauthorized.
 * A missing route responds 404 Not Found.
 * Any status other than 404 proves the route is registered.
 */

async function getStatus(url: string): Promise<number> {
  const response = await fetch(url)
  return response.status
}

test.describe('T-073: Newly registered API routes respond (not 404)', () => {
  // ── activity-logs ──────────────────────────────────────────────────────────

  test('GET /api/activity-logs returns 401, not 404', async () => {
    const status = await getStatus(`${API_BASE}/api/activity-logs`)
    expect(status).not.toBe(404)
    expect(status).toBe(401)
  })

  test('GET /api/audit-logs returns 401, not 404', async () => {
    const status = await getStatus(`${API_BASE}/api/audit-logs`)
    expect(status).not.toBe(404)
    expect(status).toBe(401)
  })

  // ── automation-rules ───────────────────────────────────────────────────────

  test('GET /api/automation-rules returns 401, not 404', async () => {
    const status = await getStatus(`${API_BASE}/api/automation-rules`)
    expect(status).not.toBe(404)
    expect(status).toBe(401)
  })

  // ── client-portal ──────────────────────────────────────────────────────────

  test('GET /api/clients returns 401, not 404', async () => {
    const status = await getStatus(`${API_BASE}/api/clients`)
    expect(status).not.toBe(404)
    expect(status).toBe(401)
  })

  test('GET /api/client-update-requests returns 401, not 404', async () => {
    const status = await getStatus(`${API_BASE}/api/client-update-requests`)
    expect(status).not.toBe(404)
    expect(status).toBe(401)
  })

  // ── comments ───────────────────────────────────────────────────────────────
  // Comments requires entityType + entityId query params, so without auth it
  // hits the guard first and returns 401 (not 400 for missing params).

  test('GET /api/comments returns 401, not 404', async () => {
    const status = await getStatus(`${API_BASE}/api/comments`)
    expect(status).not.toBe(404)
    expect(status).toBe(401)
  })

  // ── deposits ───────────────────────────────────────────────────────────────

  test('GET /api/deposits returns 401, not 404', async () => {
    const status = await getStatus(`${API_BASE}/api/deposits`)
    expect(status).not.toBe(404)
    expect(status).toBe(401)
  })

  // ── handover-photos ────────────────────────────────────────────────────────

  test('GET /api/handover-photos returns 401, not 404', async () => {
    const status = await getStatus(`${API_BASE}/api/handover-photos`)
    expect(status).not.toBe(404)
    expect(status).toBe(401)
  })

  // ── handovers ──────────────────────────────────────────────────────────────

  test('GET /api/handovers returns 401, not 404', async () => {
    const status = await getStatus(`${API_BASE}/api/handovers`)
    expect(status).not.toBe(404)
    expect(status).toBe(401)
  })

  // ── lease-agreements ───────────────────────────────────────────────────────

  test('GET /api/lease-agreements returns 401, not 404', async () => {
    const status = await getStatus(`${API_BASE}/api/lease-agreements`)
    expect(status).not.toBe(404)
    expect(status).toBe(401)
  })

  // ── meter-records ──────────────────────────────────────────────────────────

  test('GET /api/meter-records returns 401, not 404', async () => {
    const status = await getStatus(`${API_BASE}/api/meter-records`)
    expect(status).not.toBe(404)
    expect(status).toBe(401)
  })

  // ── notifications ──────────────────────────────────────────────────────────

  test('GET /api/notifications returns 401, not 404', async () => {
    const status = await getStatus(`${API_BASE}/api/notifications`)
    expect(status).not.toBe(404)
    expect(status).toBe(401)
  })

  test('GET /api/notification-preferences returns 401, not 404', async () => {
    const status = await getStatus(`${API_BASE}/api/notification-preferences`)
    expect(status).not.toBe(404)
    expect(status).toBe(401)
  })

  // ── pre-handover-inspections ───────────────────────────────────────────────

  test('GET /api/pre-handover-inspections returns 401, not 404', async () => {
    const status = await getStatus(`${API_BASE}/api/pre-handover-inspections`)
    expect(status).not.toBe(404)
    expect(status).toBe(401)
  })

  // ── sale-jobs ──────────────────────────────────────────────────────────────

  test('GET /api/sale-jobs returns 401, not 404', async () => {
    const status = await getStatus(`${API_BASE}/api/sale-jobs`)
    expect(status).not.toBe(404)
    expect(status).toBe(401)
  })

  // ── task-statuses (served by both task-config and task-statuses routes) ────

  test('GET /api/task-statuses returns 401, not 404', async () => {
    const status = await getStatus(`${API_BASE}/api/task-statuses`)
    expect(status).not.toBe(404)
    expect(status).toBe(401)
  })

  // ── tasks ──────────────────────────────────────────────────────────────────

  test('GET /api/tasks returns 401, not 404', async () => {
    const status = await getStatus(`${API_BASE}/api/tasks`)
    expect(status).not.toBe(404)
    expect(status).toBe(401)
  })

  // ── tickets ────────────────────────────────────────────────────────────────

  test('GET /api/tickets returns 401, not 404', async () => {
    const status = await getStatus(`${API_BASE}/api/tickets`)
    expect(status).not.toBe(404)
    expect(status).toBe(401)
  })

  // ── warehouse-requirements ─────────────────────────────────────────────────

  test('GET /api/warehouse-requirements returns 401, not 404', async () => {
    const status = await getStatus(`${API_BASE}/api/warehouse-requirements`)
    expect(status).not.toBe(404)
    expect(status).toBe(401)
  })

  // ── screenshot: final summary ──────────────────────────────────────────────

  test('API health endpoint confirms server is running', async ({ page }) => {
    const response = await page.request.get(`${API_BASE}/api/health`)
    expect(response.status()).toBe(200)
    const body = await response.json()
    expect(body).toHaveProperty('status', 'ok')

    await page.goto('about:blank')
    await page.screenshot({ path: 'e2e/screenshots/T-073/api-health-ok.png' })
  })
})
