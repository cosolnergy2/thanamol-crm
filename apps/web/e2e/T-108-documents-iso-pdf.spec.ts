import { test, expect, type Page } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const ADMIN_EMAIL = 'admin@thanamol.com'
const PASSWORD = 'password123'
const SCREENSHOTS = path.resolve(__dirname, 'screenshots/T-108')

async function login(page: Page) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    await page.goto('/login')
    await page.getByLabel('Email').fill(ADMIN_EMAIL)
    await page.getByLabel('Password').fill(PASSWORD)
    await page.getByRole('button', { name: 'Sign in' }).click()

    const redirected = await page
      .waitForURL('/', { timeout: 10000 })
      .then(() => true)
      .catch(() => false)

    if (redirected) return
    if (attempt < 3) await page.waitForTimeout(1000)
  }

  await expect(page).toHaveURL('/', { timeout: 10000 })
}

test.describe('T-108: Document Center (/documents)', () => {
  test.describe.configure({ mode: 'serial' })

  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('should load the page with heading and no "Not Found"', async ({ page }) => {
    const consoleErrors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text())
    })

    await page.goto('/documents')

    await page.screenshot({ path: `${SCREENSHOTS}/documents-initial.png` })

    await expect(page).toHaveURL('/documents')
    await expect(page.getByText('Not Found')).not.toBeVisible()
    await expect(page.getByRole('heading', { name: /ศูนย์เอกสาร/i })).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/documents-loaded.png` })

    const criticalErrors = consoleErrors.filter(
      (e) => !e.includes('favicon') && !e.includes('chrome-extension'),
    )
    expect(criticalErrors).toHaveLength(0)
  })

  test('should display stats cards', async ({ page }) => {
    await page.goto('/documents')

    await page.screenshot({ path: `${SCREENSHOTS}/documents-stats-before.png` })

    // Four stat cards are rendered in a grid — each contains a label text
    await expect(page.getByText('เอกสารทั้งหมด')).toBeVisible()
    await expect(page.getByText('สัญญา')).toBeVisible()
    await expect(page.getByText('ใบเสนอราคา')).toBeVisible()
    await expect(page.getByText('ใบแจ้งหนี้')).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/documents-stats-visible.png` })
  })

  test('should display filter controls and document list or empty state', async ({ page }) => {
    await page.goto('/documents')

    await page.waitForTimeout(1000)

    await page.screenshot({ path: `${SCREENSHOTS}/documents-filters-before.png` })

    // Search input inside filter card
    await expect(page.getByPlaceholder('ค้นหาชื่อเอกสาร...')).toBeVisible()
    // Search button
    await expect(page.getByRole('button', { name: 'ค้นหา' })).toBeVisible()
    // Section heading for document list
    await expect(page.getByText('รายการเอกสาร')).toBeVisible()

    // Either a table with rows or the empty state is shown
    const hasTable = await page.locator('table').count().then((c) => c > 0)
    const hasEmptyState = await page
      .getByText('ไม่พบเอกสาร')
      .isVisible()
      .catch(() => false)

    expect(hasTable || hasEmptyState).toBe(true)

    await page.screenshot({ path: `${SCREENSHOTS}/documents-filters-visible.png` })
  })

  test('should open the upload/create document dialog', async ({ page }) => {
    await page.goto('/documents')

    await page.screenshot({ path: `${SCREENSHOTS}/documents-dialog-before.png` })

    await page.getByRole('button', { name: 'เพิ่มเอกสาร' }).click()

    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByRole('dialog').getByText('เพิ่มเอกสารใหม่')).toBeVisible()
    // Required fields
    await expect(page.getByRole('dialog').getByPlaceholder('ระบุชื่อเอกสาร')).toBeVisible()
    await expect(page.getByRole('dialog').getByPlaceholder('https://...')).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/documents-dialog-open.png` })
  })
})

test.describe('T-108: ISO Document Control (/documents/iso)', () => {
  test.describe.configure({ mode: 'serial' })
  test.setTimeout(60000)

  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('should load the page with heading and no "Not Found"', async ({ page }) => {
    const consoleErrors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text())
    })

    await page.goto('/documents/iso')

    await page.screenshot({ path: `${SCREENSHOTS}/iso-initial.png` })

    await expect(page).toHaveURL('/documents/iso')
    await expect(page.getByText('Not Found')).not.toBeVisible()
    await expect(page.getByRole('heading', { name: /ISO Document Control/i })).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/iso-loaded.png` })

    const criticalErrors = consoleErrors.filter(
      (e) => !e.includes('favicon') && !e.includes('chrome-extension'),
    )
    expect(criticalErrors).toHaveLength(0)
  })

  test('should display status cards (Total, Draft, Active, Archived)', async ({ page }) => {
    await page.goto('/documents/iso')

    await page.screenshot({ path: `${SCREENSHOTS}/iso-stats-before.png` })

    await expect(page.getByText('เอกสารทั้งหมด')).toBeVisible()
    await expect(page.getByText('Draft')).toBeVisible()
    await expect(page.getByText('Active')).toBeVisible()
    await expect(page.getByText('Archived')).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/iso-stats-visible.png` })
  })

  test('should display document list or empty state', async ({ page }) => {
    await page.goto('/documents/iso')

    await page.waitForTimeout(1000)

    await page.screenshot({ path: `${SCREENSHOTS}/iso-list-before.png` })

    await expect(page.getByText('รายการเอกสาร ISO')).toBeVisible()

    const hasDocuments = await page.locator('.border.border-slate-100.rounded-lg').count().then((c) => c > 0)
    const hasEmptyState = await page
      .getByText('ไม่พบเอกสาร ISO')
      .isVisible()
      .catch(() => false)

    expect(hasDocuments || hasEmptyState).toBe(true)

    await page.screenshot({ path: `${SCREENSHOTS}/iso-list-visible.png` })
  })

  test('should open the create dialog with document number, title, category and revision fields', async ({ page }) => {
    await page.goto('/documents/iso')

    await page.screenshot({ path: `${SCREENSHOTS}/iso-dialog-before.png` })

    await page.getByRole('button', { name: 'ลงทะเบียนเอกสาร' }).click()

    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByRole('dialog').getByText('เพิ่มเอกสาร ISO ใหม่')).toBeVisible()
    // Document number (DCN)
    await expect(
      page.getByRole('dialog').getByPlaceholder(/DCN-XXX/i),
    ).toBeVisible()
    // Title field
    await expect(page.getByRole('dialog').getByPlaceholder('ระบุชื่อเอกสาร')).toBeVisible()
    // Revision field
    await expect(page.getByRole('dialog').getByPlaceholder(/เช่น 00/i)).toBeVisible()
    // Category select is visible (Label text present)
    await expect(page.getByRole('dialog').getByText('ประเภทเอกสาร')).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/iso-dialog-open.png` })
  })
})

