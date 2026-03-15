import { createFileRoute, Link } from '@tanstack/react-router'
import { TrendingUp, Building2, DollarSign, CreditCard, BarChart3 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/providers/AuthProvider'
import { useSalesReport, useRevenueReport, useOccupancyReport } from '@/hooks/useReports'

export const Route = createFileRoute('/_authenticated/')({
  component: DashboardPage,
})

function formatCurrencyShort(value: number): string {
  if (value >= 1_000_000) return `฿${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `฿${(value / 1_000).toFixed(0)}K`
  return `฿${value.toFixed(0)}`
}

type SummaryWidgetProps = {
  icon: React.ElementType
  label: string
  value: string
  sub?: string
  href: string
  gradient: string
  isLoading: boolean
}

function SummaryWidget({
  icon: Icon,
  label,
  value,
  sub,
  href,
  gradient,
  isLoading,
}: SummaryWidgetProps) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className={`bg-gradient-to-br ${gradient} p-4`}>
          <div className="mb-2">
            <div className="p-2 rounded-lg bg-white/20 inline-block">
              <Icon className="w-4 h-4 text-white" />
            </div>
          </div>
          <p className="text-[10px] text-white/80 uppercase tracking-widest font-extralight">
            {label}
          </p>
          {isLoading ? (
            <Skeleton className="h-7 w-20 mt-1 bg-white/30" />
          ) : (
            <p className="text-2xl font-light text-white mt-0.5">{value}</p>
          )}
          {sub && !isLoading && (
            <p className="text-[10px] text-white/70 mt-0.5">{sub}</p>
          )}
        </div>
        <div className="px-4 py-2 bg-white border-t border-slate-100">
          <Link to={href as Parameters<typeof Link>[0]['to']}>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-[10px] text-slate-500 hover:text-indigo-600 px-0"
            >
              View report
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}

function DashboardPage() {
  const { currentUser } = useAuth()

  const { data: salesData, isLoading: loadingSales } = useSalesReport()
  const { data: revenueData, isLoading: loadingRevenue } = useRevenueReport()
  const { data: occupancyData, isLoading: loadingOccupancy } = useOccupancyReport()

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extralight tracking-[0.3em] text-slate-600 uppercase">
            Dashboard
          </h1>
          <div className="h-px w-20 bg-gradient-to-r from-slate-300 to-transparent mt-2" />
          {currentUser && (
            <p className="mt-2 text-xs text-slate-400 font-extralight">
              Welcome, {currentUser.firstName} {currentUser.lastName}
            </p>
          )}
        </div>
        <Link to="/reports">
          <Button variant="outline" size="sm" className="gap-2">
            <BarChart3 className="w-3.5 h-3.5" />
            All Reports
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryWidget
          icon={TrendingUp}
          label="Deals Won"
          value={String(salesData?.summary.dealsWon ?? 0)}
          sub={`Win rate: ${salesData?.summary.winRate ?? 0}%`}
          href="/reports/sales"
          gradient="from-indigo-500 to-indigo-700"
          isLoading={loadingSales}
        />
        <SummaryWidget
          icon={DollarSign}
          label="Total Won Value"
          value={formatCurrencyShort(salesData?.summary.totalWonValue ?? 0)}
          href="/reports/sales"
          gradient="from-teal-500 to-teal-700"
          isLoading={loadingSales}
        />
        <SummaryWidget
          icon={Building2}
          label="Occupancy Rate"
          value={`${occupancyData?.summary.overallOccupancyRate ?? 0}%`}
          sub={`${occupancyData?.summary.totalUnits ?? 0} total units`}
          href="/reports/occupancy"
          gradient="from-emerald-500 to-emerald-700"
          isLoading={loadingOccupancy}
        />
        <SummaryWidget
          icon={CreditCard}
          label="Revenue Collected"
          value={formatCurrencyShort(revenueData?.summary.totalCollected ?? 0)}
          sub={`Collection rate: ${revenueData?.summary.collectionRate ?? 0}%`}
          href="/reports/revenue"
          gradient="from-amber-500 to-amber-700"
          isLoading={loadingRevenue}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-[10px] font-extralight text-slate-400 uppercase tracking-widest mb-3">
              Quick Navigation
            </p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Projects', href: '/projects' },
                { label: 'Customers', href: '/customers' },
                { label: 'Leads', href: '/leads' },
                { label: 'Units', href: '/units' },
                { label: 'Quotations', href: '/quotations' },
                { label: 'Companies', href: '/companies' },
              ].map((item) => (
                <Link key={item.href} to={item.href as Parameters<typeof Link>[0]['to']}>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-[11px] font-light justify-start"
                  >
                    {item.label}
                  </Button>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <p className="text-[10px] font-extralight text-slate-400 uppercase tracking-widest mb-3">
              Reports Overview
            </p>
            <div className="space-y-1">
              {[
                {
                  label: 'Sales Report',
                  value: `${salesData?.summary.totalDeals ?? 0} deals`,
                  href: '/reports/sales',
                  loading: loadingSales,
                },
                {
                  label: 'Revenue Report',
                  value: formatCurrencyShort(revenueData?.summary.totalBilled ?? 0),
                  href: '/reports/revenue',
                  loading: loadingRevenue,
                },
                {
                  label: 'Occupancy Report',
                  value: `${occupancyData?.summary.totalProjects ?? 0} projects`,
                  href: '/reports/occupancy',
                  loading: loadingOccupancy,
                },
                {
                  label: 'Collection Report',
                  value: `${revenueData?.summary.collectionRate ?? 0}% on time`,
                  href: '/reports/collection',
                  loading: loadingRevenue,
                },
              ].map((item) => (
                <Link key={item.href} to={item.href as Parameters<typeof Link>[0]['to']}>
                  <div className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer group">
                    <span className="text-[11px] font-light text-slate-700 group-hover:text-indigo-600">
                      {item.label}
                    </span>
                    {item.loading ? (
                      <Skeleton className="h-4 w-16" />
                    ) : (
                      <span className="text-[10px] text-slate-400">{item.value}</span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
