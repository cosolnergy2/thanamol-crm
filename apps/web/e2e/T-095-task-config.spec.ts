import { test, expect, type Page } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const ADMIN_EMAIL = 'admin@thanamol.com'
const PASSWORD = 'password123'
const SCREENSHOTS = path.resolve(__dirname, 'screenshots/T-095')

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

test.describe('T-095: Task Config', () => {
  test.describe.configure({ mode: 'serial' })

  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  // --- Status Settings ---

  test('should load the Task Status Settings page without errors', async ({ page }) => {
    await page.goto('/tasks/status-settings')

    await page.screenshot({ path: `${SCREENSHOTS}/status-settings-initial.png` })

    await expect(page.getByRole('heading', { name: 'Task Status Settings' })).toBeVisible()
    await expect(page.getByText('Not Found')).not.toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/status-settings-loaded.png` })
  })

  test('should display the status settings table with column headers', async ({ page }) => {
    await page.goto('/tasks/status-settings')

    await expect(page.getByRole('heading', { name: 'Task Status Settings' })).toBeVisible()

    await expect(page.getByRole('columnheader', { name: /Status/i })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: /Order/i })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: /Default/i })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: /Closed/i })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: /Actions/i })).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/status-settings-table-headers.png` })
  })

  test('should display the Add Status button on status settings', async ({ page }) => {
    await page.goto('/tasks/status-settings')

    await expect(page.getByRole('heading', { name: 'Task Status Settings' })).toBeVisible()

    await expect(page.getByRole('button', { name: 'Add Status' })).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/status-settings-add-button.png` })
  })

  test('should open the Add Status dialog', async ({ page }) => {
    await page.goto('/tasks/status-settings')

    await expect(page.getByRole('heading', { name: 'Task Status Settings' })).toBeVisible()

    await page.getByRole('button', { name: 'Add Status' }).click()

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await expect(dialog.getByRole('heading', { name: 'Add New Status' })).toBeVisible()
    await expect(dialog.getByLabel('Name')).toBeVisible()
    await expect(dialog.getByRole('button', { name: 'Cancel' })).toBeVisible()
    await expect(dialog.getByRole('button', { name: 'Save' })).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/status-settings-dialog-open.png` })

    await dialog.getByRole('button', { name: 'Cancel' }).click()
    await expect(dialog).not.toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/status-settings-dialog-closed.png` })
  })

  test('should show statuses list or empty state for status settings', async ({ page }) => {
    await page.goto('/tasks/status-settings')

    await expect(page.getByRole('heading', { name: 'Task Status Settings' })).toBeVisible()

    await page.waitForTimeout(1500)

    const hasStatusRows = await page.getByRole('row').count().then((c) => c > 1)
    const hasEmptyState = await page
      .getByText('No custom statuses yet')
      .isVisible()
      .catch(() => false)

    expect(hasStatusRows || hasEmptyState).toBe(true)

    await page.screenshot({ path: `${SCREENSHOTS}/status-settings-data.png` })
  })

  // --- Automation Rules ---

  test('should load the Task Automation Rules page without errors', async ({ page }) => {
    await page.goto('/tasks/automation')

    await page.screenshot({ path: `${SCREENSHOTS}/automation-initial.png` })

    await expect(page.getByRole('heading', { name: 'Task Automation Rules' })).toBeVisible()
    await expect(page.getByText('Not Found')).not.toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/automation-loaded.png` })
  })

  test('should display the automation rules table with column headers', async ({ page }) => {
    await page.goto('/tasks/automation')

    await expect(page.getByRole('heading', { name: 'Task Automation Rules' })).toBeVisible()

    await expect(page.getByRole('columnheader', { name: /Rule/i })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: /Trigger/i })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: /Status/i })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: /Actions/i })).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/automation-table-headers.png` })
  })

  test('should display the Add Rule button on automation page', async ({ page }) => {
    await page.goto('/tasks/automation')

    await expect(page.getByRole('heading', { name: 'Task Automation Rules' })).toBeVisible()

    await expect(page.getByRole('button', { name: 'Add Rule' })).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/automation-add-button.png` })
  })

  test('should open the Add Automation Rule dialog', async ({ page }) => {
    await page.goto('/tasks/automation')

    await expect(page.getByRole('heading', { name: 'Task Automation Rules' })).toBeVisible()

    await page.getByRole('button', { name: 'Add Rule' }).click()

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await expect(dialog.getByRole('heading', { name: 'Add Automation Rule' })).toBeVisible()
    await expect(dialog.getByLabel('Name')).toBeVisible()
    await expect(dialog.getByLabel('Trigger Event')).toBeVisible()
    await expect(dialog.getByRole('button', { name: 'Cancel' })).toBeVisible()
    await expect(dialog.getByRole('button', { name: 'Save' })).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/automation-dialog-open.png` })

    await dialog.getByRole('button', { name: 'Cancel' }).click()
    await expect(dialog).not.toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/automation-dialog-closed.png` })
  })

  test('should show automation rules or empty state', async ({ page }) => {
    await page.goto('/tasks/automation')

    await expect(page.getByRole('heading', { name: 'Task Automation Rules' })).toBeVisible()

    await page.waitForTimeout(1500)

    const hasRuleRows = await page.getByRole('row').count().then((c) => c > 1)
    const hasEmptyState = await page
      .getByText('No automation rules yet')
      .isVisible()
      .catch(() => false)

    expect(hasRuleRows || hasEmptyState).toBe(true)

    await page.screenshot({ path: `${SCREENSHOTS}/automation-data.png` })
  })

  // --- Notifications ---

  test('should load the Notifications page without errors', async ({ page }) => {
    await page.goto('/tasks/notifications')

    await page.screenshot({ path: `${SCREENSHOTS}/notifications-initial.png` })

    await expect(page.getByRole('heading', { name: 'Notifications' })).toBeVisible()
    await expect(page.getByText('Not Found')).not.toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/notifications-loaded.png` })
  })

  test('should display search and filter controls on notifications page', async ({ page }) => {
    await page.goto('/tasks/notifications')

    await expect(page.getByRole('heading', { name: 'Notifications' })).toBeVisible()

    await expect(page.getByPlaceholder('Search notifications...')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Mark All as Read' })).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/notifications-controls.png` })
  })

  test('should show notifications list or empty state', async ({ page }) => {
    await page.goto('/tasks/notifications')

    await expect(page.getByRole('heading', { name: 'Notifications' })).toBeVisible()

    await page.waitForTimeout(1500)

    const hasNotifications = await page.locator('[class*="border-indigo"]').count().then((c) => c > 0)
    const hasEmptyState = await page
      .getByText('No notifications found')
      .isVisible()
      .catch(() => false)

    expect(hasNotifications || hasEmptyState).toBe(true)

    await page.screenshot({ path: `${SCREENSHOTS}/notifications-data.png` })
  })
})
