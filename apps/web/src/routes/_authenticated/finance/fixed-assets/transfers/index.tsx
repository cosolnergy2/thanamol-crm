import { createFileRoute } from '@tanstack/react-router'
import { ArrowRightLeft } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useAssetTransfers } from '@/hooks/useFixedAssetAccounting'

export const Route = createFileRoute('/_authenticated/finance/fixed-assets/transfers/')({ component: AssetTransfersPage })

function AssetTransfersPage() {
  const { data, isLoading } = useAssetTransfers()
  const transfers = data?.data ?? []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extralight tracking-[0.3em] text-slate-600 uppercase">Asset Transfers</h1>
        <p className="text-sm text-slate-500 mt-1">โอนย้ายทรัพย์สิน</p>
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Transfer No.</TableHead><TableHead>Asset</TableHead>
                <TableHead>Date</TableHead><TableHead>Reason</TableHead><TableHead>By</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? <TableRow><TableCell colSpan={5} className="text-center py-8 text-slate-400">Loading...</TableCell></TableRow>
              : transfers.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center py-8 text-slate-400"><ArrowRightLeft className="w-8 h-8 mx-auto mb-2 opacity-50" />No transfers</TableCell></TableRow>
              : transfers.map((t: any) => (
                <TableRow key={t.id}>
                  <TableCell className="font-mono text-sm">{t.transfer_number}</TableCell>
                  <TableCell>{t.asset?.asset_number} — {t.asset?.name}</TableCell>
                  <TableCell className="text-sm">{new Date(t.transfer_date).toLocaleDateString('th-TH')}</TableCell>
                  <TableCell className="text-sm">{t.reason ?? '-'}</TableCell>
                  <TableCell className="text-sm">{t.creator ? `${t.creator.first_name} ${t.creator.last_name}` : '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
