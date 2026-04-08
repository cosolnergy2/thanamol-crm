import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { Download } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useTrialBalance } from '@/hooks/useAccountingReports'
import { ACCOUNT_TYPE_LABELS } from '@thanamol/shared'
import type { AccountType } from '@thanamol/shared'

export const Route = createFileRoute('/_authenticated/finance/accounting/trial-balance/')({
  component: TrialBalancePage,
})

function formatAmount(val: number) {
  if (Math.abs(val) < 0.01) return '-'
  return new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val)
}

function TrialBalancePage() {
  const today = new Date()
  const [periodFrom, setPeriodFrom] = useState(`${today.getFullYear()}-01`)
  const [periodTo, setPeriodTo] = useState(today.toISOString().slice(0, 7))

  const { data, isLoading } = useTrialBalance(periodFrom, periodTo)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extralight tracking-[0.3em] text-slate-600 uppercase">
            Trial Balance
          </h1>
          <p className="text-sm text-slate-500 mt-1">งบทดลอง</p>
        </div>
        <Button variant="outline" size="sm">
          <Download className="w-4 h-4 mr-1" /> Export
        </Button>
      </div>

      <div className="flex gap-4 items-end">
        <div>
          <Label>Period From</Label>
          <Input type="month" value={periodFrom} onChange={(e) => setPeriodFrom(e.target.value)} className="w-40" />
        </div>
        <div>
          <Label>Period To</Label>
          <Input type="month" value={periodTo} onChange={(e) => setPeriodTo(e.target.value)} className="w-40" />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-28">Code</TableHead>
                <TableHead>Account Name</TableHead>
                <TableHead className="w-24">Type</TableHead>
                <TableHead className="w-28 text-right">Opening Dr</TableHead>
                <TableHead className="w-28 text-right">Opening Cr</TableHead>
                <TableHead className="w-28 text-right">Period Dr</TableHead>
                <TableHead className="w-28 text-right">Period Cr</TableHead>
                <TableHead className="w-28 text-right">Closing Dr</TableHead>
                <TableHead className="w-28 text-right">Closing Cr</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-slate-400">Loading...</TableCell>
                </TableRow>
              ) : !data?.rows.length ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-slate-400">No data for this period</TableCell>
                </TableRow>
              ) : (
                <>
                  {data.rows.map((row) => {
                    const typeLabel = ACCOUNT_TYPE_LABELS[row.account_type as AccountType]
                    return (
                      <TableRow key={row.account_code}>
                        <TableCell className="font-mono text-xs">{row.account_code}</TableCell>
                        <TableCell className="text-sm">{row.account_name_th}</TableCell>
                        <TableCell>
                          {typeLabel && <span className={`text-xs px-1.5 py-0.5 rounded ${typeLabel.color}`}>{typeLabel.th}</span>}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">{formatAmount(row.opening_debit)}</TableCell>
                        <TableCell className="text-right font-mono text-sm">{formatAmount(row.opening_credit)}</TableCell>
                        <TableCell className="text-right font-mono text-sm">{formatAmount(row.period_debit)}</TableCell>
                        <TableCell className="text-right font-mono text-sm">{formatAmount(row.period_credit)}</TableCell>
                        <TableCell className="text-right font-mono text-sm font-medium">{formatAmount(row.closing_debit)}</TableCell>
                        <TableCell className="text-right font-mono text-sm font-medium">{formatAmount(row.closing_credit)}</TableCell>
                      </TableRow>
                    )
                  })}
                  <TableRow className="bg-slate-50 font-bold">
                    <TableCell colSpan={3} className="text-right">Totals</TableCell>
                    <TableCell className="text-right font-mono">{formatAmount(data.totals.opening_debit)}</TableCell>
                    <TableCell className="text-right font-mono">{formatAmount(data.totals.opening_credit)}</TableCell>
                    <TableCell className="text-right font-mono">{formatAmount(data.totals.period_debit)}</TableCell>
                    <TableCell className="text-right font-mono">{formatAmount(data.totals.period_credit)}</TableCell>
                    <TableCell className="text-right font-mono">{formatAmount(data.totals.closing_debit)}</TableCell>
                    <TableCell className="text-right font-mono">{formatAmount(data.totals.closing_credit)}</TableCell>
                  </TableRow>
                </>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
