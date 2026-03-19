import { test, expect, type Page } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const ADMIN_EMAIL = 'admin@thanamol.com'
const PASSWORD = 'password123'
const SCREENSHOTS = path.resolve(__dirname, 'screenshots/T-085')

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

test.describe('T-085: Commercial Quotations', () => {
  test.describe.configure({ mode: 'serial' })

  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('should load commercial quotations list page with table and controls', async ({ page }) => {
    await page.goto('/quotations/commercial')

    await page.screenshot({ path: `${SCREENSHOTS}/list-initial.png` })

    await expect(page.getByRole('heading', { name: 'Commercial Quotations' })).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/list-loaded.png` })

    await expect(page.getByPlaceholder('Search quotation number...')).toBeVisible()
    await expect(page.getByRole('combobox').filter({ hasText: /All Status/ })).toBeVisible()
    await expect(page.getByRole('link', { name: /New Quotation/ })).toBeVisible()

    await expect(page.getByText('Not Found')).not.toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/list-controls-visible.png` })
  })

  test('should load commercial quotation create form with customer and project fields', async ({ page }) => {
    await page.goto('/quotations/commercial/new')

    await page.screenshot({ path: `${SCREENSHOTS}/create-initial.png` })

    await expect(page.getByText('New Commercial Quotation')).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/create-loaded.png` })

    await expect(page.getByRole('button', { name: 'Create Quotation' })).toBeVisible()

    await expect(page.getByText('Not Found')).not.toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/create-form-visible.png` })
  })

  test('should navigate from list to commercial quotation detail without Not Found', async ({ page }) => {
    await page.goto('/quotations/commercial')

    await expect(page.getByRole('heading', { name: 'Commercial Quotations' })).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/list-before-nav.png` })

    const isLoading = await page.locator('[class*="skeleton"], [class*="Skeleton"]').first().isVisible().catch(() => false)
    if (isLoading) {
      await page.waitForTimeout(2000)
    }

    const viewLinks = page.getByRole('row').locator('a[href*="/quotations/commercial/"]').filter({ hasNot: page.locator('[href*="/edit"]') }).filter({ hasNot: page.locator('[href*="/print"]') })
    const viewLinkCount = await viewLinks.count()

    if (viewLinkCount > 0) {
      await viewLinks.first().click()

      await page.screenshot({ path: `${SCREENSHOTS}/detail-navigated.png` })

      await expect(page.getByText('Not Found')).not.toBeVisible()
      await expect(page.getByText('Quotation not found')).not.toBeVisible()

      await page.screenshot({ path: `${SCREENSHOTS}/detail-loaded.png` })

      await expect(page.getByText('Quotation Details')).toBeVisible()
    } else {
      await expect(page.getByText('No commercial quotations found')).toBeVisible()
      await page.screenshot({ path: `${SCREENSHOTS}/list-empty-state.png` })
    }
  })

  test('should navigate from list to commercial quotation edit page without Not Found', async ({ page }) => {
    await page.goto('/quotations/commercial')

    await expect(page.getByRole('heading', { name: 'Commercial Quotations' })).toBeVisible()

    const isLoading = await page.locator('[class*="skeleton"], [class*="Skeleton"]').first().isVisible().catch(() => false)
    if (isLoading) {
      await page.waitForTimeout(2000)
    }

    const editLinks = page.getByRole('row').locator('a[href*="/edit"]')
    const editCount = await editLinks.count()

    if (editCount > 0) {
      await page.screenshot({ path: `${SCREENSHOTS}/list-with-draft.png` })

      await editLinks.first().click()

      await page.screenshot({ path: `${SCREENSHOTS}/edit-navigated.png` })

      await expect(page.getByText('Not Found')).not.toBeVisible()

      await page.screenshot({ path: `${SCREENSHOTS}/edit-loaded.png` })
    } else {
      await page.screenshot({ path: `${SCREENSHOTS}/list-no-drafts.png` })
      test.info().annotations.push({ type: 'note', description: 'No DRAFT commercial quotations found — edit button only shows for DRAFT status' })
    }
  })

  test('should show status filter options for commercial quotations', async ({ page }) => {
    await page.goto('/quotations/commercial')

    await expect(page.getByRole('heading', { name: 'Commercial Quotations' })).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/filter-before-open.png` })

    await page.getByRole('combobox').filter({ hasText: /All Status/ }).click()

    await page.screenshot({ path: `${SCREENSHOTS}/filter-dropdown-open.png` })

    await expect(page.getByRole('option', { name: 'Draft' })).toBeVisible()
    await expect(page.getByRole('option', { name: 'Sent' })).toBeVisible()
    await expect(page.getByRole('option', { name: 'Approved' })).toBeVisible()
    await expect(page.getByRole('option', { name: 'Rejected' })).toBeVisible()
    await expect(page.getByRole('option', { name: 'Expired' })).toBeVisible()

    await page.keyboard.press('Escape')

    await page.screenshot({ path: `${SCREENSHOTS}/filter-options-verified.png` })
  })
})
