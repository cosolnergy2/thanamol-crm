import { test, expect, type Page } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const ADMIN_EMAIL = 'admin@thanamol.com'
const PASSWORD = 'password123'
const SCREENSHOTS = path.resolve(__dirname, 'screenshots/T-089')

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

test.describe('T-089: Invoices E2E', () => {
  test.describe.configure({ mode: 'serial' })

  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('should load the Invoices list page without errors', async ({ page }) => {
    await page.goto('/finance/invoices')

    await page.screenshot({ path: `${SCREENSHOTS}/invoices-list-initial.png` })

    await expect(page.getByRole('heading', { name: 'Invoices' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'New Invoice' })).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/invoices-list-loaded.png` })

    await expect(page.getByText('Not Found')).not.toBeVisible()
  })

  test('should display invoice list stats and table headers', async ({ page }) => {
    await page.goto('/finance/invoices')

    await expect(page.getByRole('heading', { name: 'Invoices' })).toBeVisible()

    await page.waitForTimeout(2000)

    await page.screenshot({ path: `${SCREENSHOTS}/invoices-list-stats.png` })

    await expect(page.getByText('Total').first()).toBeVisible()
    await expect(page.getByText('Outstanding').first()).toBeVisible()
    await expect(page.getByText('Paid').first()).toBeVisible()
    await expect(page.getByText('Overdue').first()).toBeVisible()

    await expect(page.getByRole('columnheader', { name: /Invoice/i })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: /Customer/i })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: /Status/i })).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/invoices-list-table-headers.png` })
  })

  test('should load the Create Invoice page without errors', async ({ page }) => {
    await page.goto('/finance/invoices/create')

    await page.screenshot({ path: `${SCREENSHOTS}/invoices-create-initial.png` })

    await expect(page.getByRole('heading', { name: 'New Invoice' })).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/invoices-create-loaded.png` })

    await expect(page.getByText('Not Found')).not.toBeVisible()
  })

  test('should display create invoice form fields and summary panel', async ({ page }) => {
    await page.goto('/finance/invoices/create')

    await expect(page.getByRole('heading', { name: 'New Invoice' })).toBeVisible()

    await page.waitForTimeout(1000)

    await page.screenshot({ path: `${SCREENSHOTS}/invoices-create-form.png` })

    await expect(page.getByText('Invoice Details')).toBeVisible()
    await expect(page.getByText('Line Items')).toBeVisible()
    await expect(page.getByText('Summary')).toBeVisible()

    await expect(page.getByRole('button', { name: 'Add Item' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Create Invoice' })).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/invoices-create-form-confirmed.png` })
  })

  test('should open Add Line Item dialog on the create page', async ({ page }) => {
    await page.goto('/finance/invoices/create')

    await expect(page.getByRole('heading', { name: 'New Invoice' })).toBeVisible()

    await page.getByRole('button', { name: 'Add Item' }).click()

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await expect(dialog.getByRole('heading', { name: 'Add Line Item' })).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/invoices-create-add-item-dialog.png` })

    await expect(dialog.getByPlaceholder('Item description')).toBeVisible()
    await expect(dialog.getByRole('button', { name: 'Cancel' })).toBeVisible()
    await expect(dialog.getByRole('button', { name: 'Add' })).toBeVisible()

    await dialog.getByRole('button', { name: 'Cancel' }).click()
    await expect(dialog).not.toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/invoices-create-add-item-dialog-closed.png` })
  })

  test('should navigate to an invoice detail page when invoices exist', async ({ page }) => {
    await page.goto('/finance/invoices')

    await expect(page.getByRole('heading', { name: 'Invoices' })).toBeVisible()

    await page.waitForTimeout(2000)

    await page.screenshot({ path: `${SCREENSHOTS}/invoices-list-before-navigate.png` })

    const noInvoicesVisible = await page.getByText('No invoices found').isVisible().catch(() => false)

    if (noInvoicesVisible) {
      test.skip()
      return
    }

    const viewButton = page.getByRole('link', { name: /View/i }).first()
    const viewButtonVisible = await viewButton.isVisible({ timeout: 5000 }).catch(() => false)

    if (!viewButtonVisible) {
      const eyeLinks = page.locator('a[href*="/finance/invoices/"]').first()
      await eyeLinks.click()
    } else {
      await viewButton.click()
    }

    await page.waitForURL(/\/finance\/invoices\/.+/, { timeout: 8000 })

    await page.screenshot({ path: `${SCREENSHOTS}/invoices-detail-loaded.png` })

    await expect(page.getByText('Invoice Info')).toBeVisible()
    await expect(page.getByText('Line Items')).toBeVisible()
    await expect(page.getByText('Payment History')).toBeVisible()
    await expect(page.getByText('Not Found')).not.toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/invoices-detail-confirmed.png` })
  })

  test('should display Back button and navigate to edit page for DRAFT invoices', async ({ page }) => {
    await page.goto('/finance/invoices')

    await expect(page.getByRole('heading', { name: 'Invoices' })).toBeVisible()

    await page.waitForTimeout(2000)

    const noInvoicesVisible = await page.getByText('No invoices found').isVisible().catch(() => false)

    if (noInvoicesVisible) {
      test.skip()
      return
    }

    const eyeLinks = page.locator('a[href*="/finance/invoices/"]')
    const count = await eyeLinks.count()

    if (count === 0) {
      test.skip()
      return
    }

    const detailUrl = await eyeLinks.first().getAttribute('href')
    if (!detailUrl) {
      test.skip()
      return
    }

    await page.goto(detailUrl)
    await page.waitForURL(/\/finance\/invoices\/.+/, { timeout: 8000 })

    await page.screenshot({ path: `${SCREENSHOTS}/invoices-detail-back-button.png` })

    await expect(page.getByRole('button', { name: 'Back' })).toBeVisible()

    const editButton = page.getByRole('link', { name: 'Edit' })
    const editButtonVisible = await editButton.isVisible({ timeout: 3000 }).catch(() => false)

    if (editButtonVisible) {
      await editButton.click()
      await page.waitForURL(/\/finance\/invoices\/.+\/edit/, { timeout: 8000 })

      await page.screenshot({ path: `${SCREENSHOTS}/invoices-edit-loaded.png` })

      await expect(page.getByText('Invoice Details')).toBeVisible()
      await expect(page.getByText('Not Found')).not.toBeVisible()

      await page.screenshot({ path: `${SCREENSHOTS}/invoices-edit-confirmed.png` })
    } else {
      await page.screenshot({ path: `${SCREENSHOTS}/invoices-detail-non-draft-confirmed.png` })
    }
  })
})
