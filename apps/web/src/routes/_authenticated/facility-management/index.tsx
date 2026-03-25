import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import {
  Factory,
  Wrench,
  Calendar,
  Package,
  AlertTriangle,
  DollarSign,
  Users,
  Car,
  Clock,
  CheckCircle,
  XCircle,
  TrendingDown,
  BarChart3,
  ArrowRight,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useProjects } from '@/hooks/useProjects'
import { useFMSDashboardSummary, useFMSRecentActivity } from '@/hooks/useFMSDashboard'
import type { FMSDashboardSummary } from '@thanamol/shared'

export const Route = createFileRoute('/_authenticated/facility-management/')({
  component: FacilityManagementDashboard,
})

const WO_STATUS_STYLES: Record<string, string> = {
  OPEN: 'bg-amber-50 text-amber-700 border-amber-200',
  IN_PROGRESS: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  COMPLETED: 'bg-teal-50 text-teal-700 border-teal-200',
  CANCELLED: 'bg-slate-100 text-slate-500 border-slate-200',
}

const INCIDENT_SEVERITY_STYLES: Record<string, string> = {
  MINOR: 'bg-slate-50 text-slate-700 border-slate-200',
  MODERATE: 'bg-amber-50 text-amber-700 border-amber-200',
  MAJOR: 'bg-orange-50 text-orange-700 border-orange-200',
  CRITICAL: 'bg-rose-50 text-rose-700 border-rose-200',
}

type SummaryCardProps = {
  icon: React.ElementType
  label: string
  primary: string | number
  secondary?: string
  accent: string
  href?: string
  isLoading?: boolean
}

function SummaryCard({ icon: Icon, label, primary, secondary, accent, href, isLoading }: SummaryCardProps) {
  const inner = (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <CardContent className="p-0">
        <div className={`bg-gradient-to-br ${accent} p-4`}>
          <div className="mb-2">
            <div className="p-2 rounded-lg bg-white/20 inline-block">
              <Icon className="w-4 h-4 text-white" />
            </div>
          </div>
          <p className="text-[10px] text-white/80 uppercase tracking-widest font-extralight">
            {label}
          </p>
          {isLoading ? (
            <Skeleton className="h-7 w-16 mt-1 bg-white/30" />
          ) : (
            <p className="text-2xl font-light text-white mt-0.5">{primary}</p>
          )}
          {secondary && (
            <p className="text-[10px] text-white/70 mt-0.5">{secondary}</p>
          )}
        </div>
      </CardContent>
    </Card>
  )

  if (!href) return inner
  return <Link to={href as Parameters<typeof Link>[0]['to']}>{inner}</Link>
}

function buildSummaryCards(summary: FMSDashboardSummary | undefined, isLoading: boolean) {
  return [
    {
      icon: Factory,
      label: 'Assets',
      primary: summary?.assets.total ?? 0,
      secondary: `${summary?.assets.operational ?? 0} operational`,
      accent: 'from-indigo-500 to-indigo-700',
      href: '/facility-management/assets',
    },
    {
      icon: Wrench,
      label: 'Work Orders',
      primary: summary?.workOrders.total ?? 0,
      secondary: `${summary?.workOrders.open ?? 0} open`,
      accent: 'from-amber-500 to-amber-700',
      href: '/facility-management/work-orders',
    },
    {
      icon: Calendar,
      label: 'Preventive Maint.',
      primary: summary?.preventiveMaintenance.active ?? 0,
      secondary: summary?.preventiveMaintenance.overdue
        ? `${summary.preventiveMaintenance.overdue} overdue`
        : 'none overdue',
      accent: summary?.preventiveMaintenance.overdue
        ? 'from-rose-500 to-rose-700'
        : 'from-teal-500 to-teal-700',
      href: '/facility-management/preventive-maintenance',
    },
    {
      icon: Package,
      label: 'Inventory',
      primary: summary?.inventory.totalItems ?? 0,
      secondary: summary?.inventory.lowStock
        ? `${summary.inventory.lowStock} low stock`
        : 'stock levels ok',
      accent: summary?.inventory.lowStock
        ? 'from-orange-500 to-orange-700'
        : 'from-emerald-500 to-emerald-700',
      href: '/facility-management/inventory',
    },
    {
      icon: AlertTriangle,
      label: 'Incidents',
      primary: (summary?.incidents.open ?? 0) + (summary?.incidents.investigating ?? 0),
      secondary: `${summary?.incidents.investigating ?? 0} investigating`,
      accent:
        (summary?.incidents.open ?? 0) > 0
          ? 'from-rose-500 to-rose-700'
          : 'from-slate-500 to-slate-700',
      href: '/facility-management/compliance',
    },
    {
      icon: DollarSign,
      label: 'Budget Approved',
      primary: formatCurrency(summary?.budgets.totalApproved ?? 0),
      secondary: `${formatCurrency(summary?.budgets.totalActual ?? 0)} actual`,
      accent: 'from-violet-500 to-violet-700',
      href: '/facility-management/budget',
    },
    {
      icon: Users,
      label: 'Active Vendors',
      primary: summary?.vendors.active ?? 0,
      secondary: 'vendor relationships',
      accent: 'from-sky-500 to-sky-700',
      href: '/facility-management/vendors',
    },
    {
      icon: Car,
      label: "Today's Visitors",
      primary: summary?.visitors.todayCheckedIn ?? 0,
      secondary: 'checked in today',
      accent: 'from-pink-500 to-pink-700',
      href: '/facility-management/visitors',
    },
  ]
}

