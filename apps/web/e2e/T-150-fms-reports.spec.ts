import { test, expect, type Page } from '@playwright/test'
import { fileURLToPath } from 'url'
import path from 'path'
import { login, assertNoErrorBoundary } from './helpers/fms-helpers'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const SCREENSHOTS = path.resolve(__dirname, 'screenshots/T-150')

test.describe.configure({ mode: 'serial' })

test.describe('T-150 FMS Reports', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('should load reports index page at /facility-management/reports', async ({ page }) => {
    await page.goto('/facility-management/reports')
    await page.waitForLoadState('networkidle')

    await expect(page).toHaveURL(/\/facility-management\/reports/)

    const heading = page.getByRole('heading', { level: 1 })
    await expect(heading).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/reports-index.png`, fullPage: true })
  })

  test('should load asset status report at /facility-management/reports/asset-status', async ({ page }) => {
    await page.goto('/facility-management/reports/asset-status')
    await page.waitForLoadState('networkidle')

    await expect(page).toHaveURL(/\/facility-management\/reports\/asset-status/)

    await page.screenshot({ path: `${SCREENSHOTS}/reports-asset-status.png`, fullPage: true })
  })

  test('should load maintenance cost report at /facility-management/reports/maintenance-cost', async ({ page }) => {
    await page.goto('/facility-management/reports/maintenance-cost')
    await page.waitForLoadState('networkidle')

    await expect(page).toHaveURL(/\/facility-management\/reports\/maintenance-cost/)

    await page.screenshot({ path: `${SCREENSHOTS}/reports-maintenance-cost.png`, fullPage: true })
  })

  test('should load budget variance report at /facility-management/reports/budget-variance', async ({ page }) => {
    await page.goto('/facility-management/reports/budget-variance')
    await page.waitForLoadState('networkidle')

    await expect(page).toHaveURL(/\/facility-management\/reports\/budget-variance/)

    await page.screenshot({ path: `${SCREENSHOTS}/reports-budget-variance.png`, fullPage: true })
  })

  test('should load compliance status report at /facility-management/reports/compliance-status', async ({ page }) => {
    await page.goto('/facility-management/reports/compliance-status')
    await page.waitForLoadState('networkidle')

    await expect(page).toHaveURL(/\/facility-management\/reports\/compliance-status/)

    await page.screenshot({ path: `${SCREENSHOTS}/reports-compliance-status.png`, fullPage: true })
  })

  test('should not show error boundary on any report route', async ({ page }) => {
    const routes = [
      '/facility-management/reports',
      '/facility-management/reports/asset-status',
      '/facility-management/reports/maintenance-cost',
      '/facility-management/reports/budget-variance',
      '/facility-management/reports/compliance-status',
    ]

    for (const route of routes) {
      await page.goto(route)
      await page.waitForLoadState('networkidle')
      await assertNoErrorBoundary(page)
    }

    await page.screenshot({ path: `${SCREENSHOTS}/reports-no-error-boundary.png`, fullPage: true })
  })
})
