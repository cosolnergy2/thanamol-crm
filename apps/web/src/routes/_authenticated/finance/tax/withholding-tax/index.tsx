import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { Search, FileText, Plus } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useWithholdingTaxRecords, useIssueWithholdingTax } from '@/hooks/useWithholdingTax'
import { WHT_DOCUMENT_TYPES, WHT_STATUSES } from '@thanamol/shared'
import { useToast } from '@/components/ui/use-toast'

export const Route = createFileRoute('/_authenticated/finance/tax/withholding-tax/')({ component: WhtListPage })

const STATUS_COLORS: Record<string, string> = { DRAFT: 'bg-slate-100 text-slate-600', ISSUED: 'bg-blue-100 text-blue-700', SUBMITTED: 'bg-green-100 text-green-700', CANCELLED: 'bg-red-100 text-red-600' }

function formatCurrency(val: number) { return new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val) }

function WhtListPage() {
  const { toast } = useToast()
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')

  const { data, isLoading } = useWithholdingTaxRecords({
    search: search || undefined,
    documentType: filterType === 'all' ? undefined : filterType,
    status: filterStatus === 'all' ? undefined : filterStatus,
  })
  const issueWht = useIssueWithholdingTax()

  const records = data?.data ?? []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extralight tracking-[0.3em] text-slate-600 uppercase">Withholding Tax</h1>
          <p className="text-sm text-slate-500 mt-1">ภาษีหัก ณ ที่จ่าย — PND.1 / PND.3 / PND.53</p>
        </div>
      </div>
      <div className="flex gap-2 items-center">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">All Types</SelectItem>{WHT_DOCUMENT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">All Status</SelectItem>{WHT_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>WHT No.</TableHead><TableHead>Type</TableHead><TableHead>Vendor</TableHead>
                <TableHead>Period</TableHead><TableHead className="text-right">Gross</TableHead>
                <TableHead className="text-right">Rate</TableHead><TableHead className="text-right">WHT Amount</TableHead>
                <TableHead>Status</TableHead><TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? <TableRow><TableCell colSpan={9} className="text-center py-8 text-slate-400">Loading...</TableCell></TableRow>
              : records.length === 0 ? <TableRow><TableCell colSpan={9} className="text-center py-8 text-slate-400"><FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />No records</TableCell></TableRow>
              : records.map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-sm">{r.wht_number}</TableCell>
                  <TableCell><Badge variant="outline" className="text-xs">{r.document_type}</Badge></TableCell>
                  <TableCell>{r.vendor_name}</TableCell>
                  <TableCell className="text-sm">{r.fiscal_year}/{String(r.fiscal_month).padStart(2, '0')}</TableCell>
                  <TableCell className="text-right font-mono text-sm">{formatCurrency(r.gross_amount)}</TableCell>
                  <TableCell className="text-right text-sm">{r.wht_rate}%</TableCell>
                  <TableCell className="text-right font-mono text-sm font-medium">{formatCurrency(r.wht_amount)}</TableCell>
                  <TableCell><Badge className={`text-xs ${STATUS_COLORS[r.status] ?? ''}`}>{r.status}</Badge></TableCell>
                  <TableCell>
                    {r.status === 'DRAFT' && (
                      <Button variant="ghost" size="sm" className="text-xs" onClick={async () => {
                        if (!confirm('Issue certificate?')) return
                        try { await issueWht.mutateAsync(r.id); toast({ title: 'Certificate issued' }) }
                        catch (err: any) { toast({ title: err?.message ?? 'Failed', variant: 'destructive' }) }
                      }}>Issue</Button>
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
