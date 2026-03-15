import { createFileRoute, Link } from '@tanstack/react-router'
import { BarChart3, TrendingUp, Building2, DollarSign, CreditCard, Settings2, ArrowRight } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/PageHeader'

export const Route = createFileRoute('/_authenticated/reports/')({
  component: ReportsHubPage,
})

const REPORT_LINKS = [
  {
    title: 'Sales Report',
    description: 'Deals won, total value, pipeline performance by period',
    icon: TrendingUp,
    href: '/reports/sales',
    accent: 'from-indigo-500 to-indigo-700',
  },
  {
    title: 'Revenue Report',
    description: 'Invoice totals, collected vs outstanding, collection rate',
    icon: DollarSign,
    href: '/reports/revenue',
    accent: 'from-teal-500 to-teal-700',
  },
  {
    title: 'Occupancy Report',
    description: 'Unit availability and occupancy rates by project',
    icon: Building2,
    href: '/reports/occupancy',
    accent: 'from-emerald-500 to-emerald-700',
  },
  {
    title: 'Collection Report',
    description: 'Payment timeliness — on-time vs overdue breakdown',
    icon: CreditCard,
    href: '/reports/collection',
    accent: 'from-amber-500 to-amber-700',
  },
] as const

function ReportsHubPage() {
  return (
    <div className="space-y-3">
      <PageHeader
        title="Reports"
        actions={
          <Link to="/reports/custom">
            <Button variant="outline" size="sm">
              <Settings2 className="w-4 h-4 mr-2" />
              Custom Reports
            </Button>
          </Link>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {REPORT_LINKS.map((report) => {
          const Icon = report.icon
          return (
            <Link key={report.href} to={report.href}>
              <Card className="group hover:shadow-md transition-shadow cursor-pointer overflow-hidden">
                <CardContent className="p-0">
                  <div className={`bg-gradient-to-br ${report.accent} p-5`}>
                    <div className="flex items-start justify-between mb-3">
                      <div className="p-2.5 rounded-lg bg-white/20 backdrop-blur-sm">
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      <ArrowRight className="w-4 h-4 text-white/70 group-hover:text-white transition-colors" />
                    </div>
                    <h3 className="text-sm font-semibold text-white mb-1">{report.title}</h3>
                    <p className="text-xs text-white/80 font-light">{report.description}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>

      <Card>
        <CardContent className="py-8 text-center">
          <BarChart3 className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-500 font-light">
            Select a report above to view aggregated analytics
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
