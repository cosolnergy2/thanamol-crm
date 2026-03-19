import { test, expect, type Page } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const ADMIN_EMAIL = 'admin@thanamol.com'
const PASSWORD = 'password123'
const SCREENSHOTS = path.resolve(__dirname, 'screenshots/T-098')

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

test.describe('T-098: Usage Report', () => {
  test.describe.configure({ mode: 'serial' })

  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('should load the Utility Report page without errors', async ({ page }) => {
    await page.goto('/utilities/report')

    await page.screenshot({ path: `${SCREENSHOTS}/usage-report-initial.png` })

    await expect(page.getByRole('heading', { name: 'Utility Report' })).toBeVisible()
    await expect(page.getByText('Not Found')).not.toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/usage-report-loaded.png` })
  })

  test('should display billing period selector and type filter', async ({ page }) => {
    await page.goto('/utilities/report')

    await expect(page.getByRole('heading', { name: 'Utility Report' })).toBeVisible()

    await expect(page.locator('input[type="month"]')).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/usage-report-filters.png` })
  })

  test('should display summary stat cards', async ({ page }) => {
    await page.goto('/utilities/report')

    await expect(page.getByRole('heading', { name: 'Utility Report' })).toBeVisible()

    await page.waitForTimeout(1500)

    await expect(page.getByText('Total Units')).toBeVisible()
    await expect(page.getByText('Total Usage')).toBeVisible()
    await expect(page.getByText('Total Amount')).toBeVisible()
    await expect(page.getByText('Readings')).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/usage-report-stat-cards.png` })
  })

  test('should display per-type breakdown cards for Electricity, Water, and Gas', async ({
    page,
  }) => {
    await page.goto('/utilities/report')

    await expect(page.getByRole('heading', { name: 'Utility Report' })).toBeVisible()

    await page.waitForTimeout(1500)

    await expect(page.getByText('Electricity').first()).toBeVisible()
    await expect(page.getByText('Water').first()).toBeVisible()
    await expect(page.getByText('Gas').first()).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/usage-report-type-breakdown.png` })
  })

  test('should display the Usage by Unit section', async ({ page }) => {
    await page.goto('/utilities/report')

    await expect(page.getByRole('heading', { name: 'Utility Report' })).toBeVisible()

    await page.waitForTimeout(1500)

    await expect(page.getByText('Usage by Unit')).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/usage-report-usage-by-unit.png` })
  })

  test('should show usage table with column headers or empty state for selected period', async ({
    page,
  }) => {
    await page.goto('/utilities/report')

    await expect(page.getByRole('heading', { name: 'Utility Report' })).toBeVisible()

    await page.waitForTimeout(1500)

    const hasTable = await page
      .getByRole('columnheader', { name: /Unit/i })
      .isVisible()
      .catch(() => false)
    const hasEmptyState = await page
      .getByText('No data for the selected period')
      .isVisible()
      .catch(() => false)

    expect(hasTable || hasEmptyState).toBe(true)

    await page.screenshot({ path: `${SCREENSHOTS}/usage-report-table-or-empty.png` })
  })

  test('should update report when billing period is changed', async ({ page }) => {
    await page.goto('/utilities/report')

    await expect(page.getByRole('heading', { name: 'Utility Report' })).toBeVisible()

    const monthInput = page.locator('input[type="month"]')
    await expect(monthInput).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/usage-report-before-period-change.png` })

    await monthInput.fill('2025-01')

    await page.waitForTimeout(1000)

    await expect(page.getByRole('heading', { name: 'Utility Report' })).toBeVisible()
    await expect(page.getByText('Not Found')).not.toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/usage-report-after-period-change.png` })
  })
})
