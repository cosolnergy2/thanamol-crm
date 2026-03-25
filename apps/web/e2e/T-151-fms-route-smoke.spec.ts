import { test, expect } from '@playwright/test'
import { login, assertNoErrorBoundary, FMS_ROUTES, FMS_API_ENDPOINTS } from './helpers/fms-helpers'

const API_BASE = 'http://localhost:3000'

test.describe.configure({ mode: 'serial' })

test.describe('T-151: FMS Route Smoke Tests', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  for (const route of FMS_ROUTES) {
    test(`FMS route ${route} loads without error boundary`, async ({ page }) => {
      await page.goto(route)
      await page.waitForLoadState('networkidle')
      await assertNoErrorBoundary(page)

      const screenshotName = route.replace(/\//g, '_').replace(/^_/, '')
      await page.screenshot({
        path: `e2e/screenshots/T-151/${screenshotName}.png`,
        fullPage: true,
      })
    })
  }

  for (const endpoint of FMS_API_ENDPOINTS) {
    test(`API endpoint ${endpoint} returns 401, not 404`, async () => {
      const response = await fetch(`${API_BASE}${endpoint}`)
      expect(response.status).not.toBe(404)
      expect(response.status).toBe(401)
    })
  }
})
