import { test, expect, type Page } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const ADMIN_EMAIL = 'admin@thanamol.com'
const PASSWORD = 'password123'
const SCREENSHOTS = path.resolve(__dirname, 'screenshots/T-080')

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

test.describe('T-080: Companies', () => {
  test.describe.configure({ mode: 'serial' })

  let createdCompanyName: string

  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('should load Companies page with heading and table', async ({ page }) => {
    await page.goto('/companies')

    await expect(page.getByRole('heading', { name: 'Companies' })).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/companies-page-initial.png` })

    await expect(page.getByRole('table')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Add Company' })).toBeVisible()
    await expect(page.getByPlaceholder('Search company name, tax ID...')).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/companies-page-loaded.png` })
  })

  test('should display company table headers', async ({ page }) => {
    await page.goto('/companies')

    await expect(page.getByRole('heading', { name: 'Companies' })).toBeVisible()

    await expect(page.getByRole('columnheader', { name: /company/i })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: /contact/i })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: /industry/i })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: /status/i })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: /actions/i })).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/companies-table-headers.png` })
  })

  test('should open Add Company dialog and create a new company', async ({ page }) => {
    await page.goto('/companies')

    await expect(page.getByRole('heading', { name: 'Companies' })).toBeVisible()

    const timestamp = Date.now()
    createdCompanyName = `E2E Test Company ${timestamp}`

    await page.getByRole('button', { name: 'Add Company' }).click()

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await expect(dialog.getByText('Add New Company')).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/create-dialog-open.png` })

    await dialog.getByPlaceholder('ABC Company Limited').fill(createdCompanyName)
    await dialog.getByPlaceholder('0000000000000').fill('1234567890123')
    await dialog.getByPlaceholder('Real estate, Manufacturing...').fill('Technology')
    await dialog.getByPlaceholder('02-1234567').fill('02-999-0000')
    await dialog.getByPlaceholder('info@company.com').fill('e2e@testcompany.com')
    await dialog.getByPlaceholder('https://www.example.com').fill('https://e2etest.com')

    await page.screenshot({ path: `${SCREENSHOTS}/create-dialog-filled.png` })

    await dialog.getByRole('button', { name: 'Save' }).click()

    await expect(dialog).not.toBeVisible({ timeout: 10000 })
    await expect(page.getByText(createdCompanyName)).toBeVisible({ timeout: 10000 })

    await page.screenshot({ path: `${SCREENSHOTS}/company-created-in-list.png` })
  })

  test('should show the created company with ACTIVE status badge', async ({ page }) => {
    await page.goto('/companies')

    await expect(page.getByRole('heading', { name: 'Companies' })).toBeVisible()
    await expect(page.getByText(createdCompanyName)).toBeVisible({ timeout: 10000 })

    const companyRow = page.getByRole('row').filter({ hasText: createdCompanyName })
    await expect(companyRow).toBeVisible()

    await expect(companyRow.getByText('ACTIVE')).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/company-status-badge.png` })
  })

  test('should open Edit Company dialog with pre-filled values', async ({ page }) => {
    await page.goto('/companies')

    await expect(page.getByRole('heading', { name: 'Companies' })).toBeVisible()
    await expect(page.getByText(createdCompanyName)).toBeVisible({ timeout: 10000 })

    const companyRow = page.getByRole('row').filter({ hasText: createdCompanyName })
    const editButton = companyRow.getByRole('button').first()
    await editButton.click()

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await expect(dialog.getByText('Edit Company')).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/edit-dialog-open.png` })

    await expect(dialog.locator('#companyName')).toHaveValue(createdCompanyName)

    await dialog.locator('#industry').fill('Real Estate')

    await page.screenshot({ path: `${SCREENSHOTS}/edit-dialog-filled.png` })

    await dialog.getByRole('button', { name: 'Save' }).click()

    await expect(dialog).not.toBeVisible({ timeout: 10000 })
    await expect(page.getByText('Real Estate').first()).toBeVisible({ timeout: 10000 })

    await page.screenshot({ path: `${SCREENSHOTS}/edit-saved-in-list.png` })
  })

  test('should filter companies by status', async ({ page }) => {
    await page.goto('/companies')

    await expect(page.getByRole('heading', { name: 'Companies' })).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/status-filter-initial.png` })

    const statusFilter = page.getByRole('combobox').filter({ hasText: /All Status/ })
    await statusFilter.click()
    await page.getByRole('option', { name: 'Active', exact: true }).click()

    await expect(page.getByRole('table')).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/status-filter-active-applied.png` })
  })

  test('should search companies by name', async ({ page }) => {
    await page.goto('/companies')

    await expect(page.getByRole('heading', { name: 'Companies' })).toBeVisible()

    const searchInput = page.getByPlaceholder('Search company name, tax ID...')
    await searchInput.fill('E2E Test Company')

    await page.waitForTimeout(600)

    await page.screenshot({ path: `${SCREENSHOTS}/search-results.png` })

    await expect(page.getByRole('table')).toBeVisible()
  })

  test('should not show a Not Found page at /companies', async ({ page }) => {
    await page.goto('/companies')

    await expect(page).not.toHaveURL(/.*404.*/)
    await expect(page.getByText(/not found/i)).not.toBeVisible()
    await expect(page.getByRole('heading', { name: 'Companies' })).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/no-not-found.png` })
  })
})