test.describe('T-108: PDF Template Settings (/settings/pdf-template)', () => {
  test.describe.configure({ mode: 'serial' })

  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('should load the page with heading and no "Not Found"', async ({ page }) => {
    const consoleErrors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text())
    })

    await page.goto('/settings/pdf-template')

    await page.screenshot({ path: `${SCREENSHOTS}/pdf-template-initial.png` })

    await expect(page).toHaveURL('/settings/pdf-template')
    await expect(page.getByText('Not Found')).not.toBeVisible()
    await expect(page.getByRole('heading', { name: /ตั้งค่าเทมเพลต PDF/i })).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/pdf-template-loaded.png` })

    const criticalErrors = consoleErrors.filter(
      (e) => !e.includes('favicon') && !e.includes('chrome-extension'),
    )
    expect(criticalErrors).toHaveLength(0)
  })

  test('should display template list or empty state', async ({ page }) => {
    await page.goto('/settings/pdf-template')

    await page.waitForTimeout(1000)

    await page.screenshot({ path: `${SCREENSHOTS}/pdf-template-list-before.png` })

    await expect(page.getByText('เทมเพลต PDF ทั้งหมด')).toBeVisible()

    const hasTemplates = await page.locator('.border.border-slate-100.rounded-lg').count().then((c) => c > 0)
    const hasEmptyState = await page
      .getByText('ยังไม่มีเทมเพลต PDF')
      .isVisible()
      .catch(() => false)

    expect(hasTemplates || hasEmptyState).toBe(true)

    await page.screenshot({ path: `${SCREENSHOTS}/pdf-template-list-visible.png` })
  })

  test('should open create dialog with name, type, header and footer fields', async ({ page }) => {
    await page.goto('/settings/pdf-template')

    await page.screenshot({ path: `${SCREENSHOTS}/pdf-template-dialog-before.png` })

    await page.getByRole('button', { name: 'สร้างเทมเพลต', exact: true }).click()

    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByRole('dialog').getByText('สร้างเทมเพลต PDF ใหม่')).toBeVisible()
    // Name field
    await expect(
      page.getByRole('dialog').getByPlaceholder(/Standard Quotation Template/i),
    ).toBeVisible()
    // Type select label
    await expect(page.getByRole('dialog').getByText('ประเภทเอกสาร *')).toBeVisible()
    // Header JSON field
    await expect(page.getByRole('dialog').getByText('Header JSON (ตัวเลือก)')).toBeVisible()
    // Footer JSON field
    await expect(page.getByRole('dialog').getByText('Footer JSON (ตัวเลือก)')).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS}/pdf-template-dialog-open.png` })
  })
})
