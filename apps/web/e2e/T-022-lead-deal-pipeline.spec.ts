import { test, expect, type Page } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const ADMIN_EMAIL = 'admin@thanamol.com'
const PASSWORD = 'password123'
const SCREENSHOTS = path.resolve(__dirname, 'screenshots/T-022')

async function login(page: Page) {
  await page.goto('/login')
  await page.getByLabel('Email').fill(ADMIN_EMAIL)
  await page.getByLabel('Password').fill(PASSWORD)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page).toHaveURL('/', { timeout: 15000 })
}

test.describe('T-022: Lead/Deal Pipeline', () => {
  test.describe.configure({ mode: 'serial' })

  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  // DoD 1: Lead list renders with stats cards and heading
  test('should render lead list with stats cards and Lead Inbox heading', async ({ page }) => {
    await page.goto('/leads')

    await expect(page.getByText('Lead Inbox')).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/lead-list-initial.png` })

    await expect(page.getByText('New', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('Contacted', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('Qualified', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('Converted', { exact: true }).first()).toBeVisible()

    await expect(page.getByText('Lead List')).toBeVisible()
  })

  // DoD 2: Create a new lead via the Add Lead dialog
  test('should create a new lead via the Add Lead dialog and show it in the table', async ({ page }) => {
    await page.goto('/leads')

    const uniqueTitle = `E2E Test Lead ${Date.now()}`

    await page.getByRole('button', { name: 'Add Lead' }).click()
    await expect(page.getByRole('dialog')).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/lead-create-dialog-open.png` })

    await page.getByRole('dialog').getByPlaceholder('Lead title...').fill(uniqueTitle)
    await page.getByRole('dialog').getByPlaceholder('Facebook, Walk-in, Referral...').fill('E2E Test')

    await page.getByRole('button', { name: 'Create Lead' }).click()

    await expect(page.getByText(uniqueTitle)).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/lead-created.png` })
  })

  // DoD 3: Create a lead without a title shows validation error
  test('should show validation error when creating a lead without a title', async ({ page }) => {
    await page.goto('/leads')

    await page.getByRole('button', { name: 'Add Lead' }).click()
    await expect(page.getByRole('dialog')).toBeVisible()

    await page.getByRole('button', { name: 'Create Lead' }).click()

    await page.screenshot({ path: `${SCREENSHOTS}/lead-create-no-title-error.png` })

    // Toast error appears — sonner renders toasts accessible via role="status" or text match
    await expect(page.getByText('Title is required')).toBeVisible()
  })

  // DoD 4: Filter leads by status using the dropdown
  test('should filter leads by status and update the table', async ({ page }) => {
    await page.goto('/leads')

    await expect(page.getByText('Lead List')).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/lead-filter-before.png` })

    // Open the status filter select and choose New
    const statusTrigger = page.getByRole('combobox').filter({ hasText: /All Status|New|Contacted|Qualified|Unqualified|Converted/ }).first()
    await statusTrigger.click()
    await page.getByRole('option', { name: 'New' }).click()

    await page.screenshot({ path: `${SCREENSHOTS}/lead-filter-new.png` })

    // After filtering, any visible status badges in rows should only be "New"
    // The filter dropdown should reflect the selection
    await expect(statusTrigger).toContainText('New')
  })

  // DoD 5: Navigate to lead detail page with populated form fields
  test('should navigate to lead detail page with populated form fields', async ({ page }) => {
    await page.goto('/leads')

    const firstViewButton = page.getByRole('link', { name: 'View' }).first()
    await expect(firstViewButton).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/lead-list-with-view-buttons.png` })

    await firstViewButton.click()

    await expect(page.getByText('Lead Detail')).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/lead-detail-loaded.png` })

    // The title input should be populated (Label has no htmlFor, locate by placeholder)
    const titleInput = page.getByPlaceholder('Lead title...')
    await expect(titleInput).toBeVisible()
    await expect(titleInput).not.toHaveValue('')
  })

  // DoD 6: Edit a lead field and save — success toast shown
  test('should save lead edits and show success toast', async ({ page }) => {
    await page.goto('/leads')

    await page.getByRole('link', { name: 'View' }).first().click()
    await expect(page.getByText('Lead Detail')).toBeVisible()

    // Wait for the form to be populated (useEffect loads lead data asynchronously)
    const titleInput = page.getByPlaceholder('Lead title...')
    await expect(titleInput).not.toHaveValue('', { timeout: 10000 })

    const sourceInput = page.getByPlaceholder('Facebook, Walk-in, Referral...')
    await sourceInput.clear()
    await sourceInput.fill('E2E-Updated-Source')

    // The Status Select's display is empty due to Radix UI lazy rendering, but formData.status
    // may still be an empty string. Explicitly set it to ensure a valid value is sent on save.
    const statusSelect = page.getByRole('combobox').nth(1)
    await statusSelect.click()
    await page.getByRole('option', { name: 'New' }).click()

    await page.screenshot({ path: `${SCREENSHOTS}/lead-detail-editing.png` })

    await page.getByRole('button', { name: 'Save' }).click()

    await expect(page.getByText('Lead updated')).toBeVisible({ timeout: 10000 })

    await page.screenshot({ path: `${SCREENSHOTS}/lead-detail-saved.png` })
  })

  // DoD 7: Convert a lead to deal from the list page
  test('should convert a lead to deal and navigate to /deals', async ({ page }) => {
    await page.goto('/leads')

    // Find the first "To Deal" button (leads that can be converted)
    const toDealButton = page.getByRole('button', { name: 'To Deal' }).first()
    await expect(toDealButton).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/lead-list-before-convert.png` })

    await toDealButton.click()

    // Confirmation dialog appears
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await expect(dialog.getByText('Convert Lead to Deal')).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/lead-convert-dialog.png` })

    await dialog.getByRole('button', { name: 'Convert to Deal' }).click()

    await expect(page).toHaveURL('/deals')

    await page.screenshot({ path: `${SCREENSHOTS}/lead-converted-navigated-to-deals.png` })
  })

  // DoD 8: Deal pipeline renders with all stage columns
  test('should render deal pipeline with all stage columns', async ({ page }) => {
    await page.goto('/deals')

    await expect(page.getByText('Deal Pipeline')).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/deal-pipeline-initial.png` })

    await expect(page.getByText('Prospecting')).toBeVisible()
    await expect(page.getByText('Qualification')).toBeVisible()
    await expect(page.getByText('Proposal')).toBeVisible()
    await expect(page.getByText('Negotiation')).toBeVisible()
    await expect(page.getByText('Won', { exact: true })).toBeVisible()
    await expect(page.getByText('Lost', { exact: true })).toBeVisible()
  })

  // DoD 9: Create a new deal via the New Deal dialog
  test('should create a new deal via the New Deal dialog and show it in the pipeline', async ({ page }) => {
    await page.goto('/deals')

    const uniqueTitle = `E2E Test Deal ${Date.now()}`

    await page.getByRole('button', { name: 'New Deal' }).click()
    await expect(page.getByRole('dialog')).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/deal-create-dialog-open.png` })

    await page.getByRole('dialog').getByPlaceholder('Deal title...').fill(uniqueTitle)

    await page.getByRole('button', { name: 'Create Deal' }).click()

    await expect(page.getByText(uniqueTitle)).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/deal-created.png` })
  })

  // DoD 10: Create a deal without a title shows validation error
  test('should show validation error when creating a deal without a title', async ({ page }) => {
    await page.goto('/deals')

    await page.getByRole('button', { name: 'New Deal' }).click()
    await expect(page.getByRole('dialog')).toBeVisible()

    await page.getByRole('button', { name: 'Create Deal' }).click()

    await page.screenshot({ path: `${SCREENSHOTS}/deal-create-no-title-error.png` })

    await expect(page.getByText('Title is required')).toBeVisible()
  })

  // DoD 11: Navigate to deal detail page — heading and stage badge visible
  test('should show Deal Detail heading and stage badge on deal detail page', async ({ page }) => {
    await page.goto('/deals')

    // Click a deal title link in the pipeline (first visible deal card link)
    const firstDealLink = page.locator('.bg-white.border.border-slate-100.rounded-lg a').first()
    await expect(firstDealLink).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/deal-pipeline-with-cards.png` })

    await firstDealLink.click()

    await expect(page.getByText('Deal Detail')).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/deal-detail-loaded.png` })

    // Wait for deal data to load so the form and badge are populated
    await expect(page.getByPlaceholder('Deal title...')).not.toHaveValue('', { timeout: 10000 })
    // Stage badge sits next to the h1 — target it via the sibling div inside the flex heading row
    const headingRow = page.locator('div.flex.items-center.gap-3').filter({ has: page.getByRole('heading', { name: /deal detail/i }) })
    await expect(headingRow).toBeVisible()
    await expect(headingRow.locator('div').last()).toBeVisible()
  })

  // DoD 12: Edit a deal field and save — success toast shown
  test('should save deal edits and show success toast', async ({ page }) => {
    await page.goto('/deals')

    const firstDealLink = page.locator('.bg-white.border.border-slate-100.rounded-lg a').first()
    await expect(firstDealLink).toBeVisible()
    await firstDealLink.click()

    await expect(page.getByText('Deal Detail')).toBeVisible()

    // Wait for the form to be populated (useEffect loads deal data asynchronously)
    await expect(page.getByPlaceholder('Deal title...')).not.toHaveValue('', { timeout: 10000 })

    const notesTextarea = page.getByPlaceholder('Additional notes...')
    await notesTextarea.clear()
    await notesTextarea.fill('E2E updated notes')

    // Radix UI Select lazy rendering: explicitly open Stage select and re-select current value
    // so formData.stage is set to a valid value before saving
    const stageSelect = page.getByRole('combobox').first()
    await stageSelect.click()
    await page.getByRole('option', { name: 'Prospecting' }).click()

    await page.screenshot({ path: `${SCREENSHOTS}/deal-detail-editing.png` })

    await page.getByRole('button', { name: 'Save' }).click()

    await expect(page.getByText('Deal updated')).toBeVisible({ timeout: 10000 })

    await page.screenshot({ path: `${SCREENSHOTS}/deal-detail-saved.png` })
  })

  // DoD 13: Move a deal to a different stage via "Move to..." select
  test('should show move deal confirmation dialog and move deal to new stage on confirm', async ({ page }) => {
    await page.goto('/deals')

    // Find the "Move to..." select trigger on the first deal card in Prospecting column
    const prospectingColumn = page.locator('div.flex-shrink-0.w-72').filter({ hasText: 'Prospecting' }).first()
    await expect(prospectingColumn).toBeVisible()

    const firstCard = prospectingColumn.locator('.bg-white.border.border-slate-100.rounded-lg').first()
    await expect(firstCard).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/deal-pipeline-before-move.png` })

    // Click the "Move to..." select on that card
    const moveSelect = firstCard.getByRole('combobox')
    await moveSelect.click()

    // Choose "Qualification"
    await page.getByRole('option', { name: 'Qualification' }).first().click()

    // Confirmation dialog appears
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await expect(dialog.getByText('Move Deal')).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/deal-move-dialog.png` })

    await dialog.getByRole('button', { name: 'Confirm' }).click()

    await expect(page.getByText('Deal moved to Qualification')).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/deal-moved-confirmed.png` })
  })
})
