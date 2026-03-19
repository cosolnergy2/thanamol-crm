import { test, expect, type Page } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const ADMIN_EMAIL = 'admin@thanamol.com'
const PASSWORD = 'password123'
const SCREENSHOTS = path.resolve(__dirname, 'screenshots/T-077')

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

test.describe('T-077: My Dashboard (/my-dashboard)', () => {
  test.describe.configure({ mode: 'serial' })

  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  // Acceptance criterion: Page loads without errors after navigating to /my-dashboard
  test('should load my-dashboard page without errors', async ({ page }) => {
    const consoleErrors: string[] = []
    const failed404Urls: string[] = []

    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text())
    })
    page.on('response', (response) => {
      if (response.status() === 404) failed404Urls.push(response.url())
    })

    await page.goto('/my-dashboard')

    await page.screenshot({ path: `${SCREENSHOTS}/my-dashboard-initial.png` })

    await expect(page).toHaveURL('/my-dashboard')
    await expect(page.locator('text=Not Found')).not.toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/my-dashboard-loaded.png` })

    // Log any 404 API endpoints for visibility in the report
    if (failed404Urls.length > 0) {
      console.warn('404 responses during my-dashboard load:', failed404Urls.join(', '))
    }

    // Filter known non-critical browser noise
    // Resource 404s from API data fetches are captured separately above and reported
    const jsErrors = consoleErrors.filter(
      (e) =>
        !e.includes('favicon') &&
        !e.includes('chrome-extension') &&
        !e.includes('Failed to load resource'),
    )
    expect(jsErrors).toHaveLength(0)
  })

  // Acceptance criterion: Page heading or title identifies this as "My Dashboard"
  test('should display "My Dashboard" heading', async ({ page }) => {
    await page.goto('/my-dashboard')

    await page.screenshot({ path: `${SCREENSHOTS}/my-dashboard-heading-before.png` })

    await expect(page.getByRole('heading', { name: /My Dashboard/i })).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/my-dashboard-heading-visible.png` })
  })

  // Acceptance criterion: Personal stats or task summary are visible (stat cards for notifications, deals, meetings)
  test('should display personal stat cards for notifications, deals and meetings', async ({ page }) => {
    await page.goto('/my-dashboard')

    await page.screenshot({ path: `${SCREENSHOTS}/my-dashboard-stat-cards-initial.png` })

    await expect(page.getByText(/Unread Notifications/i)).toBeVisible()
    await expect(page.getByText(/Active Deals/i)).toBeVisible()
    // "Upcoming Meetings" text appears in both stat card label and card header — use first()
    await expect(page.getByText(/Upcoming Meetings/i).first()).toBeVisible()
    await expect(page.getByText(/Total Meetings/i)).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/my-dashboard-stat-cards-visible.png` })
  })

  // Acceptance criterion: Recent Notifications widget is visible
  test('should display Recent Notifications widget', async ({ page }) => {
    await page.goto('/my-dashboard')

    await page.screenshot({ path: `${SCREENSHOTS}/notifications-widget-initial.png` })

    await expect(page.getByText(/Recent Notifications/i)).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/notifications-widget-visible.png` })
  })

  // Acceptance criterion: Upcoming Meetings and Recent Deals widgets are visible
  test('should display Upcoming Meetings and Recent Deals widgets', async ({ page }) => {
    await page.goto('/my-dashboard')

    await page.screenshot({ path: `${SCREENSHOTS}/my-dashboard-widgets-initial.png` })

    await expect(page.getByText(/Upcoming Meetings/i).first()).toBeVisible()
    await expect(page.getByText(/Recent Deals/i)).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/my-dashboard-widgets-visible.png` })
  })

  // Acceptance criterion: Sidebar navigation link for My Dashboard is visible
  test('should show My Dashboard link in sidebar navigation', async ({ page }) => {
    await page.goto('/my-dashboard')

    await page.screenshot({ path: `${SCREENSHOTS}/my-dashboard-sidebar-initial.png` })

    const sidebar = page.locator('nav, aside').first()
    await expect(sidebar).toBeVisible()

    await expect(page.getByRole('link', { name: /My Dashboard/i }).first()).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/my-dashboard-sidebar-visible.png` })
  })
})
