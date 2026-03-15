import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { LanguageProvider, useLanguage } from './LanguageProvider'
import { en, th } from '../lib/translations'

function LanguageDisplay() {
  const { language, t, setLanguage } = useLanguage()
  return (
    <div>
      <span data-testid="lang">{language}</span>
      <span data-testid="dashboard-label">{t.dashboard}</span>
      <span data-testid="logout-label">{t.logout}</span>
      <button onClick={() => setLanguage('th')}>Switch to TH</button>
      <button onClick={() => setLanguage('en')}>Switch to EN</button>
    </div>
  )
}

describe('LanguageProvider', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('defaults to English', () => {
    render(
      <LanguageProvider>
        <LanguageDisplay />
      </LanguageProvider>,
    )
    expect(screen.getByTestId('lang').textContent).toBe('en')
    expect(screen.getByTestId('dashboard-label').textContent).toBe('Dashboard')
    expect(screen.getByTestId('logout-label').textContent).toBe('Logout')
  })

  it('switches to Thai and shows Thai labels', () => {
    render(
      <LanguageProvider>
        <LanguageDisplay />
      </LanguageProvider>,
    )
    fireEvent.click(screen.getByText('Switch to TH'))
    expect(screen.getByTestId('lang').textContent).toBe('th')
    expect(screen.getByTestId('logout-label').textContent).toBe('ออกจากระบบ')
  })

  it('persists language preference to localStorage', () => {
    render(
      <LanguageProvider>
        <LanguageDisplay />
      </LanguageProvider>,
    )
    fireEvent.click(screen.getByText('Switch to TH'))
    expect(localStorage.getItem('preferredLanguage')).toBe('th')
  })

  it('reads language preference from localStorage on mount', () => {
    localStorage.setItem('preferredLanguage', 'th')
    render(
      <LanguageProvider>
        <LanguageDisplay />
      </LanguageProvider>,
    )
    expect(screen.getByTestId('lang').textContent).toBe('th')
  })

  it('switches back to English', () => {
    render(
      <LanguageProvider>
        <LanguageDisplay />
      </LanguageProvider>,
    )
    fireEvent.click(screen.getByText('Switch to TH'))
    fireEvent.click(screen.getByText('Switch to EN'))
    expect(screen.getByTestId('lang').textContent).toBe('en')
    expect(screen.getByTestId('logout-label').textContent).toBe('Logout')
  })

  it('throws when useLanguage is used outside LanguageProvider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => render(<LanguageDisplay />)).toThrow()
    spy.mockRestore()
  })
})

