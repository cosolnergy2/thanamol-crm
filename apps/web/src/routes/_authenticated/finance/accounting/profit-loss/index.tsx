import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { Download } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useProfitLoss } from '@/hooks/useAccountingReports'

export const Route = createFileRoute('/_authenticated/finance/accounting/profit-loss/')({
  component: ProfitLossPage,
})

function formatAmount(val: number) {
  return new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val)
}

function ProfitLossPage() {
  const year = new Date().getFullYear()
  const [dateFrom, setDateFrom] = useState(`${year}-01-01`)
  const [dateTo, setDateTo] = useState(new Date().toISOString().slice(0, 10))
  const { data, isLoading } = useProfitLoss(dateFrom, dateTo)

  function PLSection({ section, colorClass }: { section: { label: string; accounts: any[]; total: number }; colorClass: string }) {
    return (
      <div className="space-y-1">
        <h3 className="font-medium text-sm text-slate-700">{section.label}</h3>
        {section.accounts.map((acc: any) => (
          <div key={acc.account_code} className="flex justify-between text-sm py-0.5 pl-4">
            <span className="text-slate-600">
              <span className="font-mono text-xs text-slate-400 mr-2">{acc.account_code}</span>
              {acc.account_name_th}
            </span>
            <span className="font-mono">{formatAmount(acc.amount)}</span>
          </div>
        ))}
        <div className={`flex justify-between font-medium text-sm pl-4 ${colorClass}`}>
          <span>Total {section.label}</span>
          <span className="font-mono">{formatAmount(section.total)}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extralight tracking-[0.3em] text-slate-600 uppercase">
            Profit & Loss
          </h1>
          <p className="text-sm text-slate-500 mt-1">งบกำไรขาดทุน</p>
        </div>
        <Button variant="outline" size="sm">
          <Download className="w-4 h-4 mr-1" /> Export
        </Button>
      </div>

      <div className="flex gap-4 items-end">
        <div>
          <Label>From</Label>
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-44" />
        </div>
        <div>
          <Label>To</Label>
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-44" />
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-slate-400">Loading...</div>
      ) : data ? (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <PLSection section={data.revenue} colorClass="text-green-700" />

            <PLSection section={data.cost_of_sales} colorClass="text-orange-700" />

            <div className="flex justify-between font-bold text-sm py-2 border-t border-b">
              <span>Gross Profit</span>
              <span className={`font-mono ${data.gross_profit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                {formatAmount(data.gross_profit)}
              </span>
            </div>

            <PLSection section={data.operating_expenses} colorClass="text-yellow-700" />

            <div className="flex justify-between font-bold text-sm py-2 border-t border-b">
              <span>Operating Income</span>
              <span className={`font-mono ${data.operating_income >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                {formatAmount(data.operating_income)}
              </span>
            </div>

            <PLSection section={data.other_income} colorClass="text-teal-700" />
            <PLSection section={data.other_expenses} colorClass="text-rose-700" />

            <div className="flex justify-between font-bold text-lg py-3 border-t-2">
              <span>Net Income</span>
              <span className={`font-mono ${data.net_income >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                {formatAmount(data.net_income)}
              </span>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="text-center py-8 text-slate-400">No data</div>
      )}
    </div>
  )
}
