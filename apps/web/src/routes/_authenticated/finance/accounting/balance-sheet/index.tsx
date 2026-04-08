import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { Download } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useBalanceSheet } from '@/hooks/useAccountingReports'

export const Route = createFileRoute('/_authenticated/finance/accounting/balance-sheet/')({
  component: BalanceSheetPage,
})

function formatAmount(val: number) {
  return new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val)
}

function BalanceSheetPage() {
  const [asOfDate, setAsOfDate] = useState(new Date().toISOString().slice(0, 10))
  const { data, isLoading } = useBalanceSheet(asOfDate)

  function SectionCard({ title, sections, total, colorClass }: { title: string; sections: any[]; total: number; colorClass: string }) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {sections.map((section: any) => (
            <div key={section.label}>
              {section.accounts.map((acc: any) => (
                <div key={acc.account_code} className="flex justify-between text-sm py-0.5">
                  <span className="text-slate-600">
                    <span className="font-mono text-xs text-slate-400 mr-2">{acc.account_code}</span>
                    {acc.account_name_th}
                  </span>
                  <span className="font-mono">{formatAmount(acc.balance)}</span>
                </div>
              ))}
            </div>
          ))}
          <div className={`flex justify-between font-bold text-sm pt-2 border-t ${colorClass}`}>
            <span>Total {title}</span>
            <span className="font-mono">{formatAmount(total)}</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extralight tracking-[0.3em] text-slate-600 uppercase">
            Balance Sheet
          </h1>
          <p className="text-sm text-slate-500 mt-1">งบดุล</p>
        </div>
        <Button variant="outline" size="sm">
          <Download className="w-4 h-4 mr-1" /> Export
        </Button>
      </div>

      <div className="flex gap-4 items-end">
        <div>
          <Label>As of Date</Label>
          <Input type="date" value={asOfDate} onChange={(e) => setAsOfDate(e.target.value)} className="w-44" />
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-slate-400">Loading...</div>
      ) : data ? (
        <>
          <div className="grid grid-cols-2 gap-6">
            <SectionCard title="Assets" sections={data.assets} total={data.total_assets} colorClass="text-blue-700" />
            <div className="space-y-6">
              <SectionCard title="Liabilities" sections={data.liabilities} total={data.total_liabilities} colorClass="text-red-700" />
              <SectionCard title="Equity" sections={data.equity} total={data.total_equity} colorClass="text-purple-700" />
            </div>
          </div>

          <Card className="bg-slate-50">
            <CardContent className="pt-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex justify-between font-bold text-blue-700">
                  <span>Total Assets</span>
                  <span className="font-mono">{formatAmount(data.total_assets)}</span>
                </div>
                <div className="flex justify-between font-bold text-purple-700">
                  <span>Liabilities + Equity</span>
                  <span className="font-mono">{formatAmount(data.total_liabilities + data.total_equity)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <div className="text-center py-8 text-slate-400">No data</div>
      )}
    </div>
  )
}
