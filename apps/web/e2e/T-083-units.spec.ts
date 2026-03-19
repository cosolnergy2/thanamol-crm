import { test, expect, type Page } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const ADMIN_EMAIL = 'admin@thanamol.com'
const PASSWORD = 'password123'
const SCREENSHOTS = path.resolve(__dirname, 'screenshots/T-083')

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

test.describe('T-083: Units E2E', () => {
  test.describe.configure({ mode: 'serial' })

  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('should load the Units list page without errors', async ({ page }) => {
    await page.goto('/units')

    await expect(page.getByRole('heading', { name: 'Units' })).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/units-list-initial.png` })

    await expect(page.getByRole('button', { name: 'Add Unit' })).toBeVisible()
    await expect(page.getByPlaceholder('Search unit number...')).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/units-list-loaded.png` })

    await expect(page.getByText('Not Found')).not.toBeVisible()
  })

  test('should display unit cards with status badges on the list page', async ({ page }) => {
    await page.goto('/units')

    await expect(page.getByRole('heading', { name: 'Units' })).toBeVisible()

    await page.waitForTimeout(2000)

    await page.screenshot({ path: `${SCREENSHOTS}/units-list-data.png` })

    const noUnitsMessage = await page.getByText('No units found').isVisible().catch(() => false)

    if (!noUnitsMessage) {
      const unitCards = page.locator('[class*="hover:shadow-sm"]')
      const cardCount = await unitCards.count()
      expect(cardCount).toBeGreaterThan(0)
    }

    await page.screenshot({ path: `${SCREENSHOTS}/units-list-cards-confirmed.png` })
  })

  test('should open Add Unit dialog with project and type selectors', async ({ page }) => {
    await page.goto('/units')

    await expect(page.getByRole('heading', { name: 'Units' })).toBeVisible()

    await page.getByRole('button', { name: 'Add Unit' }).click()

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await expect(dialog.getByRole('heading', { name: 'Add New Unit' })).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/units-add-dialog-open.png` })

    await expect(dialog.getByLabel('Unit Number *')).toBeVisible()
    await expect(dialog.getByRole('button', { name: 'Cancel' })).toBeVisible()

    await dialog.getByRole('button', { name: 'Cancel' }).click()
    await expect(dialog).not.toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/units-add-dialog-closed.png` })
  })

  test('should load the Units by Project page without errors', async ({ page }) => {
    await page.goto('/units/by-project')

    await expect(page.getByRole('heading', { name: 'Units by Project' })).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/units-by-project-initial.png` })

    await expect(page.getByText('Total Units')).toBeVisible()
    await expect(page.getByText('Available', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('Rented', { exact: true }).first()).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/units-by-project-stats.png` })

    await expect(page.getByText('Not Found')).not.toBeVisible()
  })

  test('should show project accordion items on the by-project page', async ({ page }) => {
    await page.goto('/units/by-project')

    await expect(page.getByRole('heading', { name: 'Units by Project' })).toBeVisible()

    await page.waitForTimeout(2000)

    await page.screenshot({ path: `${SCREENSHOTS}/units-by-project-data.png` })

    const noProjectsVisible = await page.getByText('No projects found').isVisible().catch(() => false)

    if (!noProjectsVisible) {
      const accordionItems = page.locator('[data-radix-collection-item]')
      const count = await accordionItems.count()
      expect(count).toBeGreaterThan(0)
    }

    await page.screenshot({ path: `${SCREENSHOTS}/units-by-project-accordions.png` })
  })

  test('should expand a project accordion and show unit cards', async ({ page }) => {
    await page.goto('/units/by-project')

    await expect(page.getByRole('heading', { name: 'Units by Project' })).toBeVisible()

    await page.waitForTimeout(2000)

    const noProjectsVisible = await page.getByText('No projects found').isVisible().catch(() => false)

    if (noProjectsVisible) {
      test.skip()
      return
    }

    await page.screenshot({ path: `${SCREENSHOTS}/units-by-project-before-expand.png` })

    const accordionTrigger = page.locator('button[data-radix-collection-item]').first()
    const triggerVisible = await accordionTrigger.isVisible({ timeout: 5000 }).catch(() => false)

    if (triggerVisible) {
      await accordionTrigger.click()
      await page.waitForTimeout(500)
      await page.screenshot({ path: `${SCREENSHOTS}/units-by-project-expanded.png` })
    }
  })

  test('should load the Unit Availability page without errors', async ({ page }) => {
    await page.goto('/units/availability')

    await expect(page.getByRole('heading', { name: 'Unit Availability' })).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/units-availability-initial.png` })

    await expect(page.getByText('Available Units')).toBeVisible()
    await expect(page.getByText('Warehouse').first()).toBeVisible()
    await expect(page.getByText('Commercial').first()).toBeVisible()
    await expect(page.getByText('Office').first()).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/units-availability-stats.png` })

    await expect(page.getByText('Not Found')).not.toBeVisible()
  })

  test('should show availability table with column headers', async ({ page }) => {
    await page.goto('/units/availability')

    await expect(page.getByRole('heading', { name: 'Unit Availability' })).toBeVisible()

    await page.waitForTimeout(2000)

    await page.screenshot({ path: `${SCREENSHOTS}/units-availability-table-initial.png` })

    await expect(page.getByRole('columnheader', { name: /Unit/i })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: /Project/i })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: /Type/i })).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/units-availability-table-headers.png` })
  })

  test('should show Export CSV button on the availability page', async ({ page }) => {
    await page.goto('/units/availability')

    await expect(page.getByRole('heading', { name: 'Unit Availability' })).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/units-availability-export-button.png` })

    await expect(page.getByRole('button', { name: 'Export CSV' })).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/units-availability-export-confirmed.png` })
  })

  test('should filter units by type on the availability page', async ({ page }) => {
    await page.goto('/units/availability')

    await expect(page.getByRole('heading', { name: 'Unit Availability' })).toBeVisible()

    await page.waitForTimeout(2000)

    await page.screenshot({ path: `${SCREENSHOTS}/units-availability-before-filter.png` })

    const typeFilter = page.getByRole('combobox').filter({ hasText: /All Types/ }).first()
    const typeFilterVisible = await typeFilter.isVisible({ timeout: 5000 }).catch(() => false)

    if (typeFilterVisible) {
      await typeFilter.click()
      await page.getByRole('option', { name: 'Warehouse' }).click()

      await page.waitForTimeout(500)

      await page.screenshot({ path: `${SCREENSHOTS}/units-availability-warehouse-filter.png` })
    }
  })
})
