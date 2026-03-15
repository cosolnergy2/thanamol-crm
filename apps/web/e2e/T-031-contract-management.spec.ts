import { test, expect, type Page } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const ADMIN_EMAIL = 'admin@thanamol.com'
const PASSWORD = 'password123'
const SCREENSHOTS = path.resolve(__dirname, 'screenshots/T-031')

async function login(page: Page) {
  // Retry up to 3 times to handle intermittent JWT duplicate-token errors from the API
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

// ─── Contract List ─────────────────────────────────────────────────────────────

test.describe('T-031: Contract List', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  // Scenario 1: Contract list renders with stats cards and table
  test('should render contract list page with stats cards and table headers', async ({ page }) => {
    await page.goto('/contracts')

    await expect(page.getByRole('heading', { name: 'Contracts' })).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/contract-list-initial.png` })

    await expect(page.getByText('Total', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('Active', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('Pending Approval', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('Approved', { exact: true }).first()).toBeVisible()

    await expect(page.getByRole('columnheader', { name: 'Contract No.' })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: 'Type' })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: 'Status' })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: 'Value' })).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/contract-list-stats-and-table.png` })
  })

  // Scenario 1b: Action buttons visible
  test('should show New Contract and Expiring action buttons', async ({ page }) => {
    await page.goto('/contracts')

    await expect(page.getByRole('link', { name: /New Contract/ })).toBeVisible()
    await expect(page.getByRole('link', { name: /Expiring/ })).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/contract-list-action-buttons.png` })
  })

  // Scenario 1c: Status filter works
  test('should filter contract list by status using the status dropdown', async ({ page }) => {
    await page.goto('/contracts')

    await expect(page.getByRole('heading', { name: 'Contracts' })).toBeVisible()

    const statusTrigger = page
      .getByRole('combobox')
      .filter({ hasText: /All Status|Draft|Active|Approved/ })
      .first()
    await statusTrigger.click()

    await page.screenshot({ path: `${SCREENSHOTS}/contract-list-status-dropdown-open.png` })

    await page.getByRole('option', { name: 'Draft' }).click()
    await expect(statusTrigger).toContainText('Draft')

    await page.screenshot({ path: `${SCREENSHOTS}/contract-list-filtered-draft.png` })
  })

  // Scenario 1d: Type filter works
  test('should filter contract list by type using the type dropdown', async ({ page }) => {
    await page.goto('/contracts')

    await expect(page.getByRole('heading', { name: 'Contracts' })).toBeVisible()

    const typeTrigger = page
      .getByRole('combobox')
      .filter({ hasText: /All Types|Sale|Lease|Rental/ })
      .first()
    await typeTrigger.click()

    await page.getByRole('option', { name: 'Rental' }).click()
    await expect(typeTrigger).toContainText('Rental')

    await page.screenshot({ path: `${SCREENSHOTS}/contract-list-filtered-rental.png` })
  })
})

// ─── Create Contract ────────────────────────────────────────────────────────────

test.describe('T-031: Create Contract', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  // Scenario 2: Create contract form renders
  test('should render create contract form with required fields', async ({ page }) => {
    await page.goto('/contracts/create')

    await expect(page.getByRole('heading', { name: 'New Contract' })).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/contract-create-initial.png` })

    await expect(page.getByText('Customer *')).toBeVisible()
    await expect(page.getByText('Project *')).toBeVisible()
    await expect(page.getByText('Contract Type *')).toBeVisible()
    await expect(page.getByText('Start Date *')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Save Contract' })).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/contract-create-form-fields.png` })
  })

  // Scenario 2: Fill and submit create contract form
  test('should create a new contract and redirect to contracts list', async ({ page }) => {
    await page.goto('/contracts/create')

    await expect(page.getByRole('heading', { name: 'New Contract' })).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/contract-create-before-fill.png` })

    const customerSelect = page.getByText('Select customer')
    await customerSelect.click()
    await page.getByRole('option').first().click()

    const projectSelect = page.getByText('Select project')
    await projectSelect.click()
    await page.getByRole('option').first().click()

    await page.locator('input[type="date"]').first().fill('2026-04-01')
    await page.locator('input[type="date"]').nth(1).fill('2027-03-31')
    await page.locator('input[type="number"]').first().fill('500000')

    await page.screenshot({ path: `${SCREENSHOTS}/contract-create-filled.png` })

    await page.getByRole('button', { name: 'Save Contract' }).click()

    await expect(page).toHaveURL('/contracts', { timeout: 15000 })

    await page.screenshot({ path: `${SCREENSHOTS}/contract-create-success.png` })
  })

  // Scenario 2: Validation error for missing required fields
  test('should show validation errors when required fields are missing', async ({ page }) => {
    await page.goto('/contracts/create')

    await expect(page.getByRole('heading', { name: 'New Contract' })).toBeVisible()

    await page.getByRole('button', { name: 'Save Contract' }).click()

    await page.screenshot({ path: `${SCREENSHOTS}/contract-create-validation-errors.png` })

    await expect(page.getByText('Customer is required')).toBeVisible()
    await expect(page.getByText('Project is required')).toBeVisible()
    await expect(page.getByText('Start date is required')).toBeVisible()
  })
})

// ─── Contract Detail ───────────────────────────────────────────────────────────

test.describe('T-031: Contract Detail', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  // Scenario 3: Contract detail shows fields
  test('should show contract detail page with all fields populated', async ({ page }) => {
    await page.goto('/contracts')

    await expect(page.getByRole('heading', { name: 'Contracts' })).toBeVisible()

    const detailLinks = page.locator('a[href*="/contracts/"]').filter({
      hasNot: page.locator('[href*="/edit"]'),
      hasNot: page.locator('[href*="/print"]'),
      hasNot: page.locator('[href="/contracts"]'),
      hasNot: page.locator('[href="/contracts/create"]'),
      hasNot: page.locator('[href="/contracts/expiring"]'),
    })

    const linkCount = await detailLinks.count()

    if (linkCount === 0) {
      await page.screenshot({ path: `${SCREENSHOTS}/contract-detail-no-contracts.png` })
      test.skip()
      return
    }

    const firstHref = await detailLinks.first().getAttribute('href')
    await page.goto(firstHref!)

    await page.screenshot({ path: `${SCREENSHOTS}/contract-detail-initial.png` })

    await expect(page.getByText('Start Date')).toBeVisible()
    await expect(page.getByText('End Date')).toBeVisible()
    await expect(page.getByText('Status')).toBeVisible()
    await expect(page.getByText('Type')).toBeVisible()
    await expect(page.getByText('Contract Information')).toBeVisible()
    await expect(page.getByText('Customer')).toBeVisible()
    await expect(page.getByText('Project')).toBeVisible()
    await expect(page.getByText('Contract Value')).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/contract-detail-fields.png` })
  })
})

