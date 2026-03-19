import { test, expect, type Page } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const ADMIN_EMAIL = 'admin@thanamol.com'
const PASSWORD = 'password123'
const SCREENSHOTS = path.resolve(__dirname, 'screenshots/T-081')

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

test.describe('T-081: Leads', () => {
  test.describe.configure({ mode: 'serial' })

  let createdLeadTitle: string
  let createdLeadId: string

  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('should load Leads list page with heading and table', async ({ page }) => {
    await page.goto('/leads')

    await expect(page.getByRole('heading', { name: 'Lead Inbox' })).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/leads-page-initial.png` })

    await expect(page.getByRole('table')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Add Lead' })).toBeVisible()
    await expect(page.getByPlaceholder('Search leads...')).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/leads-page-loaded.png` })
  })

  test('should display status stat cards on leads page', async ({ page }) => {
    await page.goto('/leads')

    await expect(page.getByRole('heading', { name: 'Lead Inbox' })).toBeVisible()

    await expect(page.getByText('New').first()).toBeVisible()
    await expect(page.getByText('Contacted').first()).toBeVisible()
    await expect(page.getByText('Qualified').first()).toBeVisible()
    await expect(page.getByText('Converted').first()).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/leads-stat-cards.png` })
  })

  test('should display lead table headers', async ({ page }) => {
    await page.goto('/leads')

    await expect(page.getByRole('heading', { name: 'Lead Inbox' })).toBeVisible()

    await expect(page.getByRole('columnheader', { name: /title/i })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: /customer/i })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: /status/i })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: /source/i })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: /actions/i })).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/leads-table-headers.png` })
  })

  test('should open Add Lead dialog and create a new lead', async ({ page }) => {
    await page.goto('/leads')

    await expect(page.getByRole('heading', { name: 'Lead Inbox' })).toBeVisible()

    const timestamp = Date.now()
    createdLeadTitle = `E2E Test Lead ${timestamp}`

    await page.getByRole('button', { name: 'Add Lead' }).click()

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await expect(dialog.getByText('Add Lead')).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/create-dialog-open.png` })

    await dialog.getByPlaceholder('Lead title...').fill(createdLeadTitle)
    await dialog.getByPlaceholder('Facebook, Walk-in, Referral...').fill('E2E Test')

    await page.screenshot({ path: `${SCREENSHOTS}/create-dialog-filled.png` })

    await dialog.getByRole('button', { name: 'Create Lead' }).click()

    await expect(dialog).not.toBeVisible({ timeout: 10000 })
    await expect(page.getByText(createdLeadTitle)).toBeVisible({ timeout: 10000 })

    await page.screenshot({ path: `${SCREENSHOTS}/lead-created-in-list.png` })
  })

  test('should display the created lead with New status badge', async ({ page }) => {
    await page.goto('/leads')

    await expect(page.getByRole('heading', { name: 'Lead Inbox' })).toBeVisible()
    await expect(page.getByText(createdLeadTitle)).toBeVisible({ timeout: 10000 })

    const leadRow = page.getByRole('row').filter({ hasText: createdLeadTitle })
    await expect(leadRow).toBeVisible()
    await expect(leadRow.getByText('New')).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/lead-status-badge.png` })
  })

  test('should navigate to lead detail page via View button', async ({ page }) => {
    await page.goto('/leads')

    await expect(page.getByRole('heading', { name: 'Lead Inbox' })).toBeVisible()
    await expect(page.getByText(createdLeadTitle)).toBeVisible({ timeout: 10000 })

    const leadRow = page.getByRole('row').filter({ hasText: createdLeadTitle })

    await page.screenshot({ path: `${SCREENSHOTS}/lead-row-before-view.png` })

    await leadRow.getByRole('link', { name: 'View' }).click()

    await page.waitForURL(/\/leads\/.+/, { timeout: 10000 })

    const currentUrl = page.url()
    const match = currentUrl.match(/\/leads\/([^/]+)/)
    if (match) createdLeadId = match[1]

    await expect(page.getByRole('heading', { name: 'Lead Detail' })).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/lead-detail-page.png` })
  })

  test('should load lead detail page with Lead Information card', async ({ page }) => {
    await page.goto('/leads')

    await expect(page.getByRole('heading', { name: 'Lead Inbox' })).toBeVisible()
    await expect(page.getByText(createdLeadTitle)).toBeVisible({ timeout: 10000 })

    const leadRow = page.getByRole('row').filter({ hasText: createdLeadTitle })
    await leadRow.getByRole('link', { name: 'View' }).click()

    await page.waitForURL(/\/leads\/.+/, { timeout: 10000 })

    await expect(page.getByText('Lead Information')).toBeVisible()
    await expect(page.getByText('Select customer')).toBeVisible()

    const titleInput = page.locator('input[placeholder="Lead title..."]')
    await expect(titleInput).toHaveValue(createdLeadTitle)

    await page.screenshot({ path: `${SCREENSHOTS}/lead-detail-form.png` })
  })

  test('should show back button on lead detail page that returns to leads list', async ({ page }) => {
    await page.goto('/leads')

    await expect(page.getByRole('heading', { name: 'Lead Inbox' })).toBeVisible()
    await expect(page.getByText(createdLeadTitle)).toBeVisible({ timeout: 10000 })

    const leadRow = page.getByRole('row').filter({ hasText: createdLeadTitle })
    await leadRow.getByRole('link', { name: 'View' }).click()

    await page.waitForURL(/\/leads\/.+/, { timeout: 10000 })
    await expect(page.getByRole('heading', { name: 'Lead Detail' })).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/lead-detail-back-button.png` })

    await page.getByRole('link', { name: 'Cancel' }).click()

    await page.waitForURL('/leads', { timeout: 8000 })
    await expect(page.getByRole('heading', { name: 'Lead Inbox' })).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/back-to-leads-list.png` })
  })

  test('should filter leads by status', async ({ page }) => {
    await page.goto('/leads')

    await expect(page.getByRole('heading', { name: 'Lead Inbox' })).toBeVisible()

    const statusFilter = page.getByRole('combobox').filter({ hasText: /All Status/ })
    await statusFilter.click()
    await page.getByRole('option', { name: 'New' }).click()

    await expect(page.getByRole('table')).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/status-filter-new-applied.png` })
  })

  test('should not show a Not Found page at /leads', async ({ page }) => {
    await page.goto('/leads')

    await expect(page).not.toHaveURL(/.*404.*/)
    await expect(page.getByText(/not found/i)).not.toBeVisible()
    await expect(page.getByRole('heading', { name: 'Lead Inbox' })).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/no-not-found-leads.png` })
  })

  test('should not show a Not Found page for a valid lead detail URL', async ({ page }) => {
    await page.goto('/leads')

    await expect(page.getByRole('heading', { name: 'Lead Inbox' })).toBeVisible()
    await expect(page.getByText(createdLeadTitle)).toBeVisible({ timeout: 10000 })

    const leadRow = page.getByRole('row').filter({ hasText: createdLeadTitle })
    await leadRow.getByRole('link', { name: 'View' }).click()

    await page.waitForURL(/\/leads\/.+/, { timeout: 10000 })

    await expect(page).not.toHaveURL(/.*404.*/)
    await expect(page.getByText(/not found/i)).not.toBeVisible()
    await expect(page.getByRole('heading', { name: 'Lead Detail' })).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/no-not-found-lead-detail.png` })
  })
})
