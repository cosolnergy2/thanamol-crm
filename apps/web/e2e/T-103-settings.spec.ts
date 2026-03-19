import { test, expect, type Page } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const ADMIN_EMAIL = 'admin@thanamol.com'
const PASSWORD = 'password123'
const SCREENSHOTS = path.resolve(__dirname, 'screenshots/T-103')

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

test.describe('T-103: Settings Pages', () => {
  test.describe.configure({ mode: 'serial' })

  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  // /settings/projects
  test('should load the Project Templates settings page without "Not Found"', async ({ page }) => {
    const consoleErrors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text())
    })

    await page.goto('/settings/projects')

    await page.screenshot({ path: `${SCREENSHOTS}/settings-projects-initial.png` })

    await expect(page).toHaveURL('/settings/projects')
    await expect(page.getByText('Not Found')).not.toBeVisible()
    await expect(page.getByRole('heading', { name: /project templates/i })).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/settings-projects-loaded.png` })

    const criticalErrors = consoleErrors.filter(
      (e) => !e.includes('favicon') && !e.includes('chrome-extension'),
    )
    expect(criticalErrors).toHaveLength(0)
  })

  test('should display the Add Template button on the Project Templates page', async ({ page }) => {
    await page.goto('/settings/projects')

    await page.screenshot({ path: `${SCREENSHOTS}/settings-projects-add-button-before.png` })

    await expect(page.getByRole('button', { name: /add template/i })).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/settings-projects-add-button-visible.png` })
  })

  test('should show templates or empty state on the Project Templates page', async ({ page }) => {
    await page.goto('/settings/projects')

    await page.waitForTimeout(1500)

    await page.screenshot({ path: `${SCREENSHOTS}/settings-projects-data-state.png` })

    const hasTemplates = await page.locator('.border.border-slate-100').count().then((c) => c > 0)
    const hasEmptyState = await page
      .getByText(/no project templates yet/i)
      .isVisible()
      .catch(() => false)

    expect(hasTemplates || hasEmptyState).toBe(true)
  })

  // /settings/export
  test('should load the Data Export settings page without "Not Found"', async ({ page }) => {
    const consoleErrors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text())
    })

    await page.goto('/settings/export')

    await page.screenshot({ path: `${SCREENSHOTS}/settings-export-initial.png` })

    await expect(page).toHaveURL('/settings/export')
    await expect(page.getByText('Not Found')).not.toBeVisible()
    await expect(page.getByRole('heading', { name: /data export/i })).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/settings-export-loaded.png` })

    const criticalErrors = consoleErrors.filter(
      (e) => !e.includes('favicon') && !e.includes('chrome-extension'),
    )
    expect(criticalErrors).toHaveLength(0)
  })

  test('should display export format selector and available exports on the Data Export page', async ({ page }) => {
    await page.goto('/settings/export')

    await page.screenshot({ path: `${SCREENSHOTS}/settings-export-content-before.png` })

    const main = page.getByRole('main')

    await expect(page.getByText('Export Settings')).toBeVisible()
    await expect(page.getByText('Available Exports')).toBeVisible()
    await expect(page.getByText('Export Format')).toBeVisible()

    await expect(main.getByText('Customers')).toBeVisible()
    await expect(main.getByText('Projects')).toBeVisible()
    await expect(main.getByText('Leads')).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/settings-export-content-visible.png` })
  })

  // /settings/audit
  test('should load the Audit Log settings page without "Not Found"', async ({ page }) => {
    const consoleErrors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text())
    })

    await page.goto('/settings/audit')

    await page.screenshot({ path: `${SCREENSHOTS}/settings-audit-initial.png` })

    await expect(page).toHaveURL('/settings/audit')
    await expect(page.getByText('Not Found')).not.toBeVisible()
    await expect(page.getByRole('heading', { name: /audit log/i })).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/settings-audit-loaded.png` })

    const criticalErrors = consoleErrors.filter(
      (e) => !e.includes('favicon') && !e.includes('chrome-extension'),
    )
    expect(criticalErrors).toHaveLength(0)
  })

  test('should display audit log table with column headers', async ({ page }) => {
    await page.goto('/settings/audit')

    await page.screenshot({ path: `${SCREENSHOTS}/settings-audit-table-before.png` })

    await expect(page.getByRole('columnheader', { name: /user/i })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: /action/i })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: /details/i })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: /ip address/i })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: /date/i })).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/settings-audit-table-visible.png` })
  })

  test('should display the search input on the Audit Log page', async ({ page }) => {
    await page.goto('/settings/audit')

    await page.screenshot({ path: `${SCREENSHOTS}/settings-audit-search-before.png` })

    await expect(page.getByPlaceholder(/search by action/i)).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/settings-audit-search-visible.png` })
  })

  // /settings/activity-log
  test('should load the Activity Log settings page without "Not Found"', async ({ page }) => {
    const consoleErrors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text())
    })

    await page.goto('/settings/activity-log')

    await page.screenshot({ path: `${SCREENSHOTS}/settings-activity-log-initial.png` })

    await expect(page).toHaveURL('/settings/activity-log')
    await expect(page.getByText('Not Found')).not.toBeVisible()
    await expect(page.getByRole('heading', { name: /activity log/i })).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/settings-activity-log-loaded.png` })

    const criticalErrors = consoleErrors.filter(
      (e) => !e.includes('favicon') && !e.includes('chrome-extension'),
    )
    expect(criticalErrors).toHaveLength(0)
  })

  test('should display activity log table with column headers', async ({ page }) => {
    await page.goto('/settings/activity-log')

    await page.screenshot({ path: `${SCREENSHOTS}/settings-activity-log-table-before.png` })

    await expect(page.getByRole('columnheader', { name: /user/i })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: /action/i })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: /entity/i })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: /ip address/i })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: /date/i })).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/settings-activity-log-table-visible.png` })
  })

  test('should display the search input on the Activity Log page', async ({ page }) => {
    await page.goto('/settings/activity-log')

    await page.screenshot({ path: `${SCREENSHOTS}/settings-activity-log-search-before.png` })

    await expect(page.getByPlaceholder(/search by action/i)).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/settings-activity-log-search-visible.png` })
  })

  // /settings/system
  test('should load the System Settings page without "Not Found"', async ({ page }) => {
    const consoleErrors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text())
    })

    await page.goto('/settings/system')

    await page.screenshot({ path: `${SCREENSHOTS}/settings-system-initial.png` })

    await expect(page).toHaveURL('/settings/system')
    await expect(page.getByText('Not Found')).not.toBeVisible()
    await expect(page.getByRole('heading', { name: /system settings/i })).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/settings-system-loaded.png` })

    const criticalErrors = consoleErrors.filter(
      (e) => !e.includes('favicon') && !e.includes('chrome-extension'),
    )
    expect(criticalErrors).toHaveLength(0)
  })

  test('should display General, Locale, Notifications, and Security sections on System Settings', async ({ page }) => {
    await page.goto('/settings/system')

    await page.screenshot({ path: `${SCREENSHOTS}/settings-system-sections-before.png` })

    const main = page.getByRole('main')

    await expect(main.getByText('General')).toBeVisible()
    await expect(main.getByText(/locale.*time/i)).toBeVisible()
    await expect(main.getByText('Notifications')).toBeVisible()
    await expect(main.getByText('Security')).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/settings-system-sections-visible.png` })
  })

  test('should display the Save Settings button on the System Settings page', async ({ page }) => {
    await page.goto('/settings/system')

    await page.screenshot({ path: `${SCREENSHOTS}/settings-system-save-button-before.png` })

    await expect(page.getByRole('button', { name: /save settings/i })).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/settings-system-save-button-visible.png` })
  })
})