// ─── Edit Contract ─────────────────────────────────────────────────────────────

test.describe('T-031: Edit Contract', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  // Scenario 4: Edit a DRAFT contract
  test('should edit a DRAFT contract and save changes', async ({ page }) => {
    await page.goto('/contracts')

    await expect(page.getByRole('heading', { name: 'Contracts' })).toBeVisible()

    const editLinks = page.locator('a[href*="/contracts/"][href*="/edit"]')
    const editCount = await editLinks.count()

    if (editCount === 0) {
      await page.screenshot({ path: `${SCREENSHOTS}/contract-edit-no-draft.png` })
      test.skip()
      return
    }

    const editHref = await editLinks.first().getAttribute('href')
    await page.goto(editHref!)

    await expect(page.getByRole('heading', { name: 'Edit Contract' })).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/contract-edit-initial.png` })

    const valueInput = page.locator('input[type="number"]').first()
    await valueInput.fill('750000')

    await page.screenshot({ path: `${SCREENSHOTS}/contract-edit-changed.png` })

    await page.getByRole('button', { name: 'Save Changes' }).click()

    await expect(page).toHaveURL(/\/contracts\/[^/]+$/, { timeout: 15000 })

    await page.screenshot({ path: `${SCREENSHOTS}/contract-edit-saved.png` })

    await expect(page.getByText('750,000')).toBeVisible()
  })
})

// ─── Contract Approval Workflow ────────────────────────────────────────────────

test.describe('T-031: Contract Approval Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  // Scenario 5: Submit a DRAFT contract for approval
  test('should submit a DRAFT contract for approval and change status to Pending Approval', async ({
    page,
  }) => {
    await page.goto('/contracts')

    await expect(page.getByRole('heading', { name: 'Contracts' })).toBeVisible()

    const editLinks = page.locator('a[href*="/contracts/"][href*="/edit"]')
    const editCount = await editLinks.count()

    if (editCount === 0) {
      await page.screenshot({ path: `${SCREENSHOTS}/contract-approval-no-draft.png` })
      test.skip()
      return
    }

    const editHref = await editLinks.first().getAttribute('href')
    const contractId = editHref!.match(/\/contracts\/([^/]+)\/edit/)![1]
    await page.goto(`/contracts/${contractId}`)

    await expect(page.getByRole('button', { name: 'Submit for Approval' })).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/contract-approval-draft-view.png` })

    await page.getByRole('button', { name: 'Submit for Approval' }).click()

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/contract-approval-submit-dialog.png` })

    await dialog.getByRole('button', { name: 'Submit' }).click()

    await expect(page.getByText('Contract submitted for approval')).toBeVisible({ timeout: 10000 })

    await page.screenshot({ path: `${SCREENSHOTS}/contract-approval-submitted.png` })

    await expect(page.getByText(/Pending Approval/i)).toBeVisible()
  })

  // Scenario 5: Approve a PENDING_APPROVAL contract
  test('should approve a PENDING_APPROVAL contract and change status to Approved', async ({
    page,
  }) => {
    await page.goto('/contracts')

    await expect(page.getByRole('heading', { name: 'Contracts' })).toBeVisible()

    const statusTrigger = page
      .getByRole('combobox')
      .filter({ hasText: /All Status|Draft|Active/ })
      .first()
    await statusTrigger.click()
    await page.getByRole('option', { name: 'Pending Approval' }).click()

    await page.waitForTimeout(500)

    const detailLinks = page.locator('a[href*="/contracts/"]').filter({
      hasNot: page.locator('[href*="/edit"]'),
      hasNot: page.locator('[href*="/print"]'),
      hasNot: page.locator('[href="/contracts"]'),
      hasNot: page.locator('[href="/contracts/create"]'),
      hasNot: page.locator('[href="/contracts/expiring"]'),
    })

    const linkCount = await detailLinks.count()

    if (linkCount === 0) {
      await page.screenshot({ path: `${SCREENSHOTS}/contract-approve-no-pending.png` })
      test.skip()
      return
    }

    const href = await detailLinks.first().getAttribute('href')
    await page.goto(href!)

    await expect(page.getByRole('button', { name: 'Approve' })).toBeVisible({ timeout: 5000 })

    await page.screenshot({ path: `${SCREENSHOTS}/contract-approve-pending-view.png` })

    await page.getByRole('button', { name: 'Approve' }).click()

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/contract-approve-dialog.png` })

    await dialog.getByRole('button', { name: 'Approve' }).click()

    await expect(page.getByText('Contract approved')).toBeVisible({ timeout: 10000 })

    await page.screenshot({ path: `${SCREENSHOTS}/contract-approved.png` })

    await expect(page.getByText(/Approved/i).first()).toBeVisible()
  })

  // Scenario 6: Reject a pending contract with reason
  test('should reject a PENDING_APPROVAL contract with a reason', async ({ page }) => {
    // Create a contract, submit it, then reject it
    await page.goto('/contracts/create')
    await expect(page.getByRole('heading', { name: 'New Contract' })).toBeVisible()

    await page.getByText('Select customer').click()
    await page.getByRole('option').first().click()

    await page.getByText('Select project').click()
    await page.getByRole('option').first().click()

    await page.locator('input[type="date"]').first().fill('2026-05-01')
    await page.locator('input[type="number"]').first().fill('200000')

    await page.getByRole('button', { name: 'Save Contract' }).click()
    await expect(page).toHaveURL('/contracts', { timeout: 15000 })

    // Find the newly-created DRAFT contract and submit it
    const editLinks = page.locator('a[href*="/contracts/"][href*="/edit"]')
    const editHref = await editLinks.first().getAttribute('href')
    const contractId = editHref!.match(/\/contracts\/([^/]+)\/edit/)![1]
    await page.goto(`/contracts/${contractId}`)

    await page.getByRole('button', { name: 'Submit for Approval' }).click()
    const submitDialog = page.getByRole('dialog')
    await expect(submitDialog).toBeVisible()
    await submitDialog.getByRole('button', { name: 'Submit' }).click()
    await expect(page.getByText('Contract submitted for approval')).toBeVisible({ timeout: 10000 })

    // Now reject it
    await expect(page.getByRole('button', { name: 'Reject' })).toBeVisible({ timeout: 5000 })

    await page.screenshot({ path: `${SCREENSHOTS}/contract-reject-pending-view.png` })

    await page.getByRole('button', { name: 'Reject' }).click()

    const rejectDialog = page.getByRole('dialog')
    await expect(rejectDialog).toBeVisible()

    await rejectDialog.getByRole('textbox').fill('E2E test rejection reason — terms not acceptable')

    await page.screenshot({ path: `${SCREENSHOTS}/contract-reject-dialog-filled.png` })

    await rejectDialog.getByRole('button', { name: 'Reject' }).click()

    await expect(page.getByText('Contract rejected')).toBeVisible({ timeout: 10000 })

    await page.screenshot({ path: `${SCREENSHOTS}/contract-rejected.png` })
  })

  // Scenario 6: Reject dialog requires a reason
  test('should show error when rejecting without providing a reason', async ({ page }) => {
    await page.goto('/contracts')

    const statusTrigger = page
      .getByRole('combobox')
      .filter({ hasText: /All Status|Draft|Active/ })
      .first()
    await statusTrigger.click()
    await page.getByRole('option', { name: 'Pending Approval' }).click()

    await page.waitForTimeout(500)

    const detailLinks = page.locator(
      'a[href^="/contracts/"]:not([href="/contracts"]):not([href="/contracts/create"]):not([href="/contracts/expiring"]):not([href*="/edit"]):not([href*="/print"])',
    )

    const linkCount = await detailLinks.count()
    if (linkCount === 0) {
      test.skip()
      return
    }

    const href = await detailLinks.first().getAttribute('href')
    await page.goto(href!)

    const rejectButton = page.getByRole('button', { name: 'Reject' })
    const hasReject = await rejectButton.isVisible({ timeout: 3000 }).catch(() => false)
    if (!hasReject) {
      test.skip()
      return
    }

    await rejectButton.click()

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/contract-reject-empty-dialog.png` })

    await dialog.getByRole('button', { name: 'Reject' }).click()

    await expect(page.getByText('Rejection reason is required')).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/contract-reject-validation-error.png` })
  })
})

