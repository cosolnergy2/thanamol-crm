import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { Search, Receipt } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { usePaymentVouchers, useApprovePaymentVoucher, usePayPaymentVoucher } from '@/hooks/usePaymentVouchers'
import { PAYMENT_VOUCHER_STATUSES } from '@thanamol/shared'
import { useToast } from '@/components/ui/use-toast'

export const Route = createFileRoute('/_authenticated/finance/ap/payment-vouchers/')({ component: PaymentVouchersPage })

const STATUS_COLORS: Record<string, string> = {
  PV_DRAFT: 'bg-slate-100 text-slate-600', PV_PENDING_APPROVAL: 'bg-yellow-100 text-yellow-700',
  PV_APPROVED: 'bg-blue-100 text-blue-700', PV_PAID: 'bg-green-100 text-green-700', PV_CANCELLED: 'bg-red-100 text-red-600',
}

function formatCurrency(val: number) { return new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val) }

function PaymentVouchersPage() {
  const { toast } = useToast()
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')

  const { data, isLoading } = usePaymentVouchers({ search: search || undefined, status: filterStatus === 'all' ? undefined : filterStatus })
  const approvePV = useApprovePaymentVoucher()
  const payPV = usePayPaymentVoucher()

  const vouchers = data?.data ?? []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extralight tracking-[0.3em] text-slate-600 uppercase">Payment Vouchers</h1>
          <p className="text-sm text-slate-500 mt-1">ใบสำคัญจ่าย</p>
        </div>
      </div>
      <div className="flex gap-2">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">All Status</SelectItem>{PAYMENT_VOUCHER_STATUSES.map(s => <SelectItem key={s} value={s}>{s.replace('PV_', '')}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Voucher No.</TableHead><TableHead>Vendor</TableHead><TableHead>Date</TableHead>
                <TableHead>Method</TableHead><TableHead className="text-right">Amount</TableHead><TableHead>Status</TableHead><TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? <TableRow><TableCell colSpan={7} className="text-center py-8 text-slate-400">Loading...</TableCell></TableRow>
              : vouchers.length === 0 ? <TableRow><TableCell colSpan={7} className="text-center py-8 text-slate-400"><Receipt className="w-8 h-8 mx-auto mb-2 opacity-50" />No vouchers</TableCell></TableRow>
              : vouchers.map((v: any) => (
                <TableRow key={v.id}>
                  <TableCell className="font-mono text-sm">{v.voucher_number}</TableCell>
                  <TableCell>{v.vendor?.name ?? '-'}</TableCell>
                  <TableCell className="text-sm">{new Date(v.payment_date).toLocaleDateString('th-TH')}</TableCell>
                  <TableCell className="text-sm">{v.payment_method}</TableCell>
                  <TableCell className="text-right font-mono">{formatCurrency(v.total_amount)}</TableCell>
                  <TableCell><Badge className={`text-xs ${STATUS_COLORS[v.status] ?? ''}`}>{v.status.replace('PV_', '')}</Badge></TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {(v.status === 'PV_DRAFT' || v.status === 'PV_PENDING_APPROVAL') && (
                        <Button variant="ghost" size="sm" className="text-xs" onClick={async () => {
                          try { await approvePV.mutateAsync(v.id); toast({ title: 'Approved' }) } catch (e: any) { toast({ title: e?.message ?? 'Failed', variant: 'destructive' }) }
                        }}>Approve</Button>
                      )}
                      {v.status === 'PV_APPROVED' && (
                        <Button variant="ghost" size="sm" className="text-xs text-green-600" onClick={async () => {
                          if (!confirm('Mark as paid?')) return
                          try { await payPV.mutateAsync(v.id); toast({ title: 'Paid' }) } catch (e: any) { toast({ title: e?.message ?? 'Failed', variant: 'destructive' }) }
                        }}>Pay</Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
