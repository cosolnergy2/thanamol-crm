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

// ─── Lead ─────────────────────────────────────────────────────────────────────

export type LeadStatus = 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'UNQUALIFIED' | 'CONVERTED'

export type Lead = {
  id: string
  title: string
  customer_id: string | null
  contact_id: string | null
  source: string | null
  status: LeadStatus
  value: number | null
  probability: number | null
  expected_close_date: string | null
  notes: string | null
  assigned_to: string | null
  created_at: string
  updated_at: string
}

export type LeadWithRelations = Lead & {
  customer: Pick<Customer, 'id' | 'name' | 'email'> | null
  contact: Pick<Contact, 'id' | 'first_name' | 'last_name' | 'email'> | null
  assignee: Pick<AuthUser, 'id' | 'firstName' | 'lastName' | 'email'> | null
}

export type CreateLeadRequest = {
  title: string
  customerId?: string
  contactId?: string
  source?: string
  status?: LeadStatus
  value?: number
  probability?: number
  expectedCloseDate?: string
  notes?: string
  assignedTo?: string
}

export type UpdateLeadRequest = Partial<CreateLeadRequest>

export type LeadListResponse = PaginatedResponse<Lead>

// ─── Deal ─────────────────────────────────────────────────────────────────────

export type DealStage =
  | 'PROSPECTING'
  | 'QUALIFICATION'
  | 'PROPOSAL'
  | 'NEGOTIATION'
  | 'CLOSED_WON'
  | 'CLOSED_LOST'

export type Deal = {
  id: string
  title: string
  customer_id: string | null
  lead_id: string | null
  stage: DealStage
  value: number | null
  probability: number | null
  expected_close_date: string | null
  actual_close_date: string | null
  notes: string | null
  assigned_to: string | null
  created_at: string
  updated_at: string
}

export type DealWithRelations = Deal & {
  customer: Pick<Customer, 'id' | 'name' | 'email'> | null
  lead: Pick<Lead, 'id' | 'title' | 'status'> | null
  assignee: Pick<AuthUser, 'id' | 'firstName' | 'lastName' | 'email'> | null
}

export type PipelineStageGroup = {
  stage: DealStage
  deals: Deal[]
  count: number
  totalValue: number
}

export type CreateDealRequest = {
  title: string
  customerId?: string
  leadId?: string
  stage?: DealStage
  value?: number
  probability?: number
  expectedCloseDate?: string
  notes?: string
  assignedTo?: string
}

export type UpdateDealRequest = Partial<CreateDealRequest>

export type DealListResponse = PaginatedResponse<Deal>

// ─── Quotation ────────────────────────────────────────────────────────────────

export type QuotationStatus = 'DRAFT' | 'SENT' | 'APPROVED' | 'REJECTED' | 'EXPIRED'

export type QuotationItem = {
  description: string
  quantity: number
  unit_price: number
  amount: number
}

export type Quotation = {
  id: string
  quotation_number: string
  customer_id: string
  project_id: string
  unit_id: string | null
  items: QuotationItem[]
  total_amount: number
  discount: number
  tax: number
  grand_total: number
  status: QuotationStatus
  valid_until: string | null
  notes: string | null
  approved_by: string | null
  created_by: string
  created_at: string
  updated_at: string
}

export type QuotationWithRelations = Quotation & {
  customer: Pick<Customer, 'id' | 'name' | 'email' | 'phone'>
  project: Pick<Project, 'id' | 'name' | 'code'>
  unit: Pick<Unit, 'id' | 'unit_number' | 'floor' | 'building'> | null
  creator: { id: string; first_name: string; last_name: string }
  approver: { id: string; first_name: string; last_name: string } | null
}

export type CreateQuotationRequest = {
  quotationNumber?: string
  customerId: string
  projectId: string
  unitId?: string
  items?: QuotationItem[]
  totalAmount?: number
  discount?: number
  tax?: number
  grandTotal?: number
  status?: QuotationStatus
  validUntil?: string
  notes?: string
}

export type UpdateQuotationRequest = Partial<CreateQuotationRequest>

export type RejectQuotationRequest = {
  reason: string
}

export type QuotationListResponse = PaginatedResponse<Quotation>

// ─── CommercialQuotation ──────────────────────────────────────────────────────

export type CommercialQuotation = {
  id: string
  quotation_number: string
  customer_id: string
  project_id: string
  items: QuotationItem[]
  terms: string | null
  conditions: string | null
  total_amount: number
  status: QuotationStatus
  created_by: string
  created_at: string
  updated_at: string
}

export type CommercialQuotationWithRelations = CommercialQuotation & {
  customer: Pick<Customer, 'id' | 'name' | 'email' | 'phone'>
  project: Pick<Project, 'id' | 'name' | 'code'>
  creator: { id: string; first_name: string; last_name: string }
}

export type CreateCommercialQuotationRequest = {
  quotationNumber?: string
  customerId: string
  projectId: string
  items?: QuotationItem[]
  terms?: string
  conditions?: string
  totalAmount?: number
  status?: QuotationStatus
}

export type UpdateCommercialQuotationRequest = Partial<CreateCommercialQuotationRequest>

// ─── ClientUser ───────────────────────────────────────────────────────────────

export type ClientUser = {
  id: string
  customer_id: string
  email: string
  first_name: string
  last_name: string
  is_active: boolean
  created_at: string
  customer?: Pick<Customer, 'id' | 'name' | 'email' | 'phone'>
}

export type CreateClientUserRequest = {
  customerId: string
  email: string
  password: string
  firstName: string
  lastName: string
  isActive?: boolean
}

export type UpdateClientUserRequest = {
  email?: string
  password?: string
  firstName?: string
  lastName?: string
  isActive?: boolean
}

export type ClientUserListResponse = PaginatedResponse<ClientUser>

export type ClientUserQueryParams = {
  page?: number
  limit?: number
  search?: string
  customerId?: string
  isActive?: boolean
}

// ─── ClientUpdateRequest ──────────────────────────────────────────────────────

export type UpdateRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

export type ClientUpdateRequest = {
  id: string
  entity_type: string
  entity_id: string
  client_user_id: string
  requested_changes: Record<string, unknown>
  status: UpdateRequestStatus
  reviewed_by: string | null
  created_at: string
  updated_at: string
  client_user?: Pick<ClientUser, 'id' | 'first_name' | 'last_name' | 'email'>
  reviewer?: { id: string; first_name: string; last_name: string } | null
}

export type CreateClientUpdateRequestRequest = {
  entityType: string
  entityId: string
  clientUserId: string
  requestedChanges: Record<string, unknown>
}

export type UpdateClientUpdateRequestRequest = {
  status: UpdateRequestStatus
  reviewedBy?: string
}

export type ClientUpdateRequestListResponse = PaginatedResponse<ClientUpdateRequest>

export type ClientUpdateRequestQueryParams = {
  page?: number
  limit?: number
  status?: UpdateRequestStatus | 'all'
  clientUserId?: string
}
