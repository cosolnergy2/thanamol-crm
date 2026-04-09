import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { Plus, Search, FileCheck } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useCheques, useUpdateChequeStatus } from '@/hooks/useCheques'
import { CHEQUE_STATUSES, CHEQUE_TYPES } from '@thanamol/shared'
import { useToast } from '@/components/ui/use-toast'

export const Route = createFileRoute('/_authenticated/finance/banking/cheques/')({
  component: ChequesPage,
})

const STATUS_COLORS: Record<string, string> = {
  ISSUED: 'bg-blue-100 text-blue-700',
  CLEARED: 'bg-green-100 text-green-700',
  BOUNCED: 'bg-red-100 text-red-700',
  CANCELLED: 'bg-slate-100 text-slate-500',
  VOIDED: 'bg-slate-100 text-slate-500',
}

function formatCurrency(val: number) {
  return new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val)
}

function ChequesPage() {
  const { toast } = useToast()
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')

  const { data, isLoading } = useCheques({
    search: search || undefined,
    chequeType: filterType === 'all' ? undefined : filterType,
    status: filterStatus === 'all' ? undefined : filterStatus,
  })
  const updateStatus = useUpdateChequeStatus()

  const cheques = data?.data ?? []

  async function handleStatusChange(id: string, status: string) {
    if (!confirm(`Change status to ${status}?`)) return
    try {
      await updateStatus.mutateAsync({ id, status })
      toast({ title: `Cheque ${status.toLowerCase()}` })
    } catch (err: any) {
      toast({ title: err?.message ?? 'Failed', variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extralight tracking-[0.3em] text-slate-600 uppercase">Cheque Management</h1>
          <p className="text-sm text-slate-500 mt-1">จัดการเช็ค</p>
        </div>
      </div>

      <div className="flex gap-2 items-center">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-32"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {CHEQUE_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-32"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {CHEQUE_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cheque No.</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Payee</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-slate-400">Loading...</TableCell></TableRow>
              ) : cheques.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-slate-400"><FileCheck className="w-8 h-8 mx-auto mb-2 opacity-50" />No cheques</TableCell></TableRow>
              ) : cheques.map((c: any) => (
                <TableRow key={c.id}>
                  <TableCell className="font-mono text-sm">{c.cheque_number}</TableCell>
                  <TableCell><Badge variant="outline" className="text-xs">{c.cheque_type}</Badge></TableCell>
                  <TableCell className="text-sm">{new Date(c.cheque_date).toLocaleDateString('th-TH')}</TableCell>
                  <TableCell>{c.payee_name}</TableCell>
                  <TableCell className="text-right font-mono">{formatCurrency(c.amount)}</TableCell>
                  <TableCell><Badge className={`text-xs ${STATUS_COLORS[c.status] ?? ''}`}>{c.status}</Badge></TableCell>
                  <TableCell>
                    {c.status === 'ISSUED' && (
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" className="text-xs text-green-600" onClick={() => handleStatusChange(c.id, 'CLEARED')}>Clear</Button>
                        <Button variant="ghost" size="sm" className="text-xs text-red-600" onClick={() => handleStatusChange(c.id, 'BOUNCED')}>Bounce</Button>
                      </div>
                    )}
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