// ─── Expiring Contracts ────────────────────────────────────────────────────────

test.describe('T-031: Expiring Contracts', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  // Scenario 7: Expiring contracts page renders
  test('should render expiring contracts page with urgency stats cards', async ({ page }) => {
    await page.goto('/contracts/expiring')

    await expect(page.getByRole('heading', { name: 'Expiring Contracts' })).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/expiring-contracts-initial.png` })

    await expect(page.getByText('Critical (< 7 days)')).toBeVisible()
    await expect(page.getByText('Warning (7–29 days)')).toBeVisible()
    await expect(page.getByText('Notice (≥ 30 days)')).toBeVisible()
    await expect(page.getByText('Total Expiring')).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/expiring-contracts-stats.png` })
  })

  // Scenario 7: Navigate from contracts list to expiring contracts
  test('should navigate from contracts list to expiring contracts via Expiring button', async ({
    page,
  }) => {
    await page.goto('/contracts')

    await expect(page.getByRole('heading', { name: 'Contracts' })).toBeVisible()

    await page.getByRole('link', { name: /Expiring/ }).click()

    await expect(page).toHaveURL('/contracts/expiring')
    await expect(page.getByRole('heading', { name: 'Expiring Contracts' })).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/expiring-contracts-navigated.png` })
  })

  // Scenario 7: Table headers visible
  test('should show contract table headers on expiring contracts page', async ({ page }) => {
    await page.goto('/contracts/expiring')

    await expect(page.getByRole('heading', { name: 'Expiring Contracts' })).toBeVisible()

    await expect(page.getByRole('columnheader', { name: 'Contract' })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: 'Customer' })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: 'End Date' })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: 'Days Remaining' })).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/expiring-contracts-table-headers.png` })
  })
})

