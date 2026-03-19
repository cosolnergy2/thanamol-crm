import { test, expect, type Page } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const ADMIN_EMAIL = 'admin@thanamol.com'
const PASSWORD = 'password123'
const SCREENSHOTS = path.resolve(__dirname, 'screenshots/T-094')

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

test.describe('T-094: Tasks', () => {
  test.describe.configure({ mode: 'serial' })

  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('should load the task list page without errors', async ({ page }) => {
    await page.goto('/tasks')

    await page.screenshot({ path: `${SCREENSHOTS}/task-list-initial.png` })

    await expect(page.getByRole('heading', { name: 'Tasks' })).toBeVisible()
    await expect(page.getByText('Not Found')).not.toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/task-list-loaded.png` })
  })

  test('should display task stat cards on the list page', async ({ page }) => {
    await page.goto('/tasks')

    await expect(page.getByRole('heading', { name: 'Tasks' })).toBeVisible()

    await expect(page.getByText('To Do').first()).toBeVisible()
    await expect(page.getByText('In Progress').first()).toBeVisible()
    await expect(page.getByText('Review').first()).toBeVisible()
    await expect(page.getByText('Done').first()).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/task-list-stat-cards.png` })
  })

  test('should display search and filter controls on the task list', async ({ page }) => {
    await page.goto('/tasks')

    await expect(page.getByRole('heading', { name: 'Tasks' })).toBeVisible()

    await expect(page.getByPlaceholder('Search by title...')).toBeVisible()
    await expect(page.getByRole('button', { name: 'New Task' })).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/task-list-controls.png` })
  })

  test('should show task list or empty state', async ({ page }) => {
    await page.goto('/tasks')

    await expect(page.getByRole('heading', { name: 'Tasks' })).toBeVisible()

    await page.waitForTimeout(1500)

    const hasTaskCards = await page.locator('[class*="hover:shadow"]').count().then((c) => c > 0)
    const hasEmptyState = await page
      .getByText('No tasks found')
      .isVisible()
      .catch(() => false)

    expect(hasTaskCards || hasEmptyState).toBe(true)

    await page.screenshot({ path: `${SCREENSHOTS}/task-list-data.png` })
  })

  test('should load the create task form without errors', async ({ page }) => {
    await page.goto('/tasks/create')

    await page.screenshot({ path: `${SCREENSHOTS}/task-create-initial.png` })

    await expect(page.getByRole('heading', { name: 'Create Task' })).toBeVisible()
    await expect(page.getByText('Not Found')).not.toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/task-create-loaded.png` })
  })

  test('should display all required fields on the create task form', async ({ page }) => {
    await page.goto('/tasks/create')

    await expect(page.getByRole('heading', { name: 'Create Task' })).toBeVisible()

    await expect(page.getByLabel('Title')).toBeVisible()
    await expect(page.getByLabel('Description')).toBeVisible()
    await expect(page.getByLabel('Due Date')).toBeVisible()
    await expect(page.getByText('Task Details')).toBeVisible()
    await expect(page.getByText('Assignment & Project')).toBeVisible()

    await expect(page.getByRole('button', { name: 'Create Task' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Cancel' })).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/task-create-form-fields.png` })
  })

  test('should navigate from create form back to task list via Cancel', async ({ page }) => {
    await page.goto('/tasks/create')

    await expect(page.getByRole('heading', { name: 'Create Task' })).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/task-create-before-cancel.png` })

    await page.getByRole('button', { name: 'Cancel' }).click()

    await expect(page).toHaveURL('/tasks')
    await expect(page.getByRole('heading', { name: 'Tasks' })).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/task-create-after-cancel.png` })
  })

  test('should navigate to task detail from the New Task button path', async ({ page }) => {
    await page.goto('/tasks')

    await expect(page.getByRole('heading', { name: 'Tasks' })).toBeVisible()

    await page.getByRole('button', { name: 'New Task' }).click()

    await expect(page).toHaveURL('/tasks/create')
    await expect(page.getByRole('heading', { name: 'Create Task' })).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/task-list-to-create-navigation.png` })
  })

  test('should load the task detail page for an existing task', async ({ page }) => {
    // Get auth token from localStorage after login
    const accessToken = await page.evaluate(() => localStorage.getItem('accessToken'))

    // Create a task via API to get a valid ID
    const createResponse = await page.request.post('http://localhost:3000/api/tasks', {
      data: { title: 'E2E Test Task T-094', priority: 'MEDIUM', status: 'TODO' },
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    const { task } = await createResponse.json()

    await page.goto(`/tasks/${task.id}`)

    await page.screenshot({ path: `${SCREENSHOTS}/task-detail-initial.png` })

    await expect(page.getByRole('heading', { name: 'E2E Test Task T-094' })).toBeVisible({ timeout: 10000 })
    await expect(page.getByText('Not Found')).not.toBeVisible()
    await expect(page.getByRole('button', { name: 'Edit' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Delete' })).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/task-detail-loaded.png` })
  })

  test('should display task detail sections', async ({ page }) => {
    // Get auth token from localStorage after login
    const accessToken = await page.evaluate(() => localStorage.getItem('accessToken'))

    const createResponse = await page.request.post('http://localhost:3000/api/tasks', {
      data: { title: 'E2E Detail Sections Task T-094', priority: 'LOW', status: 'TODO' },
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    const { task } = await createResponse.json()

    await page.goto(`/tasks/${task.id}`)
    await expect(page.getByRole('heading', { name: 'E2E Detail Sections Task T-094' })).toBeVisible({ timeout: 10000 })

    await expect(page.getByText('Details').first()).toBeVisible()
    await expect(page.getByText('Status').first()).toBeVisible()
    await expect(page.getByText('Priority').first()).toBeVisible()

    const commentsSection = page.getByText(/Comments/)
    await expect(commentsSection).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/task-detail-sections.png` })
  })

  test('should load the task edit page without errors', async ({ page }) => {
    // Get auth token from localStorage after login
    const accessToken = await page.evaluate(() => localStorage.getItem('accessToken'))

    const createResponse = await page.request.post('http://localhost:3000/api/tasks', {
      data: { title: 'E2E Edit Task T-094', priority: 'HIGH', status: 'TODO' },
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    const { task } = await createResponse.json()

    await page.goto(`/tasks/${task.id}`)
    await expect(page.getByRole('heading', { name: 'E2E Edit Task T-094' })).toBeVisible({ timeout: 10000 })

    await page.getByRole('button', { name: 'Edit' }).click()

    await page.screenshot({ path: `${SCREENSHOTS}/task-edit-initial.png` })

    await expect(page.getByText('Not Found')).not.toBeVisible()
    await expect(page.getByLabel('Title')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Save Changes' })).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/task-edit-loaded.png` })
  })
})
