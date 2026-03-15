import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'

const STORAGE_KEY = 'preferredLanguage'

type Language = 'en' | 'th'

type Translations = typeof en

const en = {
  // Common
  save: 'Save',
  cancel: 'Cancel',
  delete: 'Delete',
  edit: 'Edit',
  create: 'Create',
  search: 'Search',
  filter: 'Filter',
  export: 'Export',
  import: 'Import',
  loading: 'Loading...',
  noData: 'No Data',
  confirm: 'Confirm',
  close: 'Close',

  // Navigation
  dashboard: 'Dashboard',
  myDashboard: 'My Dashboard',
  projects: 'Projects',
  customers: 'Customers',
  customerList: 'Customer List',
  addNewCustomer: 'Add New Customer',
  contacts: 'Contacts',
  leads: 'Leads & Deals',
  leadInbox: 'Lead Inbox',
  dealPipeline: 'Deal Pipeline',
  units: 'Units/Products',
  unitList: 'Unit List',
  byProject: 'By Project',
  availabilityTable: 'Availability',
  quotations: 'Quotations',
  quotationList: 'Quotation List',
  pendingApproval: 'Pending Approval',
  createNew: 'Create New',
  contracts: 'Contracts',
  contractList: 'Contract List',
  handover: 'Handover',
  expiringSoon: 'Expiring Soon',
  finance: 'Finance',
  invoices: 'Invoices',
  receivePayment: 'Receive Payment',
  deposits: 'Deposits',
  arAging: 'AR Aging',
  monthlyBilling: 'Monthly Billing',
  financeCompanyDb: 'Finance Company DB',
  utilities: 'Utilities',
  meterReading: 'Meter Reading',
  usageReport: 'Usage Report',
  service: 'Service',
  ticketList: 'Ticket List',
  createTicket: 'Create Ticket',
  documents: 'Documents',
  meetingMinutes: 'Meeting Minutes',
  minuteList: 'Minute List',
  meetingTemplates: 'Templates',
  formList: 'Form List',
  notifications: 'Notifications',
  eventCalendar: 'Event Calendar',
  projectCustomerOverview: 'Project Overview',
  reports: 'Reports',
  customReports: 'Custom Reports',
  salesReport: 'Sales Report',
  revenueReport: 'Revenue Report',
  occupancy: 'Occupancy',
  collection: 'Collection',
  companyDatabase: 'Company Database',
  settings: 'Settings',
  users: 'Users',
  rolesPermissions: 'Roles & Permissions',
  isoDocumentControl: 'ISO Document Control',
  projectTemplates: 'Project Templates',
  taskStatuses: 'Task Statuses',
  databaseExport: 'Database Export',
  clientAccounts: 'Client Accounts',
  clientRequests: 'Client Requests',
  automationRules: 'Automation Rules',
  userAuditLog: 'User Audit Log',
  activityLog: 'Activity Log',
  systemSettings: 'System Settings',
  pdfTemplates: 'PDF Templates',
  logout: 'Logout',
  searchPlaceholder: 'Search customers, contracts, invoices...',
  noNewNotifications: 'No new notifications',
  viewAll: 'View All',

  // Auth / Profile
  profile: 'Profile',
  myProfile: 'My Profile',
}

