import { createFileRoute, Link } from '@tanstack/react-router'
import { BookOpen, FileText, Calendar, BarChart3, Scale, TrendingUp, List } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useAccountingDashboard } from '@/hooks/useAccountingReports'

export const Route = createFileRoute('/_authenticated/finance/accounting/')({
  component: AccountingDashboardPage,
})

function formatCurrency(val: number) {
  return new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val)
}

const MODULES = [
  { label: 'Chart of Accounts', th: 'ผังบัญชี', icon: BookOpen, path: '/finance/accounting/chart-of-accounts', color: 'text-blue-600 bg-blue-50' },
  { label: 'Journal Entries', th: 'สมุดรายวัน', icon: FileText, path: '/finance/accounting/journal-entries', color: 'text-indigo-600 bg-indigo-50' },
  { label: 'Period Control', th: 'ควบคุมงวดบัญชี', icon: Calendar, path: '/finance/accounting/periods', color: 'text-amber-600 bg-amber-50' },
  { label: 'Trial Balance', th: 'งบทดลอง', icon: Scale, path: '/finance/accounting/trial-balance', color: 'text-emerald-600 bg-emerald-50' },
  { label: 'Balance Sheet', th: 'งบดุล', icon: BarChart3, path: '/finance/accounting/balance-sheet', color: 'text-purple-600 bg-purple-50' },
  { label: 'Profit & Loss', th: 'งบกำไรขาดทุน', icon: TrendingUp, path: '/finance/accounting/profit-loss', color: 'text-teal-600 bg-teal-50' },
  { label: 'General Ledger', th: 'บัญชีแยกประเภท', icon: List, path: '/finance/accounting/general-ledger', color: 'text-slate-600 bg-slate-50' },
] as const

function AccountingDashboardPage() {
  const { data, isLoading } = useAccountingDashboard()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extralight tracking-[0.3em] text-slate-600 uppercase">
          Accounting
        </h1>
        <p className="text-sm text-slate-500 mt-1">ระบบบัญชี — ภาพรวมและเครื่องมือ</p>
      </div>

      {!isLoading && data && (
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-slate-500">Total Assets</p>
              <p className="text-xl font-bold text-blue-600">{formatCurrency(data.total_assets)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-slate-500">Total Liabilities</p>
              <p className="text-xl font-bold text-red-600">{formatCurrency(data.total_liabilities)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-slate-500">Net Income</p>
              <p className={`text-xl font-bold ${data.net_income >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(data.net_income)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-slate-500">Pending</p>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{data.unposted_journals} journals</Badge>
                <Badge variant="secondary">{data.open_periods} open periods</Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-3 gap-4">
        {MODULES.map((mod) => {
          const Icon = mod.icon
          return (
            <Link key={mod.path} to={mod.path as any} className="block">
              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                <CardContent className="pt-5 flex items-start gap-4">
                  <div className={`p-3 rounded-lg ${mod.color}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-800">{mod.label}</p>
                    <p className="text-xs text-slate-500">{mod.th}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
