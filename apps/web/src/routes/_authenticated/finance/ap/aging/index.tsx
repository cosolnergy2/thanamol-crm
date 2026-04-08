import { createFileRoute } from '@tanstack/react-router'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useAPAging } from '@/hooks/useAPInvoices'

export const Route = createFileRoute('/_authenticated/finance/ap/aging/')({
  component: APAgingPage,
})

function formatCurrency(val: number) {
  if (Math.abs(val) < 0.01) return '-'
  return new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val)
}

function APAgingPage() {
  const { data, isLoading } = useAPAging()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extralight tracking-[0.3em] text-slate-600 uppercase">AP Aging Report</h1>
        <p className="text-sm text-slate-500 mt-1">รายงานอายุหนี้เจ้าหนี้</p>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vendor</TableHead>
                <TableHead className="text-right">Current</TableHead>
                <TableHead className="text-right">1-30 Days</TableHead>
                <TableHead className="text-right">31-60 Days</TableHead>
                <TableHead className="text-right">61-90 Days</TableHead>
                <TableHead className="text-right">90+ Days</TableHead>
                <TableHead className="text-right font-bold">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-slate-400">Loading...</TableCell></TableRow>
              ) : !data?.buckets.length ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-slate-400">No outstanding AP invoices</TableCell></TableRow>
              ) : (
                <>
                  {data.buckets.map((b) => (
                    <TableRow key={b.vendor_id}>
                      <TableCell className="font-medium">{b.vendor_name}</TableCell>
                      <TableCell className="text-right font-mono text-sm">{formatCurrency(b.current)}</TableCell>
                      <TableCell className="text-right font-mono text-sm">{formatCurrency(b.days_1_30)}</TableCell>
                      <TableCell className="text-right font-mono text-sm text-yellow-600">{formatCurrency(b.days_31_60)}</TableCell>
                      <TableCell className="text-right font-mono text-sm text-orange-600">{formatCurrency(b.days_61_90)}</TableCell>
                      <TableCell className="text-right font-mono text-sm text-red-600">{formatCurrency(b.over_90)}</TableCell>
                      <TableCell className="text-right font-mono text-sm font-bold">{formatCurrency(b.total)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-slate-50 font-bold">
                    <TableCell>Total</TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(data.totals.current)}</TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(data.totals.days_1_30)}</TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(data.totals.days_31_60)}</TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(data.totals.days_61_90)}</TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(data.totals.over_90)}</TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(data.totals.total)}</TableCell>
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
