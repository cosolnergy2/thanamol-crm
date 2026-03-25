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
  line_id: string | null
  province: string | null
  lead_source: string | null
  industry: string | null
  company_size: string | null
  budget_range: string | null
  deposit_conditions: string | null
  profile_url: string | null
  pdpa_consent: boolean
  interested_project_id: string | null
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
  lineId?: string
  province?: string
  leadSource?: string
  industry?: string
  companySize?: string
  budgetRange?: string
  depositConditions?: string
  profileUrl?: string
  pdpaConsent?: boolean
  interestedProjectId?: string
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
  line_id: string | null
  is_decision_maker: boolean
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
  lineId?: string
  isDecisionMaker?: boolean
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
  is_site: boolean
  site_type: string | null
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
  isSite?: boolean
  siteType?: string
}

export type UpdateProjectRequest = Partial<CreateProjectRequest>

export type ProjectListResponse = PaginatedResponse<ProjectWithUnitCounts>

// ─── Zone ─────────────────────────────────────────────────────────────────────

export type Zone = {
  id: string
  project_id: string
  name: string
  code: string
  description: string | null
  floor: string | null
  building: string | null
  parent_zone_id: string | null
  created_at: string
  updated_at: string
}

export type ZoneWithChildren = Zone & {
  children: Zone[]
  parent_zone: Zone | null
}

export type CreateZoneRequest = {
  projectId: string
  name: string
  code: string
  description?: string
  floor?: string
  building?: string
  parentZoneId?: string
}

export type UpdateZoneRequest = Partial<Omit<CreateZoneRequest, 'projectId'>>

export type ZoneWithCount = Zone & {
  _count: { children: number; units: number }
}

export type ZoneListResponse = PaginatedResponse<ZoneWithCount>

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
  zone_legacy: string | null
  zone_id: string | null
  location: string | null
  office_area_sqm: number | null
  floor_load: string | null
  electrical_load: string | null
  ceiling_height: number | null
  lease_type: string | null
  floor_plan_url: string | null
  has_sprinkler: boolean
  rent_per_sqm: number | null
  common_fee: number | null
  common_fee_waived: boolean
  water_rate: number | null
  water_rate_actual: boolean
  electricity_rate: number | null
  electricity_rate_actual: boolean
  deposit_months: number | null
  advance_rent_months: number | null
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
  zoneLegacy?: string
  zoneId?: string
  location?: string
  officeAreaSqm?: number
  floorLoad?: string
  electricalLoad?: string
  ceilingHeight?: number
  leaseType?: string
  floorPlanUrl?: string
  hasSprinkler?: boolean
  rentPerSqm?: number
  commonFee?: number
  commonFeeWaived?: boolean
  waterRate?: number
  waterRateActual?: boolean
  electricityRate?: number
  electricityRateActual?: boolean
  depositMonths?: number
  advanceRentMonths?: number
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
  projectId?: string
  unitId?: string
  unitType?: string
  rateType?: string
  duration?: number
  durationUnit?: string
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
  deposit_months: number | null
  advance_rent_months: number | null
  electricity_rate_type: string | null
  electricity_rate: number | null
  water_rate: number | null
  deposit_decoration: string | null
  registration_fee: string | null
  property_tax: string | null
  building_insurance: string | null
  goods_insurance: string | null
  special_conditions: string | null
  remarks: string | null
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
  depositMonths?: number
  advanceRentMonths?: number
  electricityRateType?: string
  electricityRate?: number
  waterRate?: number
  depositDecoration?: string
  registrationFee?: string
  propertyTax?: string
  buildingInsurance?: string
  goodsInsurance?: string
  specialConditions?: string
  remarks?: string
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
  rate_per_unit: number | null
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
  work_order_id: string | null
  resolution_notes: string | null
  resolution_date: string | null
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

// ─── MeetingMinute ────────────────────────────────────────────────────────────

export type MeetingMinuteStatus = 'DRAFT' | 'FINALIZED' | 'DISTRIBUTED'

