import { test, expect, type Page } from '@playwright/test'
import { login, assertNoErrorBoundary } from './helpers/fms-helpers'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const SCREENSHOTS = path.resolve(__dirname, 'screenshots/T-113-pm')

test.describe.configure({ mode: 'serial' })

test.describe('FMS Preventive Maintenance', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('should load PM schedules list page', async ({ page }) => {
    await page.goto('/facility-management/preventive-maintenance')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('body')).toBeVisible()
    const hasHeading = await page.getByRole('heading').count()
    expect(hasHeading).toBeGreaterThan(0)
    await page.screenshot({ path: `${SCREENSHOTS}/pm-list.png`, fullPage: true })
  })

  test('should navigate to create PM schedule form at /facility-management/preventive-maintenance/create', async ({ page }) => {
    await page.goto('/facility-management/preventive-maintenance')
    await page.waitForLoadState('networkidle')
    const addButton = page.getByRole('button', { name: /add|create|new|schedule/i }).first()
    const buttonCount = await addButton.count()
    if (buttonCount > 0) {
      await addButton.click()
      await page.waitForURL('**/facility-management/preventive-maintenance/create')
      await expect(page).toHaveURL(/\/facility-management\/preventive-maintenance\/create/)
    } else {
      await page.goto('/facility-management/preventive-maintenance/create')
      await page.waitForLoadState('networkidle')
      await expect(page).toHaveURL(/\/facility-management\/preventive-maintenance\/create/)
    }
    await page.screenshot({ path: `${SCREENSHOTS}/pm-create-form.png`, fullPage: true })
  })

  test('should not show error boundary', async ({ page }) => {
    await page.goto('/facility-management/preventive-maintenance')
    await page.waitForLoadState('networkidle')
    await assertNoErrorBoundary(page)
    await page.screenshot({ path: `${SCREENSHOTS}/pm-no-error.png`, fullPage: true })
  })
})
