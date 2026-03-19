import { describe, it, expect } from 'vitest'
import {
  PERMISSION_MODULES,
  PERMISSION_ACTIONS,
  ROLE_TEMPLATES,
  LEGACY_KEY_MODULE_MAP,
} from './permissions'

describe('PERMISSION_MODULES', () => {
  it('contains expected modules', () => {
    expect(PERMISSION_MODULES).toContain('customers')
    expect(PERMISSION_MODULES).toContain('invoices')
    expect(PERMISSION_MODULES).toContain('contracts')
    expect(PERMISSION_MODULES).toContain('projects')
    expect(PERMISSION_MODULES).toContain('users')
    expect(PERMISSION_MODULES).toContain('reports')
    expect(PERMISSION_MODULES).toContain('settings')
  })
})

describe('PERMISSION_ACTIONS', () => {
  it('contains expected actions', () => {
    expect(PERMISSION_ACTIONS).toContain('view')
    expect(PERMISSION_ACTIONS).toContain('create')
    expect(PERMISSION_ACTIONS).toContain('edit')
    expect(PERMISSION_ACTIONS).toContain('delete')
    expect(PERMISSION_ACTIONS).toContain('approve')
  })
})

describe('ROLE_TEMPLATES', () => {
  it('has Admin template with all permissions true', () => {
    const admin = ROLE_TEMPLATES.find((t) => t.name === 'Admin')
    expect(admin).toBeDefined()
    for (const module of PERMISSION_MODULES) {
      for (const action of PERMISSION_ACTIONS) {
        expect(admin!.permissions[module]?.[action]).toBe(true)
      }
    }
  })

  it('has Viewer Only template with only view permissions', () => {
    const viewer = ROLE_TEMPLATES.find((t) => t.name === 'Viewer Only')
    expect(viewer).toBeDefined()
    for (const module of PERMISSION_MODULES) {
      expect(viewer!.permissions[module]?.view).toBe(true)
      expect(viewer!.permissions[module]?.create).toBe(false)
      expect(viewer!.permissions[module]?.delete).toBe(false)
    }
  })

  it('has Sales Manager template', () => {
    const salesMgr = ROLE_TEMPLATES.find((t) => t.name === 'Sales Manager')
    expect(salesMgr).toBeDefined()
    expect(salesMgr!.permissions.customers?.view).toBe(true)
    expect(salesMgr!.permissions.customers?.create).toBe(true)
  })

  it('has Finance Officer template with invoices full access', () => {
    const finance = ROLE_TEMPLATES.find((t) => t.name === 'Finance Officer')
    expect(finance).toBeDefined()
    expect(finance!.permissions.invoices?.view).toBe(true)
    expect(finance!.permissions.invoices?.create).toBe(true)
    expect(finance!.permissions.invoices?.approve).toBe(true)
  })

  it('has Sales Staff template', () => {
    const salesStaff = ROLE_TEMPLATES.find((t) => t.name === 'Sales Staff')
    expect(salesStaff).toBeDefined()
    expect(salesStaff!.permissions.quotations?.view).toBe(true)
    expect(salesStaff!.permissions.settings?.view).toBe(false)
  })
})

describe('LEGACY_KEY_MODULE_MAP', () => {
  it('maps manage_finance to invoices', () => {
    expect(LEGACY_KEY_MODULE_MAP['manage_finance']).toContain('invoices')
  })

  it('maps manage_projects to customers and projects', () => {
    expect(LEGACY_KEY_MODULE_MAP['manage_projects']).toContain('customers')
    expect(LEGACY_KEY_MODULE_MAP['manage_projects']).toContain('projects')
  })

  it('maps manage_contracts to contracts', () => {
    expect(LEGACY_KEY_MODULE_MAP['manage_contracts']).toContain('contracts')
  })
})