describe('English translation dictionary', () => {
  it('has all common action keys', () => {
    expect(en.save).toBe('Save')
    expect(en.cancel).toBe('Cancel')
    expect(en.delete).toBe('Delete')
    expect(en.edit).toBe('Edit')
    expect(en.create).toBe('Create')
    expect(en.search).toBe('Search')
    expect(en.filter).toBe('Filter')
    expect(en.export).toBe('Export')
    expect(en.import).toBe('Import')
    expect(en.confirm).toBe('Confirm')
    expect(en.close).toBe('Close')
  })

  it('has all navigation keys', () => {
    expect(en.dashboard).toBe('Dashboard')
    expect(en.projects).toBe('Projects')
    expect(en.customers).toBe('Customers')
    expect(en.leads).toBe('Leads & Deals')
    expect(en.contracts).toBe('Contracts')
    expect(en.finance).toBe('Finance')
    expect(en.invoices).toBe('Invoices')
    expect(en.reports).toBe('Reports')
    expect(en.settings).toBe('Settings')
    expect(en.logout).toBe('Logout')
  })

  it('has all AR aging keys', () => {
    expect(en.arAgingTitle).toBe('AR Aging Report - Outstanding Receivables')
    expect(en.totalAR).toBe('Total AR')
    expect(en.agingBucket).toBe('Aging Bucket')
    expect(en.current).toBe('Current (0 days)')
    expect(en.days1to30).toBe('1-30 Days')
    expect(en.days31to60).toBe('31-60 Days')
    expect(en.days61to90).toBe('61-90 Days')
    expect(en.days90plus).toBe('90+ Days')
    expect(en.balanceDue).toBe('Balance Due')
    expect(en.daysOverdue).toBe('Days Overdue')
  })

  it('has dashboard widget keys', () => {
    expect(en.welcomeBack).toBe('Welcome back')
    expect(en.customizeDashboard).toBe('Customize Dashboard')
    expect(en.overdueInvoices).toBe('Overdue Invoices')
    expect(en.contractsExpiringSoon).toBe('Contracts Expiring Soon')
    expect(en.recentDeals).toBe('Recent Deals')
    expect(en.wonDealsThisMonth).toBe('Deals Won This Month')
    expect(en.totalCustomers).toBe('Total Customers')
    expect(en.pendingQuotations).toBe('Pending Quotations')
  })

  it('has project management keys', () => {
    expect(en.projectCode).toBe('Project Code')
    expect(en.projectName).toBe('Project Name')
    expect(en.projectType).toBe('Project Type')
    expect(en.projectCreatedSuccess).toBe('Project created successfully')
    expect(en.projectUpdatedSuccess).toBe('Project updated successfully')
    expect(en.projectDeletedSuccess).toBe('Project deleted successfully')
  })

  it('has customer form keys', () => {
    expect(en.companyName).toBe('Company Name')
    expect(en.contactPerson).toBe('Contact Person')
    expect(en.taxId).toBe('Tax ID')
    expect(en.pdpaConsent).toBe('PDPA Consent Received')
    expect(en.directCustomer).toBe('Direct Customer')
    expect(en.broker).toBe('Broker')
    expect(en.leadSource).toBe('Lead Source')
    expect(en.creditTerms).toBe('Credit Terms')
  })

  it('has contract list keys', () => {
    expect(en.contractsTitle).toBe('Contract List')
    expect(en.createContract).toBe('Create New Contract')
    expect(en.rentPerMonth).toBe('Rent/Month')
    expect(en.downloadHandover).toBe('Download Handover Document')
    expect(en.noContractsFound).toBe('No contracts found')
  })

  it('has invoice list keys', () => {
    expect(en.invoicesTitle).toBe('Invoices')
    expect(en.createInvoice).toBe('Create Invoice')
    expect(en.outstanding).toBe('Outstanding')
    expect(en.paidStatus).toBe('Paid')
    expect(en.overdueStatus).toBe('Overdue')
    expect(en.noInvoicesFound).toBe('No invoices found')
  })

  it('has status value keys', () => {
    expect(en.statusActive).toBe('Active')
    expect(en.statusInactive).toBe('Inactive')
    expect(en.statusPlanning).toBe('Planning')
    expect(en.statusUnderConstruction).toBe('Under Construction')
    expect(en.statusOnHold).toBe('On Hold')
    expect(en.statusCompleted).toBe('Completed')
  })

  it('preserves T-007 keys that are not in base44', () => {
    expect(en.myDashboard).toBe('My Dashboard')
    expect(en.financeCompanyDb).toBe('Finance Company DB')
    expect(en.meetingMinutes).toBe('Meeting Minutes')
    expect(en.isoDocumentControl).toBe('ISO Document Control')
    expect(en.profile).toBe('Profile')
    expect(en.myProfile).toBe('My Profile')
  })
})

