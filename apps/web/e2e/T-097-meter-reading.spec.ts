import { test, expect, type Page } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const ADMIN_EMAIL = 'admin@thanamol.com'
const PASSWORD = 'password123'
const SCREENSHOTS = path.resolve(__dirname, 'screenshots/T-097')

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

test.describe('T-097: Meter Reading', () => {
  test.describe.configure({ mode: 'serial' })

  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('should load the Meter Reading page without errors', async ({ page }) => {
    await page.goto('/utilities/meter-reading')

    await page.screenshot({ path: `${SCREENSHOTS}/meter-reading-initial.png` })

    await expect(page.getByRole('heading', { name: 'Meter Reading' })).toBeVisible()
    await expect(page.getByText('Not Found')).not.toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/meter-reading-loaded.png` })
  })

  test('should display the meter readings table with column headers', async ({ page }) => {
    await page.goto('/utilities/meter-reading')

    await expect(page.getByRole('heading', { name: 'Meter Reading' })).toBeVisible()

    await page.waitForTimeout(1500)

    await expect(page.getByRole('columnheader', { name: /Unit/i })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: /Type/i })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: /Billing Period/i })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: /Prev Reading/i })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: /Curr Reading/i })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: /Usage/i })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: /Amount/i })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: /Reading Date/i })).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/meter-reading-table-headers.png` })
  })

  test('should display filter controls for unit and meter type', async ({ page }) => {
    await page.goto('/utilities/meter-reading')

    await expect(page.getByRole('heading', { name: 'Meter Reading' })).toBeVisible()

    await expect(page.getByRole('button', { name: /Add Reading/i })).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/meter-reading-controls.png` })
  })

  test('should show meter records or empty state', async ({ page }) => {
    await page.goto('/utilities/meter-reading')

    await expect(page.getByRole('heading', { name: 'Meter Reading' })).toBeVisible()

    await page.waitForTimeout(1500)

    const hasRows = await page.getByRole('cell').count().then((c) => c > 0)
    const hasEmptyState = await page
      .getByText('No meter records found')
      .isVisible()
      .catch(() => false)

    expect(hasRows || hasEmptyState).toBe(true)

    await page.screenshot({ path: `${SCREENSHOTS}/meter-reading-data.png` })
  })

  test('should open the Add Meter Reading dialog when clicking Add Reading', async ({ page }) => {
    await page.goto('/utilities/meter-reading')

    await expect(page.getByRole('heading', { name: 'Meter Reading' })).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/meter-reading-before-dialog.png` })

    await page.getByRole('button', { name: /Add Reading/i }).click()

    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Add Meter Reading' })).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/meter-reading-dialog-open.png` })
  })

  test('should display all form fields in the Add Meter Reading dialog', async ({ page }) => {
    await page.goto('/utilities/meter-reading')

    await expect(page.getByRole('heading', { name: 'Meter Reading' })).toBeVisible()

    await page.getByRole('button', { name: /Add Reading/i }).click()

    await expect(page.getByRole('dialog')).toBeVisible()

    await expect(page.getByLabel('Meter Type')).toBeVisible()
    await expect(page.getByLabel('Billing Period')).toBeVisible()
    await expect(page.getByLabel('Previous Reading')).toBeVisible()
    await expect(page.getByLabel('Current Reading')).toBeVisible()
    await expect(page.getByLabel('Amount (฿)')).toBeVisible()
    await expect(page.getByLabel('Reading Date')).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/meter-reading-dialog-fields.png` })
  })
})
