import { expect, type Page } from '@playwright/test'

const ADMIN_EMAIL = 'admin@thanamol.com'
const PASSWORD = 'password123'

export async function login(page: Page) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')
    await page.getByLabel('Email').fill(ADMIN_EMAIL)
    await page.getByLabel('Password').fill(PASSWORD)
    await page.getByRole('button', { name: 'Sign in' }).click()

    const redirected = await page
      .waitForURL('/', { timeout: 15000 })
      .then(() => true)
      .catch(() => false)

    if (redirected) return
    if (attempt < 3) await page.waitForTimeout(1000)
  }

  await expect(page).toHaveURL('/', { timeout: 10000 })
}

export async function assertNoErrorBoundary(page: Page) {
  await expect(page.getByText('Something went wrong')).not.toBeVisible({ timeout: 3000 })
}

export const FMS_ROUTES = [
  '/facility-management',
  '/facility-management/assets',
  '/facility-management/assets/create',
  '/facility-management/assets/categories',
  '/facility-management/work-orders',
  '/facility-management/work-orders/create',
  '/facility-management/preventive-maintenance',
  '/facility-management/preventive-maintenance/create',
  '/facility-management/inventory',
  '/facility-management/inventory/create',
  '/facility-management/inventory/categories',
  '/facility-management/inventory/grn',
  '/facility-management/inventory/grn/create',
  '/facility-management/inventory/stock-issues',
  '/facility-management/inventory/stock-issues/create',
  '/facility-management/procurement',
  '/facility-management/procurement/requests/create',
  '/facility-management/procurement/quotations',
  '/facility-management/procurement/quotations/create',
  '/facility-management/procurement/orders',
  '/facility-management/procurement/orders/create',
  '/facility-management/vendors',
  '/facility-management/vendors/create',
  '/facility-management/vendors/contracts',
  '/facility-management/vendors/invoices',
  '/facility-management/budget',
  '/facility-management/budget/create',
  '/facility-management/budget/templates',
  '/facility-management/compliance/incidents',
  '/facility-management/compliance/incidents/create',
  '/facility-management/compliance/permits',
  '/facility-management/compliance/permits/create',
  '/facility-management/compliance/contractors',
  '/facility-management/compliance/fire-equipment',
  '/facility-management/compliance/insurance',
  '/facility-management/zones',
  '/facility-management/zones/create',
  '/facility-management/parking',
  '/facility-management/security',
  '/facility-management/services',
  '/facility-management/keys',
  '/facility-management/visitors',
  '/facility-management/visitors/create',
  '/facility-management/cleaning',
  '/facility-management/calibrations',
  '/facility-management/petty-cash',
  '/facility-management/petty-cash/funds/create',
  '/facility-management/petty-cash/transactions/create',
  '/facility-management/reports',
  '/facility-management/reports/asset-status',
  '/facility-management/reports/maintenance-cost',
  '/facility-management/reports/budget-variance',
  '/facility-management/reports/compliance-status',
] as const

export const FMS_API_ENDPOINTS = [
  '/api/fms/assets',
  '/api/fms/asset-categories',
  '/api/fms/work-orders',
  '/api/fms/preventive-maintenance',
  '/api/fms/inventory',
  '/api/fms/inventory-categories',
  '/api/fms/grn',
  '/api/fms/stock-issues',
  '/api/fms/purchase-requests',
  '/api/fms/purchase-orders',
  '/api/fms/vendor-quotations',
  '/api/fms/vendors',
  '/api/fms/vendor-contracts',
  '/api/fms/vendor-invoices',
  '/api/fms/budgets',
  '/api/fms/budget-templates',
  '/api/fms/stock-movements',
  '/api/fms/incidents',
  '/api/fms/permits-to-work',
  '/api/fms/contractor-safety',
  '/api/fms/fire-equipment',
  '/api/fms/insurance-policies',
  '/api/fms/zones',
  '/api/fms/parking-slots',
  '/api/fms/security-patrols',
  '/api/fms/service-logs',
  '/api/fms/key-records',
  '/api/fms/visitors',
  '/api/fms/cleaning-checklists',
  '/api/fms/calibrations',
  '/api/fms/petty-cash/funds',
  '/api/fms/dashboard/summary',
  '/api/fms/reports/asset-status',
] as const
