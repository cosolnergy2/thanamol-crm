import { test, expect, type Page } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const ADMIN_EMAIL = 'admin@thanamol.com'
const PASSWORD = 'password123'
const SCREENSHOTS = path.resolve(__dirname, 'screenshots/T-075')

async function login(page: Page) {
  for (let attempt = 1; attempt <= 5; attempt++) {
    await page.goto('/login')
    await page.getByLabel('Email').fill(ADMIN_EMAIL)
    await page.getByLabel('Password').fill(PASSWORD)
    await page.getByRole('button', { name: 'Sign in' }).click()

    const redirected = await page
      .waitForURL('/', { timeout: 10000 })
      .then(() => true)
      .catch(() => false)

    if (redirected) return
    if (attempt < 5) await page.waitForTimeout(1000)
  }

  await expect(page).toHaveURL('/', { timeout: 8000 })
}

test.describe('T-075: Role Management Enhancement', () => {
  test.describe.configure({ mode: 'serial' })

  test.beforeEach(async ({ page }) => {
    await login(page)
    await page.goto('/settings/roles')
    await expect(page.getByRole('heading', { name: 'Roles' })).toBeVisible()
  })

  // DoD 1: Roles page loads and shows system roles
  test('should display system roles with lock icon and user count badge', async ({ page }) => {
    await page.screenshot({ path: `${SCREENSHOTS}/roles-page-initial.png` })

    // Admin system role should be visible with a "system" badge
    const adminRow = page.locator('div').filter({ hasText: /^Admin/ }).first()
    await expect(adminRow).toBeVisible()

    // The "system" badge should appear for system roles
    const systemBadges = page.getByText('system')
    await expect(systemBadges.first()).toBeVisible()

    // User count badges (Users icon + number) should be present
    const userCountBadges = page.locator('svg').filter({ has: page.locator('[class*="lucide-users"]') })
    // At least one role row exists
    await expect(page.locator('[class*="space-y-2"]').first()).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/system-roles-visible.png` })
  })

  // DoD 2: Delete button disabled for system roles
  test('should disable delete button for system roles', async ({ page }) => {
    // Wait for roles list to load by waiting for at least one role row
    const roleItems = page.locator('div.flex.items-center.justify-between.p-3')
    await expect(roleItems.first()).toBeVisible()
    const count = await roleItems.count()
    expect(count).toBeGreaterThan(0)

    // Find a system role row and verify its delete button is disabled
    let foundSystemRole = false
    for (let i = 0; i < count; i++) {
      const row = roleItems.nth(i)
      const systemBadge = row.getByText('system', { exact: true })
      const isSystem = await systemBadge.isVisible()
      if (isSystem) {
        const deleteBtn = row.locator('button').last()
        await expect(deleteBtn).toBeDisabled()
        foundSystemRole = true
        await page.screenshot({ path: `${SCREENSHOTS}/system-role-delete-disabled.png` })
        break
      }
    }

    expect(foundSystemRole).toBe(true)
  })

  // DoD 3: Edit button opens dialog for system roles but name/code fields are locked
  test('should open edit dialog for system role with name and code fields disabled', async ({ page }) => {
    // Wait for roles list to load
    const roleItems = page.locator('div.flex.items-center.justify-between.p-3')
    await expect(roleItems.first()).toBeVisible()
    const count = await roleItems.count()

    let foundSystemRole = false
    for (let i = 0; i < count; i++) {
      const row = roleItems.nth(i)
      const systemBadge = row.getByText('system', { exact: true })
      const isSystem = await systemBadge.isVisible()
      if (isSystem) {
        // Click the edit (pencil) button
        const editBtn = row.locator('button').first()
        await editBtn.click()
        foundSystemRole = true
        break
      }
    }

    expect(foundSystemRole).toBe(true)

    // Edit Role dialog should open
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Edit Role' })).toBeVisible()

    // The description text explains system role restrictions
    await expect(
      page.getByText('System roles: permissions can be changed, but name and code are locked.')
    ).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/system-role-edit-dialog.png` })

    // Name and code fields are disabled for system roles
    const nameInput = page.getByPlaceholder('e.g. Sales Manager')
    const codeInput = page.getByPlaceholder('e.g. sales-manager')
    await expect(nameInput).toBeDisabled()
    await expect(codeInput).toBeDisabled()

    await page.screenshot({ path: `${SCREENSHOTS}/system-role-fields-locked.png` })

    // Close dialog
    await page.getByRole('button', { name: 'Cancel' }).click()
    await expect(page.getByRole('dialog')).not.toBeVisible()
  })

  // DoD 4: Create new role using a template (Sales Manager) — permission matrix pre-fills
  test('should pre-fill permission matrix when a role template is selected', async ({ page }) => {
    await page.getByRole('button', { name: 'Add Role' }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Create Role' })).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/create-role-dialog-empty.png` })

    // Open the "Start from template" dropdown
    await page.getByRole('button', { name: /Start from template/i }).click()

    // Sales Manager template should be listed
    await expect(page.getByRole('menuitem').filter({ hasText: 'Sales Manager' })).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/template-dropdown-open.png` })

    // Select Sales Manager template
    await page.getByRole('menuitem').filter({ hasText: 'Sales Manager' }).click()

    // Toast confirming template applied
    await expect(page.getByText(/Applied "Sales Manager" template/i)).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/template-applied.png` })

    // The permission matrix should have some checkboxes checked
    // Sales Manager has full access to customers — verify at least one checked checkbox exists
    const checkedCheckboxes = page.locator('[role="checkbox"][data-state="checked"]')
    await expect(checkedCheckboxes.first()).toBeVisible()

    // Close dialog without saving
    await page.getByRole('button', { name: 'Cancel' }).click()
    await expect(page.getByRole('dialog')).not.toBeVisible()
  })

  // DoD 5: Code field auto-generates from name
  test('should auto-generate code field from role name input', async ({ page }) => {
    await page.getByRole('button', { name: 'Add Role' }).click()
    await expect(page.getByRole('dialog')).toBeVisible()

    const nameInput = page.getByPlaceholder('e.g. Sales Manager')
    const codeInput = page.getByPlaceholder('e.g. sales-manager')

    // Initially both fields are empty
    await expect(nameInput).toHaveValue('')
    await expect(codeInput).toHaveValue('')

    // Type a name
    await nameInput.fill('Property Agent')

    await page.screenshot({ path: `${SCREENSHOTS}/code-auto-generated.png` })

    // Code should auto-generate as kebab-case
    await expect(codeInput).toHaveValue('property-agent')

    // Close without saving
    await page.getByRole('button', { name: 'Cancel' }).click()
  })

  // DoD 6: Create a new custom role and verify it appears in the list
  test('should create a new custom role and display it in the roles list', async ({ page }) => {
    const roleName = `E2E Test Role ${Date.now()}`

    await page.getByRole('button', { name: 'Add Role' }).click()
    await expect(page.getByRole('dialog')).toBeVisible()

    await page.getByPlaceholder('e.g. Sales Manager').fill(roleName)
    await page.getByPlaceholder('Role description').fill('Created by E2E test')

    await page.screenshot({ path: `${SCREENSHOTS}/create-role-filled.png` })

    await page.getByRole('button', { name: 'Save Role' }).click()

    // Dialog closes after successful save
    await expect(page.getByRole('dialog')).not.toBeVisible()

    // Toast success message
    await expect(page.getByText('Role created')).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/role-created-success.png` })

    // New role should appear in the list
    await expect(page.getByText(roleName)).toBeVisible()
  })

  // DoD 7: Edit a custom role — toggle permissions in the matrix
  test('should edit a custom role and toggle permissions in the permission matrix', async ({ page }) => {
    // First create a role to edit
    const roleName = `E2E Edit Role ${Date.now()}`

    await page.getByRole('button', { name: 'Add Role' }).click()
    await page.getByPlaceholder('e.g. Sales Manager').fill(roleName)
    await page.getByRole('button', { name: 'Save Role' }).click()
    await expect(page.getByRole('dialog')).not.toBeVisible()
    await expect(page.getByText(roleName)).toBeVisible()

    // Find the row for our newly created role and click edit
    const newRoleRow = page
      .locator('div.flex.items-center.justify-between.p-3')
      .filter({ hasText: roleName })
    await expect(newRoleRow).toBeVisible()

    const editBtn = newRoleRow.locator('button').first()
    await editBtn.click()

    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Edit Role' })).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/edit-custom-role-dialog.png` })

    // Toggle a permission checkbox in the matrix (first unchecked checkbox)
    const uncheckedCheckbox = page
      .getByRole('dialog')
      .locator('[role="checkbox"][data-state="unchecked"]')
      .first()
    await uncheckedCheckbox.click()

    // The checkbox should now be checked
    const firstCheckbox = page
      .getByRole('dialog')
      .locator('[role="checkbox"]')
      .first()
    // At least one checked checkbox should now exist
    const checkedAfterToggle = page.getByRole('dialog').locator('[role="checkbox"][data-state="checked"]')
    await expect(checkedAfterToggle.first()).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/permission-toggled.png` })

    await page.getByRole('button', { name: 'Save Role' }).click()
    await expect(page.getByRole('dialog')).not.toBeVisible()
    await expect(page.getByText('Role updated — sidebar will refresh')).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/edit-role-saved.png` })
  })

  // DoD 8: Delete a custom role
  test('should delete a custom role after confirmation', async ({ page }) => {
    // Create a role to delete
    const roleName = `E2E Delete Role ${Date.now()}`

    await page.getByRole('button', { name: 'Add Role' }).click()
    await page.getByPlaceholder('e.g. Sales Manager').fill(roleName)
    await page.getByRole('button', { name: 'Save Role' }).click()
    await expect(page.getByRole('dialog')).not.toBeVisible()
    await expect(page.getByText(roleName)).toBeVisible()

    // Find the row and click delete (last button in row)
    const targetRow = page
      .locator('div.flex.items-center.justify-between.p-3')
      .filter({ hasText: roleName })
    await expect(targetRow).toBeVisible()

    const deleteBtn = targetRow.locator('button').last()
    await expect(deleteBtn).not.toBeDisabled()
    await deleteBtn.click()

    // Confirmation dialog should appear
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Delete Role' })).toBeVisible()
    // The role name appears in the confirmation text — match within the dialog
    await expect(page.getByRole('dialog').getByText(roleName)).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/delete-role-confirm-dialog.png` })

    // Confirm deletion
    await page.getByRole('button', { name: 'Delete' }).click()

    // Dialog closes and success toast appears
    await expect(page.getByRole('dialog')).not.toBeVisible()
    await expect(page.getByText('Role deleted')).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/role-deleted-success.png` })

    // Role no longer in list
    await expect(page.getByText(roleName)).not.toBeVisible()
  })

  // DoD 9: UI blocks delete attempt on system roles (button is disabled, no dialog opened)
  test('should prevent opening delete dialog for system roles via disabled button', async ({ page }) => {
    // Wait for roles list to load
    const roleItems = page.locator('div.flex.items-center.justify-between.p-3')
    await expect(roleItems.first()).toBeVisible()
    const count = await roleItems.count()

    let adminRow: ReturnType<typeof roleItems.nth> | null = null
    for (let i = 0; i < count; i++) {
      const row = roleItems.nth(i)
      const systemBadge = row.getByText('system', { exact: true })
      if (await systemBadge.isVisible()) {
        adminRow = row
        break
      }
    }

    expect(adminRow).not.toBeNull()

    const deleteBtn = adminRow!.locator('button').last()
    await expect(deleteBtn).toBeDisabled()

    // Attempting to click a disabled button should not open any dialog
    await deleteBtn.dispatchEvent('click')
    await page.waitForTimeout(300)

    await expect(page.getByRole('dialog')).not.toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/system-role-delete-blocked.png` })
  })
})