function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `฿${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `฿${(value / 1_000).toFixed(0)}K`
  return `฿${value.toFixed(0)}`
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function RecentActivityTimeline({ projectId }: { projectId?: string }) {
  const { data, isLoading } = useFMSRecentActivity(projectId)
  const activity = data?.activity

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    )
  }

  const items: Array<{
    id: string
    label: string
    status: string
    statusStyle: string
    time: string
    icon: React.ElementType
    iconColor: string
  }> = []

  for (const wo of activity?.workOrders.slice(0, 5) ?? []) {
    items.push({
      id: `wo-${wo.id}`,
      label: `[${wo.wo_number}] ${wo.title}`,
      status: wo.status.replace('_', ' '),
      statusStyle: WO_STATUS_STYLES[wo.status] ?? 'bg-slate-50 text-slate-700 border-slate-200',
      time: formatTimestamp(wo.created_at),
      icon: Wrench,
      iconColor: 'text-amber-500',
    })
  }

  for (const inc of activity?.incidents.slice(0, 3) ?? []) {
    items.push({
      id: `inc-${inc.id}`,
      label: `[${inc.incident_number}] ${inc.title}`,
      status: inc.severity,
      statusStyle:
        INCIDENT_SEVERITY_STYLES[inc.severity] ?? 'bg-slate-50 text-slate-700 border-slate-200',
      time: formatTimestamp(inc.created_at),
      icon: AlertTriangle,
      iconColor: 'text-rose-500',
    })
  }

  for (const pm of activity?.pmLogs.slice(0, 3) ?? []) {
    items.push({
      id: `pm-${pm.id}`,
      label: pm.pm.title,
      status: pm.status,
      statusStyle: pm.status === 'COMPLETED'
        ? 'bg-teal-50 text-teal-700 border-teal-200'
        : 'bg-slate-50 text-slate-700 border-slate-200',
      time: formatTimestamp(pm.created_at),
      icon: CheckCircle,
      iconColor: 'text-teal-500',
    })
  }

  for (const sm of activity?.stockMovements.slice(0, 3) ?? []) {
    items.push({
      id: `sm-${sm.id}`,
      label: `${sm.item.name} (${sm.movement_type})`,
      status: `qty: ${sm.quantity}`,
      statusStyle: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      time: formatTimestamp(sm.created_at),
      icon: Package,
      iconColor: 'text-indigo-500',
    })
  }

  items.sort((a, b) => (b.time > a.time ? 1 : -1))

  if (items.length === 0) {
    return (
      <div className="py-8 text-center text-slate-400">
        <Clock className="w-8 h-8 mx-auto mb-2 opacity-40" />
        <p className="text-xs font-light">No recent activity</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {items.slice(0, 10).map((item) => {
        const Icon = item.icon
        return (
          <div
            key={item.id}
            className="flex items-center gap-3 px-3 py-2 rounded-lg border border-slate-100 bg-white hover:border-slate-200 transition-colors"
          >
            <div className="flex-shrink-0">
              <Icon className={`w-3.5 h-3.5 ${item.iconColor}`} />
            </div>
            <p className="flex-1 text-[11px] font-light text-slate-700 truncate">{item.label}</p>
            <Badge
              variant="outline"
              className={`text-[9px] h-4 px-1.5 font-extralight flex-shrink-0 ${item.statusStyle}`}
            >
              {item.status}
            </Badge>
            <span className="text-[10px] text-slate-400 flex-shrink-0 hidden sm:block">
              {item.time}
            </span>
          </div>
        )
      })}
    </div>
  )
}

function FacilityManagementDashboard() {
  const { data: projectsData } = useProjects({ limit: 50 })
  const projects = projectsData?.data ?? []

  const [selectedProjectId, setSelectedProjectId] = useState<string>('')

  const projectId = selectedProjectId || projects[0]?.id || undefined

  const { data: summaryData, isLoading: summaryLoading } = useFMSDashboardSummary(projectId)
  const summary = summaryData?.summary

  const cards = buildSummaryCards(summary, summaryLoading)

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-extralight tracking-[0.3em] text-slate-600 uppercase">
            Facility Management
          </h1>
          <div className="h-px w-20 bg-gradient-to-r from-slate-300 to-transparent mt-2" />
          <p className="mt-2 text-xs text-slate-400 font-extralight">
            Operations dashboard — assets, maintenance, inventory &amp; compliance
          </p>
        </div>

        <div className="flex items-center gap-3">
          {projects.length > 0 && (
            <Select
              value={selectedProjectId || projects[0]?.id || ''}
              onValueChange={setSelectedProjectId}
            >
              <SelectTrigger className="w-48 h-8 text-xs">
                <SelectValue placeholder="Select project" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id} className="text-xs">
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Link to="/facility-management/reports">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 transition-colors cursor-pointer">
              <BarChart3 className="w-3.5 h-3.5 text-indigo-600" />
              <span className="text-[11px] font-light text-indigo-700">Reports</span>
              <ArrowRight className="w-3 h-3 text-indigo-500" />
            </div>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {cards.map((card) => (
          <SummaryCard
            key={card.label}
            icon={card.icon}
            label={card.label}
            primary={card.primary}
            secondary={card.secondary}
            accent={card.accent}
            href={card.href}
            isLoading={summaryLoading}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-extralight text-slate-500 uppercase tracking-widest">
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <RecentActivityTimeline projectId={projectId} />
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-extralight text-slate-500 uppercase tracking-widest">
                Asset Health
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {summaryLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-8 w-full" />
                  ))}
                </div>
              ) : (
                <>
                  <AssetHealthBar
                    label="Operational"
                    count={summary?.assets.operational ?? 0}
                    total={summary?.assets.total ?? 0}
                    color="bg-teal-400"
                    icon={CheckCircle}
                    iconColor="text-teal-500"
                  />
                  <AssetHealthBar
                    label="Under Maintenance"
                    count={summary?.assets.underMaintenance ?? 0}
                    total={summary?.assets.total ?? 0}
                    color="bg-amber-400"
                    icon={Wrench}
                    iconColor="text-amber-500"
                  />
                  <AssetHealthBar
                    label="Out of Service"
                    count={summary?.assets.outOfService ?? 0}
                    total={summary?.assets.total ?? 0}
                    color="bg-rose-400"
                    icon={XCircle}
                    iconColor="text-rose-500"
                  />
                  <div className="pt-2 border-t border-slate-100">
                    <div className="flex items-center gap-2">
                      <TrendingDown className="w-3.5 h-3.5 text-orange-500" />
                      <span className="text-[11px] font-light text-slate-600">
                        {summary?.inventory.lowStock ?? 0} inventory items low
                      </span>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="mt-3">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-extralight text-slate-500 uppercase tracking-widest">
                Quick Navigation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-1.5">
                {QUICK_NAV_LINKS.map((link) => {
                  const Icon = link.icon
                  return (
                    <Link key={link.href} to={link.href as Parameters<typeof Link>[0]['to']}>
                      <div className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 transition-colors cursor-pointer group">
                        <Icon className="w-3 h-3 text-slate-400 group-hover:text-indigo-500" />
                        <span className="text-[10px] font-light text-slate-600 group-hover:text-indigo-600 truncate">
                          {link.label}
                        </span>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

type AssetHealthBarProps = {
  label: string
  count: number
  total: number
  color: string
  icon: React.ElementType
  iconColor: string
}

function AssetHealthBar({ label, count, total, color, icon: Icon, iconColor }: AssetHealthBarProps) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Icon className={`w-3.5 h-3.5 ${iconColor}`} />
          <span className="text-[11px] font-light text-slate-600">{label}</span>
        </div>
        <span className="text-[11px] text-slate-500">
          {count} <span className="text-slate-400">({pct}%)</span>
        </span>
      </div>
      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

const QUICK_NAV_LINKS = [
  { label: 'Zones', href: '/facility-management/zones', icon: Factory },
  { label: 'Work Orders', href: '/facility-management/work-orders', icon: Wrench },
  { label: 'PM', href: '/facility-management/preventive-maintenance', icon: Calendar },
  { label: 'Vendors', href: '/facility-management/vendors', icon: Users },
  { label: 'Budget', href: '/facility-management/budget', icon: DollarSign },
  { label: 'Compliance', href: '/facility-management/compliance', icon: AlertTriangle },
  { label: 'Security', href: '/facility-management/security', icon: Users },
  { label: 'Visitors', href: '/facility-management/visitors', icon: Car },
] as const
