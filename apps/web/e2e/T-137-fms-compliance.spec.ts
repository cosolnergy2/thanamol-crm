import { test, expect, type Page } from '@playwright/test'
import { fileURLToPath } from 'url'
import path from 'path'
import { login, assertNoErrorBoundary } from './helpers/fms-helpers'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const SCREENSHOTS = path.resolve(__dirname, 'screenshots/T-137')

test.describe.configure({ mode: 'serial' })

test.describe('T-137 FMS Compliance & Safety', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('should load incidents list at /facility-management/compliance/incidents', async ({ page }) => {
    await page.goto('/facility-management/compliance/incidents')
    await page.waitForLoadState('networkidle')

    await expect(page).toHaveURL(/\/facility-management\/compliance\/incidents/)

    const heading = page.getByRole('heading', { level: 1 })
    await expect(heading).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/compliance-incidents-list.png`, fullPage: true })
  })

  test('should navigate to create incident form at /facility-management/compliance/incidents/create', async ({ page }) => {
    await page.goto('/facility-management/compliance/incidents/create')
    await page.waitForLoadState('networkidle')

    await expect(page).toHaveURL(/\/facility-management\/compliance\/incidents\/create/)

    const form = page.locator('form')
    await expect(form).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/compliance-incidents-create.png`, fullPage: true })
  })

  test('should load permits list at /facility-management/compliance/permits', async ({ page }) => {
    await page.goto('/facility-management/compliance/permits')
    await page.waitForLoadState('networkidle')

    await expect(page).toHaveURL(/\/facility-management\/compliance\/permits/)

    const heading = page.getByRole('heading', { level: 1 })
    await expect(heading).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/compliance-permits-list.png`, fullPage: true })
  })

  test('should navigate to create permit form at /facility-management/compliance/permits/create', async ({ page }) => {
    await page.goto('/facility-management/compliance/permits/create')
    await page.waitForLoadState('networkidle')

    await expect(page).toHaveURL(/\/facility-management\/compliance\/permits\/create/)

    const form = page.locator('form')
    await expect(form).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/compliance-permits-create.png`, fullPage: true })
  })

  test('should load contractors page at /facility-management/compliance/contractors', async ({ page }) => {
    await page.goto('/facility-management/compliance/contractors')
    await page.waitForLoadState('networkidle')

    await expect(page).toHaveURL(/\/facility-management\/compliance\/contractors/)

    await page.screenshot({ path: `${SCREENSHOTS}/compliance-contractors.png`, fullPage: true })
  })

  test('should load fire equipment page at /facility-management/compliance/fire-equipment', async ({ page }) => {
    await page.goto('/facility-management/compliance/fire-equipment')
    await page.waitForLoadState('networkidle')

    await expect(page).toHaveURL(/\/facility-management\/compliance\/fire-equipment/)

    await page.screenshot({ path: `${SCREENSHOTS}/compliance-fire-equipment.png`, fullPage: true })
  })

  test('should load insurance page at /facility-management/compliance/insurance', async ({ page }) => {
    await page.goto('/facility-management/compliance/insurance')
    await page.waitForLoadState('networkidle')

    await expect(page).toHaveURL(/\/facility-management\/compliance\/insurance/)

    await page.screenshot({ path: `${SCREENSHOTS}/compliance-insurance.png`, fullPage: true })
  })

  test('should not show error boundary on any compliance route', async ({ page }) => {
    const routes = [
      '/facility-management/compliance/incidents',
      '/facility-management/compliance/incidents/create',
      '/facility-management/compliance/permits',
      '/facility-management/compliance/permits/create',
      '/facility-management/compliance/contractors',
      '/facility-management/compliance/fire-equipment',
      '/facility-management/compliance/insurance',
    ]

    for (const route of routes) {
      await page.goto(route)
      await page.waitForLoadState('networkidle')
      await assertNoErrorBoundary(page)
    }

    await page.screenshot({ path: `${SCREENSHOTS}/compliance-no-error-boundary.png`, fullPage: true })
  })
})
