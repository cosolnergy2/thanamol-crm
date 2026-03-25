import { test, expect, type Page } from '@playwright/test'
import { fileURLToPath } from 'url'
import path from 'path'
import { login, assertNoErrorBoundary } from './helpers/fms-helpers'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const SCREENSHOTS = path.resolve(__dirname, 'screenshots/T-129')

test.describe.configure({ mode: 'serial' })

test.describe('T-129 FMS Vendor Management', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('should load vendors list page with heading and controls', async ({ page }) => {
    await page.goto('/facility-management/vendors')
    await page.waitForLoadState('networkidle')

    const heading = page.getByRole('heading', { level: 1 })
    await expect(heading).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/vendors-list.png`, fullPage: true })
    await assertNoErrorBoundary(page)
  })

  test('should show vendor data or empty state', async ({ page }) => {
    await page.goto('/facility-management/vendors')
    await page.waitForLoadState('networkidle')

    const hasItems = await page.getByRole('row').count() > 1
    const hasEmptyState = await page.getByText(/no vendors|no results|empty/i).isVisible().catch(() => false)

    expect(hasItems || hasEmptyState).toBeTruthy()

    await page.screenshot({ path: `${SCREENSHOTS}/vendors-data-or-empty.png`, fullPage: true })
    await assertNoErrorBoundary(page)
  })

  test('should navigate to create vendor form at /facility-management/vendors/create', async ({ page }) => {
    await page.goto('/facility-management/vendors/create')
    await page.waitForLoadState('networkidle')

    await assertNoErrorBoundary(page)
    await page.screenshot({ path: `${SCREENSHOTS}/vendors-create.png`, fullPage: true })
    await assertNoErrorBoundary(page)
  })

  test('should load vendor contracts list at /facility-management/vendors/contracts', async ({ page }) => {
    await page.goto('/facility-management/vendors/contracts')
    await page.waitForLoadState('networkidle')

    await expect(page).toHaveURL(/\/facility-management\/vendors\/contracts/)

    await page.screenshot({ path: `${SCREENSHOTS}/vendors-contracts-list.png`, fullPage: true })
    await assertNoErrorBoundary(page)
  })

  test('should load vendor invoices list at /facility-management/vendors/invoices', async ({ page }) => {
    await page.goto('/facility-management/vendors/invoices')
    await page.waitForLoadState('networkidle')

    await expect(page).toHaveURL(/\/facility-management\/vendors\/invoices/)

    await page.screenshot({ path: `${SCREENSHOTS}/vendors-invoices-list.png`, fullPage: true })
    await assertNoErrorBoundary(page)
  })

  test('should not show error boundary on any vendor route', async ({ page }) => {
    const routes = [
      '/facility-management/vendors',
      '/facility-management/vendors/contracts',
      '/facility-management/vendors/invoices',
    ]

    for (const route of routes) {
      await page.goto(route)
      await page.waitForLoadState('networkidle')
      await assertNoErrorBoundary(page)
    }

    await page.screenshot({ path: `${SCREENSHOTS}/vendors-no-error-boundary.png`, fullPage: true })
  })
})
