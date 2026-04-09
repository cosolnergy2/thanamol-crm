import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { Download, Search } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useGeneralLedger } from '@/hooks/useAccountingReports'
import { useChartOfAccounts } from '@/hooks/useChartOfAccounts'

export const Route = createFileRoute('/_authenticated/finance/accounting/general-ledger/')({
  component: GeneralLedgerPage,
})

function formatAmount(val: number) {
  if (Math.abs(val) < 0.01) return '-'
  return new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val)
}

function GeneralLedgerPage() {
  const year = new Date().getFullYear()
  const [accountCode, setAccountCode] = useState('')
  const [dateFrom, setDateFrom] = useState(`${year}-01-01`)
  const [dateTo, setDateTo] = useState(new Date().toISOString().slice(0, 10))

  const { data: accountsData } = useChartOfAccounts({ isActive: true, limit: 500 })
  const { data, isLoading } = useGeneralLedger(accountCode || undefined, dateFrom, dateTo)

  const accounts = accountsData?.data ?? []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extralight tracking-[0.3em] text-slate-600 uppercase">
          General Ledger
        </h1>
        <p className="text-sm text-slate-500 mt-1">บัญชีแยกประเภท</p>
      </div>

      <div className="flex gap-4 items-end">
        <div className="flex-1 max-w-sm">
          <Label>Account</Label>
          <Select value={accountCode || 'placeholder'} onValueChange={(v) => setAccountCode(v === 'placeholder' ? '' : v)}>
            <SelectTrigger>
              <SelectValue placeholder="Select account" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="placeholder" disabled>Select account</SelectItem>
              {accounts.map((a) => (
                <SelectItem key={a.account_code} value={a.account_code}>
                  {a.account_code} - {a.account_name_th}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>From</Label>
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-40" />
        </div>
        <div>
          <Label>To</Label>
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-40" />
        </div>
      </div>

      {!accountCode ? (
        <div className="text-center py-12 text-slate-400">
          <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
          Select an account to view the general ledger
        </div>
      ) : isLoading ? (
        <div className="text-center py-8 text-slate-400">Loading...</div>
      ) : data ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">
              <span className="font-mono mr-2">{data.account_code}</span>
              {data.account_name_th}
              {data.account_name_en && <span className="text-slate-400 ml-2 font-normal">({data.account_name_en})</span>}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-28">Date</TableHead>
                  <TableHead className="w-36">Journal No.</TableHead>
                  <TableHead>Narration</TableHead>
                  <TableHead className="w-28">Reference</TableHead>
                  <TableHead className="w-28 text-right">Debit</TableHead>
                  <TableHead className="w-28 text-right">Credit</TableHead>
                  <TableHead className="w-32 text-right">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow className="bg-slate-50">
                  <TableCell colSpan={6} className="font-medium text-sm">Opening Balance</TableCell>
                  <TableCell className="text-right font-mono font-medium">{formatAmount(data.opening_balance)}</TableCell>
                </TableRow>
                {data.entries.map((entry, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-sm">{new Date(entry.journal_date).toLocaleDateString('th-TH')}</TableCell>
                    <TableCell className="font-mono text-xs text-indigo-600">{entry.journal_number}</TableCell>
                    <TableCell className="text-sm truncate max-w-[200px]">{entry.narration ?? '-'}</TableCell>
                    <TableCell className="text-xs text-slate-500">{entry.reference_document ?? '-'}</TableCell>
                    <TableCell className="text-right font-mono text-sm">{entry.debit > 0 ? formatAmount(entry.debit) : '-'}</TableCell>
                    <TableCell className="text-right font-mono text-sm">{entry.credit > 0 ? formatAmount(entry.credit) : '-'}</TableCell>
                    <TableCell className="text-right font-mono text-sm font-medium">{formatAmount(entry.running_balance)}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-slate-50 font-bold">
                  <TableCell colSpan={4} className="text-right">Totals / Closing Balance</TableCell>
                  <TableCell className="text-right font-mono">{formatAmount(data.total_debit)}</TableCell>
                  <TableCell className="text-right font-mono">{formatAmount(data.total_credit)}</TableCell>
                  <TableCell className="text-right font-mono">{formatAmount(data.closing_balance)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
