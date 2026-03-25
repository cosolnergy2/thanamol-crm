import { test, expect, type Page } from '@playwright/test'
import { fileURLToPath } from 'url'
import path from 'path'
import { login, assertNoErrorBoundary } from './helpers/fms-helpers'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const SCREENSHOTS = path.resolve(__dirname, 'screenshots/T-133')

test.describe.configure({ mode: 'serial' })

test.describe('T-133 FMS Budget Management', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('should load budgets list page with heading and controls', async ({ page }) => {
    await page.goto('/facility-management/budget')
    await page.waitForLoadState('networkidle')

    const heading = page.getByRole('heading', { level: 1 })
    await expect(heading).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/budget-list.png`, fullPage: true })
  })

  test('should show budget data or empty state', async ({ page }) => {
    await page.goto('/facility-management/budget')
    await page.waitForLoadState('networkidle')
    await assertNoErrorBoundary(page)
    await page.screenshot({ path: `${SCREENSHOTS}/budget-data-or-empty.png`, fullPage: true })
  })

  test('should navigate to create budget form at /facility-management/budget/create', async ({ page }) => {
    await page.goto('/facility-management/budget/create')
    await page.waitForLoadState('networkidle')

    await expect(page).toHaveURL(/\/facility-management\/budget\/create/)

    const form = page.locator('form')
    await expect(form).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/budget-create-form.png`, fullPage: true })
  })

  test('should load budget templates page at /facility-management/budget/templates', async ({ page }) => {
    await page.goto('/facility-management/budget/templates')
    await page.waitForLoadState('networkidle')

    await expect(page).toHaveURL(/\/facility-management\/budget\/templates/)

    await page.screenshot({ path: `${SCREENSHOTS}/budget-templates.png`, fullPage: true })
  })

  test('should not show error boundary on any budget route', async ({ page }) => {
    const routes = [
      '/facility-management/budget',
      '/facility-management/budget/create',
      '/facility-management/budget/templates',
    ]

    for (const route of routes) {
      await page.goto(route)
      await page.waitForLoadState('networkidle')
      await assertNoErrorBoundary(page)
    }

    await page.screenshot({ path: `${SCREENSHOTS}/budget-no-error-boundary.png`, fullPage: true })
  })
})
