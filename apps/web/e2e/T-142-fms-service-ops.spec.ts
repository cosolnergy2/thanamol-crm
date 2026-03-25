import { test, expect, type Page } from '@playwright/test'
import { fileURLToPath } from 'url'
import path from 'path'
import { login, assertNoErrorBoundary } from './helpers/fms-helpers'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const SCREENSHOTS = path.resolve(__dirname, 'screenshots/T-142')

test.describe.configure({ mode: 'serial' })

test.describe('T-142 FMS Service Operations', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('should load zones list at /facility-management/zones', async ({ page }) => {
    await page.goto('/facility-management/zones')
    await page.waitForLoadState('networkidle')

    await expect(page).toHaveURL(/\/facility-management\/zones/)

    const heading = page.getByRole('heading', { level: 1 })
    await expect(heading).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/zones-list.png`, fullPage: true })
  })

  test('should navigate to create zone form at /facility-management/zones/create', async ({ page }) => {
    await page.goto('/facility-management/zones/create')
    await page.waitForLoadState('networkidle')

    await expect(page).toHaveURL(/\/facility-management\/zones\/create/)

    const form = page.locator('form')
    await expect(form).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/zones-create.png`, fullPage: true })
  })

  test('should load parking page at /facility-management/parking', async ({ page }) => {
    await page.goto('/facility-management/parking')
    await page.waitForLoadState('networkidle')

    await expect(page).toHaveURL(/\/facility-management\/parking/)

    await page.screenshot({ path: `${SCREENSHOTS}/parking.png`, fullPage: true })
  })

  test('should load security page at /facility-management/security', async ({ page }) => {
    await page.goto('/facility-management/security')
    await page.waitForLoadState('networkidle')

    await expect(page).toHaveURL(/\/facility-management\/security/)

    await page.screenshot({ path: `${SCREENSHOTS}/security.png`, fullPage: true })
  })

  test('should load services page at /facility-management/services', async ({ page }) => {
    await page.goto('/facility-management/services')
    await page.waitForLoadState('networkidle')

    await expect(page).toHaveURL(/\/facility-management\/services/)

    await page.screenshot({ path: `${SCREENSHOTS}/services.png`, fullPage: true })
  })

  test('should load keys page at /facility-management/keys', async ({ page }) => {
    await page.goto('/facility-management/keys')
    await page.waitForLoadState('networkidle')

    await expect(page).toHaveURL(/\/facility-management\/keys/)

    await page.screenshot({ path: `${SCREENSHOTS}/keys.png`, fullPage: true })
  })

  test('should load visitors list at /facility-management/visitors', async ({ page }) => {
    await page.goto('/facility-management/visitors')
    await page.waitForLoadState('networkidle')

    await expect(page).toHaveURL(/\/facility-management\/visitors/)

    const heading = page.getByRole('heading', { level: 1 })
    await expect(heading).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/visitors-list.png`, fullPage: true })
  })

  test('should navigate to create visitor form at /facility-management/visitors/create', async ({ page }) => {
    await page.goto('/facility-management/visitors/create')
    await page.waitForLoadState('networkidle')

    await expect(page).toHaveURL(/\/facility-management\/visitors\/create/)

    const form = page.locator('form')
    await expect(form).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/visitors-create.png`, fullPage: true })
  })

  test('should load cleaning page at /facility-management/cleaning', async ({ page }) => {
    await page.goto('/facility-management/cleaning')
    await page.waitForLoadState('networkidle')

    await expect(page).toHaveURL(/\/facility-management\/cleaning/)

    await page.screenshot({ path: `${SCREENSHOTS}/cleaning.png`, fullPage: true })
  })

  test('should load calibrations page at /facility-management/calibrations', async ({ page }) => {
    await page.goto('/facility-management/calibrations')
    await page.waitForLoadState('networkidle')

    await expect(page).toHaveURL(/\/facility-management\/calibrations/)

    await page.screenshot({ path: `${SCREENSHOTS}/calibrations.png`, fullPage: true })
  })

  test('should not show error boundary on any service ops route', async ({ page }) => {
    const routes = [
      '/facility-management/zones',
      '/facility-management/zones/create',
      '/facility-management/parking',
      '/facility-management/security',
      '/facility-management/services',
      '/facility-management/keys',
      '/facility-management/visitors',
      '/facility-management/visitors/create',
      '/facility-management/cleaning',
      '/facility-management/calibrations',
    ]

    for (const route of routes) {
      await page.goto(route)
      await page.waitForLoadState('networkidle')
      await assertNoErrorBoundary(page)
    }

    await page.screenshot({ path: `${SCREENSHOTS}/service-ops-no-error-boundary.png`, fullPage: true })
  })
})
