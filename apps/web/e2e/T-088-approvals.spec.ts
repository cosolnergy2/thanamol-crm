import { test, expect, type Page } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const ADMIN_EMAIL = 'admin@thanamol.com'
const PASSWORD = 'password123'
const SCREENSHOTS = path.resolve(__dirname, 'screenshots/T-088')

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

test.describe('T-088: Approvals E2E', () => {
  test.describe.configure({ mode: 'serial' })

  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('should load the Approvals page without errors', async ({ page }) => {
    await page.goto('/approvals')

    await page.screenshot({ path: `${SCREENSHOTS}/approvals-initial.png` })

    await expect(page.getByRole('heading', { name: 'รายการรออนุมัติ' })).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/approvals-loaded.png` })

    await expect(page.getByText('Not Found')).not.toBeVisible()
  })

  test('should display the two status tabs: quotations and commercial', async ({ page }) => {
    await page.goto('/approvals')

    await expect(page.getByRole('heading', { name: 'รายการรออนุมัติ' })).toBeVisible()

    const tabList = page.getByRole('tablist')
    await expect(tabList).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/approvals-tabs-initial.png` })

    await expect(tabList.getByRole('tab', { name: /ใบเสนอราคา/ })).toBeVisible()
    await expect(tabList.getByRole('tab', { name: /Commercial Quotations/ })).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/approvals-tabs-visible.png` })
  })

  test('should show quotations tab content by default', async ({ page }) => {
    await page.goto('/approvals')

    await expect(page.getByRole('heading', { name: 'รายการรออนุมัติ' })).toBeVisible()

    const quotationsTab = page.getByRole('tab', { name: /ใบเสนอราคา/ })
    await expect(quotationsTab).toHaveAttribute('data-state', 'active')

    await page.screenshot({ path: `${SCREENSHOTS}/approvals-quotations-tab-default.png` })

    const quotationsPanel = page.getByRole('tabpanel')
    await expect(quotationsPanel).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/approvals-quotations-content-visible.png` })
  })

  test('should switch to Commercial Quotations tab and show its content', async ({ page }) => {
    await page.goto('/approvals')

    await expect(page.getByRole('heading', { name: 'รายการรออนุมัติ' })).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/approvals-before-tab-switch.png` })

    const commercialTab = page.getByRole('tab', { name: /Commercial Quotations/ })
    await commercialTab.click()

    await expect(commercialTab).toHaveAttribute('data-state', 'active')

    await page.screenshot({ path: `${SCREENSHOTS}/approvals-commercial-tab-active.png` })

    const commercialPanel = page.getByRole('tabpanel')
    await expect(commercialPanel).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/approvals-commercial-content-visible.png` })
  })

  test('should show empty state or approval cards in quotations tab', async ({ page }) => {
    await page.goto('/approvals')

    await expect(page.getByRole('heading', { name: 'รายการรออนุมัติ' })).toBeVisible()

    const quotationsTab = page.getByRole('tab', { name: /ใบเสนอราคา/ })
    await expect(quotationsTab).toHaveAttribute('data-state', 'active')

    // Wait for loading to finish — skeletons should disappear
    await expect(page.locator('.animate-pulse')).toHaveCount(0, { timeout: 10000 })

    await page.screenshot({ path: `${SCREENSHOTS}/approvals-quotations-loaded.png` })

    const hasCards = await page.locator('[class*="card"], [class*="Card"]').count()
    // Page renders either cards or an empty state card — at minimum one element is present
    expect(hasCards).toBeGreaterThan(0)

    await page.screenshot({ path: `${SCREENSHOTS}/approvals-quotations-content-confirmed.png` })
  })

  test('should show empty state or approval cards in commercial tab', async ({ page }) => {
    await page.goto('/approvals')

    await expect(page.getByRole('heading', { name: 'รายการรออนุมัติ' })).toBeVisible()

    const commercialTab = page.getByRole('tab', { name: /Commercial Quotations/ })
    await commercialTab.click()
    await expect(commercialTab).toHaveAttribute('data-state', 'active')

    await expect(page.locator('.animate-pulse')).toHaveCount(0, { timeout: 10000 })

    await page.screenshot({ path: `${SCREENSHOTS}/approvals-commercial-loaded.png` })

    const hasCards = await page.locator('[class*="card"], [class*="Card"]').count()
    expect(hasCards).toBeGreaterThan(0)

    await page.screenshot({ path: `${SCREENSHOTS}/approvals-commercial-content-confirmed.png` })
  })

  test('should display approve and reject buttons on quotation cards when items exist', async ({
    page,
  }) => {
    await page.goto('/approvals')

    await expect(page.getByRole('heading', { name: 'รายการรออนุมัติ' })).toBeVisible()
    await expect(page.locator('.animate-pulse')).toHaveCount(0, { timeout: 10000 })

    await page.screenshot({ path: `${SCREENSHOTS}/approvals-approve-reject-check-initial.png` })

    const approveButtons = page.getByRole('button', { name: 'อนุมัติ' })
    const rejectButtons = page.getByRole('button', { name: 'ปฏิเสธ' })

    const approveCount = await approveButtons.count()
    const rejectCount = await rejectButtons.count()

    if (approveCount > 0) {
      expect(rejectCount).toBe(approveCount)
      await expect(approveButtons.first()).toBeVisible()
      await expect(rejectButtons.first()).toBeVisible()

      await page.screenshot({ path: `${SCREENSHOTS}/approvals-action-buttons-visible.png` })
    } else {
      // Empty state — confirm the Thai empty message is shown
      await expect(page.getByText('ไม่มีใบเสนอราคารออนุมัติ')).toBeVisible()

      await page.screenshot({ path: `${SCREENSHOTS}/approvals-quotations-empty-state.png` })
    }
  })

  test('should open reject dialog with reason field when reject button clicked', async ({
    page,
  }) => {
    await page.goto('/approvals')

    await expect(page.getByRole('heading', { name: 'รายการรออนุมัติ' })).toBeVisible()
    await expect(page.locator('.animate-pulse')).toHaveCount(0, { timeout: 10000 })

    const rejectButtons = page.getByRole('button', { name: 'ปฏิเสธ' })
    const rejectCount = await rejectButtons.count()

    if (rejectCount === 0) {
      test.skip()
      return
    }

    await page.screenshot({ path: `${SCREENSHOTS}/approvals-before-reject-click.png` })

    await rejectButtons.first().click()

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await expect(dialog.getByRole('heading', { name: 'ปฏิเสธรายการ' })).toBeVisible()
    await expect(dialog.getByPlaceholder('ระบุเหตุผลในการปฏิเสธ...')).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/approvals-reject-dialog-open.png` })

    await dialog.getByRole('button', { name: 'ยกเลิก' }).click()
    await expect(dialog).not.toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/approvals-reject-dialog-closed.png` })
  })

  test('should show tab count badges after data loads', async ({ page }) => {
    await page.goto('/approvals')

    await expect(page.getByRole('heading', { name: 'รายการรออนุมัติ' })).toBeVisible()
    await expect(page.locator('.animate-pulse')).toHaveCount(0, { timeout: 10000 })

    await page.screenshot({ path: `${SCREENSHOTS}/approvals-tab-counts-initial.png` })

    // Both tabs render a count badge in parentheses once data loads
    const tabList = page.getByRole('tablist')
    const quotationsTabText = await tabList.getByRole('tab', { name: /ใบเสนอราคา/ }).textContent()
    const commercialTabText = await tabList
      .getByRole('tab', { name: /Commercial Quotations/ })
      .textContent()

    expect(quotationsTabText).toMatch(/\(\d+\)/)
    expect(commercialTabText).toMatch(/\(\d+\)/)

    await page.screenshot({ path: `${SCREENSHOTS}/approvals-tab-counts-visible.png` })
  })
})
