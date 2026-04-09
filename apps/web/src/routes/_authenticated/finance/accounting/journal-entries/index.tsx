import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { Plus, Search, FileText } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
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
import { useJournalEntries } from '@/hooks/useJournalEntries'
import { JOURNAL_TYPE_LABELS, JOURNAL_STATUS_LABELS, JOURNAL_TYPES, JOURNAL_STATUSES } from '@thanamol/shared'
import type { JournalType, JournalStatus } from '@thanamol/shared'

export const Route = createFileRoute('/_authenticated/finance/accounting/journal-entries/')({
  component: JournalEntriesPage,
})

function JournalEntriesPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState<JournalType | 'all'>('all')
  const [filterStatus, setFilterStatus] = useState<JournalStatus | 'all'>('all')
  const [filterPeriod, setFilterPeriod] = useState('')

  const { data, isLoading } = useJournalEntries({
    search: search || undefined,
    journalType: filterType === 'all' ? undefined : filterType,
    status: filterStatus === 'all' ? undefined : filterStatus,
    postingPeriod: filterPeriod || undefined,
    limit: 50,
  })

  const journals = data?.data ?? []
  const total = data?.pagination?.total ?? 0

  function formatAmount(val: number) {
    return new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extralight tracking-[0.3em] text-slate-600 uppercase">
            Journal Entries
          </h1>
          <p className="text-sm text-slate-500 mt-1">สมุดรายวัน — {total} entries</p>
        </div>
        <Button
          size="sm"
          onClick={() => navigate({ to: '/finance/accounting/journal-entries/create' })}
        >
          <Plus className="w-4 h-4 mr-1" /> New Entry
        </Button>
      </div>

      <div className="flex gap-2 items-center flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterType} onValueChange={(v) => setFilterType(v as any)}>
          <SelectTrigger className="w-44"><SelectValue placeholder="All Types" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {JOURNAL_TYPES.map((t) => (
              <SelectItem key={t} value={t}>{JOURNAL_TYPE_LABELS[t].en}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as any)}>
          <SelectTrigger className="w-36"><SelectValue placeholder="All Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {JOURNAL_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>{JOURNAL_STATUS_LABELS[s].en}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          type="month"
          value={filterPeriod}
          onChange={(e) => setFilterPeriod(e.target.value)}
          className="w-40"
          placeholder="Period"
        />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-40">Journal No.</TableHead>
                <TableHead className="w-36">Type</TableHead>
                <TableHead className="w-28">Date</TableHead>
                <TableHead className="w-20">Period</TableHead>
                <TableHead>Narration</TableHead>
                <TableHead className="w-28 text-right">Debit</TableHead>
                <TableHead className="w-28 text-right">Credit</TableHead>
                <TableHead className="w-24">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-slate-400">Loading...</TableCell>
                </TableRow>
              ) : journals.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-slate-400">
                    <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    No journal entries found
                  </TableCell>
                </TableRow>
              ) : (
                journals.map((j) => {
                  const typeLabel = JOURNAL_TYPE_LABELS[j.journal_type as JournalType]
                  const statusLabel = JOURNAL_STATUS_LABELS[j.status as JournalStatus]
                  return (
                    <TableRow key={j.id} className="cursor-pointer hover:bg-slate-50">
                      <TableCell>
                        <Link
                          to="/finance/accounting/journal-entries/$journalId"
                          params={{ journalId: j.id }}
                          className="font-mono text-sm text-indigo-600 hover:underline"
                        >
                          {j.journal_number}
                        </Link>
                      </TableCell>
                      <TableCell className="text-xs">{typeLabel?.th ?? j.journal_type}</TableCell>
                      <TableCell className="text-sm">{new Date(j.journal_date).toLocaleDateString('th-TH')}</TableCell>
                      <TableCell className="text-sm font-mono">{j.posting_period}</TableCell>
                      <TableCell className="text-sm truncate max-w-[200px]">{j.narration ?? '-'}</TableCell>
                      <TableCell className="text-right font-mono text-sm">{formatAmount(j.total_debit)}</TableCell>
                      <TableCell className="text-right font-mono text-sm">{formatAmount(j.total_credit)}</TableCell>
                      <TableCell>
                        <Badge className={`text-xs ${statusLabel?.color ?? ''}`}>
                          {statusLabel?.th ?? j.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