export type MeetingMinute = {
  id: string
  title: string
  meeting_date: string
  location: string | null
  attendees: unknown[]
  agenda: unknown[]
  minutes: Record<string, unknown>
  action_items: unknown[]
  pdf_url: string | null
  status: MeetingMinuteStatus
  created_by: string
  created_at: string
  updated_at: string
}

export type MeetingMinuteWithCreator = MeetingMinute & {
  creator: {
    id: string
    first_name: string
    last_name: string
  }
}

export type CreateMeetingRequest = {
  title: string
  meetingDate: string
  location?: string
  attendees?: unknown[]
  agenda?: unknown[]
  minutes?: Record<string, unknown>
  actionItems?: unknown[]
  pdfUrl?: string
  status?: MeetingMinuteStatus
}

export type UpdateMeetingRequest = Partial<CreateMeetingRequest>

export type MeetingMinuteListResponse = PaginatedResponse<MeetingMinuteWithCreator>

export type MeetingMinuteQueryParams = {
  page?: number
  limit?: number
  status?: MeetingMinuteStatus | 'all'
}

// ─── MeetingTemplate ──────────────────────────────────────────────────────────

export type MeetingTemplate = {
  id: string
  name: string
  description: string | null
  sections: unknown[]
  created_at: string
}

export type CreateMeetingTemplateRequest = {
  name: string
  description?: string
  sections?: unknown[]
}

export type UpdateMeetingTemplateRequest = Partial<CreateMeetingTemplateRequest>

// ─── Document ─────────────────────────────────────────────────────────────────

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

// ─── ISODocument ──────────────────────────────────────────────────────────────

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
  is_sop: boolean
  department: string | null
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

// ─── PDFTemplate ──────────────────────────────────────────────────────────────

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

// Aliases
export type ISODocument = ISODocumentRecord
export type PDFTemplate = PDFTemplateRecord

// ─── FMS: Asset Management ────────────────────────────────────────────────────

export type AssetStatus = 'OPERATIONAL' | 'UNDER_MAINTENANCE' | 'OUT_OF_SERVICE' | 'DISPOSED' | 'IN_STORAGE'

export type AssetCategory = {
  id: string
  name: string
  code: string
  description: string | null
  parent_id: string | null
  created_at: string
}

export type AssetCategoryWithChildren = AssetCategory & {
  children: AssetCategory[]
  parent: AssetCategory | null
}

export type CreateAssetCategoryRequest = {
  name: string
  code: string
  description?: string
  parentId?: string
}

export type UpdateAssetCategoryRequest = Partial<CreateAssetCategoryRequest>

export type AssetCategoryListResponse = PaginatedResponse<AssetCategory>

export type Asset = {
  id: string
  asset_number: string
  name: string
  description: string | null
  category_id: string | null
  project_id: string
  zone_id: string | null
  unit_id: string | null
  location_detail: string | null
  manufacturer: string | null
  model_name: string | null
  serial_number: string | null
  purchase_date: string | null
  purchase_cost: number | null
  warranty_expiry: string | null
  status: AssetStatus
  qr_code_url: string | null
  specifications: Record<string, unknown>
  photos: string[]
  assigned_to: string | null
  created_at: string
  updated_at: string
}

export type AssetWithRelations = Asset & {
  category: AssetCategory | null
  project: { id: string; name: string; code: string }
  zone: { id: string; name: string; code: string } | null
  unit: { id: string; unit_number: string } | null
  assignee: { id: string; first_name: string; last_name: string } | null
  _count: { work_orders: number; calibrations: number; pm_schedules: number }
}

export type CreateAssetRequest = {
  name: string
  description?: string
  categoryId?: string
  projectId: string
  zoneId?: string
  unitId?: string
  locationDetail?: string
  manufacturer?: string
  modelName?: string
  serialNumber?: string
  purchaseDate?: string
  purchaseCost?: number
  warrantyExpiry?: string
  status?: AssetStatus
  specifications?: Record<string, unknown>
  photos?: string[]
  assignedTo?: string
}