// ─── Contract Print ────────────────────────────────────────────────────────────

test.describe('T-031: Contract Print', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  // Print page renders
  test('should render contract print page', async ({ page }) => {
    await page.goto('/contracts')

    await expect(page.getByRole('heading', { name: 'Contracts' })).toBeVisible()

    const printLinks = page.locator('a[href*="/contracts/"][href*="/print"]')
    const printCount = await printLinks.count()

    if (printCount === 0) {
      await page.screenshot({ path: `${SCREENSHOTS}/contract-print-no-contracts.png` })
      test.skip()
      return
    }

    const printHref = await printLinks.first().getAttribute('href')
    await page.goto(printHref!)

    await page.screenshot({ path: `${SCREENSHOTS}/contract-print-layout.png` })

    await expect(page.url()).toContain('/print')
    await expect(page.getByText(/CONTRACT|Contract/)).toBeVisible()
  })
})

// ─── Lease Agreement List ──────────────────────────────────────────────────────

test.describe('T-031: Lease Agreement List', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  // Scenario 8: Lease agreement list renders
  test('should render lease agreement list page with stats cards', async ({ page }) => {
    await page.goto('/forms/sale-job02-f01')

    await expect(page.getByText('SALE-JOB02-F01: Lease Agreement')).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/lease-list-initial.png` })

    await expect(page.getByText('Total', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('Active', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('Draft', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('Expired', { exact: true }).first()).toBeVisible()

    await expect(page.getByRole('link', { name: /New Lease Agreement/ })).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/lease-list-stats.png` })
  })

  // Scenario 8: Status filter
  test('should filter lease agreement list by status', async ({ page }) => {
    await page.goto('/forms/sale-job02-f01')

    await expect(page.getByText('SALE-JOB02-F01: Lease Agreement')).toBeVisible()

    const statusTrigger = page
      .getByRole('combobox')
      .filter({ hasText: /All Status|Draft|Active|Expired|Terminated/ })
      .first()
    await statusTrigger.click()

    await page.screenshot({ path: `${SCREENSHOTS}/lease-list-status-dropdown.png` })

    await page.getByRole('option', { name: 'Draft' }).click()
    await expect(statusTrigger).toContainText('Draft')

    await page.screenshot({ path: `${SCREENSHOTS}/lease-list-filtered-draft.png` })
  })
})

