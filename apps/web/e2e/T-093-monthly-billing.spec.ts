import { test, expect, type Page } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const ADMIN_EMAIL = 'admin@thanamol.com'
const PASSWORD = 'password123'
const SCREENSHOTS = path.resolve(__dirname, 'screenshots/T-093')

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

test.describe('T-093: Monthly Billing', () => {
  test.describe.configure({ mode: 'serial' })

  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('should load the Monthly Billing page without errors', async ({ page }) => {
    await page.goto('/finance/monthly-billing')

    await page.screenshot({ path: `${SCREENSHOTS}/monthly-billing-initial.png` })

    await expect(page.getByRole('heading', { name: 'Monthly Billing' })).toBeVisible()

    await expect(page.getByText('Not Found')).not.toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/monthly-billing-loaded.png` })
  })

  test('should display the billing month selector', async ({ page }) => {
    await page.goto('/finance/monthly-billing')

    await expect(page.getByRole('heading', { name: 'Monthly Billing' })).toBeVisible()

    await expect(page.getByText('Billing Month')).toBeVisible()

    const monthInput = page.locator('input[type="month"]')
    await expect(monthInput).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/monthly-billing-month-selector.png` })
  })

  test('should display stat cards for billing totals', async ({ page }) => {
    await page.goto('/finance/monthly-billing')

    await expect(page.getByRole('heading', { name: 'Monthly Billing' })).toBeVisible()

    await page.waitForTimeout(1500)

    await expect(page.getByText('Total Billed')).toBeVisible()
    await expect(page.getByText('Collected')).toBeVisible()
    await expect(page.getByText('Outstanding')).toBeVisible()
    await expect(page.getByText('Invoices').first()).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/monthly-billing-stat-cards.png` })
  })

  test('should display the invoices table with column headers', async ({ page }) => {
    await page.goto('/finance/monthly-billing')

    await expect(page.getByRole('heading', { name: 'Monthly Billing' })).toBeVisible()

    await page.waitForTimeout(1500)

    await page.screenshot({ path: `${SCREENSHOTS}/monthly-billing-table-initial.png` })

    await expect(page.getByRole('columnheader', { name: /Invoice No/i })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: /Customer/i })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: /Due Date/i })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: /Subtotal/i })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: /VAT/i })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: 'Total', exact: true })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: /Status/i })).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/monthly-billing-table-headers.png` })
  })

  test('should show invoices list or empty state for the selected month', async ({ page }) => {
    await page.goto('/finance/monthly-billing')

    await expect(page.getByRole('heading', { name: 'Monthly Billing' })).toBeVisible()

    await page.waitForTimeout(1500)

    const hasInvoices = await page.getByRole('cell').count().then((c) => c > 0)
    const hasEmptyState = await page.getByText(/No invoices for/).isVisible().catch(() => false)

    expect(hasInvoices || hasEmptyState).toBe(true)

    await page.screenshot({ path: `${SCREENSHOTS}/monthly-billing-table-data.png` })
  })
})
