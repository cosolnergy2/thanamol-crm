import { test, expect, type Page } from '@playwright/test'
import { fileURLToPath } from 'url'
import path from 'path'
import { login, assertNoErrorBoundary } from './helpers/fms-helpers'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const SCREENSHOTS = path.resolve(__dirname, 'screenshots/T-147')

test.describe.configure({ mode: 'serial' })

test.describe('T-147 FMS Petty Cash', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('should load petty cash index page', async ({ page }) => {
    await page.goto('/facility-management/petty-cash')
    await page.waitForLoadState('networkidle')

    await expect(page).toHaveURL(/\/facility-management\/petty-cash/)

    const heading = page.getByRole('heading', { level: 1 })
    await expect(heading).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/petty-cash-index.png`, fullPage: true })
  })

  test('should navigate to create fund form at /facility-management/petty-cash/funds/create', async ({ page }) => {
    await page.goto('/facility-management/petty-cash/funds/create')
    await page.waitForLoadState('networkidle')

    await expect(page).toHaveURL(/\/facility-management\/petty-cash\/funds\/create/)

    const form = page.locator('form')
    await expect(form).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/petty-cash-fund-create.png`, fullPage: true })
  })

  test('should navigate to create transaction form at /facility-management/petty-cash/transactions/create', async ({ page }) => {
    await page.goto('/facility-management/petty-cash/transactions/create')
    await page.waitForLoadState('networkidle')

    await expect(page).toHaveURL(/\/facility-management\/petty-cash\/transactions\/create/)

    const form = page.locator('form')
    await expect(form).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/petty-cash-transaction-create.png`, fullPage: true })
  })

  test('should not show error boundary on any petty cash route', async ({ page }) => {
    const routes = [
      '/facility-management/petty-cash',
      '/facility-management/petty-cash/funds/create',
      '/facility-management/petty-cash/transactions/create',
    ]

    for (const route of routes) {
      await page.goto(route)
      await page.waitForLoadState('networkidle')
      await assertNoErrorBoundary(page)
    }

    await page.screenshot({ path: `${SCREENSHOTS}/petty-cash-no-error-boundary.png`, fullPage: true })
  })
})
