export type AuthUser = {
  id: string
  email: string
  firstName: string
  lastName: string
  avatarUrl: string | null
  isActive: boolean
  roles: Array<{ id: string; name: string }>
}

export type RegisterRequest = {
  email: string
  password: string
  firstName: string
  lastName: string
}

export type LoginRequest = {
  email: string
  password: string
}

export type AuthResponse = {
  user: AuthUser
  accessToken: string
  refreshToken: string
}

export type RefreshResponse = {
  accessToken: string
}

export type MeResponse = {
  user: AuthUser
}

export type UserPermissionsResponse = {
  permissions: Record<string, boolean>
}

// ─── Pagination ───────────────────────────────────────────────────────────────

export type Pagination = {
  page: number
  limit: number
  total: number
  totalPages: number
}

export type PaginatedResponse<T> = {
  data: T[]
  pagination: Pagination
}

// ─── Customer ─────────────────────────────────────────────────────────────────

export type CustomerType = 'INDIVIDUAL' | 'COMPANY'
export type CustomerStatus = 'ACTIVE' | 'INACTIVE' | 'PROSPECT'

export type Customer = {
  id: string
  name: string
  email: string | null
  phone: string | null
  address: string | null
  tax_id: string | null
  type: CustomerType
  status: CustomerStatus
  notes: string | null
  created_at: string
  updated_at: string
}

export type CustomerWithCounts = Customer & {
  _count: { contacts: number }
}

export type CustomerWithContacts = Customer & {
  contacts: Contact[]
}

export type CreateCustomerRequest = {
  name: string
  email?: string
  phone?: string
  address?: string
  taxId?: string
  type?: CustomerType
  status?: CustomerStatus
  notes?: string
}

export type UpdateCustomerRequest = Partial<CreateCustomerRequest>

export type CustomerListResponse = PaginatedResponse<CustomerWithCounts>

// ─── Contact ──────────────────────────────────────────────────────────────────

export type Contact = {
  id: string
  customer_id: string
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  position: string | null
  is_primary: boolean
  created_at: string
}

export type ContactWithCustomer = Contact & {
  customer: Customer
}

export type CreateContactRequest = {
  customerId: string
  firstName: string
  lastName: string
  email?: string
  phone?: string
  position?: string
  isPrimary?: boolean
}

export type UpdateContactRequest = Partial<Omit<CreateContactRequest, 'customerId'>>

export type ContactListResponse = PaginatedResponse<Contact>

// ─── Company ──────────────────────────────────────────────────────────────────

export type Company = {
  id: string
  name: string
  tax_id: string | null
  address: string | null
  phone: string | null
  email: string | null
  website: string | null
  industry: string | null
  status: string
  notes: string | null
  created_at: string
  updated_at: string
}

export type CreateCompanyRequest = {
  name: string
  taxId?: string
  address?: string
  phone?: string
  email?: string
  website?: string
  industry?: string
  status?: string
  notes?: string
}

export type UpdateCompanyRequest = Partial<CreateCompanyRequest>

export type CompanyListResponse = PaginatedResponse<Company>

// ─── Project ───────────────────────────────────────────────────────────────────

export type ProjectStatus = 'PLANNING' | 'ACTIVE' | 'COMPLETED' | 'SUSPENDED'

export type Project = {
  id: string
  name: string
  code: string
  description: string | null
  address: string | null
  type: string
  status: ProjectStatus
  total_units: number
  settings: Record<string, unknown>
  created_at: string
  updated_at: string
}

export type ProjectWithUnitCounts = Project & {
  _count: { units: number }
  unitStatusCounts?: UnitStatusCounts
}

export type UnitStatusCounts = {
  available: number
  reserved: number
  sold: number
  rented: number
  under_maintenance: number
}

export type ProjectDashboard = {
  totalUnits: number
  unitStatusCounts: UnitStatusCounts
  occupancyRate: number
  totalRevenuePotential: number
}

export type CreateProjectRequest = {
  name: string
  code: string
  description?: string
  address?: string
  type: string
  status?: ProjectStatus
  totalUnits?: number
  settings?: Record<string, unknown>
}

export type UpdateProjectRequest = Partial<CreateProjectRequest>

export type ProjectListResponse = PaginatedResponse<ProjectWithUnitCounts>

// ─── ProjectTemplate ──────────────────────────────────────────────────────────

export type ProjectTemplate = {
  id: string
  name: string
  description: string | null
  settings: Record<string, unknown>
  created_at: string
}

export type CreateProjectTemplateRequest = {
  name: string
  description?: string
  settings?: Record<string, unknown>
}

export type UpdateProjectTemplateRequest = Partial<CreateProjectTemplateRequest>

// ─── Unit ─────────────────────────────────────────────────────────────────────

export type UnitStatus = 'AVAILABLE' | 'RESERVED' | 'SOLD' | 'RENTED' | 'UNDER_MAINTENANCE'

export type Unit = {
  id: string
  project_id: string
  unit_number: string
  floor: number | null
  building: string | null
  type: string
  area_sqm: number | null
  price: number | null
  status: UnitStatus
  features: Record<string, unknown>
  created_at: string
  updated_at: string
}

export type UnitWithProject = Unit & {
  project: Pick<Project, 'id' | 'name' | 'code'>
}

export type UnitAvailabilityEntry = {
  id: string
  unitNumber: string
  floor: number | null
  building: string | null
  status: UnitStatus
  areaSqm: number | null
  price: number | null
  type: string
}

export type UnitAvailabilityByProject = {
  projectId: string
  projectName: string
  projectCode: string
  units: UnitAvailabilityEntry[]
}

export type CreateUnitRequest = {
  projectId: string
  unitNumber: string
  floor?: number
  building?: string
  type: string
  areaSqm?: number
  price?: number
  status?: UnitStatus
  features?: Record<string, unknown>
}

export type UpdateUnitRequest = Partial<Omit<CreateUnitRequest, 'projectId'>>

export type UnitListResponse = PaginatedResponse<UnitWithProject>
