export const PERMISSION_MODULES = [
  'customers',
  'deals',
  'quotations',
  'contracts',
  'invoices',
  'tasks',
  'users',
  'reports',
  'settings',
  'projects',
] as const

export type PermissionModule = (typeof PERMISSION_MODULES)[number]

export const PERMISSION_ACTIONS = ['view', 'create', 'edit', 'delete', 'approve'] as const

export type PermissionAction = (typeof PERMISSION_ACTIONS)[number]

export type ModulePermissions = Partial<Record<PermissionAction, boolean>>

export type GranularPermissions = Partial<Record<PermissionModule, ModulePermissions>>

export type RoleTemplate = {
  name: string
  description: string
  permissions: GranularPermissions
}

const ALL_ACTIONS: ModulePermissions = {
  view: true,
  create: true,
  edit: true,
  delete: true,
  approve: true,
}

const VIEW_ONLY_ACTIONS: ModulePermissions = {
  view: true,
  create: false,
  edit: false,
  delete: false,
  approve: false,
}

const EDIT_ACTIONS: ModulePermissions = {
  view: true,
  create: true,
  edit: true,
  delete: false,
  approve: false,
}

export const ROLE_TEMPLATES: RoleTemplate[] = [
  {
    name: 'Admin',
    description: 'Full permissions across all modules',
    permissions: Object.fromEntries(
      PERMISSION_MODULES.map((m) => [m, { ...ALL_ACTIONS }])
    ) as GranularPermissions,
  },
  {
    name: 'Sales Manager',
    description: 'Manage sales pipeline, customers, deals, and quotations',
    permissions: {
      customers: { ...ALL_ACTIONS },
      deals: { ...ALL_ACTIONS },
      quotations: { ...ALL_ACTIONS },
      contracts: { view: true, create: true, edit: true, delete: false, approve: true },
      invoices: { view: true, create: false, edit: false, delete: false, approve: false },
      tasks: { ...ALL_ACTIONS },
      reports: { view: true, create: false, edit: false, delete: false, approve: false },
      projects: { view: true, create: false, edit: false, delete: false, approve: false },
      users: { view: true, create: false, edit: false, delete: false, approve: false },
      settings: { view: false, create: false, edit: false, delete: false, approve: false },
    },
  },
  {
    name: 'Sales Staff',
    description: 'Create and manage leads, deals, and quotations',
    permissions: {
      customers: { ...EDIT_ACTIONS },
      deals: { ...EDIT_ACTIONS },
      quotations: { view: true, create: true, edit: true, delete: false, approve: false },
      contracts: { view: true, create: false, edit: false, delete: false, approve: false },
      invoices: { view: true, create: false, edit: false, delete: false, approve: false },
      tasks: { ...EDIT_ACTIONS },
      reports: { view: true, create: false, edit: false, delete: false, approve: false },
      projects: { view: true, create: false, edit: false, delete: false, approve: false },
      users: { view: false, create: false, edit: false, delete: false, approve: false },
      settings: { view: false, create: false, edit: false, delete: false, approve: false },
    },
  },
  {
    name: 'Finance Officer',
    description: 'Manage invoices, payments, and contracts',
    permissions: {
      customers: { view: true, create: false, edit: false, delete: false, approve: false },
      deals: { view: true, create: false, edit: false, delete: false, approve: false },
      quotations: { view: true, create: false, edit: false, delete: false, approve: false },
      contracts: { ...ALL_ACTIONS },
      invoices: { ...ALL_ACTIONS },
      tasks: { view: true, create: false, edit: false, delete: false, approve: false },
      reports: { view: true, create: false, edit: false, delete: false, approve: false },
      projects: { view: true, create: false, edit: false, delete: false, approve: false },
      users: { view: false, create: false, edit: false, delete: false, approve: false },
      settings: { view: false, create: false, edit: false, delete: false, approve: false },
    },
  },
  {
    name: 'Viewer Only',
    description: 'Read-only access to all modules',
    permissions: Object.fromEntries(
      PERMISSION_MODULES.map((m) => [m, { ...VIEW_ONLY_ACTIONS }])
    ) as GranularPermissions,
  },
]

export const LEGACY_KEY_MODULE_MAP: Record<string, PermissionModule[]> = {
  manage_projects: ['customers', 'projects', 'deals'],
  manage_contracts: ['contracts', 'quotations'],
  manage_finance: ['invoices'],
  manage_documents: ['tasks'],
  manage_users: ['users'],
  manage_roles: ['settings'],
  manage_settings: ['settings'],
  view_reports: ['reports'],
}
