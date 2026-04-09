import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { Plus, Search, FileText } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useAPInvoices } from '@/hooks/useAPInvoices'
import { AP_INVOICE_STATUSES } from '@thanamol/shared'

export const Route = createFileRoute('/_authenticated/finance/ap/invoices/')({ component: APInvoicesPage })

const STATUS_COLORS: Record<string, string> = {
  AP_DRAFT: 'bg-slate-100 text-slate-600', AP_PENDING_APPROVAL: 'bg-yellow-100 text-yellow-700',
  AP_APPROVED: 'bg-blue-100 text-blue-700', AP_PARTIALLY_PAID: 'bg-orange-100 text-orange-700',
  AP_PAID: 'bg-green-100 text-green-700', AP_CANCELLED: 'bg-red-100 text-red-600',
}

function formatCurrency(val: number) { return new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val) }

function APInvoicesPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')

  const { data, isLoading } = useAPInvoices({ search: search || undefined, status: filterStatus === 'all' ? undefined : filterStatus })
  const invoices = data?.data ?? []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extralight tracking-[0.3em] text-slate-600 uppercase">AP Invoices</h1>
          <p className="text-sm text-slate-500 mt-1">ใบแจ้งหนี้จากเจ้าหนี้</p>
        </div>
        <Button size="sm" onClick={() => navigate({ to: '/finance/ap/invoices/create' as any })}><Plus className="w-4 h-4 mr-1" /> New Invoice</Button>
      </div>
      <div className="flex gap-2">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">All Status</SelectItem>{AP_INVOICE_STATUSES.map(s => <SelectItem key={s} value={s}>{s.replace('AP_', '')}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>AP Invoice No.</TableHead><TableHead>Vendor</TableHead><TableHead>Date</TableHead>
                <TableHead>Due Date</TableHead><TableHead className="text-right">Total</TableHead><TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? <TableRow><TableCell colSpan={6} className="text-center py-8 text-slate-400">Loading...</TableCell></TableRow>
              : invoices.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center py-8 text-slate-400"><FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />No AP invoices</TableCell></TableRow>
              : invoices.map((inv: any) => (
                <TableRow key={inv.id}>
                  <TableCell className="font-mono text-sm">{inv.ap_invoice_number}</TableCell>
                  <TableCell>{inv.vendor?.name ?? '-'}</TableCell>
                  <TableCell className="text-sm">{new Date(inv.invoice_date).toLocaleDateString('th-TH')}</TableCell>
                  <TableCell className="text-sm">{new Date(inv.due_date).toLocaleDateString('th-TH')}</TableCell>
                  <TableCell className="text-right font-mono">{formatCurrency(inv.total_amount)}</TableCell>
                  <TableCell><Badge className={`text-xs ${STATUS_COLORS[inv.status] ?? ''}`}>{inv.status.replace('AP_', '')}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
