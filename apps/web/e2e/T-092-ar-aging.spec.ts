import { test, expect, type Page } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const ADMIN_EMAIL = 'admin@thanamol.com'
const PASSWORD = 'password123'
const SCREENSHOTS = path.resolve(__dirname, 'screenshots/T-092')

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

test.describe('T-092: AR Aging', () => {
  test.describe.configure({ mode: 'serial' })

  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('should load the AR Aging page without errors', async ({ page }) => {
    await page.goto('/finance/ar-aging')

    await page.screenshot({ path: `${SCREENSHOTS}/ar-aging-initial.png` })

    await expect(page.getByRole('heading', { name: 'AR Aging' })).toBeVisible()

    await expect(page.getByText('Not Found')).not.toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/ar-aging-loaded.png` })
  })

  test('should display aging bucket summary cards', async ({ page }) => {
    await page.goto('/finance/ar-aging')

    await expect(page.getByRole('heading', { name: 'AR Aging' })).toBeVisible()

    await page.waitForTimeout(1500)

    await page.screenshot({ path: `${SCREENSHOTS}/ar-aging-buckets-initial.png` })

    await expect(page.getByText('Current')).toBeVisible()
    await expect(page.getByText('1-30 days')).toBeVisible()
    await expect(page.getByText('31-60 days')).toBeVisible()
    await expect(page.getByText('61-90 days')).toBeVisible()
    await expect(page.getByText('90+ days')).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/ar-aging-buckets-loaded.png` })
  })

  test('should display the Unpaid Invoices table with column headers', async ({ page }) => {
    await page.goto('/finance/ar-aging')

    await expect(page.getByRole('heading', { name: 'AR Aging' })).toBeVisible()

    await page.waitForTimeout(1500)

    await page.screenshot({ path: `${SCREENSHOTS}/ar-aging-table-initial.png` })

    await expect(page.getByText('Unpaid Invoices')).toBeVisible()
    await expect(page.getByRole('columnheader', { name: /Invoice No/i })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: /Customer/i })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: /Balance Due/i })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: /Days Overdue/i })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: /Bucket/i })).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/ar-aging-table-headers.png` })
  })

  test('should display Total AR summary or clear AR message', async ({ page }) => {
    await page.goto('/finance/ar-aging')

    await expect(page.getByRole('heading', { name: 'AR Aging' })).toBeVisible()

    await page.waitForTimeout(1500)

    const hasAR = await page.getByText(/Total AR:/).isVisible().catch(() => false)
    const clearAR = await page.getByText('No outstanding invoices — AR is clear').isVisible().catch(() => false)

    expect(hasAR || clearAR).toBe(true)

    await page.screenshot({ path: `${SCREENSHOTS}/ar-aging-summary.png` })
  })
})
