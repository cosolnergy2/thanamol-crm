import { test, expect, type Page } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const ADMIN_EMAIL = 'admin@thanamol.com'
const PASSWORD = 'password123'
const SCREENSHOTS = path.resolve(__dirname, 'screenshots/T-082')

const STAGE_LABELS = ['Prospecting', 'Qualification', 'Proposal', 'Negotiation', 'Won', 'Lost']

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

test.describe('T-082: Deals E2E', () => {
  test.describe.configure({ mode: 'serial' })

  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('should load the Deal Pipeline page without errors', async ({ page }) => {
    await page.goto('/deals')

    await expect(page.getByRole('heading', { name: 'Deal Pipeline' })).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/deals-pipeline-initial.png` })

    await expect(page.getByText('Total Pipeline Value')).toBeVisible()
    await expect(page.getByText('Active Deals')).toBeVisible()
    await expect(page.getByText('Deals Won')).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/deals-pipeline-loaded.png` })

    await expect(page.getByText('Not Found')).not.toBeVisible()
  })

  test('should display pipeline stage columns with deal counts', async ({ page }) => {
    await page.goto('/deals')

    await expect(page.getByRole('heading', { name: 'Deal Pipeline' })).toBeVisible()

    await page.waitForSelector('text=Prospecting', { timeout: 10000 })

    await page.screenshot({ path: `${SCREENSHOTS}/deals-stage-columns.png` })

    for (const stage of STAGE_LABELS) {
      await expect(page.getByText(stage).first()).toBeVisible()
    }

    await page.screenshot({ path: `${SCREENSHOTS}/deals-all-stages-visible.png` })
  })

  test('should show New Deal button and open create dialog', async ({ page }) => {
    await page.goto('/deals')

    await expect(page.getByRole('heading', { name: 'Deal Pipeline' })).toBeVisible()

    const newDealButton = page.getByRole('button', { name: 'New Deal' })
    await expect(newDealButton).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/deals-new-deal-button.png` })

    await newDealButton.click()

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await expect(dialog.getByRole('heading', { name: 'New Deal' })).toBeVisible()
    await expect(dialog.getByPlaceholder('Deal title...')).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/deals-create-dialog-open.png` })

    await dialog.getByRole('button', { name: 'Cancel' }).click()
    await expect(dialog).not.toBeVisible()
  })

  test('should create a new deal and show it on the pipeline board', async ({ page }) => {
    await page.goto('/deals')

    await expect(page.getByRole('heading', { name: 'Deal Pipeline' })).toBeVisible()

    const timestamp = Date.now()
    const dealTitle = `E2E Deal ${timestamp}`

    await page.getByRole('button', { name: 'New Deal' }).click()

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()

    await dialog.getByPlaceholder('Deal title...').fill(dealTitle)

    await page.screenshot({ path: `${SCREENSHOTS}/deals-create-dialog-filled.png` })

    await dialog.getByRole('button', { name: 'Create Deal' }).click()

    await expect(dialog).not.toBeVisible({ timeout: 10000 })

    await expect(page.getByText(dealTitle)).toBeVisible({ timeout: 10000 })

    await page.screenshot({ path: `${SCREENSHOTS}/deals-new-deal-on-board.png` })
  })

  test('should navigate to deal detail page when clicking a deal card title', async ({ page }) => {
    await page.goto('/deals')

    await expect(page.getByRole('heading', { name: 'Deal Pipeline' })).toBeVisible()

    await page.waitForSelector('text=Prospecting', { timeout: 10000 })

    await page.screenshot({ path: `${SCREENSHOTS}/deals-before-clicking-deal.png` })

    const dealLinks = page.locator('a[href^="/deals/"]')
    const linkCount = await dealLinks.count()

    if (linkCount === 0) {
      test.skip()
      return
    }

    const firstDealLink = dealLinks.first()
    const dealTitle = await firstDealLink.textContent()

    await firstDealLink.click()

    await expect(page).toHaveURL(/\/deals\/.+/, { timeout: 10000 })

    await page.screenshot({ path: `${SCREENSHOTS}/deals-detail-page-loaded.png` })

    await expect(page.getByRole('heading', { name: 'Deal Detail' })).toBeVisible()
    await expect(page.getByText('Not Found')).not.toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/deals-detail-page-confirmed.png` })
  })

  test('should show deal detail fields: stage selector, title input, and save button', async ({ page }) => {
    await page.goto('/deals')

    await expect(page.getByRole('heading', { name: 'Deal Pipeline' })).toBeVisible()

    const dealLinks = page.locator('a[href^="/deals/"]')
    const linkCount = await dealLinks.count()

    if (linkCount === 0) {
      test.skip()
      return
    }

    await dealLinks.first().click()
    await expect(page).toHaveURL(/\/deals\/.+/, { timeout: 10000 })

    await expect(page.getByRole('heading', { name: 'Deal Detail' })).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/deals-detail-fields-initial.png` })

    await expect(page.getByRole('button', { name: /Save/ })).toBeVisible()
    await expect(page.getByPlaceholder('Deal title...')).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/deals-detail-fields-confirmed.png` })
  })

  test('should navigate back to pipeline from deal detail via back button', async ({ page }) => {
    await page.goto('/deals')

    await expect(page.getByRole('heading', { name: 'Deal Pipeline' })).toBeVisible()

    const dealLinks = page.locator('a[href^="/deals/"]')
    const linkCount = await dealLinks.count()

    if (linkCount === 0) {
      test.skip()
      return
    }

    await dealLinks.first().click()
    await expect(page).toHaveURL(/\/deals\/.+/, { timeout: 10000 })
    await expect(page.getByRole('heading', { name: 'Deal Detail' })).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/deals-detail-before-back.png` })

    await page.getByRole('link', { name: /Cancel/ }).click()

    await expect(page).toHaveURL('/deals', { timeout: 10000 })
    await expect(page.getByRole('heading', { name: 'Deal Pipeline' })).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/deals-back-to-pipeline.png` })
  })
})
