import { test, expect, type Page } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const ADMIN_EMAIL = 'admin@thanamol.com'
const PASSWORD = 'password123'
const SCREENSHOTS = path.resolve(__dirname, 'screenshots/T-101')

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

test.describe('T-101: Calendar Events (/calendar/events)', () => {
  test.describe.configure({ mode: 'serial' })

  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('should load the Calendar page without "Not Found"', async ({ page }) => {
    const consoleErrors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text())
    })

    await page.goto('/calendar/events')

    await page.screenshot({ path: `${SCREENSHOTS}/calendar-initial.png` })

    await expect(page).toHaveURL('/calendar/events')
    await expect(page.getByText('Not Found')).not.toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/calendar-loaded.png` })

    const criticalErrors = consoleErrors.filter(
      (e) =>
        !e.includes('favicon') &&
        !e.includes('chrome-extension') &&
        !e.includes('Failed to load resource'),
    )
    expect(criticalErrors).toHaveLength(0)
  })

  test('should display the Calendar page heading', async ({ page }) => {
    await page.goto('/calendar/events')

    await page.screenshot({ path: `${SCREENSHOTS}/calendar-heading-before.png` })

    await expect(page.getByRole('heading', { name: /calendar/i })).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/calendar-heading-visible.png` })
  })

  test('should render the calendar grid with weekday headers', async ({ page }) => {
    await page.goto('/calendar/events')

    await page.screenshot({ path: `${SCREENSHOTS}/calendar-grid-before.png` })

    await expect(page.getByText('Sun', { exact: true })).toBeVisible()
    await expect(page.getByText('Mon', { exact: true })).toBeVisible()
    await expect(page.getByText('Tue', { exact: true })).toBeVisible()
    await expect(page.getByText('Wed', { exact: true })).toBeVisible()
    await expect(page.getByText('Thu', { exact: true })).toBeVisible()
    await expect(page.getByText('Fri', { exact: true })).toBeVisible()
    await expect(page.getByText('Sat', { exact: true })).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/calendar-grid-visible.png` })
  })

  test('should display the current month and year label', async ({ page }) => {
    await page.goto('/calendar/events')

    const now = new Date()
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ]
    const expectedMonth = monthNames[now.getMonth()]
    const expectedYear = now.getFullYear().toString()

    await page.screenshot({ path: `${SCREENSHOTS}/calendar-month-label-before.png` })

    await expect(page.getByText(new RegExp(`${expectedMonth}.*${expectedYear}`))).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/calendar-month-label-visible.png` })
  })

  test('should display the Events This Month sidebar panel', async ({ page }) => {
    await page.goto('/calendar/events')

    await page.screenshot({ path: `${SCREENSHOTS}/calendar-events-panel-before.png` })

    await expect(page.getByText('Events This Month')).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/calendar-events-panel-visible.png` })
  })

  test('should show navigation buttons to move between months', async ({ page }) => {
    await page.goto('/calendar/events')

    await page.screenshot({ path: `${SCREENSHOTS}/calendar-nav-buttons-before.png` })

    const prevButton = page.getByRole('button').filter({ has: page.locator('svg') }).first()
    await expect(prevButton).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/calendar-nav-buttons-visible.png` })
  })
})
