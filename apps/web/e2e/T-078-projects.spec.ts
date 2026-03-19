import { test, expect, type Page } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const ADMIN_EMAIL = 'admin@thanamol.com'
const PASSWORD = 'password123'
const SCREENSHOTS = path.resolve(__dirname, 'screenshots/T-078')

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

test.describe('T-078: Projects E2E', () => {
  test.describe.configure({ mode: 'serial' })

  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('should load projects list page with heading and controls', async ({ page }) => {
    await page.goto('/projects')

    await expect(page.getByRole('heading', { name: 'Projects' })).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/projects-list-initial.png` })

    await expect(page.getByPlaceholder('Search by name or code...')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Add Project' })).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/projects-list-loaded.png` })
  })

  test('should show project cards in the grid', async ({ page }) => {
    await page.goto('/projects')

    await expect(page.getByRole('heading', { name: 'Projects' })).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/projects-cards-before.png` })

    // Either project cards are visible, or the empty state is shown — neither is a "Not Found" page
    const projectCards = page.locator('[class*="hover:shadow-md"]')
    const emptyState = page.getByText('No projects found')
    const addFirstProject = page.getByText('Add your first project to get started')

    const hasCards = await projectCards.count().then((n) => n > 0)
    const hasEmpty = await emptyState.isVisible().catch(() => false)

    expect(hasCards || hasEmpty).toBeTruthy()

    if (hasCards) {
      // When projects exist, each card should have a "View Details" button
      await expect(projectCards.first().getByRole('button', { name: 'View Details' })).toBeVisible()
    }

    await page.screenshot({ path: `${SCREENSHOTS}/projects-cards-loaded.png` })
  })

  test('should navigate into a project detail page', async ({ page }) => {
    await page.goto('/projects')

    await expect(page.getByRole('heading', { name: 'Projects' })).toBeVisible()

    const viewDetailsButtons = page.getByRole('button', { name: 'View Details' })
    const count = await viewDetailsButtons.count()

    if (count === 0) {
      // No projects exist — skip navigation but verify the page itself is not broken
      await expect(page.getByText('No projects found')).toBeVisible()
      await page.screenshot({ path: `${SCREENSHOTS}/projects-detail-skipped-empty.png` })
      return
    }

    await page.screenshot({ path: `${SCREENSHOTS}/projects-detail-before-click.png` })

    await viewDetailsButtons.first().click()

    await page.waitForURL(/\/projects\/.+/, { timeout: 10000 })

    // Should not be a "Not Found" page
    await expect(page.getByText('404')).not.toBeVisible()
    await expect(page.getByText('Not Found')).not.toBeVisible()

    // Project detail header elements
    await expect(page.getByRole('button', { name: 'Edit Project' })).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/projects-detail-loaded.png` })
  })

  test('should show project detail tabs: Overview, Units, Contracts', async ({ page }) => {
    await page.goto('/projects')

    await expect(page.getByRole('heading', { name: 'Projects' })).toBeVisible()

    const viewDetailsButtons = page.getByRole('button', { name: 'View Details' })
    const count = await viewDetailsButtons.count()

    if (count === 0) {
      await page.screenshot({ path: `${SCREENSHOTS}/projects-tabs-skipped-empty.png` })
      return
    }

    await viewDetailsButtons.first().click()
    await page.waitForURL(/\/projects\/.+/, { timeout: 10000 })

    await page.screenshot({ path: `${SCREENSHOTS}/projects-tabs-initial.png` })

    const tabList = page.getByRole('tablist')
    await expect(tabList).toBeVisible()
    await expect(tabList.getByRole('tab', { name: 'Overview' })).toBeVisible()
    await expect(tabList.getByRole('tab', { name: 'Units' })).toBeVisible()
    await expect(tabList.getByRole('tab', { name: 'Contracts' })).toBeVisible()

    // Overview tab is active by default — Project Information card should be visible
    await expect(page.getByText('Project Information')).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/projects-tabs-overview.png` })

    // Click Units tab
    await tabList.getByRole('tab', { name: 'Units' }).click()
    // The Units tab content shows either a units table or an empty state
    const unitsPanel = page.getByRole('tabpanel', { name: 'Units' })
    await expect(unitsPanel).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/projects-tabs-units.png` })

    // Click Contracts tab
    await tabList.getByRole('tab', { name: 'Contracts' }).click()
    await expect(page.getByText('Contract management is available in the Contracts section')).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/projects-tabs-contracts.png` })
  })

  test('should load project dashboard page', async ({ page }) => {
    await page.goto('/projects/dashboard')

    await expect(page.getByRole('heading', { name: 'Project Dashboard' })).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/projects-dashboard-initial.png` })

    // Portfolio stat cards should be visible
    await expect(page.getByText('Total Projects')).toBeVisible()
    await expect(page.getByText('Active Projects')).toBeVisible()
    await expect(page.getByText('Total Units')).toBeVisible()

    // Charts section
    await expect(page.getByText('Projects by Type')).toBeVisible()
    await expect(page.getByText('Project Unit Analysis')).toBeVisible()

    // Recent Projects section
    await expect(page.getByText('Recent Projects')).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/projects-dashboard-loaded.png` })
  })

  test('should load customer overview page', async ({ page }) => {
    await page.goto('/projects/customer-overview')

    await expect(page.getByRole('heading', { name: 'Customer Overview' })).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/customer-overview-initial.png` })

    // Summary stat cards — use the paragraph labels inside stat cards
    const statCards = page.locator('div.grid.grid-cols-2').first()
    await expect(statCards).toBeVisible()

    // Table section heading
    await expect(page.getByText('Projects & Unit Overview')).toBeVisible()

    // Search input
    await expect(page.getByPlaceholder('Search project...')).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/customer-overview-loaded.png` })
  })

  test('should not show Not Found on any projects route', async ({ page }) => {
    const routes = ['/projects', '/projects/dashboard', '/projects/customer-overview']

    for (const route of routes) {
      await page.goto(route)
      await expect(page.getByText('404')).not.toBeVisible()
      await expect(page.getByText('Not Found')).not.toBeVisible()
    }

    await page.screenshot({ path: `${SCREENSHOTS}/projects-no-404.png` })
  })
})