const th: Translations = {
  // Common
  save: 'บันทึก',
  cancel: 'ยกเลิก',
  delete: 'ลบ',
  edit: 'แก้ไข',
  create: 'สร้าง',
  search: 'ค้นหา',
  filter: 'กรอง',
  export: 'ส่งออก',
  import: 'นำเข้า',
  loading: 'กำลังโหลด...',
  noData: 'ไม่มีข้อมูล',
  confirm: 'ยืนยัน',
  close: 'ปิด',

  // Navigation
  dashboard: 'Dashboard',
  myDashboard: 'Dashboard ของฉัน',
  projects: 'โครงการ',
  customers: 'ลูกค้า',
  customerList: 'รายการลูกค้า',
  addNewCustomer: 'เพิ่มลูกค้าใหม่',
  contacts: 'ผู้ติดต่อ',
  leads: 'Leads & Deals',
  leadInbox: 'Lead Inbox',
  dealPipeline: 'Deal Pipeline',
  units: 'พื้นที่/สินค้า',
  unitList: 'รายการยูนิต',
  byProject: 'ตามโครงการ',
  availabilityTable: 'ตารางว่าง',
  quotations: 'ใบเสนอราคา',
  quotationList: 'รายการใบเสนอราคา',
  pendingApproval: 'รออนุมัติ',
  createNew: 'สร้างใหม่',
  contracts: 'สัญญา',
  contractList: 'รายการสัญญา',
  handover: 'ส่งมอบพื้นที่',
  expiringSoon: 'ใกล้หมดอายุ',
  finance: 'การเงิน',
  invoices: 'ใบแจ้งหนี้',
  receivePayment: 'รับชำระเงิน',
  deposits: 'เงินประกัน',
  arAging: 'AR Aging',
  monthlyBilling: 'สร้างบิลรายเดือน',
  financeCompanyDb: 'ฐานข้อมูลบริษัท (การเงิน)',
  utilities: 'ค่าน้ำ/ค่าไฟ',
  meterReading: 'บันทึกมิเตอร์',
  usageReport: 'รายงานการใช้',
  service: 'งานบริการ',
  ticketList: 'รายการ Ticket',
  createTicket: 'สร้าง Ticket',
  documents: 'เอกสาร',
  meetingMinutes: 'บันทึกการประชุม',
  minuteList: 'รายการบันทึก',
  meetingTemplates: 'เทมเพลต',
  formList: 'แบบฟอร์ม',
  notifications: 'การแจ้งเตือน',
  eventCalendar: 'ปฏิทินกิจกรรม',
  projectCustomerOverview: 'ภาพรวมเอกสาร',
  reports: 'รายงาน',
  customReports: 'สร้างรายงานแบบกำหนดเอง',
  salesReport: 'รายงานขาย',
  revenueReport: 'รายงานรายได้',
  occupancy: 'Occupancy',
  collection: 'Collection',
  companyDatabase: 'ฐานข้อมูลบริษัท',
  settings: 'ตั้งค่า',
  users: 'ผู้ใช้งาน',
  rolesPermissions: 'บทบาทและสิทธิ์',
  isoDocumentControl: 'ISO Document Control',
  projectTemplates: 'Project Templates',
  taskStatuses: 'Task Statuses',
  databaseExport: 'Database Export',
  clientAccounts: 'จัดการบัญชี Client',
  clientRequests: 'คำขอจาก Client',
  automationRules: 'กฎอัตโนมัติ',
  userAuditLog: 'User Audit Log',
  activityLog: 'Activity Log',
  systemSettings: 'ตั้งค่าระบบ',
  pdfTemplates: 'ตั้งค่าเทมเพลต PDF',
  logout: 'ออกจากระบบ',
  searchPlaceholder: 'ค้นหาลูกค้า, สัญญา, ใบแจ้งหนี้...',
  noNewNotifications: 'ไม่มีการแจ้งเตือนใหม่',
  viewAll: 'ดูทั้งหมด',

  // Auth / Profile
  profile: 'โปรไฟล์',
  myProfile: 'โปรไฟล์ของฉัน',
}

const TRANSLATIONS: Record<Language, Translations> = { en, th }

type LanguageContextValue = {
  language: Language
  setLanguage: (lang: Language) => void
  t: Translations
}

const LanguageContext = createContext<LanguageContextValue | null>(null)

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored === 'th' || stored === 'en' ? stored : 'en'
  })

  const setLanguage = useCallback((lang: Language) => {
    localStorage.setItem(STORAGE_KEY, lang)
    setLanguageState(lang)
  }, [])

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'th' || stored === 'en') {
      setLanguageState(stored)
    }
  }, [])

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t: TRANSLATIONS[language] }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext)
  if (!ctx) {
    throw new Error('useLanguage must be used within LanguageProvider')
  }
  return ctx
}
