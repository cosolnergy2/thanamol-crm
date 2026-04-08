import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useTaxDashboard } from '@/hooks/useWithholdingTax'

export const Route = createFileRoute('/_authenticated/finance/tax/dashboard/')({
  component: TaxDashboardPage,
})

function formatCurrency(val: number) {
  return new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val)
}

function TaxDashboardPage() {
  const now = new Date()
  const [period, setPeriod] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`)

  const { data, isLoading } = useTaxDashboard(period)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extralight tracking-[0.3em] text-slate-600 uppercase">Tax Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">ภาพรวมภาษี — VAT & WHT</p>
        </div>
        <div>
          <Label>Period</Label>
          <Input type="month" value={period} onChange={(e) => setPeriod(e.target.value)} className="w-40" />
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-slate-400">Loading...</div>
      ) : data ? (
        <div className="grid grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle className="text-sm font-medium">VAT Summary (PP.30)</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Output VAT (ภาษีขาย)</span>
                <span className="font-mono font-medium text-green-600">{formatCurrency(data.output_vat)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Input VAT (ภาษีซื้อ)</span>
                <span className="font-mono font-medium text-blue-600">{formatCurrency(data.input_vat)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold pt-2 border-t">
                <span>Net VAT {data.net_vat >= 0 ? '(Pay)' : '(Refund)'}</span>
                <span className={`font-mono ${data.net_vat >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {formatCurrency(Math.abs(data.net_vat))}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm font-medium">Withholding Tax Summary</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Total WHT (ภาษีหัก ณ ที่จ่าย)</span>
                <span className="font-mono font-medium text-purple-600">{formatCurrency(data.total_wht)}</span>
              </div>
              <p className="text-xs text-slate-400 pt-2 border-t">
                Period: {data.period}
              </p>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  )
}
