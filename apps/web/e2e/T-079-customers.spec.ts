import { test, expect, type Page } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const ADMIN_EMAIL = 'admin@thanamol.com'
const PASSWORD = 'password123'
const SCREENSHOTS = path.resolve(__dirname, 'screenshots/T-079')

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

test.describe('T-079: Customers & Contacts E2E', () => {
  test.describe.configure({ mode: 'serial' })

  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('should load customers list page with heading and controls', async ({ page }) => {
    await page.goto('/customers')

    await expect(page.getByRole('heading', { name: 'Customers' })).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/customers-list-initial.png` })

    await expect(page.getByPlaceholder('Search name, email, phone...')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Add Customer' })).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/customers-list-loaded.png` })
  })

  test('should show customer data in the table', async ({ page }) => {
    await page.goto('/customers')

    await expect(page.getByRole('heading', { name: 'Customers' })).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/customers-table-before.png` })

    // Table headers should be visible
    await expect(page.getByRole('columnheader', { name: 'Customer' })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: 'Contact', exact: true })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: 'Type' })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: 'Status' })).toBeVisible()

    // Either rows or the empty state should be visible — neither is a broken page
    const rows = page.getByRole('row')
    const rowCount = await rows.count()
    // There will always be at least 1 row (the header row)
    expect(rowCount).toBeGreaterThanOrEqual(1)

    const emptyState = page.getByText('No customers found')
    const hasEmpty = await emptyState.isVisible().catch(() => false)

    if (!hasEmpty) {
      // Data rows exist (rowCount > 1 includes header + at least one data row)
      expect(rowCount).toBeGreaterThan(1)
    }

    await page.screenshot({ path: `${SCREENSHOTS}/customers-table-loaded.png` })
  })

  test('should load create customer form with all required fields', async ({ page }) => {
    await page.goto('/customers/create')

    await expect(page.getByRole('heading', { name: 'Add New Customer' })).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/customer-create-initial.png` })

    // Required fields
    await expect(page.getByLabel('Name')).toBeVisible()
    await expect(page.getByPlaceholder('Full name or company name')).toBeVisible()

    // Section headings
    await expect(page.getByText('Basic Information')).toBeVisible()
    await expect(page.getByText('Contact Information')).toBeVisible()
    await expect(page.getByText('Additional Information')).toBeVisible()

    // Save button
    await expect(page.getByRole('button', { name: 'Save Customer' })).toBeVisible()

    // Cancel button (link)
    await expect(page.getByRole('button', { name: 'Cancel' })).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/customer-create-loaded.png` })
  })

  test('should show type and status selects on create customer form', async ({ page }) => {
    await page.goto('/customers/create')

    await expect(page.getByRole('heading', { name: 'Add New Customer' })).toBeVisible()

    // Type select defaults to Individual
    const typeSelect = page.getByRole('combobox').filter({ hasText: /Individual|Company/ })
    await expect(typeSelect).toBeVisible()

    // Status select defaults to Prospect
    const statusSelect = page.getByRole('combobox').filter({ hasText: /Prospect|Active|Inactive/ })
    await expect(statusSelect).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/customer-create-selects.png` })
  })

  test('should show validation error when submitting empty customer form', async ({ page }) => {
    await page.goto('/customers/create')

    await expect(page.getByRole('heading', { name: 'Add New Customer' })).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/customer-create-before-submit.png` })

    await page.getByRole('button', { name: 'Save Customer' }).click()

    // Name is required — should show validation error
    await expect(page.getByText('Name is required')).toBeVisible({ timeout: 5000 })

    await page.screenshot({ path: `${SCREENSHOTS}/customer-create-validation-error.png` })
  })

  test('should load contacts page with heading and table', async ({ page }) => {
    await page.goto('/contacts')

    await expect(page.getByRole('heading', { name: 'Contacts' })).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/contacts-initial.png` })

    await expect(page.getByPlaceholder('Search name, position, phone, email...')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Add Contact' })).toBeVisible()

    // Table headers
    await expect(page.getByRole('columnheader', { name: 'Contact', exact: true })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: 'Position' })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: 'Customer' })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: 'Contact Info' })).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/contacts-loaded.png` })
  })

  test('should show contacts table data or empty state', async ({ page }) => {
    await page.goto('/contacts')

    await expect(page.getByRole('heading', { name: 'Contacts' })).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/contacts-table-before.png` })

    const rows = page.getByRole('row')
    const rowCount = await rows.count()
    // At minimum the header row should exist
    expect(rowCount).toBeGreaterThanOrEqual(1)

    const emptyState = page.getByText('No contacts found')
    const hasEmpty = await emptyState.isVisible().catch(() => false)

    if (!hasEmpty) {
      // Data rows present
      expect(rowCount).toBeGreaterThan(1)
    }

    await page.screenshot({ path: `${SCREENSHOTS}/contacts-table-loaded.png` })
  })

  test('should open Add Contact dialog with all required fields', async ({ page }) => {
    await page.goto('/contacts')

    await expect(page.getByRole('heading', { name: 'Contacts' })).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/contacts-add-before-click.png` })

    await page.getByRole('button', { name: 'Add Contact' }).click()

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await expect(dialog.getByRole('heading', { name: 'Add New Contact' })).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/contacts-add-dialog-open.png` })

    // Customer select, First Name, Last Name fields should exist
    await expect(dialog.getByLabel('Customer')).toBeVisible()
    await expect(dialog.getByLabel('First Name')).toBeVisible()
    await expect(dialog.getByLabel('Last Name')).toBeVisible()

    // Save and Cancel buttons
    await expect(dialog.getByRole('button', { name: 'Save' })).toBeVisible()
    await expect(dialog.getByRole('button', { name: 'Cancel' })).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/contacts-add-dialog-loaded.png` })

    // Close the dialog
    await dialog.getByRole('button', { name: 'Cancel' }).click()
    await expect(dialog).not.toBeVisible({ timeout: 5000 })

    await page.screenshot({ path: `${SCREENSHOTS}/contacts-add-dialog-closed.png` })
  })

  test('should not show Not Found on any customers or contacts route', async ({ page }) => {
    const routes = ['/customers', '/customers/create', '/contacts']

    for (const route of routes) {
      await page.goto(route)
      await expect(page.getByText('404')).not.toBeVisible()
      await expect(page.getByText('Not Found')).not.toBeVisible()
    }

    await page.screenshot({ path: `${SCREENSHOTS}/customers-contacts-no-404.png` })
  })
})
