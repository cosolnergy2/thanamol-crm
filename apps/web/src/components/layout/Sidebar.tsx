import React, { useState } from 'react'
import { Link, useRouterState } from '@tanstack/react-router'
import {
  LayoutDashboard,
  Users,
  Package,
  TrendingUp,
  FileText,
  FileSignature,
  DollarSign,
  Droplets,
  Wrench,
  FolderOpen,
  BarChart3,
  Settings,
  ChevronRight,
  ChevronDown,
  Building2,
  Calendar,
  Bell,
  LogOut,
  X,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useLanguage } from '@/providers/LanguageProvider'
import type { AuthUser } from '@thanamol/shared'

type NavSubItem = {
  label: string
  path: string
}

type NavItem = {
  label: string
  icon: React.ComponentType<{ className?: string }>
  path?: string
  permission: string
  submenu?: NavSubItem[]
}

function buildNavigation(t: ReturnType<typeof useLanguage>['t']): NavItem[] {
  return [
    {
      label: t.dashboard,
      icon: LayoutDashboard,
      path: '/',
      permission: 'dashboard',
    },
    {
      label: t.myDashboard,
      icon: LayoutDashboard,
      path: '/my-dashboard',
      permission: 'dashboard',
    },
    {
      label: t.projects,
      icon: Building2,
      path: '/projects',
      permission: 'projects',
    },
    {
      label: t.customers,
      icon: Users,
      permission: 'customers',
      submenu: [
        { label: t.customerList, path: '/customers' },
        { label: t.addNewCustomer, path: '/customers/create' },
        { label: t.contacts, path: '/contacts' },
      ],
    },
    {
      label: t.leads,
      icon: TrendingUp,
      permission: 'leads_deals',
      submenu: [
        { label: t.leadInbox, path: '/leads' },
        { label: t.dealPipeline, path: '/deals' },
      ],
    },
    {
      label: t.units,
      icon: Package,
      permission: 'units',
      submenu: [
        { label: t.unitList, path: '/units' },
        { label: t.byProject, path: '/units/by-project' },
        { label: t.availabilityTable, path: '/units/availability' },
      ],
    },
    {
      label: t.quotations,
      icon: FileText,
      permission: 'quotations',
      submenu: [
        { label: t.quotationList, path: '/quotations' },
        { label: t.pendingApproval, path: '/approvals' },
        { label: t.createNew, path: '/quotations/create' },
      ],
    },
    {
      label: t.contracts,
      icon: FileSignature,
      permission: 'contracts',
      submenu: [
        { label: t.contractList, path: '/contracts' },
        { label: t.pendingApproval, path: '/approvals' },
        { label: t.handover, path: '/contracts/handover' },
        { label: t.expiringSoon, path: '/contracts/expiring' },
      ],
    },
    {
      label: t.finance,
      icon: DollarSign,
      permission: 'finance',
      submenu: [
        { label: t.invoices, path: '/finance/invoices' },
        { label: t.receivePayment, path: '/finance/payments/receive' },
        { label: t.deposits, path: '/finance/deposits' },
        { label: t.arAging, path: '/finance/ar-aging' },
        { label: t.monthlyBilling, path: '/finance/monthly-billing' },
        { label: t.financeCompanyDb, path: '/finance/companies' },
      ],
    },
    {
      label: t.utilities,
      icon: Droplets,
      permission: 'utilities',
      submenu: [
        { label: t.meterReading, path: '/utilities/meter-reading' },
        { label: t.usageReport, path: '/utilities/report' },
      ],
    },
    {
      label: t.service,
      icon: Wrench,
      permission: 'service',
      submenu: [
        { label: t.ticketList, path: '/tickets' },
        { label: t.createTicket, path: '/tickets/create' },
      ],
    },
    {
      label: t.documents,
      icon: FolderOpen,
      path: '/documents',
      permission: 'documents',
    },
    {
      label: t.meetingMinutes,
      icon: FileText,
      permission: 'documents',
      submenu: [
        { label: t.minuteList, path: '/meetings' },
        { label: t.createNew, path: '/meetings/create' },
        { label: t.meetingTemplates, path: '/meetings/templates' },
      ],
    },
    {
      label: t.formList,
      icon: FileText,
      permission: 'documents',
      submenu: [
        { label: 'SALE-JOB01-F01: Warehouse Requirement', path: '/forms/sale-f01' },
        { label: 'SALE-JOB01-F02: Commercial Quotation', path: '/forms/sale-f02' },
        { label: 'SALE-JOB02-F01: Lease Agreement', path: '/forms/sale-job02-f01' },
        { label: 'SALE-JOB03-F01: Pre-Handover Inspection', path: '/forms/sale-job03-f01' },
        { label: 'SALE-JOB04-F01: ใบแจ้งหนี้', path: '/forms/sale-job04-f01' },
        { label: 'SALE-JOB04-F02: ใบส่งมอบพื้นที่', path: '/forms/handover' },
        { label: 'SALE-JOB04-F03: ภาพส่งมอบพื้นที่', path: '/forms/handover-photos' },
      ],
    },
    {
      label: t.notifications,
      icon: Bell,
      path: '/tasks/notifications',
      permission: 'dashboard',
    },
    {
      label: t.eventCalendar,
      icon: Calendar,
      path: '/calendar/events',
      permission: 'dashboard',
    },
    {
      label: t.projectCustomerOverview,
      icon: FileText,
      path: '/projects/customer-overview',
      permission: 'customers',
    },
    {
      label: t.reports,
      icon: BarChart3,
      permission: 'reports',
      submenu: [
        { label: 'Analytics Hub', path: '/reports' },
        { label: t.customReports, path: '/reports/custom' },
        { label: t.salesReport, path: '/reports/sales' },
        { label: t.revenueReport, path: '/reports/revenue' },
        { label: t.occupancy, path: '/reports/occupancy' },
        { label: t.collection, path: '/reports/collection' },
      ],
    },
    {
      label: t.companyDatabase,
      icon: Building2,
      path: '/companies',
      permission: 'customers',
    },
    {
      label: t.settings,
      icon: Settings,
      permission: 'settings',
      submenu: [
        { label: t.users, path: '/settings/users' },
        { label: t.rolesPermissions, path: '/settings/roles' },
        { label: t.isoDocumentControl, path: '/documents/iso' },
        { label: t.projectTemplates, path: '/settings/projects' },
        { label: t.taskStatuses, path: '/tasks/status-settings' },
        { label: t.databaseExport, path: '/settings/export' },
        { label: t.clientAccounts, path: '/clients' },
        { label: t.clientRequests, path: '/clients/portal' },
        { label: t.automationRules, path: '/tasks/automation' },
        { label: t.userAuditLog, path: '/settings/audit' },
        { label: t.activityLog, path: '/settings/activity-log' },
        { label: t.systemSettings, path: '/settings/system' },
        { label: t.pdfTemplates, path: '/settings/pdf-template' },
      ],
    },
  ]
}

