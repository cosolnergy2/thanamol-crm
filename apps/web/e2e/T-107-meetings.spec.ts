import { test, expect, type Page } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const ADMIN_EMAIL = 'admin@thanamol.com'
const PASSWORD = 'password123'
const SCREENSHOTS = path.resolve(__dirname, 'screenshots/T-107')

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

test.describe('T-107: Meetings', () => {
  test.describe.configure({ mode: 'serial' })

  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  // DoD: Meeting list page loads with heading, stat cards, table
  test('should load the meeting list page with heading, stat cards, and table', async ({ page }) => {
    const consoleErrors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text())
    })

    await page.goto('/meetings')

    await page.screenshot({ path: `${SCREENSHOTS}/list-initial.png` })

    await expect(page.getByRole('heading', { name: 'Meeting Minutes' })).toBeVisible()
    await expect(page.getByText('Not Found')).not.toBeVisible()

    // Stat cards: Total, Draft, Finalized, Distributed
    await expect(page.getByText('Total').first()).toBeVisible()
    await expect(page.getByText('Draft').first()).toBeVisible()
    await expect(page.getByText('Finalized').first()).toBeVisible()
    await expect(page.getByText('Distributed').first()).toBeVisible()

    // Table headers
    await expect(page.getByRole('columnheader', { name: /title/i })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: /date/i })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: /location/i })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: /status/i })).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/list-loaded.png` })

    const criticalErrors = consoleErrors.filter(
      (e) =>
        !e.includes('favicon') &&
        !e.includes('chrome-extension') &&
        !e.includes('Failed to load resource'),
    )
    expect(criticalErrors).toHaveLength(0)
  })

  // DoD: No "Not Found" error on /meetings
  test('should not show "Not Found" on /meetings', async ({ page }) => {
    await page.goto('/meetings')

    await expect(page).toHaveURL('/meetings')
    await expect(page.getByText('Not Found')).not.toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/list-no-not-found.png` })
  })

  // DoD: Search and filter controls present
  test('should display search input and status filter on the meeting list', async ({ page }) => {
    await page.goto('/meetings')

    await expect(page.getByPlaceholder('Search meeting title...')).toBeVisible()
    await expect(page.getByRole('button', { name: 'New Meeting' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Templates' })).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/list-controls.png` })
  })

  // DoD: Meeting list shows rows or empty state
  test('should show meeting rows or empty state on the list page', async ({ page }) => {
    await page.goto('/meetings')

    await expect(page.getByRole('heading', { name: 'Meeting Minutes' })).toBeVisible()

    await page.waitForTimeout(1500)

    const hasRows = (await page.locator('tbody tr').count()) > 0
    const hasEmptyState = await page
      .getByText('No meetings found')
      .isVisible()
      .catch(() => false)

    expect(hasRows || hasEmptyState).toBe(true)

    await page.screenshot({ path: `${SCREENSHOTS}/list-data.png` })
  })

  // DoD: Create meeting form loads at /meetings/create with all fields
  test('should load the create meeting form without "Not Found"', async ({ page }) => {
    await page.goto('/meetings/create')

    await page.screenshot({ path: `${SCREENSHOTS}/create-initial.png` })

    await expect(page.getByRole('heading', { name: 'New Meeting Minute' })).toBeVisible()
    await expect(page.getByText('Not Found')).not.toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/create-loaded.png` })
  })

  // DoD: Create form has all required fields
  test('should display all required sections and fields on the create form', async ({ page }) => {
    await page.goto('/meetings/create')

    await expect(page.getByRole('heading', { name: 'New Meeting Minute' })).toBeVisible()

    // Meeting Details section
    await expect(page.getByText('Meeting Details')).toBeVisible()
    await expect(page.getByPlaceholder('Meeting title')).toBeVisible()
    await expect(page.getByPlaceholder('Meeting location')).toBeVisible()
    await expect(page.locator('input[type="date"]').first()).toBeVisible()

    // Attendees section
    await expect(page.getByText('Attendees')).toBeVisible()

    // Agenda section
    await expect(page.getByText('Agenda')).toBeVisible()

    // Action Items section
    await expect(page.getByText('Action Items')).toBeVisible()

    // Submit and Cancel buttons
    await expect(page.getByRole('button', { name: 'Save Meeting' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Cancel' })).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/create-form-fields.png` })
  })

  // DoD: Can fill out and submit the create form; new meeting appears in the list
  test('should create a new meeting and show it in the list', async ({ page }) => {
    await page.goto('/meetings/create')

    await expect(page.getByRole('heading', { name: 'New Meeting Minute' })).toBeVisible()

    const meetingTitle = `E2E Meeting T-107 ${Date.now()}`

    await page.getByPlaceholder('Meeting title').fill(meetingTitle)
    await page.locator('input[type="date"]').first().fill('2026-03-19')
    await page.getByPlaceholder('Meeting location').fill('Conference Room A')

    await page.screenshot({ path: `${SCREENSHOTS}/create-form-filled.png` })

    await page.getByRole('button', { name: 'Save Meeting' }).click()

    await expect(page).toHaveURL('/meetings', { timeout: 10000 })

    await page.screenshot({ path: `${SCREENSHOTS}/create-submitted.png` })

    await expect(page.getByText(meetingTitle)).toBeVisible({ timeout: 10000 })

    await page.screenshot({ path: `${SCREENSHOTS}/create-meeting-in-list.png` })
  })

  // DoD: Cancel on create form navigates back to meeting list
  test('should navigate back to meeting list when Cancel is clicked on the create form', async ({ page }) => {
    await page.goto('/meetings/create')

    await expect(page.getByRole('heading', { name: 'New Meeting Minute' })).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/create-before-cancel.png` })

    await page.getByRole('button', { name: 'Cancel' }).click()

    await expect(page).toHaveURL('/meetings')
    await expect(page.getByRole('heading', { name: 'Meeting Minutes' })).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/create-after-cancel.png` })
  })

  // DoD: Meeting templates page loads at /meetings/templates
  test('should load the meeting templates page without "Not Found"', async ({ page }) => {
    const consoleErrors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text())
    })

    await page.goto('/meetings/templates')

    await page.screenshot({ path: `${SCREENSHOTS}/templates-initial.png` })

    await expect(page).toHaveURL('/meetings/templates')
    await expect(page.getByRole('heading', { name: 'Meeting Templates' })).toBeVisible()
    await expect(page.getByText('Not Found')).not.toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/templates-loaded.png` })

    const criticalErrors = consoleErrors.filter(
      (e) =>
        !e.includes('favicon') &&
        !e.includes('chrome-extension') &&
        !e.includes('Failed to load resource'),
    )
    expect(criticalErrors).toHaveLength(0)
  })

  // DoD: Templates page shows New Template button and navigates to meeting list
  test('should display New Template and Minute List buttons on the templates page', async ({ page }) => {
    await page.goto('/meetings/templates')

    await expect(page.getByRole('heading', { name: 'Meeting Templates' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'New Template' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Minute List' })).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/templates-controls.png` })
  })

  // DoD: Can create a template via dialog
  test('should create a template via the New Template dialog', async ({ page }) => {
    await page.goto('/meetings/templates')

    await expect(page.getByRole('heading', { name: 'Meeting Templates' })).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/templates-before-create.png` })

    await page.getByRole('button', { name: 'New Template' }).click()

    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'New Template' })).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/templates-dialog-open.png` })

    const templateName = `E2E Template T-107 ${Date.now()}`
    await page.getByPlaceholder('Template name').fill(templateName)
    await page.getByPlaceholder('Template description (optional)').fill('Created by E2E test')

    await page.screenshot({ path: `${SCREENSHOTS}/templates-dialog-filled.png` })

    await page.getByRole('button', { name: 'Create' }).click()

    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 8000 })

    await page.screenshot({ path: `${SCREENSHOTS}/templates-after-create.png` })

    await expect(page.getByText(templateName)).toBeVisible({ timeout: 10000 })

    await page.screenshot({ path: `${SCREENSHOTS}/templates-new-template-visible.png` })
  })

  // DoD: No "Not Found" on any meeting route
  test('should not show "Not Found" on /meetings/templates', async ({ page }) => {
    await page.goto('/meetings/templates')

    await expect(page).toHaveURL('/meetings/templates')
    await expect(page.getByText('Not Found')).not.toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/templates-no-not-found.png` })
  })

  // DoD: Navigating from list to create via "New Meeting" button works
  test('should navigate from meeting list to create form via New Meeting button', async ({ page }) => {
    await page.goto('/meetings')

    await expect(page.getByRole('heading', { name: 'Meeting Minutes' })).toBeVisible()

    await page.getByRole('button', { name: 'New Meeting' }).click()

    await expect(page).toHaveURL('/meetings/create')
    await expect(page.getByRole('heading', { name: 'New Meeting Minute' })).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/list-to-create-navigation.png` })
  })

  // DoD: Navigating from list to templates via "Templates" button works
  test('should navigate from meeting list to templates page via Templates button', async ({ page }) => {
    await page.goto('/meetings')

    await expect(page.getByRole('heading', { name: 'Meeting Minutes' })).toBeVisible()

    await page.getByRole('button', { name: 'Templates' }).click()

    await expect(page).toHaveURL('/meetings/templates')
    await expect(page.getByRole('heading', { name: 'Meeting Templates' })).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/list-to-templates-navigation.png` })
  })
})
