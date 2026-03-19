export const DEPARTMENTS = ['Admin', 'Sale', 'Legal', 'Account', 'Service'] as const
export type Department = (typeof DEPARTMENTS)[number]

export type AuthUser = {
  id: string
  email: string
  firstName: string
  lastName: string
  avatarUrl: string | null
  phone: string | null
  department: string | null
  position: string | null
  isActive: boolean
  roles: Array<{ id: string; name: string }>
}

export type RegisterRequest = {
  email: string
  password: string
  firstName: string
  lastName: string
}

export type CreateUserRequest = {
  email: string
  password: string
  firstName: string
  lastName: string
  phone?: string
  department?: string
  position?: string
  roleId?: string
}

export type ResetPasswordRequest = {
  newPassword: string
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

export type PendingQuotation = QuotationWithRelations

// ─── CommercialQuotation ──────────────────────────────────────────────────────

export type CommercialQuotationListResponse = PaginatedResponse<CommercialQuotation>

export type CommercialQuotationQueryParams = {
  page?: number
  limit?: number
  search?: string
  status?: QuotationStatus | 'all'
  customerId?: string
  projectId?: string
}

export type RejectCommercialQuotationRequest = {
  reason: string
}

export type PendingCommercialQuotationsResponse = {
  data: CommercialQuotationWithRelations[]
  total: number
}

// ─── CommercialQuotation (original) ───────────────────────────────────────────

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

export type PendingCommercialQuotation = CommercialQuotationWithRelations

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

// ─── Reports ──────────────────────────────────────────────────────────────────

export type SalesReportSummary = {
  totalDeals: number
  dealsWon: number
  dealsLost: number
  totalWonValue: number
  avgDealValue: number
  winRate: number
}

export type SalesByStage = {
  stage: string
  count: number
  totalValue: number
}

export type SalesReportResponse = {
  summary: SalesReportSummary
  byStage: SalesByStage[]
}

export type RevenueReportSummary = {
  totalBilled: number
  totalCollected: number
  totalOutstanding: number
  totalOverdue: number
  collectionRate: number
}

export type RevenueByStatus = {
  status: string
  count: number
  total: number
}

export type RevenueReportResponse = {
  summary: RevenueReportSummary
  byStatus: RevenueByStatus[]
}

export type OccupancySummary = {
  totalProjects: number
  totalUnits: number
  totalOccupied: number
  totalAvailable: number
  overallOccupancyRate: number
}

export type ProjectOccupancy = {
  projectId: string
  projectName: string
  projectCode: string
  projectStatus: string
  totalUnits: number
  available: number
  reserved: number
  sold: number
  rented: number
  underMaintenance: number
  occupied: number
  occupancyRate: number
}

export type OccupancyReportResponse = {
  summary: OccupancySummary
  byProject: ProjectOccupancy[]
}

export type CollectionReportSummary = {
  totalInvoices: number
  paidOnTime: number
  paidOverdue: number
  pending: number
  totalCollected: number
  totalOverdue: number
  onTimePaymentRate: number
}

export type CollectionReportResponse = {
  summary: CollectionReportSummary
}

// ─── Contract ─────────────────────────────────────────────────────────────────

export type ContractType = 'SALE' | 'LEASE' | 'RENTAL'
export type ContractStatus =
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'ACTIVE'
  | 'EXPIRED'
  | 'TERMINATED'
  | 'CANCELLED'

export type Contract = {
  id: string
  contract_number: string
  customer_id: string
  project_id: string
  unit_id: string | null
  quotation_id: string | null
  type: ContractType
  start_date: string
  end_date: string | null
  value: number
  monthly_rent: number | null
  deposit_amount: number | null
  terms: string | null
  status: ContractStatus
  approved_by: string | null
  created_by: string
  created_at: string
  updated_at: string
}

export type ContractWithRelations = Contract & {
  customer: Pick<Customer, 'id' | 'name' | 'email' | 'phone'>
  project: Pick<Project, 'id' | 'name' | 'code'>
  unit: Pick<Unit, 'id' | 'unit_number' | 'floor' | 'building'> | null
  quotation: { id: string; quotation_number: string } | null
  creator: { id: string; first_name: string; last_name: string }
  approver: { id: string; first_name: string; last_name: string } | null
  daysUntilExpiry?: number | null
}

export type CreateContractRequest = {
  contractNumber?: string
  customerId: string
  projectId: string
  unitId?: string
  quotationId?: string
  type: ContractType
  startDate: string
  endDate?: string
  value?: number
  monthlyRent?: number
  depositAmount?: number
  terms?: string
  status?: ContractStatus
}

export type UpdateContractRequest = {
  contractNumber?: string
  customerId?: string
  projectId?: string
  unitId?: string
  quotationId?: string
  type?: ContractType
  startDate?: string
  endDate?: string
  value?: number
  monthlyRent?: number
  depositAmount?: number
  terms?: string
  status?: ContractStatus
}

export type RejectContractRequest = {
  reason: string
}

export type ContractListResponse = PaginatedResponse<Contract>

export type ContractQueryParams = {
  page?: number
  limit?: number
  status?: ContractStatus | 'all'
  type?: ContractType | 'all'
  customerId?: string
  projectId?: string
}

// ─── LeaseAgreement ───────────────────────────────────────────────────────────

export type LeaseStatus = 'DRAFT' | 'ACTIVE' | 'EXPIRED' | 'TERMINATED'

export type LeaseAgreement = {
  id: string
  contract_id: string
  lease_terms: Record<string, unknown>
  special_conditions: string | null
  status: LeaseStatus
  created_at: string
  updated_at: string
}

export type LeaseAgreementWithContract = LeaseAgreement & {
  contract: Pick<Contract, 'id' | 'contract_number' | 'type' | 'status'>
}

export type CreateLeaseAgreementRequest = {
  contractId: string
  leaseTerms?: Record<string, unknown>
  specialConditions?: string
  status?: LeaseStatus
}

export type UpdateLeaseAgreementRequest = {
  leaseTerms?: Record<string, unknown>
  specialConditions?: string
  status?: LeaseStatus
}

export type LeaseAgreementListResponse = PaginatedResponse<LeaseAgreementWithContract>

// ─── Handover ─────────────────────────────────────────────────────────────────

export type HandoverType = 'INITIAL' | 'FINAL' | 'PARTIAL'
export type HandoverStatus = 'PENDING' | 'COMPLETED' | 'REJECTED'

export type Handover = {
  id: string
  contract_id: string
  handover_date: string
  handover_type: HandoverType
  checklist: unknown[]
  notes: string | null
  status: HandoverStatus
  received_by: string | null
  handed_by: string | null
  created_at: string
  updated_at: string
}

export type HandoverWithRelations = Handover & {
  contract: Pick<Contract, 'id' | 'contract_number' | 'type' | 'status'>
  photos: HandoverPhotos[]
}

export type CreateHandoverRequest = {
  contractId: string
  handoverDate: string
  handoverType: HandoverType
  checklist?: unknown[]
  notes?: string
  status?: HandoverStatus
  receivedBy?: string
  handedBy?: string
}

export type UpdateHandoverRequest = Partial<Omit<CreateHandoverRequest, 'contractId'>>

export type HandoverListResponse = PaginatedResponse<Handover>

// ─── HandoverPhotos ───────────────────────────────────────────────────────────

export type HandoverPhotos = {
  id: string
  handover_id: string
  photos: unknown[]
  description: string | null
  category: string | null
  created_at: string
}

export type CreateHandoverPhotosRequest = {
  handoverId: string
  photos?: unknown[]
  description?: string
  category?: string
}

export type UpdateHandoverPhotosRequest = {
  photos?: unknown[]
  description?: string
  category?: string
}

export type HandoverPhotosListResponse = PaginatedResponse<HandoverPhotos>

// ─── PreHandoverInspection ────────────────────────────────────────────────────

export type InspectionStatus = 'PASS' | 'FAIL' | 'CONDITIONAL'

export type PreHandoverInspection = {
  id: string
  contract_id: string
  inspection_date: string
  inspector: string
  items: unknown[]
  overall_status: InspectionStatus
  notes: string | null
  photos: unknown[]
  created_at: string
  updated_at: string
}

export type PreHandoverInspectionWithContract = PreHandoverInspection & {
  contract: Pick<Contract, 'id' | 'contract_number' | 'type' | 'status'>
}

export type CreatePreHandoverInspectionRequest = {
  contractId: string
  inspectionDate: string
  inspector: string
  items?: unknown[]
  overallStatus?: InspectionStatus
  notes?: string
  photos?: unknown[]
}

export type UpdatePreHandoverInspectionRequest = Partial<
  Omit<CreatePreHandoverInspectionRequest, 'contractId'>
>

export type PreHandoverInspectionListResponse = PaginatedResponse<PreHandoverInspectionWithContract>

// ─── Invoice ──────────────────────────────────────────────────────────────────

export type InvoiceStatus = 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE' | 'CANCELLED' | 'PARTIAL'

export type InvoiceItemType = 'Rent' | 'Common Fee' | 'Water' | 'Electricity' | 'Parking' | 'Other'

export type InvoiceItem = {
  description: string
  quantity: number
  unit_price: number
  amount: number
  item_type?: InvoiceItemType
}

export type Invoice = {
  id: string
  invoice_number: string
  contract_id: string | null
  customer_id: string
  items: InvoiceItem[]
  subtotal: number
  tax: number
  total: number
  discount: number
  due_date: string | null
  invoice_date: string | null
  billing_period_start: string | null
  billing_period_end: string | null
  status: InvoiceStatus
  days_overdue: number
  notes: string | null
  created_by: string
  created_at: string
  updated_at: string
}

export type InvoiceWithRelations = Invoice & {
  customer: Pick<Customer, 'id' | 'name' | 'email' | 'phone'>
  contract: Pick<Contract, 'id' | 'contract_number' | 'type' | 'status'> | null
  creator: { id: string; first_name: string; last_name: string }
}

export type CreateInvoiceRequest = {
  invoiceNumber?: string
  contractId?: string
  customerId: string
  items?: InvoiceItem[]
  subtotal?: number
  tax?: number
  total?: number
  discount?: number
  dueDate?: string
  invoiceDate?: string
  billingPeriodStart?: string
  billingPeriodEnd?: string
  status?: InvoiceStatus
  notes?: string
}

export type UpdateInvoiceRequest = Partial<CreateInvoiceRequest>

export type InvoiceWithCustomer = Invoice & {
  customer: Pick<Customer, 'id' | 'name'>
}

export type InvoiceListResponse = PaginatedResponse<InvoiceWithCustomer>

export type InvoiceQueryParams = {
  page?: number
  limit?: number
  status?: InvoiceStatus | 'all'
  customerId?: string
  contractId?: string
}

// ─── Payment ──────────────────────────────────────────────────────────────────

export type PaymentMethod = 'CASH' | 'BANK_TRANSFER' | 'CHEQUE' | 'CREDIT_CARD' | 'ONLINE'

export type Payment = {
  id: string
  invoice_id: string
  amount: number
  payment_date: string
  payment_method: PaymentMethod
  reference_number: string | null
  notes: string | null
  received_by: string | null
  created_at: string
}

export type PaymentWithRelations = Payment & {
  invoice: {
    id: string
    invoice_number: string
    total: number
    status: InvoiceStatus
    customer_id: string
  }
  receiver: { id: string; first_name: string; last_name: string } | null
}

export type CreatePaymentRequest = {
  invoiceId: string
  amount: number
  paymentDate: string
  paymentMethod: PaymentMethod
  referenceNumber?: string
  notes?: string
}

export type UpdatePaymentRequest = Partial<CreatePaymentRequest>

export type PaymentListResponse = PaginatedResponse<Payment>

export type PaymentQueryParams = {
  page?: number
  limit?: number
  invoiceId?: string
  paymentMethod?: PaymentMethod
}

// ─── Deposit ──────────────────────────────────────────────────────────────────

export type DepositStatus = 'HELD' | 'APPLIED' | 'REFUNDED' | 'FORFEITED'

export type Deposit = {
  id: string
  contract_id: string
  customer_id: string
  amount: number
  deposit_date: string
  status: DepositStatus
  refund_date: string | null
  refund_amount: number | null
  notes: string | null
  created_at: string
  updated_at: string
}

export type DepositWithRelations = Deposit & {
  contract: Pick<Contract, 'id' | 'contract_number' | 'type' | 'status'>
  customer: Pick<Customer, 'id' | 'name' | 'email' | 'phone'>
}

export type CreateDepositRequest = {
  contractId: string
  customerId: string
  amount: number
  depositDate: string
  status?: DepositStatus
  refundDate?: string
  refundAmount?: number
  notes?: string
}

export type UpdateDepositRequest = Partial<CreateDepositRequest>

export type DepositListResponse = PaginatedResponse<Deposit>

export type DepositQueryParams = {
  page?: number
  limit?: number
  status?: DepositStatus | 'all'
  contractId?: string
  customerId?: string
}

// ─── MeterRecord ──────────────────────────────────────────────────────────────

export type MeterType = 'ELECTRICITY' | 'WATER' | 'GAS'

export type MeterRecord = {
  id: string
  unit_id: string
  meter_type: MeterType
  previous_reading: number
  current_reading: number
  reading_date: string
  usage: number
  amount: number
  billing_period: string
  created_at: string
}

export type MeterRecordWithUnit = MeterRecord & {
  unit: Pick<Unit, 'id' | 'unit_number' | 'floor' | 'building' | 'project_id'>
}

export type CreateMeterRecordRequest = {
  unitId: string
  meterType: MeterType
  previousReading: number
  currentReading: number
  readingDate: string
  amount: number
  billingPeriod: string
}

export type UpdateMeterRecordRequest = Partial<CreateMeterRecordRequest>

export type MeterRecordListResponse = PaginatedResponse<MeterRecord>

export type MeterRecordQueryParams = {
  page?: number
  limit?: number
  unitId?: string
  meterType?: MeterType
  billingPeriod?: string
}

// ─── Task ─────────────────────────────────────────────────────────────────────

export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'DONE' | 'CANCELLED'

export type Task = {
  id: string
  title: string
  description: string | null
  project_id: string | null
  assigned_to: string | null
  created_by: string
  priority: TaskPriority
  status: TaskStatus
  due_date: string | null
  parent_task_id: string | null
  estimated_hours: number | null
  actual_hours: number | null
  tags: string[]
  is_recurring: boolean
  recurrence_pattern: string | null
  created_at: string
  updated_at: string
}

export type TaskWithRelations = Task & {
  project: { id: string; name: string; code: string } | null
  assignee: { id: string; first_name: string; last_name: string } | null
  creator: { id: string; first_name: string; last_name: string }
  comments: TaskComment[]
  parent_task: Pick<Task, 'id' | 'title' | 'status'> | null
  subtasks: Pick<Task, 'id' | 'title' | 'status' | 'priority'>[]
}

export type CreateTaskRequest = {
  title: string
  description?: string
  projectId?: string
  assignedTo?: string
  priority?: TaskPriority
  status?: TaskStatus
  dueDate?: string
  parentTaskId?: string
  estimatedHours?: number
  actualHours?: number
  tags?: string[]
  isRecurring?: boolean
  recurrencePattern?: string
}

export type UpdateTaskRequest = Partial<CreateTaskRequest>

export type TaskListResponse = PaginatedResponse<Task>

export type TaskQueryParams = {
  page?: number
  limit?: number
  status?: TaskStatus | 'all'
  priority?: TaskPriority | 'all'
  assignedTo?: string
  projectId?: string
  search?: string
}

// ─── TaskComment ──────────────────────────────────────────────────────────────

export type TaskComment = {
  id: string
  task_id: string
  user_id: string
  content: string
  created_at: string
  user?: { id: string; first_name: string; last_name: string }
}

export type CreateTaskCommentRequest = {
  content: string
}

// ─── TaskStatusConfig ─────────────────────────────────────────────────────────

export type TaskStatusConfig = {
  id: string
  name: string
  color: string
  order: number
  is_default: boolean
  is_closed: boolean
  created_at: string
}

export type CreateTaskStatusRequest = {
  name: string
  color: string
  order: number
  isDefault?: boolean
  isClosed?: boolean
}

export type UpdateTaskStatusRequest = Partial<CreateTaskStatusRequest>

export type TaskStatusListResponse = { data: TaskStatusConfig[] }

// ─── AutomationRule ───────────────────────────────────────────────────────────

export type AutomationRule = {
  id: string
  name: string
  trigger_event: string
  conditions: Record<string, unknown>
  actions: unknown[]
  is_active: boolean
  created_at: string
}

export type CreateAutomationRuleRequest = {
  name: string
  triggerEvent: string
  conditions?: Record<string, unknown>
  actions?: unknown[]
  isActive?: boolean
}

export type UpdateAutomationRuleRequest = Partial<CreateAutomationRuleRequest>

export type AutomationRuleListResponse = { data: AutomationRule[] }

// ─── Ticket ───────────────────────────────────────────────────────────────────

export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED'
export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'

export type Ticket = {
  id: string
  title: string
  description: string | null
  customer_id: string | null
  unit_id: string | null
  category: string | null
  priority: TicketPriority
  status: TicketStatus
  assigned_to: string | null
  resolved_at: string | null
  created_at: string
  updated_at: string
}

export type TicketWithRelations = Ticket & {
  customer: Pick<Customer, 'id' | 'name' | 'email' | 'phone'> | null
  unit: Pick<Unit, 'id' | 'unit_number' | 'floor' | 'building'> | null
  assignee: { id: string; first_name: string; last_name: string } | null
}

export type CreateTicketRequest = {
  title: string
  description?: string
  customerId?: string
  unitId?: string
  category?: string
  priority?: TicketPriority
  status?: TicketStatus
  assignedTo?: string
}

export type UpdateTicketRequest = Partial<CreateTicketRequest>

export type TicketListResponse = PaginatedResponse<Ticket>

export type TicketQueryParams = {
  page?: number
  limit?: number
  status?: TicketStatus | 'all'
  priority?: TicketPriority | 'all'
  customerId?: string
  assignedTo?: string
}

// ─── Notification ─────────────────────────────────────────────────────────────

export type Notification = {
  id: string
  user_id: string
  title: string
  message: string
  type: string
  entity_type: string | null
  entity_id: string | null
  is_read: boolean
  created_at: string
}

export type NotificationListResponse = PaginatedResponse<Notification>

export type NotificationQueryParams = {
  page?: number
  limit?: number
  isRead?: boolean
}

// ─── ActivityLog ──────────────────────────────────────────────────────────────

export type ActivityLog = {
  id: string
  user_id: string | null
  action: string
  entity_type: string | null
  entity_id: string | null
  details: Record<string, unknown> | null
  ip_address: string | null
  created_at: string
  user?: { id: string; first_name: string; last_name: string; email: string } | null
}

export type ActivityLogListResponse = PaginatedResponse<ActivityLog>

export type ActivityLogQueryParams = {
  page?: number
  limit?: number
  userId?: string
  entityType?: string
  action?: string
}

export type UserAuditLog = {
  id: string
  user_id: string
  action: string
  details: Record<string, unknown> | null
  ip_address: string | null
  created_at: string
  user?: { id: string; first_name: string; last_name: string; email: string }
}

export type UserAuditLogListResponse = PaginatedResponse<UserAuditLog>

export type AuditLogQueryParams = {
  page?: number
  limit?: number
  userId?: string
  action?: string
}

// ─── WarehouseRequirement ─────────────────────────────────────────────────────

export type WarehouseRequirementStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'REVIEWED'
  | 'APPROVED'
  | 'REJECTED'

export type WarehouseRequirement = {
  id: string
  customer_id: string
  project_id: string | null
  requirements: Record<string, unknown>
  specifications: Record<string, unknown>
  status: WarehouseRequirementStatus
  created_by: string
  created_at: string
  updated_at: string
  customer?: { id: string; name: string; email: string | null; phone: string | null }
  project?: { id: string; name: string; code: string } | null
  creator?: { id: string; first_name: string; last_name: string }
}

export type CreateWarehouseRequirementRequest = {
  customerId: string
  projectId?: string
  requirements?: Record<string, unknown>
  specifications?: Record<string, unknown>
  status?: WarehouseRequirementStatus
}

export type UpdateWarehouseRequirementRequest = Partial<CreateWarehouseRequirementRequest>

export type WarehouseRequirementListResponse = PaginatedResponse<WarehouseRequirement>

export type WarehouseRequirementQueryParams = {
  page?: number
  limit?: number
  status?: WarehouseRequirementStatus | 'all'
  customerId?: string
  projectId?: string
}

// ─── SaleJob04F01 ─────────────────────────────────────────────────────────────

export type SaleJobStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED'

export type SaleJob04F01 = {
  id: string
  form_number: string
  project_id: string
  customer_id: string
  unit_id: string | null
  form_data: Record<string, unknown>
  status: SaleJobStatus
  created_by: string
  approved_by: string | null
  created_at: string
  updated_at: string
  project?: { id: string; name: string; code: string }
  customer?: { id: string; name: string; email: string | null; phone: string | null }
  unit?: { id: string; unit_number: string; floor: number | null; building: string | null } | null
  creator?: { id: string; first_name: string; last_name: string }
  approver?: { id: string; first_name: string; last_name: string } | null
}

export type CreateSaleJob04F01Request = {
  formNumber?: string
  projectId: string
  customerId: string
  unitId?: string
  formData?: Record<string, unknown>
  status?: SaleJobStatus
}

export type UpdateSaleJob04F01Request = Partial<Omit<CreateSaleJob04F01Request, 'formNumber'>>

export type SaleJob04F01ListResponse = PaginatedResponse<SaleJob04F01>

export type SaleJobQueryParams = {
  page?: number
  limit?: number
  status?: SaleJobStatus | 'all'
  projectId?: string
  customerId?: string
}

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

// ─── Meeting ──────────────────────────────────────────────────────────────────

export type MeetingStatus = 'SCHEDULED' | 'COMPLETED' | 'CANCELLED' | 'RESCHEDULED'

export type Meeting = {
  id: string
  title: string
  description: string | null
  meeting_date: string
  location: string | null
  status: MeetingStatus
  created_by: string
  created_at: string
  updated_at: string
}

export type MeetingListResponse = PaginatedResponse<Meeting>

// ─── Form Types ───────────────────────────────────────────────────────────────

export type SaleQuotationItem = {
  description: string
  quantity: number
  unit_price: number
  amount: number
}

export type SaleQuotationFormData = {
  quotation_number: string
  customer_name: string
  quotation_date: string
  valid_until: string
  contact_person: string
  phone: string
  email: string
  items: SaleQuotationItem[]
  subtotal: number
  vat: number
  total: number
  terms: string
  notes: string
}

export type LesseeResponsibility = {
  checked: boolean
  note: string
}

export type CommercialProposalFormData = {
  quotation_number: string
  proposal_date: Date | null
  customer_info: {
    company_address: string
    contact_name: string
    telephone: string
    mobile: string
    email: string
  }
  warehouse_location: {
    house_no: string
    moo: string
    sub_district: string
    district: string
    province: string
  }
  rental_details: Array<{
    building: string
    area: number
    rental_rate: number
    monthly_rental: number
  }>
  terms_conditions: {
    deposit_months: number
    advance_rental_months: number
    water_charge: number
    electricity_charge: string
    contract_duration: number
    lessee_responsibilities: Record<string, LesseeResponsibility>
  }
  valid_until: Date | null
  footer_info: {
    company_name: string
    company_address: string
    contact_person_name: string
    contact_mobile: string
    contact_email: string
  }
  status: string
}

// ─── InspectionItem ───────────────────────────────────────────────────────────

export type InspectionItem = {
  number: string
  name: string
  category_number: string
  category_name: string
  status: string
  note?: string
  responsible_person?: string
  abnormal_condition?: string
}

// ─── Document Center ──────────────────────────────────────────────────────────

export type DocumentRecord = {
  id: string
  title: string
  file_url: string
  file_type: string | null
  file_size: number | null
  category: string | null
  entity_type: string | null
  entity_id: string | null
  uploaded_by: string
  tags: string[]
  version: number
  created_at: string
  updated_at: string
  uploader?: { id: string; first_name: string; last_name: string }
}

export type CreateDocumentRequest = {
  title: string
  fileUrl: string
  fileType?: string
  fileSize?: number
  category?: string
  entityType?: string
  entityId?: string
  tags?: string[]
  version?: number
}

export type UpdateDocumentRequest = Partial<CreateDocumentRequest>

export type DocumentListResponse = PaginatedResponse<DocumentRecord>

export type DocumentQueryParams = {
  page?: number
  limit?: number
  category?: string
  entityType?: string
  search?: string
}

// ─── ISO Document Control ─────────────────────────────────────────────────────

export type ISODocumentStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED' | 'SUPERSEDED'

export type ISODocumentRecord = {
  id: string
  document_number: string
  title: string
  category: string
  revision: string
  status: ISODocumentStatus
  content: string | null
  effective_date: string | null
  review_date: string | null
  approved_by: string | null
  created_at: string
  updated_at: string
  approver?: { id: string; first_name: string; last_name: string } | null
}

export type CreateISODocumentRequest = {
  documentNumber: string
  title: string
  category: string
  revision: string
  status?: ISODocumentStatus
  content?: string
  effectiveDate?: string
  reviewDate?: string
  approvedBy?: string
}

export type UpdateISODocumentRequest = Partial<CreateISODocumentRequest>

export type ISODocumentListResponse = PaginatedResponse<ISODocumentRecord>

export type ISODocumentQueryParams = {
  page?: number
  limit?: number
  status?: ISODocumentStatus | 'all'
  category?: string
  search?: string
}

// Alias
export type ISODocument = ISODocumentRecord

// ─── PDF Template Settings ────────────────────────────────────────────────────

export type PDFTemplateType = 'quotation' | 'contract' | 'invoice' | 'receipt' | 'handover'

export type PDFTemplateRecord = {
  id: string
  name: string
  template_type: PDFTemplateType
  header: Record<string, unknown>
  footer: Record<string, unknown>
  styles: Record<string, unknown>
  is_default: boolean
  created_at: string
  updated_at: string
}

export type CreatePDFTemplateRequest = {
  name: string
  templateType: PDFTemplateType
  header?: Record<string, unknown>
  footer?: Record<string, unknown>
  styles?: Record<string, unknown>
  isDefault?: boolean
}

export type UpdatePDFTemplateRequest = Partial<CreatePDFTemplateRequest>

export type PDFTemplateListResponse = PaginatedResponse<PDFTemplateRecord>

export type PDFTemplateQueryParams = {
  page?: number
  limit?: number
  type?: PDFTemplateType | 'all'
}

// Alias
export type PDFTemplate = PDFTemplateRecord
