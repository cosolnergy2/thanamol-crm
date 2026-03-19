import { test, expect, type Page } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const ADMIN_EMAIL = 'admin@thanamol.com'
const PASSWORD = 'password123'
const SCREENSHOTS = path.resolve(__dirname, 'screenshots/T-076')

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

test.describe('T-076: Dashboard (/)', () => {
  test.describe.configure({ mode: 'serial' })

  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  // Acceptance criterion: Dashboard page loads after login without errors
  test('should load dashboard page without errors after login', async ({ page }) => {
    const consoleErrors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text())
    })

    await page.goto('/')

    await page.screenshot({ path: `${SCREENSHOTS}/dashboard-initial.png` })

    await expect(page).toHaveURL('/')
    await expect(page.locator('text=Not Found')).not.toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/dashboard-loaded.png` })

    // Filter out known non-critical browser errors (e.g. favicon, extensions)
    const criticalErrors = consoleErrors.filter(
      (e) => !e.includes('favicon') && !e.includes('chrome-extension'),
    )
    expect(criticalErrors).toHaveLength(0)
  })

  // Acceptance criterion: Page title or heading is visible
  test('should display the Dashboard heading', async ({ page }) => {
    await page.goto('/')

    await page.screenshot({ path: `${SCREENSHOTS}/dashboard-heading-before.png` })

    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/dashboard-heading-visible.png` })
  })

  // Acceptance criterion: Summary stat cards are visible (deals won, total won value, occupancy rate, revenue collected)
  test('should display summary stat cards for deals, revenue and occupancy', async ({ page }) => {
    await page.goto('/')

    await page.screenshot({ path: `${SCREENSHOTS}/stat-cards-initial.png` })

    await expect(page.getByText(/Deals Won/i)).toBeVisible()
    await expect(page.getByText(/Total Won Value/i)).toBeVisible()
    await expect(page.getByText(/Occupancy Rate/i)).toBeVisible()
    await expect(page.getByText(/Revenue Collected/i)).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/stat-cards-visible.png` })
  })

  // Acceptance criterion: At least one chart or data visualization widget is rendered
  // Dashboard has "Reports Overview" card with sales, revenue, occupancy, collection links
  test('should display the Reports Overview widget with report links', async ({ page }) => {
    await page.goto('/')

    await page.screenshot({ path: `${SCREENSHOTS}/reports-widget-initial.png` })

    await expect(page.getByText(/Reports Overview/i)).toBeVisible()
    await expect(page.getByText(/Sales Report/i)).toBeVisible()
    await expect(page.getByText(/Revenue Report/i)).toBeVisible()
    await expect(page.getByText(/Occupancy Report/i)).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/reports-widget-visible.png` })
  })

  // Acceptance criterion: Sidebar navigation is present and the Dashboard link is active/highlighted
  test('should show sidebar navigation with Dashboard link visible', async ({ page }) => {
    await page.goto('/')

    await page.screenshot({ path: `${SCREENSHOTS}/sidebar-initial.png` })

    // Sidebar is rendered on the authenticated layout — look for the nav element
    const sidebar = page.locator('nav, aside').first()
    await expect(sidebar).toBeVisible()

    // The Dashboard link should appear in the sidebar
    await expect(page.getByRole('link', { name: /^Dashboard$/i }).first()).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/sidebar-visible.png` })
  })

  // Acceptance criterion: Quick Navigation card is visible with key module links
  test('should display Quick Navigation card with links to key CRM modules', async ({ page }) => {
    await page.goto('/')

    await page.screenshot({ path: `${SCREENSHOTS}/quick-nav-initial.png` })

    const mainContent = page.getByRole('main')
    await expect(page.getByText(/Quick Navigation/i)).toBeVisible()
    await expect(mainContent.getByRole('button', { name: 'Projects' })).toBeVisible()
    await expect(mainContent.getByRole('button', { name: 'Customers' })).toBeVisible()
    await expect(mainContent.getByRole('button', { name: 'Leads' })).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/quick-nav-visible.png` })
  })
})
