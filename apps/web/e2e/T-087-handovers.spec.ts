import { test, expect, type Page } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const ADMIN_EMAIL = 'admin@thanamol.com'
const PASSWORD = 'password123'
const SCREENSHOTS = path.resolve(__dirname, 'screenshots/T-087')

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

test.describe('T-087: Handovers E2E', () => {
  test.describe.configure({ mode: 'serial' })

  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('should load the Handovers list page without errors', async ({ page }) => {
    await page.goto('/contracts/handover')

    await expect(page.getByRole('heading', { name: 'Handovers' })).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/handovers-list-initial.png` })

    await expect(page.getByRole('button', { name: 'New Handover' })).toBeVisible()
    await expect(page.getByPlaceholder('Search by contract ID...')).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/handovers-list-loaded.png` })

    await expect(page.getByText('Not Found')).not.toBeVisible()
  })

  test('should display the handovers table with correct column headers', async ({ page }) => {
    await page.goto('/contracts/handover')

    await expect(page.getByRole('heading', { name: 'Handovers' })).toBeVisible()

    await page.waitForTimeout(1500)

    await page.screenshot({ path: `${SCREENSHOTS}/handovers-table-headers-initial.png` })

    await expect(page.getByRole('columnheader', { name: /Contract/i })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: /Date/i })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: /Type/i })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: /Status/i })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: /Received By/i })).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/handovers-table-headers-confirmed.png` })
  })

  test('should load the New Handover create form without errors', async ({ page }) => {
    await page.goto('/contracts/handover/new')

    await expect(page.getByText('New Handover')).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/handovers-create-initial.png` })

    await expect(page.getByText('Handover Details')).toBeVisible()
    await expect(page.getByLabel('Contract ID')).toBeVisible()
    await expect(page.getByLabel('Handover Date')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Create Handover' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Cancel' })).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/handovers-create-loaded.png` })

    await expect(page.getByText('Not Found')).not.toBeVisible()
  })

  test('should display type and status selectors on the New Handover form', async ({ page }) => {
    await page.goto('/contracts/handover/new')

    await expect(page.getByText('New Handover')).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/handovers-create-selectors-initial.png` })

    await expect(page.getByText('Type *')).toBeVisible()
    await expect(page.getByText('Status')).toBeVisible()
    await expect(page.getByText('Received By')).toBeVisible()
    await expect(page.getByText('Handed By')).toBeVisible()
    await expect(page.getByText('Notes')).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/handovers-create-selectors-confirmed.png` })
  })

  test('should navigate back to Handovers list from New Handover via Cancel', async ({ page }) => {
    await page.goto('/contracts/handover/new')

    await expect(page.getByText('New Handover')).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/handovers-create-before-cancel.png` })

    await page.getByRole('button', { name: 'Cancel' }).click()

    await expect(page).toHaveURL('/contracts/handover', { timeout: 10000 })
    await expect(page.getByRole('heading', { name: 'Handovers' })).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/handovers-back-to-list.png` })
  })

  test('should navigate to handover detail page when clicking on a handover record', async ({ page }) => {
    await page.goto('/contracts/handover')

    await expect(page.getByRole('heading', { name: 'Handovers' })).toBeVisible()

    await page.waitForTimeout(1500)

    const allHandoverLinks = page.locator('a[href^="/contracts/handover/"]')
    const allCount = await allHandoverLinks.count()

    await page.screenshot({ path: `${SCREENSHOTS}/handovers-before-navigate-detail.png` })

    // Find first detail link: /contracts/handover/<uuid> (no further path segments)
    let detailHref: string | null = null
    for (let i = 0; i < allCount; i++) {
      const href = await allHandoverLinks.nth(i).getAttribute('href')
      if (href && /^\/contracts\/handover\/[a-f0-9-]{36}$/.test(href)) {
        detailHref = href
        break
      }
    }

    if (!detailHref) {
      test.skip()
      return
    }

    await page.locator(`a[href="${detailHref}"]`).first().click()

    await expect(page).toHaveURL(/\/contracts\/handover\/[a-f0-9-]{36}$/, { timeout: 10000 })

    await page.screenshot({ path: `${SCREENSHOTS}/handovers-detail-loaded.png` })

    await expect(page.getByText('Handover Detail')).toBeVisible()
    await expect(page.getByText('Not Found')).not.toBeVisible()
    await expect(page.getByText('Status').first()).toBeVisible()
    await expect(page.getByText('Type').first()).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/handovers-detail-confirmed.png` })
  })
})
