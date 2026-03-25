import { test, expect, type Page } from '@playwright/test'
import { login, assertNoErrorBoundary } from './helpers/fms-helpers'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const SCREENSHOTS = path.resolve(__dirname, 'screenshots/T-150')

test.describe.configure({ mode: 'serial' })

test.describe('FMS Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('should load FMS dashboard with heading "Facility Management"', async ({ page }) => {
    await page.goto('/facility-management')
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('heading', { name: 'Facility Management' })).toBeVisible()
    await page.screenshot({ path: `${SCREENSHOTS}/dashboard-heading.png`, fullPage: true })
  })

  test('should display summary cards or dashboard content', async ({ page }) => {
    await page.goto('/facility-management')
    await page.waitForLoadState('networkidle')
    const hasCards = await page.locator('[class*="card"], [class*="Card"], [data-testid*="card"]').count()
    const hasContent = await page.locator('main, [role="main"]').count()
    expect(hasCards + hasContent).toBeGreaterThan(0)
    await page.screenshot({ path: `${SCREENSHOTS}/dashboard-content.png`, fullPage: true })
  })

  test('should not show error boundary', async ({ page }) => {
    await page.goto('/facility-management')
    await page.waitForLoadState('networkidle')
    await assertNoErrorBoundary(page)
    await page.screenshot({ path: `${SCREENSHOTS}/dashboard-no-error.png`, fullPage: true })
  })
})