// ─── Create Lease Agreement ────────────────────────────────────────────────────

test.describe('T-031: Create Lease Agreement', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  // Scenario 9: Lease agreement form renders
  test('should render new lease agreement form with contract selector', async ({ page }) => {
    await page.goto('/forms/sale-job02-f01/new')

    await expect(page.getByRole('heading', { name: 'New Lease Agreement' })).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/lease-create-initial.png` })

    await expect(page.getByText('Contract *')).toBeVisible()
    await expect(page.getByText('Status')).toBeVisible()
    await expect(page.getByText('Lease Terms', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('Special Conditions')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Save Lease Agreement' })).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/lease-create-form-fields.png` })
  })

  // Scenario 9: Create lease agreement with contract reference
  test('should create a new lease agreement with a contract reference and redirect to list', async ({
    page,
  }) => {
    await page.goto('/forms/sale-job02-f01/new')

    await expect(page.getByRole('heading', { name: 'New Lease Agreement' })).toBeVisible()

    const contractTrigger = page.getByText('Select contract')
    await contractTrigger.click()

    const options = page.getByRole('option')
    const optionCount = await options.count()

    if (optionCount === 0) {
      await page.screenshot({ path: `${SCREENSHOTS}/lease-create-no-contracts.png` })
      test.skip()
      return
    }

    await options.first().click()

    await page.screenshot({ path: `${SCREENSHOTS}/lease-create-contract-selected.png` })

    await page
      .getByPlaceholder('Enter lease terms as JSON')
      .fill('{"duration": "12 months", "rent": 50000}')

    await page
      .getByPlaceholder('Enter any special conditions')
      .fill('E2E test special conditions')

    await page.screenshot({ path: `${SCREENSHOTS}/lease-create-filled.png` })

    await page.getByRole('button', { name: 'Save Lease Agreement' }).click()

    await expect(page).toHaveURL('/forms/sale-job02-f01', { timeout: 15000 })

    await page.screenshot({ path: `${SCREENSHOTS}/lease-create-success.png` })
  })

  // Scenario 9: Validation requires contract selection
  test('should show validation error when contract is not selected', async ({ page }) => {
    await page.goto('/forms/sale-job02-f01/new')

    await expect(page.getByRole('heading', { name: 'New Lease Agreement' })).toBeVisible()

    await page.getByRole('button', { name: 'Save Lease Agreement' }).click()

    await page.screenshot({ path: `${SCREENSHOTS}/lease-create-validation-error.png` })

    await expect(page.getByText('Contract is required')).toBeVisible()
  })
})

