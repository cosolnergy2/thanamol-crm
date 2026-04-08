import { createFileRoute } from '@tanstack/react-router'
import { Trash2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useAssetDisposals } from '@/hooks/useFixedAssetAccounting'

export const Route = createFileRoute('/_authenticated/finance/fixed-assets/disposals/')({ component: AssetDisposalsPage })

function formatCurrency(val: number) { return new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val) }

function AssetDisposalsPage() {
  const { data, isLoading } = useAssetDisposals()
  const disposals = data?.data ?? []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extralight tracking-[0.3em] text-slate-600 uppercase">Asset Disposals</h1>
        <p className="text-sm text-slate-500 mt-1">การจำหน่ายทรัพย์สิน</p>
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Disposal No.</TableHead><TableHead>Asset</TableHead><TableHead>Type</TableHead>
                <TableHead>Date</TableHead><TableHead className="text-right">Amount</TableHead><TableHead className="text-right">Gain/Loss</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? <TableRow><TableCell colSpan={6} className="text-center py-8 text-slate-400">Loading...</TableCell></TableRow>
              : disposals.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center py-8 text-slate-400"><Trash2 className="w-8 h-8 mx-auto mb-2 opacity-50" />No disposals</TableCell></TableRow>
              : disposals.map((d: any) => (
                <TableRow key={d.id}>
                  <TableCell className="font-mono text-sm">{d.disposal_number}</TableCell>
                  <TableCell>{d.asset?.asset_number} — {d.asset?.name}</TableCell>
                  <TableCell><Badge variant="outline" className="text-xs">{d.disposal_type}</Badge></TableCell>
                  <TableCell className="text-sm">{new Date(d.disposal_date).toLocaleDateString('th-TH')}</TableCell>
                  <TableCell className="text-right font-mono">{formatCurrency(d.disposal_amount)}</TableCell>
                  <TableCell className={`text-right font-mono ${d.gain_loss >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(d.gain_loss)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
