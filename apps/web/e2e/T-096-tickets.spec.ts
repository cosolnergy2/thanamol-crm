import { test, expect, type Page } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const ADMIN_EMAIL = 'admin@thanamol.com'
const PASSWORD = 'password123'
const SCREENSHOTS = path.resolve(__dirname, 'screenshots/T-096')

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

test.describe('T-096: Tickets', () => {
  test.describe.configure({ mode: 'serial' })

  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('should load the Tickets list page without errors', async ({ page }) => {
    await page.goto('/tickets')

    await page.screenshot({ path: `${SCREENSHOTS}/tickets-list-initial.png` })

    await expect(page.getByRole('heading', { name: 'Tickets' })).toBeVisible()
    await expect(page.getByText('Not Found')).not.toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/tickets-list-loaded.png` })
  })

  test('should display the tickets table with column headers', async ({ page }) => {
    await page.goto('/tickets')

    await expect(page.getByRole('heading', { name: 'Tickets' })).toBeVisible()

    await expect(page.getByRole('columnheader', { name: /Ticket/i })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: /Category/i })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: /Priority/i })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: /Status/i })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: /Actions/i })).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/tickets-table-headers.png` })
  })

  test('should display search and filter controls', async ({ page }) => {
    await page.goto('/tickets')

    await expect(page.getByRole('heading', { name: 'Tickets' })).toBeVisible()

    await expect(page.getByPlaceholder('Search title, category...')).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/tickets-filter-controls.png` })
  })

  test('should display a New Ticket button linking to the create form', async ({ page }) => {
    await page.goto('/tickets')

    await expect(page.getByRole('heading', { name: 'Tickets' })).toBeVisible()

    const newTicketBtn = page.getByRole('link', { name: /New Ticket/i })
    await expect(newTicketBtn).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/tickets-new-button.png` })
  })

  test('should show tickets list or empty state', async ({ page }) => {
    await page.goto('/tickets')

    await expect(page.getByRole('heading', { name: 'Tickets' })).toBeVisible()

    await page.waitForTimeout(1500)

    const hasRows = await page.getByRole('cell').count().then((c) => c > 0)
    const hasEmptyState =
      (await page.getByText('No tickets yet').isVisible().catch(() => false)) ||
      (await page.getByText('No tickets match your filters').isVisible().catch(() => false))

    expect(hasRows || hasEmptyState).toBe(true)

    await page.screenshot({ path: `${SCREENSHOTS}/tickets-list-data.png` })
  })

  test('should load the Create Ticket form page without errors', async ({ page }) => {
    await page.goto('/tickets/create')

    await page.screenshot({ path: `${SCREENSHOTS}/ticket-create-initial.png` })

    await expect(page.getByRole('heading', { name: 'New Ticket' })).toBeVisible()
    await expect(page.getByText('Not Found')).not.toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/ticket-create-loaded.png` })
  })

  test('should display all create form fields', async ({ page }) => {
    await page.goto('/tickets/create')

    await expect(page.getByRole('heading', { name: 'New Ticket' })).toBeVisible()

    await expect(page.getByLabel('Title')).toBeVisible()
    await expect(page.getByLabel('Description')).toBeVisible()
    await expect(page.getByLabel('Category')).toBeVisible()
    await expect(page.getByLabel('Priority')).toBeVisible()
    await expect(page.getByLabel('Status')).toBeVisible()

    await expect(page.getByRole('button', { name: /Create Ticket/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /Cancel/i })).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/ticket-create-form-fields.png` })
  })

  test('should show validation error when submitting an empty title', async ({ page }) => {
    await page.goto('/tickets/create')

    await expect(page.getByRole('heading', { name: 'New Ticket' })).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/ticket-create-before-submit.png` })

    await page.getByRole('button', { name: /Create Ticket/i }).click()

    await expect(page.getByText('Ticket title is required')).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/ticket-create-validation-error.png` })
  })

  test('should navigate to /tickets/create when clicking New Ticket button', async ({ page }) => {
    await page.goto('/tickets')

    await expect(page.getByRole('heading', { name: 'Tickets' })).toBeVisible()

    await page.getByRole('link', { name: /New Ticket/i }).click()

    await expect(page).toHaveURL('/tickets/create')
    await expect(page.getByRole('heading', { name: 'New Ticket' })).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/ticket-create-navigation.png` })
  })
})
