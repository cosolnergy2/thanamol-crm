import { createFileRoute } from '@tanstack/react-router'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useCFODashboard } from '@/hooks/useCFODashboard'

export const Route = createFileRoute('/_authenticated/finance/executive/cfo-dashboard/')({ component: CFODashboardPage })

function formatCurrency(val: number) { return new Intl.NumberFormat('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(val) }

function CFODashboardPage() {
  const { data, isLoading } = useCFODashboard()

  if (isLoading) return <div className="p-8 text-center text-slate-400">Loading...</div>
  if (!data) return <div className="p-8 text-center text-slate-400">No data</div>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extralight tracking-[0.3em] text-slate-600 uppercase">CFO Dashboard</h1>
        <p className="text-sm text-slate-500 mt-1">ภาพรวมการเงินสำหรับผู้บริหาร</p>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-slate-500">Total Assets</p>
            <p className="text-2xl font-bold text-blue-600">{formatCurrency(data.total_assets)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-slate-500">Total Liabilities</p>
            <p className="text-2xl font-bold text-red-600">{formatCurrency(data.total_liabilities)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-slate-500">Total Equity</p>
            <p className="text-2xl font-bold text-purple-600">{formatCurrency(data.total_equity)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-slate-500">Net Income</p>
            <p className={`text-2xl font-bold ${data.net_income >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(data.net_income)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-slate-500">Cash Balance</p>
            <p className="text-xl font-bold text-teal-600">{formatCurrency(data.cash_balance)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-slate-500">AR Balance</p>
            <p className="text-xl font-bold text-indigo-600">{formatCurrency(data.ar_balance)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-slate-500">AP Balance</p>
            <p className="text-xl font-bold text-orange-600">{formatCurrency(data.ap_balance)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium">Financial Ratios</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Current Ratio</span>
              <span className="font-mono font-medium">{data.current_ratio}x</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Gross Margin</span>
              <span className="font-mono font-medium">{data.gross_margin}%</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm font-medium">Revenue Trend (6 months)</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.revenue_trend?.map((t: any) => (
                <div key={t.period} className="flex items-center gap-2 text-sm">
                  <span className="font-mono text-xs text-slate-400 w-16">{t.period}</span>
                  <div className="flex-1 flex gap-1">
                    <div className="bg-green-200 h-4 rounded" style={{ width: `${Math.min(100, (t.revenue / Math.max(1, ...data.revenue_trend.map((r: any) => r.revenue))) * 100)}%` }} />
                  </div>
                  <span className="font-mono text-xs w-24 text-right text-green-600">{formatCurrency(t.revenue)}</span>
                  <span className="font-mono text-xs w-24 text-right text-red-500">-{formatCurrency(t.expenses)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