export type UpdateAssetRequest = Partial<CreateAssetRequest>

export type AssetListResponse = PaginatedResponse<AssetWithRelations>

export type AssetQueryParams = {
  page?: number
  limit?: number
  projectId?: string
  zoneId?: string
  categoryId?: string
  status?: AssetStatus | 'all'
  search?: string
}

// ─── FMS: Work Orders ─────────────────────────────────────────────────────────

export type WorkOrderStatus = 'OPEN' | 'ASSIGNED' | 'IN_PROGRESS' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED'
export type WorkOrderType = 'CORRECTIVE' | 'PREVENTIVE' | 'EMERGENCY' | 'INSPECTION' | 'CALIBRATION'
export type WorkOrderPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'

export type WorkOrder = {
  id: string
  wo_number: string
  title: string
  description: string | null
  type: WorkOrderType
  priority: string
  status: WorkOrderStatus
  asset_id: string | null
  project_id: string
  zone_id: string | null
  unit_id: string | null
  assigned_to: string | null
  estimated_hours: number | null
  actual_hours: number | null
  scheduled_date: string | null
  started_at: string | null
  completed_at: string | null
  completion_notes: string | null
  parts_used: unknown[]
  cost_estimate: number | null
  actual_cost: number | null
  created_by: string
  created_at: string
  updated_at: string
}

export type WorkOrderWithRelations = WorkOrder & {
  asset: { id: string; asset_number: string; name: string } | null
  project: { id: string; name: string; code: string }
  zone: { id: string; name: string } | null
  unit: { id: string; unit_number: string } | null
  assignee: { id: string; first_name: string; last_name: string } | null
  creator: { id: string; first_name: string; last_name: string }
}

export type CreateWorkOrderRequest = {
  title: string
  description?: string
  type?: WorkOrderType
  priority?: string
  assetId?: string
  projectId: string
  zoneId?: string
  unitId?: string
  assignedTo?: string
  estimatedHours?: number
  scheduledDate?: string
  costEstimate?: number
  createdBy: string
}

export type UpdateWorkOrderRequest = Partial<Omit<CreateWorkOrderRequest, 'createdBy'>> & {
  status?: WorkOrderStatus
  actualHours?: number
  startedAt?: string
  completedAt?: string
  completionNotes?: string
  partsUsed?: unknown[]
  actualCost?: number
}

export type WorkOrderListResponse = PaginatedResponse<WorkOrderWithRelations>

export type WorkOrderQueryParams = {
  page?: number
  limit?: number
  projectId?: string
  assetId?: string
  status?: WorkOrderStatus | 'all'
  type?: WorkOrderType | 'all'
  assignedTo?: string
  search?: string
}

// ─── FMS: Preventive Maintenance ──────────────────────────────────────────────

export type PMFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'SEMI_ANNUAL' | 'ANNUAL' | 'CUSTOM'

export type PreventiveMaintenance = {
  id: string
  pm_number: string
  title: string
  description: string | null
  asset_id: string | null
  project_id: string
  zone_id: string | null
  frequency: PMFrequency
  custom_interval_days: number | null
  checklist: unknown[]
  assigned_to: string | null
  next_due_date: string | null
  last_completed_date: string | null
  is_active: boolean
  created_by: string
  created_at: string
  updated_at: string
}

export type PMWithRelations = PreventiveMaintenance & {
  asset: { id: string; asset_number: string; name: string } | null
  project: { id: string; name: string; code: string }
  zone: { id: string; name: string } | null
  assignee: { id: string; first_name: string; last_name: string } | null
  creator: { id: string; first_name: string; last_name: string }
  _count: { logs: number }
}

export type CreatePMRequest = {
  title: string
  description?: string
  assetId?: string
  projectId: string
  zoneId?: string
  frequency?: PMFrequency
  customIntervalDays?: number
  checklist?: unknown[]
  assignedTo?: string
  nextDueDate?: string
  createdBy: string
}

export type UpdatePMRequest = Partial<Omit<CreatePMRequest, 'createdBy'>> & {
  isActive?: boolean
  lastCompletedDate?: string
}

