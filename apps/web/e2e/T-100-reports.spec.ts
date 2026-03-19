import { test, expect, type Page } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const ADMIN_EMAIL = 'admin@thanamol.com'
const PASSWORD = 'password123'
const SCREENSHOTS = path.resolve(__dirname, 'screenshots/T-100')

async function login(page: Page) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    await page.goto('/login')
    await page.getByLabel('Email').fill(ADMIN_EMAIL)
    await page.getByLabel('Password').fill(PASSWORD)
    await page.getByRole('button', { name: 'Sign in' }).click()

    const redirected = await page
      .waitForURL('/', { timeout: 8000 })
      .then(() => true)
      .catch(() => false)

    if (redirected) return
    if (attempt < 3) await page.waitForTimeout(500)
  }

  await expect(page).toHaveURL('/', { timeout: 5000 })
}

test.describe('T-100: Reports Pages', () => {
  test.describe.configure({ mode: 'serial' })

  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('should load the Reports hub page without errors', async ({ page }) => {
    await page.goto('/reports')

    await page.screenshot({ path: `${SCREENSHOTS}/reports-hub-initial.png` })

    await expect(page.getByRole('heading', { name: 'Reports' })).toBeVisible()
    await expect(page.getByText('Not Found')).not.toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/reports-hub-loaded.png` })
  })

  test('should display all four report links on the Reports hub', async ({ page }) => {
    await page.goto('/reports')

    await expect(page.getByRole('heading', { name: 'Reports' })).toBeVisible()

    await expect(page.getByText('Sales Report').first()).toBeVisible()
    await expect(page.getByText('Revenue Report').first()).toBeVisible()
    await expect(page.getByText('Occupancy Report').first()).toBeVisible()
    await expect(page.getByText('Collection Report').first()).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/reports-hub-links.png` })
  })

  test('should load the Sales Report page without errors', async ({ page }) => {
    await page.goto('/reports/sales')

    await page.screenshot({ path: `${SCREENSHOTS}/sales-report-initial.png` })

    await expect(page.getByRole('heading', { name: 'Sales Report' })).toBeVisible()
    await expect(page.getByText('Not Found')).not.toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/sales-report-loaded.png` })
  })

  test('should display date filter controls on the Sales Report page', async ({ page }) => {
    await page.goto('/reports/sales')

    await expect(page.getByRole('heading', { name: 'Sales Report' })).toBeVisible()

    await expect(page.getByText('From', { exact: true })).toBeVisible()
    await expect(page.getByText('To', { exact: true })).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/sales-report-filters.png` })
  })

  test('should display stat cards on the Sales Report page', async ({ page }) => {
    await page.goto('/reports/sales')

    await expect(page.getByRole('heading', { name: 'Sales Report' })).toBeVisible()

    await page.waitForTimeout(1500)

    await expect(page.getByText('Total Deals')).toBeVisible()
    await expect(page.getByText('Deals Won')).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/sales-report-stats.png` })
  })

  test('should load the Revenue Report page without errors', async ({ page }) => {
    await page.goto('/reports/revenue')

    await page.screenshot({ path: `${SCREENSHOTS}/revenue-report-initial.png` })

    await expect(page.getByRole('heading', { name: 'Revenue Report' })).toBeVisible()
    await expect(page.getByText('Not Found')).not.toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/revenue-report-loaded.png` })
  })

  test('should display date filter controls and stat cards on the Revenue Report page', async ({ page }) => {
    await page.goto('/reports/revenue')

    await expect(page.getByRole('heading', { name: 'Revenue Report' })).toBeVisible()

    await expect(page.getByText('From', { exact: true })).toBeVisible()
    await expect(page.getByText('To', { exact: true })).toBeVisible()

    await page.waitForTimeout(1500)

    await expect(page.getByText('Total Billed')).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/revenue-report-stats.png` })
  })

  test('should load the Occupancy Report page without errors', async ({ page }) => {
    await page.goto('/reports/occupancy')

    await page.screenshot({ path: `${SCREENSHOTS}/occupancy-report-initial.png` })

    await expect(page.getByRole('heading', { name: 'Occupancy Report' })).toBeVisible()
    await expect(page.getByText('Not Found')).not.toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/occupancy-report-loaded.png` })
  })

  test('should display stat cards on the Occupancy Report page', async ({ page }) => {
    await page.goto('/reports/occupancy')

    await expect(page.getByRole('heading', { name: 'Occupancy Report' })).toBeVisible()

    await page.waitForTimeout(1500)

    await expect(page.getByRole('main').getByText('Projects')).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/occupancy-report-stats.png` })
  })

  test('should load the Collection Report page without errors', async ({ page }) => {
    await page.goto('/reports/collection')

    await page.screenshot({ path: `${SCREENSHOTS}/collection-report-initial.png` })

    await expect(page.getByRole('heading', { name: 'Collection Report' })).toBeVisible()
    await expect(page.getByText('Not Found')).not.toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/collection-report-loaded.png` })
  })

  test('should display stat cards on the Collection Report page', async ({ page }) => {
    await page.goto('/reports/collection')

    await expect(page.getByRole('heading', { name: 'Collection Report' })).toBeVisible()

    await page.waitForTimeout(1500)

    await expect(page.getByText('Total Invoices')).toBeVisible()
    await expect(page.getByText('Paid On Time')).toBeVisible()
    await expect(page.getByText('Paid Overdue')).toBeVisible()
    await expect(page.getByText('Pending')).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/collection-report-stats.png` })
  })

  test('should load the Custom Reports page without errors', async ({ page }) => {
    await page.goto('/reports/custom')

    await page.screenshot({ path: `${SCREENSHOTS}/custom-reports-initial.png` })

    await expect(page.getByRole('heading', { name: 'Custom Reports' })).toBeVisible()
    await expect(page.getByText('Not Found')).not.toBeVisible()
    await expect(page.getByText(/coming soon/i)).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/custom-reports-loaded.png` })
  })
})
