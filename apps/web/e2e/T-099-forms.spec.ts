import { test, expect, type Page } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const ADMIN_EMAIL = 'admin@thanamol.com'
const PASSWORD = 'password123'
const SCREENSHOTS = path.resolve(__dirname, 'screenshots/T-099')

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

test.describe('T-099: Forms Pages', () => {
  test.describe.configure({ mode: 'serial' })

  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('should load the Sale Quotation form page without errors', async ({ page }) => {
    await page.goto('/forms/sale-quotation')

    await page.screenshot({ path: `${SCREENSHOTS}/sale-quotation-initial.png` })

    await expect(page.getByText('SALE-JOB01')).toBeVisible()
    await expect(page.getByText('Not Found')).not.toBeVisible()

    await expect(page.getByLabel('Quotation Number')).toBeVisible()
    await expect(page.getByLabel('Customer Name')).toBeVisible()
    await expect(page.getByLabel('Quotation Date')).toBeVisible()
    await expect(page.getByLabel('Valid Until')).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/sale-quotation-loaded.png` })
  })

  test('should show Sale Quotation form totals section with subtotal, VAT, and total fields', async ({ page }) => {
    await page.goto('/forms/sale-quotation')

    await expect(page.getByText('SALE-JOB01')).toBeVisible()

    await expect(page.getByText('Subtotal:')).toBeVisible()
    await expect(page.getByText('VAT (7%):')).toBeVisible()
    await expect(page.getByText('Total:', { exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: /Print \/ Save/i })).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/sale-quotation-totals.png` })
  })

  test('should load the Commercial Proposal form page without errors', async ({ page }) => {
    await page.goto('/forms/sale-commercial-proposal')

    await page.screenshot({ path: `${SCREENSHOTS}/sale-commercial-proposal-initial.png` })

    await expect(page.getByText('Not Found')).not.toBeVisible()
    await expect(page.getByRole('heading', { name: /Commercial Proposal/i })).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/sale-commercial-proposal-loaded.png` })
  })

  test('should load the Handover form page without errors', async ({ page }) => {
    await page.goto('/forms/handover')

    await page.screenshot({ path: `${SCREENSHOTS}/handover-initial.png` })

    await expect(page.getByText('Not Found')).not.toBeVisible()
    await expect(page.getByRole('heading', { name: /Handover Form/i })).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/handover-loaded.png` })
  })

  test('should load the Handover Photos page without errors', async ({ page }) => {
    await page.goto('/forms/handover-photos')

    await page.screenshot({ path: `${SCREENSHOTS}/handover-photos-initial.png` })

    await expect(page.getByText('Not Found')).not.toBeVisible()
    await expect(page.getByRole('heading', { name: /Handover Photo/i })).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/handover-photos-loaded.png` })
  })

  test('should load the SALE-F01 Warehouse Requirements page without errors', async ({ page }) => {
    await page.goto('/forms/sale-f01')

    await page.screenshot({ path: `${SCREENSHOTS}/sale-f01-initial.png` })

    await expect(page.getByText('Not Found')).not.toBeVisible()
    await expect(page.getByRole('heading', { name: /SALE-F01/i })).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/sale-f01-loaded.png` })
  })

  test('should load the SALE-JOB02-F01 Lease Agreement page without errors', async ({ page }) => {
    await page.goto('/forms/sale-job02-f01')

    await page.screenshot({ path: `${SCREENSHOTS}/sale-job02-f01-initial.png` })

    await expect(page.getByText('Not Found')).not.toBeVisible()
    await expect(page.getByRole('heading', { name: /SALE-JOB02-F01/i })).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/sale-job02-f01-loaded.png` })
  })

  test('should load the SALE-JOB03-F01 Pre-Handover Inspection page without errors', async ({ page }) => {
    await page.goto('/forms/sale-job03-f01')

    await page.screenshot({ path: `${SCREENSHOTS}/sale-job03-f01-initial.png` })

    await expect(page.getByText('Not Found')).not.toBeVisible()
    await expect(page.getByRole('heading', { name: /SALE-JOB03-F01/i })).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/sale-job03-f01-loaded.png` })
  })

  test('should load the SALE-JOB04-F01 Sale Jobs page without errors', async ({ page }) => {
    await page.goto('/forms/sale-job04-f01')

    await page.screenshot({ path: `${SCREENSHOTS}/sale-job04-f01-initial.png` })

    await expect(page.getByText('Not Found')).not.toBeVisible()
    await expect(page.getByRole('heading', { name: /SALE-JOB04-F01/i })).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/sale-job04-f01-loaded.png` })
  })

  test('should display list or empty state on SALE-F01 Warehouse Requirements page', async ({ page }) => {
    await page.goto('/forms/sale-f01')

    await expect(page.getByRole('heading', { name: /SALE-F01/i })).toBeVisible()

    await page.waitForTimeout(1500)

    const hasTable = await page.getByRole('table').isVisible().catch(() => false)
    const hasEmpty = await page.getByText(/No warehouse requirements/i).isVisible().catch(() => false)

    expect(hasTable || hasEmpty).toBe(true)

    await page.screenshot({ path: `${SCREENSHOTS}/sale-f01-content.png` })
  })

  test('should display list or empty state on SALE-JOB02-F01 Lease Agreement page', async ({ page }) => {
    await page.goto('/forms/sale-job02-f01')

    await expect(page.getByRole('heading', { name: /SALE-JOB02-F01/i })).toBeVisible()

    await page.waitForTimeout(1500)

    const hasTable = await page.getByRole('table').isVisible().catch(() => false)
    const hasEmpty = await page.getByText(/No lease agreements/i).isVisible().catch(() => false)

    expect(hasTable || hasEmpty).toBe(true)

    await page.screenshot({ path: `${SCREENSHOTS}/sale-job02-f01-content.png` })
  })

  test('should display list or empty state on SALE-JOB03-F01 Pre-Handover Inspection page', async ({ page }) => {
    await page.goto('/forms/sale-job03-f01')

    await expect(page.getByRole('heading', { name: /SALE-JOB03-F01/i })).toBeVisible()

    await page.waitForTimeout(1500)

    const hasTable = await page.getByRole('table').isVisible().catch(() => false)
    const hasEmpty = await page.getByText(/No (pre-handover inspections|inspections)/i).isVisible().catch(() => false)

    expect(hasTable || hasEmpty).toBe(true)

    await page.screenshot({ path: `${SCREENSHOTS}/sale-job03-f01-content.png` })
  })

  test('should display list or empty state on SALE-JOB04-F01 Sale Jobs page', async ({ page }) => {
    await page.goto('/forms/sale-job04-f01')

    await expect(page.getByRole('heading', { name: /SALE-JOB04-F01/i })).toBeVisible()

    await page.waitForTimeout(1500)

    const hasTable = await page.getByRole('table').isVisible().catch(() => false)
    const hasEmpty = await page.getByText(/No sale jobs/i).isVisible().catch(() => false)

    expect(hasTable || hasEmpty).toBe(true)

    await page.screenshot({ path: `${SCREENSHOTS}/sale-job04-f01-content.png` })
  })
})