export type PMListResponse = PaginatedResponse<PMWithRelations>

export type PMQueryParams = {
  page?: number
  limit?: number
  projectId?: string
  assetId?: string
  isActive?: boolean
  search?: string
}

export type PMScheduleLog = {
  id: string
  pm_id: string
  work_order_id: string | null
  scheduled_date: string
  actual_date: string | null
  status: string
  notes: string | null
  completed_by: string | null
  created_at: string
}

// ─── FMS: Calibration ─────────────────────────────────────────────────────────

export type CalibrationStatus = 'PENDING' | 'IN_PROGRESS' | 'PASSED' | 'FAILED' | 'OVERDUE'

export type CalibrationRecord = {
  id: string
  asset_id: string
  calibration_date: string
  next_calibration_date: string | null
  performed_by: string | null
  certificate_url: string | null
  status: CalibrationStatus
  notes: string | null
  created_at: string
}

export type CalibrationWithAsset = CalibrationRecord & {
  asset: { id: string; asset_number: string; name: string }
}

export type CreateCalibrationRequest = {
  assetId: string
  calibrationDate: string
  nextCalibrationDate?: string
  performedBy?: string
  certificateUrl?: string
  status?: CalibrationStatus
  notes?: string
}

export type UpdateCalibrationRequest = Partial<CreateCalibrationRequest>

export type CalibrationListResponse = PaginatedResponse<CalibrationWithAsset>

export type CalibrationQueryParams = {
  page?: number
  limit?: number
  assetId?: string
  status?: CalibrationStatus | 'all'
  projectId?: string
}

// ─── FMS: Inventory & Stock Management ────────────────────────────────────────

export type StockMovementType = 'RECEIVED' | 'ISSUED' | 'RETURNED' | 'ADJUSTED' | 'TRANSFERRED'
export type GRNStatus = 'DRAFT' | 'RECEIVED' | 'INSPECTED' | 'ACCEPTED' | 'REJECTED'

export type InventoryCategory = {
  id: string
  name: string
  code: string
  description: string | null
  parent_id: string | null
  created_at: string
}

export type InventoryCategoryWithChildren = InventoryCategory & {
  children: InventoryCategory[]
  parent: InventoryCategory | null
  _count: { items: number }
}

