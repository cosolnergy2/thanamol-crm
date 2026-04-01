import { createFileRoute, Link } from '@tanstack/react-router'
import { Wrench, BarChart3, ShieldCheck, DollarSign, ClipboardList, ArrowRight } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { PageHeader } from '@/components/PageHeader'

export const Route = createFileRoute('/_authenticated/facility-management/reports/')({
  component: FMSReportsHubPage,
})

const REPORT_CARDS = [
  {
    title: 'Maintenance Cost',
    description: 'Monthly work order costs and trends over a selected date range',
    icon: Wrench,
    href: '/facility-management/reports/maintenance-cost',
    accent: 'from-amber-500 to-amber-700',
  },
  {
    title: 'Asset Status',
    description: 'Breakdown of assets by operational status for a project',
    icon: BarChart3,
    href: '/facility-management/reports/asset-status',
    accent: 'from-indigo-500 to-indigo-700',
  },
  {
    title: 'Budget Variance',
    description: 'Budget lines with approved vs actual spend and variance',
    icon: DollarSign,
    href: '/facility-management/reports/budget-variance',
    accent: 'from-violet-500 to-violet-700',
  },
  {
    title: 'Compliance Status',
    description: 'Fire equipment overdue, active PTW, incident severity and expiring insurance',
    icon: ShieldCheck,
    href: '/facility-management/reports/compliance-status',
    accent: 'from-teal-500 to-teal-700',
  },
  {
    title: 'PM Compliance',
    description: 'Preventive maintenance schedule compliance rate, overdue and missed PMs',
    icon: ClipboardList,
    href: '/facility-management/reports/pm-compliance',
    accent: 'from-rose-500 to-rose-700',
  },
] as const

function FMSReportsHubPage() {
  return (
    <div className="space-y-3">
      <PageHeader title="FMS Reports" subtitle="Facility management analytics and compliance" />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {REPORT_CARDS.map((report) => {
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
            Select a report above to view analytics
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
