import { test, expect, type Page } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const ADMIN_EMAIL = 'admin@thanamol.com'
const PASSWORD = 'password123'
const SCREENSHOTS = path.resolve(__dirname, 'screenshots/T-090')

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

test.describe('T-090: Payments E2E', () => {
  test.describe.configure({ mode: 'serial' })

  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('should load the Receive Payment page without errors', async ({ page }) => {
    await page.goto('/finance/payments/receive')

    await page.screenshot({ path: `${SCREENSHOTS}/payments-receive-initial.png` })

    await expect(page.getByRole('heading', { name: 'Receive Payment' })).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/payments-receive-loaded.png` })

    await expect(page.getByText('Not Found')).not.toBeVisible()
  })

  test('should display outstanding invoices summary stats', async ({ page }) => {
    await page.goto('/finance/payments/receive')

    await expect(page.getByRole('heading', { name: 'Receive Payment' })).toBeVisible()

    await page.waitForTimeout(2000)

    await page.screenshot({ path: `${SCREENSHOTS}/payments-receive-stats.png` })

    await expect(page.getByText('Outstanding Invoices', { exact: true })).toBeVisible()
    await expect(page.getByText('Total Outstanding', { exact: true })).toBeVisible()
    await expect(page.getByText('Overdue', { exact: true }).first()).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/payments-receive-stats-confirmed.png` })
  })

  test('should display invoice table with correct column headers', async ({ page }) => {
    await page.goto('/finance/payments/receive')

    await expect(page.getByRole('heading', { name: 'Receive Payment' })).toBeVisible()

    await page.waitForTimeout(2000)

    await page.screenshot({ path: `${SCREENSHOTS}/payments-receive-table-initial.png` })

    await expect(page.getByRole('columnheader', { name: /Invoice No/i })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: /Customer/i })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: /Due Date/i })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: /Total/i })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: /Status/i })).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/payments-receive-table-headers.png` })
  })

  test('should show Receive button for each unpaid invoice or empty state message', async ({ page }) => {
    await page.goto('/finance/payments/receive')

    await expect(page.getByRole('heading', { name: 'Receive Payment' })).toBeVisible()

    await page.waitForTimeout(2000)

    await page.screenshot({ path: `${SCREENSHOTS}/payments-receive-invoice-rows.png` })

    const noInvoicesMessage = await page.getByText('No outstanding invoices').isVisible().catch(() => false)

    if (noInvoicesMessage) {
      await expect(page.getByText('No outstanding invoices')).toBeVisible()
    } else {
      const receiveButtons = page.getByRole('button', { name: 'Receive' })
      const buttonCount = await receiveButtons.count()
      expect(buttonCount).toBeGreaterThan(0)
    }

    await page.screenshot({ path: `${SCREENSHOTS}/payments-receive-invoice-rows-confirmed.png` })
  })

  test('should open payment dialog when clicking Receive on an unpaid invoice', async ({ page }) => {
    await page.goto('/finance/payments/receive')

    await expect(page.getByRole('heading', { name: 'Receive Payment' })).toBeVisible()

    await page.waitForTimeout(2000)

    const noInvoicesMessage = await page.getByText('No outstanding invoices').isVisible().catch(() => false)

    if (noInvoicesMessage) {
      test.skip()
      return
    }

    const receiveButton = page.getByRole('button', { name: 'Receive' }).first()
    const buttonVisible = await receiveButton.isVisible({ timeout: 5000 }).catch(() => false)

    if (!buttonVisible) {
      test.skip()
      return
    }

    await page.screenshot({ path: `${SCREENSHOTS}/payments-receive-before-dialog.png` })

    await receiveButton.click()

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await expect(dialog.getByRole('heading', { name: 'Record Payment' })).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/payments-receive-dialog-open.png` })

    await expect(dialog.getByRole('button', { name: 'Cancel' })).toBeVisible()
    await expect(dialog.getByRole('button', { name: 'Record Payment' })).toBeVisible()

    await dialog.getByRole('button', { name: 'Cancel' }).click()
    await expect(dialog).not.toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/payments-receive-dialog-closed.png` })
  })

  test('should display payment method options in the payment dialog', async ({ page }) => {
    await page.goto('/finance/payments/receive')

    await expect(page.getByRole('heading', { name: 'Receive Payment' })).toBeVisible()

    await page.waitForTimeout(2000)

    const noInvoicesMessage = await page.getByText('No outstanding invoices').isVisible().catch(() => false)

    if (noInvoicesMessage) {
      test.skip()
      return
    }

    const receiveButton = page.getByRole('button', { name: 'Receive' }).first()
    const buttonVisible = await receiveButton.isVisible({ timeout: 5000 }).catch(() => false)

    if (!buttonVisible) {
      test.skip()
      return
    }

    await receiveButton.click()

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/payments-dialog-method-before.png` })

    const methodSelect = dialog.getByRole('combobox').first()
    await methodSelect.click()

    await expect(page.getByRole('option', { name: 'Cash' })).toBeVisible()
    await expect(page.getByRole('option', { name: 'Bank Transfer' })).toBeVisible()
    await expect(page.getByRole('option', { name: 'Cheque' })).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/payments-dialog-method-options.png` })

    await page.keyboard.press('Escape')
  })
})
