import { test, expect, type Page } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const ADMIN_EMAIL = 'admin@thanamol.com'
const PASSWORD = 'password123'
const SCREENSHOTS = path.resolve(__dirname, 'screenshots/T-102')

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

test.describe('T-102: Clients (/clients and /clients/portal)', () => {
  test.describe.configure({ mode: 'serial' })

  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  // /clients tests
  test('should load the Client Accounts list page without "Not Found"', async ({ page }) => {
    const consoleErrors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text())
    })

    await page.goto('/clients')

    await page.screenshot({ path: `${SCREENSHOTS}/clients-initial.png` })

    await expect(page).toHaveURL('/clients')
    await expect(page.getByText('Not Found')).not.toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/clients-loaded.png` })

    const criticalErrors = consoleErrors.filter(
      (e) => !e.includes('favicon') && !e.includes('chrome-extension'),
    )
    expect(criticalErrors).toHaveLength(0)
  })

  test('should display the Client Accounts heading', async ({ page }) => {
    await page.goto('/clients')

    await page.screenshot({ path: `${SCREENSHOTS}/clients-heading-before.png` })

    await expect(page.getByRole('heading', { name: /client accounts/i })).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/clients-heading-visible.png` })
  })

  test('should display the client list table with column headers', async ({ page }) => {
    await page.goto('/clients')

    await page.screenshot({ path: `${SCREENSHOTS}/clients-table-before.png` })

    await expect(page.getByRole('columnheader', { name: /client/i })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: /email/i })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: /customer/i })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: /status/i })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: /actions/i })).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/clients-table-visible.png` })
  })

  test('should display the Add Client button on the clients list page', async ({ page }) => {
    await page.goto('/clients')

    await page.screenshot({ path: `${SCREENSHOTS}/clients-add-button-before.png` })

    await expect(page.getByRole('button', { name: /add client/i })).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/clients-add-button-visible.png` })
  })

  test('should display search input on the clients list page', async ({ page }) => {
    await page.goto('/clients')

    await page.screenshot({ path: `${SCREENSHOTS}/clients-search-before.png` })

    await expect(page.getByPlaceholder(/search by name or email/i)).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/clients-search-visible.png` })
  })

  test('should show client records or empty state on the clients list page', async ({ page }) => {
    await page.goto('/clients')

    await page.waitForTimeout(1500)

    await page.screenshot({ path: `${SCREENSHOTS}/clients-data-state.png` })

    const hasClients = await page.getByRole('cell').count().then((c) => c > 0)
    const hasEmptyState = await page
      .getByText(/no client accounts found/i)
      .isVisible()
      .catch(() => false)

    expect(hasClients || hasEmptyState).toBe(true)
  })

  // /clients/portal tests
  test('should load the Client Update Requests (portal) page without "Not Found"', async ({ page }) => {
    const consoleErrors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text())
    })

    await page.goto('/clients/portal')

    await page.screenshot({ path: `${SCREENSHOTS}/portal-initial.png` })

    await expect(page).toHaveURL('/clients/portal')
    await expect(page.getByText('Not Found')).not.toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/portal-loaded.png` })

    const criticalErrors = consoleErrors.filter(
      (e) => !e.includes('favicon') && !e.includes('chrome-extension'),
    )
    expect(criticalErrors).toHaveLength(0)
  })

  test('should display the Client Update Requests heading on the portal page', async ({ page }) => {
    await page.goto('/clients/portal')

    await page.screenshot({ path: `${SCREENSHOTS}/portal-heading-before.png` })

    await expect(page.getByRole('heading', { name: /client update requests/i })).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/portal-heading-visible.png` })
  })

  test('should display the portal table with column headers', async ({ page }) => {
    await page.goto('/clients/portal')

    await page.screenshot({ path: `${SCREENSHOTS}/portal-table-before.png` })

    await expect(page.getByRole('columnheader', { name: /client/i })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: /entity/i })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: /status/i })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: /submitted/i })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: /actions/i })).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/portal-table-visible.png` })
  })

  test('should display the status filter dropdown on the portal page', async ({ page }) => {
    await page.goto('/clients/portal')

    await page.screenshot({ path: `${SCREENSHOTS}/portal-filter-before.png` })

    await expect(page.getByRole('combobox')).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/portal-filter-visible.png` })
  })

  test('should show portal requests or empty state on the portal page', async ({ page }) => {
    await page.goto('/clients/portal')

    await page.waitForTimeout(1500)

    await page.screenshot({ path: `${SCREENSHOTS}/portal-data-state.png` })

    const hasRequests = await page.getByRole('cell').count().then((c) => c > 0)
    const hasEmptyState = await page
      .getByText(/no update requests found/i)
      .isVisible()
      .catch(() => false)

    expect(hasRequests || hasEmptyState).toBe(true)
  })
})
