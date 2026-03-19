import { test, expect, type Page } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const ADMIN_EMAIL = 'admin@thanamol.com'
const PASSWORD = 'password123'
const SCREENSHOTS = path.resolve(__dirname, 'screenshots/T-086')

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

test.describe('T-086: Contracts E2E', () => {
  test.describe.configure({ mode: 'serial' })

  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('should load the Contracts list page without errors', async ({ page }) => {
    await page.goto('/contracts')

    await expect(page.getByRole('heading', { name: 'Contracts' })).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/contracts-list-initial.png` })

    await expect(page.getByRole('button', { name: 'New Contract' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Expiring' })).toBeVisible()
    await expect(page.getByPlaceholder('Search contract number...')).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/contracts-list-loaded.png` })

    await expect(page.getByText('Not Found')).not.toBeVisible()
  })

  test('should display stat cards on the Contracts list page', async ({ page }) => {
    await page.goto('/contracts')

    await expect(page.getByRole('heading', { name: 'Contracts' })).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/contracts-stat-cards-initial.png` })

    await expect(page.getByText('Total').first()).toBeVisible()
    await expect(page.getByText('Active').first()).toBeVisible()
    await expect(page.getByText('Pending Approval').first()).toBeVisible()
    await expect(page.getByText('Approved').first()).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/contracts-stat-cards-loaded.png` })
  })

  test('should load the Create Contract page without errors', async ({ page }) => {
    await page.goto('/contracts/create')

    await expect(page.getByRole('heading', { name: 'New Contract' })).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/contracts-create-initial.png` })

    await expect(page.getByText('Contract Details')).toBeVisible()
    await expect(page.getByText('Financial Details')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Save Contract' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Cancel' })).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/contracts-create-loaded.png` })

    await expect(page.getByText('Not Found')).not.toBeVisible()
  })

  test('should display required field labels on Create Contract form', async ({ page }) => {
    await page.goto('/contracts/create')

    await expect(page.getByRole('heading', { name: 'New Contract' })).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/contracts-create-fields-initial.png` })

    await expect(page.getByText('Customer *')).toBeVisible()
    await expect(page.getByText('Project *')).toBeVisible()
    await expect(page.getByText('Start Date *')).toBeVisible()
    await expect(page.getByText('Contract Type *')).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/contracts-create-fields-confirmed.png` })
  })

  test('should load the Expiring Contracts page without errors', async ({ page }) => {
    await page.goto('/contracts/expiring')

    await expect(page.getByRole('heading', { name: 'Expiring Contracts' })).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/contracts-expiring-initial.png` })

    await expect(page.getByText('Critical (< 7 days)')).toBeVisible()
    await expect(page.getByText('Warning (7–29 days)')).toBeVisible()
    await expect(page.getByText('Notice (≥ 30 days)')).toBeVisible()
    await expect(page.getByText('Total Expiring')).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/contracts-expiring-loaded.png` })

    await expect(page.getByText('Not Found')).not.toBeVisible()
  })

  test('should navigate from Contracts list to a contract detail page', async ({ page }) => {
    await page.goto('/contracts')

    await expect(page.getByRole('heading', { name: 'Contracts' })).toBeVisible()

    await page.waitForTimeout(1500)

    // Collect all hrefs of links starting with /contracts/
    const allContractLinks = page.locator('a[href^="/contracts/"]')
    const allCount = await allContractLinks.count()

    await page.screenshot({ path: `${SCREENSHOTS}/contracts-list-before-navigate.png` })

    // Find first detail-page link: /contracts/<uuid> (no further path segments)
    let detailHref: string | null = null
    for (let i = 0; i < allCount; i++) {
      const href = await allContractLinks.nth(i).getAttribute('href')
      if (href && /^\/contracts\/[a-f0-9-]{36}$/.test(href)) {
        detailHref = href
        break
      }
    }

    if (!detailHref) {
      test.skip()
      return
    }

    await page.locator(`a[href="${detailHref}"]`).first().click()

    await expect(page).toHaveURL(new RegExp(detailHref.replace('/', '\\/')), { timeout: 10000 })

    await page.screenshot({ path: `${SCREENSHOTS}/contracts-detail-loaded.png` })

    await expect(page.getByText('Not Found')).not.toBeVisible()
    // Detail page renders stat cards: Status and Type are always visible
    await expect(page.getByText('Status').first()).toBeVisible()
    await expect(page.getByText('Type').first()).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/contracts-detail-confirmed.png` })
  })

  test('should navigate to edit page for a DRAFT contract', async ({ page }) => {
    await page.goto('/contracts')

    await expect(page.getByRole('heading', { name: 'Contracts' })).toBeVisible()

    await page.waitForTimeout(1500)

    // Edit buttons only appear for DRAFT contracts; links end in /<id>/edit
    const editLinks = page.locator('a[href$="/edit"]')
    const editCount = await editLinks.count()

    await page.screenshot({ path: `${SCREENSHOTS}/contracts-edit-link-check.png` })

    if (editCount === 0) {
      test.skip()
      return
    }

    await editLinks.first().click()

    await expect(page).toHaveURL(/\/contracts\/.+\/edit/, { timeout: 10000 })

    await page.screenshot({ path: `${SCREENSHOTS}/contracts-edit-loaded.png` })

    await expect(page.getByText('Not Found')).not.toBeVisible()
    await expect(page.getByText('Contract Details')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Save Changes' })).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/contracts-edit-confirmed.png` })
  })

  test('should navigate back to Contracts list from Create Contract via Cancel', async ({ page }) => {
    await page.goto('/contracts/create')

    await expect(page.getByRole('heading', { name: 'New Contract' })).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/contracts-create-before-cancel.png` })

    await page.getByRole('button', { name: 'Cancel' }).click()

    await expect(page).toHaveURL('/contracts', { timeout: 10000 })
    await expect(page.getByRole('heading', { name: 'Contracts' })).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/contracts-back-to-list.png` })
  })
})
