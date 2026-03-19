import { test, expect, type Page } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const ADMIN_EMAIL = 'admin@thanamol.com'
const PASSWORD = 'password123'
const SCREENSHOTS = path.resolve(__dirname, 'screenshots/T-091')

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

test.describe('T-091: Deposits', () => {
  test.describe.configure({ mode: 'serial' })

  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('should load the Deposits page without errors', async ({ page }) => {
    await page.goto('/finance/deposits')

    await page.screenshot({ path: `${SCREENSHOTS}/deposits-initial.png` })

    await expect(page.getByRole('heading', { name: 'Deposits' })).toBeVisible()

    await expect(page.getByText('Not Found')).not.toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/deposits-loaded.png` })
  })

  test('should display the deposits table with column headers', async ({ page }) => {
    await page.goto('/finance/deposits')

    await expect(page.getByRole('heading', { name: 'Deposits' })).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/deposits-table-initial.png` })

    await expect(page.getByRole('columnheader', { name: /Contract/i })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: /Customer/i })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: /Amount/i })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: /Date/i })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: /Status/i })).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/deposits-table-headers.png` })
  })

  test('should display the New Deposit button and status filter', async ({ page }) => {
    await page.goto('/finance/deposits')

    await expect(page.getByRole('heading', { name: 'Deposits' })).toBeVisible()

    await expect(page.getByRole('button', { name: 'New Deposit' })).toBeVisible()

    await expect(page.getByPlaceholder('Search contract, customer...')).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/deposits-controls.png` })
  })

  test('should display stat cards for deposit totals', async ({ page }) => {
    await page.goto('/finance/deposits')

    await expect(page.getByRole('heading', { name: 'Deposits' })).toBeVisible()

    await page.waitForTimeout(1500)

    await expect(page.getByText('Total Held')).toBeVisible()
    await expect(page.getByText('Held').first()).toBeVisible()
    await expect(page.getByText('Applied').first()).toBeVisible()
    await expect(page.getByText('Refunded').first()).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/deposits-stat-cards.png` })
  })

  test('should open the New Deposit dialog', async ({ page }) => {
    await page.goto('/finance/deposits')

    await expect(page.getByRole('heading', { name: 'Deposits' })).toBeVisible()

    await page.getByRole('button', { name: 'New Deposit' }).click()

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await expect(dialog.getByRole('heading', { name: 'New Deposit' })).toBeVisible()
    await expect(dialog.getByLabel('Contract ID *')).toBeVisible()
    await expect(dialog.getByLabel('Customer ID *')).toBeVisible()
    await expect(dialog.getByLabel('Amount (฿) *')).toBeVisible()
    await expect(dialog.getByRole('button', { name: 'Cancel' })).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/deposits-create-dialog-open.png` })

    await dialog.getByRole('button', { name: 'Cancel' }).click()
    await expect(dialog).not.toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/deposits-create-dialog-closed.png` })
  })
})
