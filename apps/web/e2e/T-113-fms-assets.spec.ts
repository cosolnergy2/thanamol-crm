import { test, expect, type Page } from '@playwright/test'
import { login, assertNoErrorBoundary } from './helpers/fms-helpers'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const SCREENSHOTS = path.resolve(__dirname, 'screenshots/T-113-assets')

test.describe.configure({ mode: 'serial' })

test.describe('FMS Assets', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('should load assets list page with heading "Assets" and controls', async ({ page }) => {
    await page.goto('/facility-management/assets')
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('heading', { name: 'Assets' })).toBeVisible()
    await expect(page.getByRole('button', { name: /add asset/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /categor/i })).toBeVisible()
    await expect(page.getByPlaceholder('Search assets...')).toBeVisible()
    await page.screenshot({ path: `${SCREENSHOTS}/assets-list-controls.png`, fullPage: true })
  })

  test('should show table with headers: Asset #, Name, Category, Project, Status, Serial #, Actions', async ({ page }) => {
    await page.goto('/facility-management/assets')
    await page.waitForLoadState('networkidle')
    const headers = ['Asset #', 'Name', 'Category', 'Project', 'Status', 'Serial #', 'Actions']
    for (const header of headers) {
      await expect(page.getByRole('columnheader', { name: header })).toBeVisible()
    }
    await page.screenshot({ path: `${SCREENSHOTS}/assets-table-headers.png`, fullPage: true })
  })

  test('should show assets data or "No assets found" empty state', async ({ page }) => {
    await page.goto('/facility-management/assets')
    await page.waitForLoadState('networkidle')
    const hasRows = await page.locator('tbody tr').count()
    if (hasRows === 0) {
      await expect(page.getByText(/no assets found/i)).toBeVisible()
    } else {
      expect(hasRows).toBeGreaterThan(0)
    }
    await page.screenshot({ path: `${SCREENSHOTS}/assets-data-or-empty.png`, fullPage: true })
  })

  test('should navigate to create asset form at /facility-management/assets/create', async ({ page }) => {
    await page.goto('/facility-management/assets')
    await page.waitForLoadState('networkidle')
    await page.getByRole('button', { name: /add asset/i }).click()
    await page.waitForURL('**/facility-management/assets/create')
    await expect(page).toHaveURL(/\/facility-management\/assets\/create/)
    await page.screenshot({ path: `${SCREENSHOTS}/assets-create-form.png`, fullPage: true })
  })

  test('should load asset categories page at /facility-management/assets/categories', async ({ page }) => {
    await page.goto('/facility-management/assets/categories')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('body')).toBeVisible()
    await page.screenshot({ path: `${SCREENSHOTS}/assets-categories.png`, fullPage: true })
  })

  test('should not show error boundary on any asset route', async ({ page }) => {
    const routes = [
      '/facility-management/assets',
      '/facility-management/assets/categories',
    ]
    for (const route of routes) {
      await page.goto(route)
      await page.waitForLoadState('networkidle')
      await assertNoErrorBoundary(page)
    }
    await page.screenshot({ path: `${SCREENSHOTS}/assets-no-error.png`, fullPage: true })
  })
})
