import { test, expect, type Page } from '@playwright/test'
import { fileURLToPath } from 'url'
import path from 'path'
import { login, assertNoErrorBoundary } from './helpers/fms-helpers'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const SCREENSHOTS = path.resolve(__dirname, 'screenshots/T-124')

test.describe.configure({ mode: 'serial' })

test.describe('T-124 FMS Procurement', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('should load procurement index page', async ({ page }) => {
    await page.goto('/facility-management/procurement')
    await page.waitForLoadState('networkidle')

    await expect(page).toHaveURL(/\/facility-management\/procurement/)

    await page.screenshot({ path: `${SCREENSHOTS}/procurement-index.png`, fullPage: true })
    await assertNoErrorBoundary(page)
  })

  test('should navigate to create purchase request at /facility-management/procurement/requests/create', async ({ page }) => {
    await page.goto('/facility-management/procurement/requests/create')
    await page.waitForLoadState('networkidle')
    await assertNoErrorBoundary(page)
    await page.screenshot({ path: `${SCREENSHOTS}/procurement-request-create.png`, fullPage: true })
  })

  test('should load purchase quotations list at /facility-management/procurement/quotations', async ({ page }) => {
    await page.goto('/facility-management/procurement/quotations')
    await page.waitForLoadState('networkidle')

    await expect(page).toHaveURL(/\/facility-management\/procurement\/quotations/)

    await page.screenshot({ path: `${SCREENSHOTS}/procurement-quotations-list.png`, fullPage: true })
    await assertNoErrorBoundary(page)
  })

  test('should navigate to create purchase quotation at /facility-management/procurement/quotations/create', async ({ page }) => {
    await page.goto('/facility-management/procurement/quotations/create')
    await page.waitForLoadState('networkidle')
    await assertNoErrorBoundary(page)
    await page.screenshot({ path: `${SCREENSHOTS}/procurement-quotation-create.png`, fullPage: true })
  })

  test('should load purchase orders list at /facility-management/procurement/orders', async ({ page }) => {
    await page.goto('/facility-management/procurement/orders')
    await page.waitForLoadState('networkidle')

    await expect(page).toHaveURL(/\/facility-management\/procurement\/orders/)

    await page.screenshot({ path: `${SCREENSHOTS}/procurement-orders-list.png`, fullPage: true })
    await assertNoErrorBoundary(page)
  })

  test('should navigate to create purchase order at /facility-management/procurement/orders/create', async ({ page }) => {
    await page.goto('/facility-management/procurement/orders/create')
    await page.waitForLoadState('networkidle')

    await assertNoErrorBoundary(page)
    await page.screenshot({ path: `${SCREENSHOTS}/procurement-order-create.png`, fullPage: true })
    await assertNoErrorBoundary(page)
  })

  test('should not show error boundary on any procurement route', async ({ page }) => {
    const routes = [
      '/facility-management/procurement',
      '/facility-management/procurement/quotations',
      '/facility-management/procurement/orders',
    ]

    for (const route of routes) {
      await page.goto(route)
      await page.waitForLoadState('networkidle')
      await assertNoErrorBoundary(page)
    }

    await page.screenshot({ path: `${SCREENSHOTS}/procurement-no-error-boundary.png`, fullPage: true })
  })
})
