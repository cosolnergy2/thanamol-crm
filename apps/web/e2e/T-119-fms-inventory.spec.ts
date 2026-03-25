import { test, expect, type Page } from '@playwright/test'
import { fileURLToPath } from 'url'
import path from 'path'
import { login, assertNoErrorBoundary } from './helpers/fms-helpers'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const SCREENSHOTS = path.resolve(__dirname, 'screenshots/T-119')

test.describe.configure({ mode: 'serial' })

test.describe('T-119 FMS Inventory Management', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('should load inventory list page with heading and controls', async ({ page }) => {
    await page.goto('/facility-management/inventory')
    await page.waitForLoadState('networkidle')

    const heading = page.getByRole('heading', { level: 1 })
    await expect(heading).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/inventory-list.png`, fullPage: true })
    await assertNoErrorBoundary(page)
  })

  test('should show inventory data or empty state', async ({ page }) => {
    await page.goto('/facility-management/inventory')
    await page.waitForLoadState('networkidle')

    const hasItems = await page.getByRole('row').count() > 1
    const hasEmptyState = await page.getByText(/no inventory|no items|empty/i).isVisible().catch(() => false)

    expect(hasItems || hasEmptyState).toBeTruthy()

    await page.screenshot({ path: `${SCREENSHOTS}/inventory-data-or-empty.png`, fullPage: true })
    await assertNoErrorBoundary(page)
  })

  test('should navigate to create inventory item form at /facility-management/inventory/create', async ({ page }) => {
    await page.goto('/facility-management/inventory/create')
    await page.waitForLoadState('networkidle')

    await assertNoErrorBoundary(page)
    await page.screenshot({ path: `${SCREENSHOTS}/inventory-create.png`, fullPage: true })
    await assertNoErrorBoundary(page)
  })

  test('should load inventory categories page at /facility-management/inventory/categories', async ({ page }) => {
    await page.goto('/facility-management/inventory/categories')
    await page.waitForLoadState('networkidle')

    await expect(page).toHaveURL(/\/facility-management\/inventory\/categories/)

    await page.screenshot({ path: `${SCREENSHOTS}/inventory-categories.png`, fullPage: true })
    await assertNoErrorBoundary(page)
  })

  test('should load GRN list at /facility-management/inventory/grn', async ({ page }) => {
    await page.goto('/facility-management/inventory/grn')
    await page.waitForLoadState('networkidle')

    await expect(page).toHaveURL(/\/facility-management\/inventory\/grn/)

    await page.screenshot({ path: `${SCREENSHOTS}/inventory-grn-list.png`, fullPage: true })
    await assertNoErrorBoundary(page)
  })

  test('should navigate to create GRN form at /facility-management/inventory/grn/create', async ({ page }) => {
    await page.goto('/facility-management/inventory/grn/create')
    await page.waitForLoadState('networkidle')

    await assertNoErrorBoundary(page)
    await page.screenshot({ path: `${SCREENSHOTS}/inventory-grn-create.png`, fullPage: true })
    await assertNoErrorBoundary(page)
  })

  test('should load stock issues list at /facility-management/inventory/stock-issues', async ({ page }) => {
    await page.goto('/facility-management/inventory/stock-issues')
    await page.waitForLoadState('networkidle')

    await expect(page).toHaveURL(/\/facility-management\/inventory\/stock-issues/)

    await page.screenshot({ path: `${SCREENSHOTS}/inventory-stock-issues-list.png`, fullPage: true })
    await assertNoErrorBoundary(page)
  })

  test('should navigate to create stock issue form at /facility-management/inventory/stock-issues/create', async ({ page }) => {
    await page.goto('/facility-management/inventory/stock-issues/create')
    await page.waitForLoadState('networkidle')

    await assertNoErrorBoundary(page)
    await page.screenshot({ path: `${SCREENSHOTS}/inventory-stock-issues-create.png`, fullPage: true })
    await assertNoErrorBoundary(page)
  })

  test('should not show error boundary on any inventory route', async ({ page }) => {
    const routes = [
      '/facility-management/inventory',
      '/facility-management/inventory/categories',
      '/facility-management/inventory/grn',
      '/facility-management/inventory/stock-issues',
    ]

    for (const route of routes) {
      await page.goto(route)
      await page.waitForLoadState('networkidle')
      await assertNoErrorBoundary(page)
    }

    await page.screenshot({ path: `${SCREENSHOTS}/inventory-no-error-boundary.png`, fullPage: true })
  })
})