describe('Thai translation dictionary', () => {
  it('has all common action keys in Thai', () => {
    expect(th.save).toBe('บันทึก')
    expect(th.cancel).toBe('ยกเลิก')
    expect(th.delete).toBe('ลบ')
    expect(th.edit).toBe('แก้ไข')
    expect(th.create).toBe('สร้าง')
    expect(th.search).toBe('ค้นหา')
    expect(th.filter).toBe('กรอง')
    expect(th.export).toBe('ส่งออก')
    expect(th.import).toBe('นำเข้า')
    expect(th.confirm).toBe('ยืนยัน')
    expect(th.close).toBe('ปิด')
  })

  it('has all navigation keys in Thai', () => {
    expect(th.dashboard).toBe('Dashboard')
    expect(th.projects).toBe('โครงการ')
    expect(th.customers).toBe('ลูกค้า')
    expect(th.contracts).toBe('สัญญา')
    expect(th.finance).toBe('การเงิน')
    expect(th.invoices).toBe('ใบแจ้งหนี้')
    expect(th.reports).toBe('รายงาน')
    expect(th.settings).toBe('ตั้งค่า')
    expect(th.logout).toBe('ออกจากระบบ')
  })

  it('has all AR aging keys in Thai', () => {
    expect(th.arAgingTitle).toBe('รายงาน AR Aging - ลูกหนี้คงค้าง')
    expect(th.totalAR).toBe('ยอด AR รวม')
    expect(th.current).toBe('ปัจจุบัน (0 วัน)')
    expect(th.days1to30).toBe('1-30 วัน')
    expect(th.days90plus).toBe('90+ วัน')
    expect(th.balanceDue).toBe('ยอดคงค้าง')
    expect(th.daysOverdue).toBe('จำนวนวันเกิน')
  })

  it('has dashboard widget keys in Thai', () => {
    expect(th.welcomeBack).toBe('ยินดีต้อนรับกลับมา')
    expect(th.overdueInvoices).toBe('ใบแจ้งหนี้ค้างชำระ')
    expect(th.contractsExpiringSoon).toBe('สัญญาใกล้หมดอายุ')
    expect(th.wonDealsThisMonth).toBe('Deals ที่ชนะในเดือนนี้')
    expect(th.totalCustomers).toBe('ลูกค้าทั้งหมด')
    expect(th.pendingQuotations).toBe('ใบเสนอราคารออนุมัติ')
  })

  it('has project keys in Thai', () => {
    expect(th.projectCode).toBe('รหัสโครงการ')
    expect(th.projectName).toBe('ชื่อโครงการ')
    expect(th.projectCreatedSuccess).toBe('สร้างโครงการสำเร็จ')
    expect(th.projectUpdatedSuccess).toBe('อัปเดตโครงการสำเร็จ')
    expect(th.projectDeletedSuccess).toBe('ลบโครงการสำเร็จ')
  })

  it('has customer form keys in Thai', () => {
    expect(th.companyName).toBe('ชื่อบริษัท')
    expect(th.contactPerson).toBe('ผู้ติดต่อหลัก')
    expect(th.taxId).toBe('เลขผู้เสียภาษี')
    expect(th.pdpaConsent).toBe('ได้รับความยินยอม PDPA')
    expect(th.directCustomer).toBe('ลูกค้าโดยตรง')
    expect(th.broker).toBe('นายหน้า')
    expect(th.creditTerms).toBe('เงื่อนไขเครดิต')
  })

  it('has status value keys in Thai', () => {
    expect(th.statusActive).toBe('ใช้งาน')
    expect(th.statusInactive).toBe('ไม่ใช้งาน')
    expect(th.statusPlanning).toBe('วางแผน')
    expect(th.statusUnderConstruction).toBe('ก่อสร้าง')
    expect(th.statusOnHold).toBe('พัก')
    expect(th.statusCompleted).toBe('เสร็จสิ้น')
  })

  it('preserves T-007 keys in Thai', () => {
    expect(th.myDashboard).toBe('Dashboard ของฉัน')
    expect(th.financeCompanyDb).toBe('ฐานข้อมูลบริษัท (การเงิน)')
    expect(th.meetingMinutes).toBe('บันทึกการประชุม')
    expect(th.profile).toBe('โปรไฟล์')
    expect(th.myProfile).toBe('โปรไฟล์ของฉัน')
  })
})
