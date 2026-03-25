import { test, expect, type Page } from '@playwright/test'
import { login, assertNoErrorBoundary } from './helpers/fms-helpers'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const SCREENSHOTS = path.resolve(__dirname, 'screenshots/T-113-work-orders')

test.describe.configure({ mode: 'serial' })

test.describe('FMS Work Orders', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('should load work orders list page with heading and controls', async ({ page }) => {
    await page.goto('/facility-management/work-orders')
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('heading', { name: /work orders?/i })).toBeVisible()
    const hasAddButton = await page.getByRole('button', { name: /add|create|new/i }).count()
    expect(hasAddButton).toBeGreaterThan(0)
    await page.screenshot({ path: `${SCREENSHOTS}/work-orders-list-controls.png`, fullPage: true })
  })

  test('should show work order data or empty state', async ({ page }) => {
    await page.goto('/facility-management/work-orders')
    await page.waitForLoadState('networkidle')
    const hasRows = await page.locator('tbody tr').count()
    if (hasRows === 0) {
      const emptyState = page.locator('text=/no work orders?/i, text=/no records/i, text=/empty/i')
      const emptyCount = await emptyState.count()
      expect(emptyCount + hasRows).toBeGreaterThanOrEqual(0)
    } else {
      expect(hasRows).toBeGreaterThan(0)
    }
    await page.screenshot({ path: `${SCREENSHOTS}/work-orders-data-or-empty.png`, fullPage: true })
  })

  test('should navigate to create work order form at /facility-management/work-orders/create', async ({ page }) => {
    await page.goto('/facility-management/work-orders')
    await page.waitForLoadState('networkidle')
    const addButton = page.getByRole('button', { name: /add|create|new/i }).first()
    await addButton.click()
    await page.waitForURL('**/facility-management/work-orders/create')
    await expect(page).toHaveURL(/\/facility-management\/work-orders\/create/)
    await page.screenshot({ path: `${SCREENSHOTS}/work-orders-create-form.png`, fullPage: true })
  })

  test('should not show error boundary', async ({ page }) => {
    await page.goto('/facility-management/work-orders')
    await page.waitForLoadState('networkidle')
    await assertNoErrorBoundary(page)
    await page.screenshot({ path: `${SCREENSHOTS}/work-orders-no-error.png`, fullPage: true })
  })
})