// ─── View & Edit Lease Agreement ──────────────────────────────────────────────

test.describe('T-031: View and Edit Lease Agreement', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  // Scenario 10: View lease agreement detail
  test('should display lease agreement detail with contract reference', async ({ page }) => {
    await page.goto('/forms/sale-job02-f01')

    await expect(page.getByText('SALE-JOB02-F01: Lease Agreement')).toBeVisible()

    const detailLinks = page.locator(
      'a[href^="/forms/sale-job02-f01/"]:not([href="/forms/sale-job02-f01"]):not([href="/forms/sale-job02-f01/new"]):not([href*="/edit"]):not([href*="/print"])',
    )

    await page.waitForTimeout(500)
    const linkCount = await detailLinks.count()

    if (linkCount === 0) {
      await page.screenshot({ path: `${SCREENSHOTS}/lease-detail-no-records.png` })
      test.skip()
      return
    }

    const href = await detailLinks.first().getAttribute('href')
    await page.goto(href!)

    await page.screenshot({ path: `${SCREENSHOTS}/lease-detail-initial.png` })

    await expect(page.getByText('Status')).toBeVisible()
    await expect(page.getByText('Contract Type')).toBeVisible()
    await expect(page.getByText('Contract Reference')).toBeVisible()
    await expect(page.getByText('Contract Number')).toBeVisible()
    await expect(page.getByText('Contract Status')).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/lease-detail-fields.png` })
  })

  // Scenario 10: Edit a DRAFT lease agreement
  test('should edit a DRAFT lease agreement and save changes', async ({ page }) => {
    await page.goto('/forms/sale-job02-f01')

    await expect(page.getByText('SALE-JOB02-F01: Lease Agreement')).toBeVisible()

    const editLinks = page.locator('a[href*="/forms/sale-job02-f01/"][href*="/edit"]')
    await page.waitForTimeout(500)
    const editCount = await editLinks.count()

    if (editCount === 0) {
      await page.screenshot({ path: `${SCREENSHOTS}/lease-edit-no-draft.png` })
      test.skip()
      return
    }

    const editHref = await editLinks.first().getAttribute('href')
    await page.goto(editHref!)

    await expect(page.getByRole('heading', { name: 'Edit Lease Agreement' })).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/lease-edit-initial.png` })

    await page
      .getByPlaceholder('Enter any special conditions')
      .fill('Updated special condition — E2E edit test')

    await page.screenshot({ path: `${SCREENSHOTS}/lease-edit-changed.png` })

    await page.getByRole('button', { name: 'Save Changes' }).click()

    await expect(page).toHaveURL(/\/forms\/sale-job02-f01\/[^/]+$/, { timeout: 15000 })

    await page.screenshot({ path: `${SCREENSHOTS}/lease-edit-saved.png` })

    await expect(page.getByText('Updated special condition — E2E edit test')).toBeVisible()
  })
})