export type InventoryItem = {
  id: string
  item_code: string
  name: string
  description: string | null
  category_id: string | null
  unit_of_measure: string | null
  current_stock: number
  minimum_stock: number | null
  maximum_stock: number | null
  reorder_point: number | null
  reorder_quantity: number | null
  unit_cost: number | null
  storage_location: string | null
  project_id: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export type InventoryItemWithRelations = InventoryItem & {
  category: InventoryCategory | null
  project: { id: string; name: string; code: string } | null
}

export type StockMovement = {
  id: string
  item_id: string
  movement_type: StockMovementType
  quantity: number
  reference_type: string | null
  reference_id: string | null
  from_location: string | null
  to_location: string | null
  notes: string | null
  performed_by: string | null
  created_at: string
}

export type StockMovementWithRelations = StockMovement & {
  item: { id: string; item_code: string; name: string }
  performer: { id: string; first_name: string; last_name: string } | null
}

export type StockIssueItem = {
  item_id: string
  item_code: string
  item_name: string
  quantity: number
  unit_cost: number | null
  unit_of_measure: string | null
}

export type StockIssue = {
  id: string
  issue_number: string
  work_order_id: string | null
  project_id: string | null
  items: StockIssueItem[]
  issued_to: string | null
  issued_by: string | null
  issue_date: string
  notes: string | null
  created_at: string
}

export type StockIssueWithRelations = StockIssue & {
  project: { id: string; name: string; code: string } | null
  issued_to_user: { id: string; first_name: string; last_name: string } | null
  issuer: { id: string; first_name: string; last_name: string } | null
}

export type GRNItem = {
  item_id: string
  item_code: string
  item_name: string
  quantity: number
  unit_cost: number | null
  unit_of_measure: string | null
}

export type GoodsReceivedNote = {
  id: string
  grn_number: string
  supplier_name: string
  items: GRNItem[]
  received_date: string
  received_by: string | null
  status: GRNStatus
  inspection_notes: string | null
  project_id: string | null
  created_at: string
  updated_at: string
}

export type GoodsReceivedNoteWithRelations = GoodsReceivedNote & {
  project: { id: string; name: string; code: string } | null
  receiver: { id: string; first_name: string; last_name: string } | null
}

// ─── Inventory Request/Response Types ─────────────────────────────────────────

export type CreateInventoryCategoryRequest = {
  name: string
  code: string
  description?: string
  parentId?: string
}

export type UpdateInventoryCategoryRequest = Partial<CreateInventoryCategoryRequest>

export type InventoryCategoryListResponse = PaginatedResponse<InventoryCategoryWithChildren>

export type CreateInventoryItemRequest = {
  name: string
  description?: string
  categoryId?: string
  unitOfMeasure?: string
  minimumStock?: number
  maximumStock?: number
  reorderPoint?: number
  reorderQuantity?: number
  unitCost?: number
  storageLocation?: string
  projectId?: string
}

export type UpdateInventoryItemRequest = Partial<CreateInventoryItemRequest> & {
  isActive?: boolean
}

export type InventoryItemListResponse = PaginatedResponse<InventoryItemWithRelations>

export type InventoryQueryParams = {
  page?: number
  limit?: number
  projectId?: string
  categoryId?: string
  lowStock?: boolean
  search?: string
  isActive?: boolean
}

export type CreateStockMovementRequest = {
  itemId: string
  movementType: StockMovementType
  quantity: number
  referenceType?: string
  referenceId?: string
  fromLocation?: string
  toLocation?: string
  notes?: string
  performedBy?: string
}

export type StockMovementListResponse = PaginatedResponse<StockMovementWithRelations>

export type CreateStockIssueRequest = {
  workOrderId?: string
  projectId?: string
  items: StockIssueItem[]
  issuedTo?: string
  issuedBy?: string
  issueDate: string
  notes?: string
}

export type UpdateStockIssueRequest = Partial<Omit<CreateStockIssueRequest, 'items'>>

export type StockIssueListResponse = PaginatedResponse<StockIssueWithRelations>

export type StockIssueQueryParams = {
  page?: number
  limit?: number
  projectId?: string
  search?: string
}

export type CreateGRNRequest = {
  supplierName: string
  items: GRNItem[]
  receivedDate: string
  receivedBy?: string
  inspectionNotes?: string
  projectId?: string
}

export type UpdateGRNRequest = Partial<Omit<CreateGRNRequest, 'items'>> & {
  status?: GRNStatus
  inspectionNotes?: string
}

export type GRNListResponse = PaginatedResponse<GoodsReceivedNoteWithRelations>

export type GRNQueryParams = {
  page?: number
  limit?: number
  projectId?: string
  status?: GRNStatus | 'all'
  search?: string
}

// ─── FMS: Procurement ─────────────────────────────────────────────────────────

export type PRStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'CONVERTED'
export type POStatus =
  | 'DRAFT'
  | 'ISSUED'
  | 'PARTIALLY_RECEIVED'
  | 'FULLY_RECEIVED'
  | 'CANCELLED'
  | 'CLOSED'

export type PRItem = {
  item_name: string
  description?: string
  quantity: number
  unit_of_measure?: string
  estimated_unit_price?: number
  total?: number
}

export type PurchaseRequest = {
  id: string
  pr_number: string
  title: string
  description?: string | null
  project_id?: string | null
  items: PRItem[]
  estimated_total?: number | null
  priority: string
  status: PRStatus
  requested_by: string
  approved_by?: string | null
  approved_at?: string | null
  notes?: string | null
  created_at: string
  updated_at: string
}

export type PurchaseRequestWithRelations = PurchaseRequest & {
  project: { id: string; name: string; code: string } | null
  requester: { id: string; first_name: string; last_name: string }
  approver: { id: string; first_name: string; last_name: string } | null
}

export type POItem = {
  item_name: string
  description?: string
  quantity: number
  unit_of_measure?: string
  unit_price: number
  total: number
}

export type PurchaseOrder = {
  id: string
  po_number: string
  pr_id?: string | null
  vendor_name: string
  project_id?: string | null
  items: POItem[]
  subtotal: number
  tax: number
  total: number
  status: POStatus
  delivery_date?: string | null
  payment_terms?: string | null
  notes?: string | null
  created_by: string
  approved_by?: string | null
  created_at: string
  updated_at: string
}

export type PurchaseOrderWithRelations = PurchaseOrder & {
  project: { id: string; name: string; code: string } | null
  purchase_request: PurchaseRequest | null
  creator: { id: string; first_name: string; last_name: string }
  approver: { id: string; first_name: string; last_name: string } | null
}

export type VQItem = {
  item_name: string
  quantity: number
  unit_price: number
  total: number
  lead_time_days?: number
}

export type VendorQuotation = {
  id: string
  quotation_number?: string | null
  vendor_name: string
  pr_id?: string | null
  items: VQItem[]
  total: number
  valid_until?: string | null
  notes?: string | null
  is_selected: boolean
  created_at: string
}

export type VendorQuotationWithRelations = VendorQuotation & {
  purchase_request: PurchaseRequest | null
}

// ─── Procurement Request/Response Types ───────────────────────────────────────

export type CreatePRRequest = {
  title: string
  description?: string
  projectId?: string
  items: PRItem[]
  estimatedTotal?: number
  priority?: string
  requestedBy: string
  notes?: string
}

export type UpdatePRRequest = Partial<Omit<CreatePRRequest, 'requestedBy'>>

export type PRListResponse = PaginatedResponse<PurchaseRequestWithRelations>

export type PRQueryParams = {
  page?: number
  limit?: number
  projectId?: string
  status?: PRStatus | 'all'
  search?: string
}

export type CreatePORequest = {
  prId?: string
  vendorName: string
  projectId?: string
  items: POItem[]
  deliveryDate?: string
  paymentTerms?: string
  notes?: string
  createdBy: string
}

export type UpdatePORequest = Partial<Omit<CreatePORequest, 'createdBy'>>

export type POListResponse = PaginatedResponse<PurchaseOrderWithRelations>

export type POQueryParams = {
  page?: number
  limit?: number
  projectId?: string
  status?: POStatus | 'all'
  prId?: string
  search?: string
}

export type CreateVQRequest = {
  quotationNumber?: string
  vendorName: string
  prId?: string
  items: VQItem[]
  validUntil?: string
  notes?: string
}

export type UpdateVQRequest = Partial<CreateVQRequest>

export type VQListResponse = PaginatedResponse<VendorQuotationWithRelations>

export type VQQueryParams = {
  page?: number
  limit?: number
  prId?: string
  search?: string
}

// ─── Vendor Domain ────────────────────────────────────────────────────────────

export const VENDOR_CATEGORIES = [
  'MAINTENANCE',
  'CLEANING',
  'SECURITY',
  'LANDSCAPING',
  'ELECTRICAL',
  'PLUMBING',
  'HVAC',
  'IT',
  'GENERAL',
  'OTHER',
] as const
export type VendorCategory = (typeof VENDOR_CATEGORIES)[number]

export type VendorStatus = 'ACTIVE' | 'INACTIVE' | 'BLACKLISTED' | 'PENDING_APPROVAL'
export type VendorContractStatus = 'DRAFT' | 'ACTIVE' | 'EXPIRED' | 'TERMINATED'

export type Vendor = {
  id: string
  vendor_code: string
  name: string
  tax_id?: string | null
  address?: string | null
  phone?: string | null
  email?: string | null
  website?: string | null
  contact_person?: string | null
  category?: string | null
  rating?: number | null
  status: VendorStatus
  bank_details: Record<string, unknown>
  notes?: string | null
  created_at: string
  updated_at: string
}

export type VendorContract = {
  id: string
  contract_number: string
  vendor_id: string
  title: string
  scope?: string | null
  start_date: string
  end_date: string
  value?: number | null
  payment_terms?: string | null
  status: VendorContractStatus
  document_url?: string | null
  project_id?: string | null
  created_at: string
  updated_at: string
}

export type VendorContractWithRelations = VendorContract & {
  vendor: { id: string; vendor_code: string; name: string }
  project: { id: string; name: string; code: string } | null
}

export type VendorItemPrice = {
  id: string
  vendor_id: string
  item_name: string
  item_code?: string | null
  unit_price: number
  currency: string
  valid_from?: string | null
  valid_until?: string | null
  is_active: boolean
  created_at: string
}

export type VendorInvoice = {
  id: string
  invoice_number: string
  vendor_id: string
  po_id?: string | null
  items: VendorInvoiceItem[]
  subtotal: number
  tax: number
  total: number
  invoice_date: string
  due_date?: string | null
  payment_status: string
  payment_date?: string | null
  notes?: string | null
  created_at: string
  updated_at: string
}

export type VendorInvoiceItem = {
  description: string
  quantity: number
  unit_price: number
  total: number
}

export type VendorInvoiceWithRelations = VendorInvoice & {
  vendor: { id: string; vendor_code: string; name: string }
}

// ─── Vendor Request/Response Types ────────────────────────────────────────────

export type CreateVendorRequest = {
  name: string
  taxId?: string
  address?: string
  phone?: string
  email?: string
  website?: string
  contactPerson?: string
  category?: string
  rating?: number
  status?: VendorStatus
  bankDetails?: Record<string, unknown>
  notes?: string
}

export type UpdateVendorRequest = {
  name?: string
  taxId?: string | null
  address?: string | null
  phone?: string | null
  email?: string | null
  website?: string | null
  contactPerson?: string | null
  category?: string | null
  rating?: number | null
  status?: VendorStatus
  bankDetails?: Record<string, unknown>
  notes?: string | null
}

export type VendorListResponse = PaginatedResponse<Vendor>

export type VendorQueryParams = {
  page?: number
  limit?: number
  status?: VendorStatus | 'all'
  category?: string
  search?: string
}

export type CreateVendorContractRequest = {
  vendorId: string
  title: string
  scope?: string
  startDate: string
  endDate: string
  value?: number
  paymentTerms?: string
  status?: VendorContractStatus
  documentUrl?: string
  projectId?: string
}

export type UpdateVendorContractRequest = Partial<Omit<CreateVendorContractRequest, 'vendorId'>>

export type VendorContractListResponse = PaginatedResponse<VendorContractWithRelations>

export type VendorContractQueryParams = {
  page?: number
  limit?: number
  vendorId?: string
  projectId?: string
  status?: VendorContractStatus | 'all'
  search?: string
}

export type CreateVendorItemPriceRequest = {
  vendorId: string
  itemName: string
  itemCode?: string
  unitPrice: number
  currency?: string
  validFrom?: string
  validUntil?: string
  isActive?: boolean
}

export type UpdateVendorItemPriceRequest = Partial<Omit<CreateVendorItemPriceRequest, 'vendorId'>>

export type VendorItemPriceListResponse = PaginatedResponse<VendorItemPrice>

export type CreateVendorInvoiceRequest = {
  invoiceNumber: string
  vendorId: string
  poId?: string
  items: VendorInvoiceItem[]
  subtotal: number
  tax: number
  total: number
  invoiceDate: string
  dueDate?: string
  notes?: string
}

export type UpdateVendorInvoiceRequest = Partial<Omit<CreateVendorInvoiceRequest, 'vendorId'>>

export type VendorInvoiceListResponse = PaginatedResponse<VendorInvoiceWithRelations>

export type VendorInvoiceQueryParams = {
  page?: number
  limit?: number
  vendorId?: string
  paymentStatus?: string
  search?: string
}
