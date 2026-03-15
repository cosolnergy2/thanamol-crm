import { test, expect, type Page } from '@playwright/test'
import path from 'path'

const ADMIN_EMAIL = 'admin@thanamol.com'
const USER_EMAIL = 'user1@thanamol.com'
const PASSWORD = 'password123'
const SCREENSHOTS = path.resolve(__dirname, 'screenshots/T-012')

async function loginAs(page: Page, email: string) {
  await page.goto('/login')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(PASSWORD)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page).toHaveURL('/')
}

test.describe('T-012: RBAC and language switching', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.evaluate(() => {
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
      localStorage.removeItem('preferredLanguage')
    })
  })

  // DoD 1: Admin sees full nav
  test('should show all navigation sections for admin user', async ({ page }) => {
    await loginAs(page, ADMIN_EMAIL)

    const nav = page.locator('nav')

    await page.screenshot({ path: `${SCREENSHOTS}/admin-nav-full.png` })

    await expect(nav.getByText('Dashboard', { exact: true })).toBeVisible()
    await expect(nav.getByText('My Dashboard', { exact: true })).toBeVisible()
    await expect(nav.getByText('Projects', { exact: true })).toBeVisible()
    await expect(nav.getByText('Customers', { exact: true })).toBeVisible()
    await expect(nav.getByText('Leads & Deals', { exact: true })).toBeVisible()
    await expect(nav.getByText('Units/Products', { exact: true })).toBeVisible()
    await expect(nav.getByText('Quotations', { exact: true })).toBeVisible()
    await expect(nav.getByText('Contracts', { exact: true })).toBeVisible()
    await expect(nav.getByText('Finance', { exact: true })).toBeVisible()
    await expect(nav.getByText('Utilities', { exact: true })).toBeVisible()
    await expect(nav.getByText('Service', { exact: true })).toBeVisible()
    await expect(nav.getByText('Documents', { exact: true })).toBeVisible()
    await expect(nav.getByText('Meeting Minutes', { exact: true })).toBeVisible()
    await expect(nav.getByText('Form List', { exact: true })).toBeVisible()
    await expect(nav.getByText('Reports', { exact: true })).toBeVisible()
    await expect(nav.getByText('Settings', { exact: true })).toBeVisible()
  })

  // DoD 2: Regular user sees restricted nav
  test('should hide restricted navigation sections for a User-role account', async ({ page }) => {
    await loginAs(page, USER_EMAIL)

    const nav = page.locator('nav')

    await page.screenshot({ path: `${SCREENSHOTS}/user-nav-restricted.png` })

    // User role (view_reports: true only) does not have 'settings', 'finance', or 'contracts' permissions
    await expect(nav.getByText('Settings', { exact: true })).not.toBeVisible()
    await expect(nav.getByText('Finance', { exact: true })).not.toBeVisible()
    await expect(nav.getByText('Contracts', { exact: true })).not.toBeVisible()
  })

  // DoD 3: Permission guard hides protected content from limited user
  test('should not render Settings nav item for a User-role account', async ({ page }) => {
    await loginAs(page, USER_EMAIL)

    // Navigate directly to a settings sub-page that requires 'settings' permission
    await page.goto('/settings/roles')

    await page.screenshot({ path: `${SCREENSHOTS}/permission-guard-hidden.png` })

    const nav = page.locator('nav')
    // Settings nav item should not appear in sidebar for a limited user
    await expect(nav.getByText('Settings', { exact: true })).not.toBeVisible()
    await expect(nav.getByText('Roles & Permissions', { exact: true })).not.toBeVisible()
  })

  // DoD 4: Language toggle EN to TH
  test('should switch sidebar labels to Thai when EN/TH toggle is clicked', async ({ page }) => {
    await loginAs(page, ADMIN_EMAIL)

    const nav = page.locator('nav')

    // Starting state: English
    await expect(nav.getByText('Projects', { exact: true })).toBeVisible()

    await page.getByRole('button', { name: 'Switch to Thai' }).click()

    await page.screenshot({ path: `${SCREENSHOTS}/language-switched-to-th.png` })

    // Thai translations for nav labels should now be visible
    await expect(nav.getByText('โครงการ', { exact: true })).toBeVisible()
    await expect(nav.getByText('ลูกค้า', { exact: true })).toBeVisible()
    await expect(nav.getByText('ใบเสนอราคา', { exact: true })).toBeVisible()

    // English labels should be replaced
    await expect(nav.getByText('Projects', { exact: true })).not.toBeVisible()
    await expect(nav.getByText('Customers', { exact: true })).not.toBeVisible()
    await expect(nav.getByText('Quotations', { exact: true })).not.toBeVisible()
  })

  // DoD 5: Language toggle TH back to EN
  test('should revert sidebar labels to English when toggled back from Thai', async ({ page }) => {
    await loginAs(page, ADMIN_EMAIL)

    // Switch to Thai first
    await page.getByRole('button', { name: 'Switch to Thai' }).click()
    const nav = page.locator('nav')
    await expect(nav.getByText('โครงการ', { exact: true })).toBeVisible()

    // Switch back to English
    await page.getByRole('button', { name: 'Switch to English' }).click()

    await page.screenshot({ path: `${SCREENSHOTS}/language-switched-back-en.png` })

    await expect(nav.getByText('Projects', { exact: true })).toBeVisible()
    await expect(nav.getByText('Customers', { exact: true })).toBeVisible()
    await expect(nav.getByText('Quotations', { exact: true })).toBeVisible()
    await expect(nav.getByText('โครงการ', { exact: true })).not.toBeVisible()
  })

  // DoD 6: Language persists after page reload
  test('should retain Thai language after page reload', async ({ page }) => {
    await loginAs(page, ADMIN_EMAIL)

    // Switch to Thai
    await page.getByRole('button', { name: 'Switch to Thai' }).click()
    const nav = page.locator('nav')
    await expect(nav.getByText('โครงการ', { exact: true })).toBeVisible()

    // Reload
    await page.reload()
    await expect(page).toHaveURL('/')

    await page.screenshot({ path: `${SCREENSHOTS}/language-persisted-after-reload.png` })

    await expect(nav.getByText('โครงการ', { exact: true })).toBeVisible()
    await expect(nav.getByText('ลูกค้า', { exact: true })).toBeVisible()
    await expect(nav.getByText('ใบเสนอราคา', { exact: true })).toBeVisible()
  })
})