const ADMIN_ROLE = 'admin'

function userHasPermission(user: AuthUser | null, permission: string): boolean {
  if (!user) return false
  if (user.roles.some((r) => r.name === ADMIN_ROLE)) return true
  return user.roles.some((r) => r.name === permission)
}

type SidebarProps = {
  user: AuthUser | null
  isOpen: boolean
  isCollapsed: boolean
  onClose: () => void
  onLogout: () => void
}

export function Sidebar({ user, isOpen, isCollapsed, onClose, onLogout }: SidebarProps) {
  const { t } = useLanguage()
  const routerState = useRouterState()
  const currentPath = routerState.location.pathname
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({})

  const navigation = buildNavigation(t).filter((item) =>
    userHasPermission(user, item.permission),
  )

  function isPathActive(path: string): boolean {
    if (path === '/') return currentPath === '/'
    return currentPath === path || currentPath.startsWith(path + '/')
  }

  function isSubmenuActive(submenu: NavSubItem[]): boolean {
    return submenu.some((item) => isPathActive(item.path))
  }

  function toggleMenu(label: string) {
    setExpandedMenus((prev) => ({ ...prev, [label]: !prev[label] }))
  }

  const userInitial =
    user?.firstName?.charAt(0) ?? user?.email?.charAt(0)?.toUpperCase() ?? '?'
  const userDisplayName = user ? `${user.firstName} ${user.lastName}`.trim() : ''
  const userRole = user?.roles?.[0]?.name ?? 'User'

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/30 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed top-0 left-0 z-40 h-screen transition-all duration-300 bg-white/80 backdrop-blur-xl border-r border-slate-100 flex flex-col
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          ${isCollapsed ? 'w-16' : 'w-64'}
        `}
      >
        {/* Logo */}
        <div className={`border-b border-slate-100 ${isCollapsed ? 'px-2 py-6' : 'px-6 py-6'}`}>
          <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'space-x-4 mb-4'}`}>
            <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-indigo-500 to-teal-500 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <span className="text-white text-sm font-semibold tracking-wider">PF</span>
            </div>
            {!isCollapsed && (
              <span className="text-xl font-extralight tracking-widest text-slate-700">PropertyFlow</span>
            )}
          </div>
          {!isCollapsed && user && (
            <div className="ml-1">
              <p className="text-xs font-extralight text-slate-500 tracking-wider">{userDisplayName || user.email}</p>
              <p className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase mt-1">{userRole}</p>
            </div>
          )}
          {/* Mobile close button */}
          <button
            className="absolute top-4 right-4 lg:hidden p-1 rounded-md hover:bg-slate-100 transition-colors"
            onClick={onClose}
            aria-label="Close sidebar"
          >
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
          {navigation.map((item) => {
            const Icon = item.icon

            if (item.submenu) {
              const hasActive = isSubmenuActive(item.submenu)
              const isExpanded = expandedMenus[item.label] ?? hasActive

              if (isCollapsed) {
                return (
                  <div
                    key={item.label}
                    title={item.label}
                    className={`flex items-center justify-center w-full px-2 py-3 rounded-lg transition-all duration-200 ${
                      hasActive
                        ? 'bg-indigo-50 text-indigo-600'
                        : 'text-slate-500 hover:bg-slate-100/80 hover:text-slate-700'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                )
              }

              return (
                <div key={item.label}>
                  <button
                    onClick={() => toggleMenu(item.label)}
                    className={`flex items-center justify-between w-full px-4 py-3 text-sm rounded-lg transition-all duration-200 ${
                      hasActive
                        ? 'bg-slate-50 text-slate-700 border border-slate-200'
                        : 'text-slate-500 hover:bg-slate-100/80 hover:text-slate-700'
                    }`}
                  >
                    <div className="flex items-center">
                      <Icon
                        className={`w-4 h-4 mr-3 ${hasActive ? 'text-indigo-500' : 'text-slate-400'}`}
                      />
                      <span className="font-extralight tracking-wider">{item.label}</span>
                    </div>
                    <ChevronRight
                      className={`w-3 h-3 transition-transform duration-300 ${isExpanded ? 'rotate-90' : ''} ${
                        hasActive ? 'text-slate-600' : 'text-slate-300'
                      }`}
                    />
                  </button>

                  {isExpanded && (
                    <div className="ml-7 mt-1 space-y-0.5 pl-4 border-l border-slate-100">
                      {item.submenu.map((subItem) => {
                        const subActive = isPathActive(subItem.path)
                        return (
                          <Link
                            key={subItem.path}
                            to={subItem.path}
                            className={`block px-4 py-2 text-xs rounded-lg transition-all duration-200 ${
                              subActive
                                ? 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                                : 'text-slate-400 hover:bg-slate-100/80 hover:text-slate-600'
                            }`}
                          >
                            <span className="font-extralight tracking-wider">{subItem.label}</span>
                          </Link>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            }

            const active = item.path ? isPathActive(item.path) : false

            if (isCollapsed) {
              return (
                <Link
                  key={item.label}
                  to={item.path ?? '/'}
                  title={item.label}
                  className={`flex items-center justify-center px-2 py-3 rounded-lg transition-all duration-200 ${
                    active
                      ? 'bg-indigo-50 text-indigo-600'
                      : 'text-slate-500 hover:bg-slate-100/80 hover:text-slate-700'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </Link>
              )
            }

            return (
              <Link
                key={item.label}
                to={item.path ?? '/'}
                className={`flex items-center px-4 py-3 text-sm rounded-lg transition-all duration-200 ${
                  active
                    ? 'bg-slate-50 text-slate-700 border border-slate-200'
                    : 'text-slate-500 hover:bg-slate-100/80 hover:text-slate-700'
                }`}
              >
                <Icon
                  className={`w-4 h-4 mr-3 ${active ? 'text-indigo-500' : 'text-slate-400'}`}
                />
                <span className="font-extralight tracking-wider">{item.label}</span>
              </Link>
            )
          })}
        </nav>

        {/* User profile bottom section */}
        {user && !isCollapsed && (
          <div className="p-4 border-t border-slate-100">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center w-full px-3 py-2 rounded-lg hover:bg-slate-50 transition-all duration-200 text-left" aria-label="User menu">
                  <div className="flex-shrink-0 w-8 h-8 bg-indigo-50 border border-indigo-100 rounded-full flex items-center justify-center">
                    <span className="text-indigo-600 text-sm font-light">{userInitial}</span>
                  </div>
                  <div className="ml-3 flex-1 min-w-0">
                    <p className="text-sm font-light text-slate-700 truncate">{userDisplayName || 'User'}</p>
                    <p className="text-xs text-slate-400 font-extralight truncate">{userRole}</p>
                  </div>
                  <ChevronDown className="w-3 h-3 text-slate-300 flex-shrink-0" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>{user.email}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onLogout}>
                  <LogOut className="w-4 h-4 mr-2" />
                  {t.logout}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        {user && isCollapsed && (
          <div className="p-2 border-t border-slate-100">
            <button
              onClick={onLogout}
              title={t.logout}
              className="flex items-center justify-center w-full p-2 rounded-lg hover:bg-slate-50 transition-all duration-200"
            >
              <div className="w-7 h-7 bg-indigo-50 border border-indigo-100 rounded-full flex items-center justify-center">
                <span className="text-indigo-600 text-xs font-light">{userInitial}</span>
              </div>
            </button>
          </div>
        )}
      </aside>
    </>
  )
}
