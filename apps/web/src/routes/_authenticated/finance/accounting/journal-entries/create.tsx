import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { ArrowLeft, Plus, Trash2, AlertTriangle, CheckCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useCreateJournalEntry } from '@/hooks/useJournalEntries'
import { useChartOfAccounts } from '@/hooks/useChartOfAccounts'
import { JOURNAL_TYPES, JOURNAL_TYPE_LABELS } from '@thanamol/shared'
import type { JournalType } from '@thanamol/shared'
import { useToast } from '@/components/ui/use-toast'

export const Route = createFileRoute(
  '/_authenticated/finance/accounting/journal-entries/create'
)({
  component: CreateJournalEntryPage,
})

type LineItem = {
  accountCode: string
  debit: string
  credit: string
  description: string
}

const EMPTY_LINE: LineItem = { accountCode: '', debit: '', credit: '', description: '' }

function CreateJournalEntryPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const createJournal = useCreateJournalEntry()
  const { data: accountsData } = useChartOfAccounts({ isActive: true, limit: 500 })

  const today = new Date()
  const [form, setForm] = useState({
    journalType: 'GENERAL' as string,
    journalDate: today.toISOString().slice(0, 10),
    postingPeriod: today.toISOString().slice(0, 7),
    referenceDocument: '',
    narration: '',
  })
  const [lines, setLines] = useState<LineItem[]>([{ ...EMPTY_LINE }, { ...EMPTY_LINE }])

  const accounts = accountsData?.data ?? []

  function updateLine(index: number, field: keyof LineItem, value: string) {
    setLines((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: value }
      return next
    })
  }

  function addLine() {
    setLines((prev) => [...prev, { ...EMPTY_LINE }])
  }

  function removeLine(index: number) {
    if (lines.length <= 2) return
    setLines((prev) => prev.filter((_, i) => i !== index))
  }

  const totalDebit = lines.reduce((sum, l) => sum + (parseFloat(l.debit) || 0), 0)
  const totalCredit = lines.reduce((sum, l) => sum + (parseFloat(l.credit) || 0), 0)
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01
  const difference = totalDebit - totalCredit

  function formatAmount(val: number) {
    return new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!isBalanced) {
      toast({ title: 'Debits must equal credits', variant: 'destructive' })
      return
    }

    const validLines = lines.filter((l) => l.accountCode && (parseFloat(l.debit) > 0 || parseFloat(l.credit) > 0))
    if (validLines.length < 2) {
      toast({ title: 'At least 2 valid lines required', variant: 'destructive' })
      return
    }

    try {
      await createJournal.mutateAsync({
        journalType: form.journalType as JournalType,
        journalDate: form.journalDate,
        postingPeriod: form.postingPeriod,
        referenceDocument: form.referenceDocument || undefined,
        narration: form.narration || undefined,
        lines: validLines.map((l) => ({
          accountCode: l.accountCode,
          debit: parseFloat(l.debit) || 0,
          credit: parseFloat(l.credit) || 0,
          description: l.description || undefined,
        })),
      })
      toast({ title: 'Journal entry created' })
      navigate({ to: '/finance/accounting/journal-entries' })
    } catch (err: any) {
      toast({ title: err?.message ?? 'Failed to create', variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate({ to: '/finance/accounting/journal-entries' })}
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-extralight tracking-[0.3em] text-slate-600 uppercase">
            New Journal Entry
          </h1>
          <p className="text-sm text-slate-500 mt-1">บันทึกรายการสมุดรายวัน</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Entry Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-4 gap-4">
              <div>
                <Label>Journal Type</Label>
                <Select value={form.journalType} onValueChange={(v) => setForm((f) => ({ ...f, journalType: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {JOURNAL_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>{JOURNAL_TYPE_LABELS[t].en}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Date</Label>
                <Input
                  type="date"
                  value={form.journalDate}
                  onChange={(e) => setForm((f) => ({ ...f, journalDate: e.target.value }))}
                />
              </div>
              <div>
                <Label>Posting Period</Label>
                <Input
                  type="month"
                  value={form.postingPeriod}
                  onChange={(e) => setForm((f) => ({ ...f, postingPeriod: e.target.value }))}
                />
              </div>
              <div>
                <Label>Reference Document</Label>
                <Input
                  value={form.referenceDocument}
                  onChange={(e) => setForm((f) => ({ ...f, referenceDocument: e.target.value }))}
                  placeholder="e.g. INV-001"
                />
              </div>
            </div>
            <div>
              <Label>Narration</Label>
              <Textarea
                value={form.narration}
                onChange={(e) => setForm((f) => ({ ...f, narration: e.target.value }))}
                rows={2}
                placeholder="Description of this journal entry"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="mt-4">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">Journal Lines</CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={addLine}>
              <Plus className="w-4 h-4 mr-1" /> Add Line
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="grid grid-cols-12 gap-2 text-xs font-medium text-slate-500 px-1">
                <div className="col-span-4">Account</div>
                <div className="col-span-2 text-right">Debit</div>
                <div className="col-span-2 text-right">Credit</div>
                <div className="col-span-3">Description</div>
                <div className="col-span-1"></div>
              </div>
              {lines.map((line, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-4">
                    <Select value={line.accountCode || 'placeholder'} onValueChange={(v) => updateLine(i, 'accountCode', v === 'placeholder' ? '' : v)}>
                      <SelectTrigger className="text-xs">
                        <SelectValue placeholder="Select account" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="placeholder" disabled>Select account</SelectItem>
                        {accounts.map((a) => (
                          <SelectItem key={a.account_code} value={a.account_code} className="text-xs">
                            {a.account_code} - {a.account_name_th}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2">
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={line.debit}
                      onChange={(e) => updateLine(i, 'debit', e.target.value)}
                      className="text-right text-sm"
                      placeholder="0.00"
                    />
                  </div>
                  <div className="col-span-2">
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={line.credit}
                      onChange={(e) => updateLine(i, 'credit', e.target.value)}
                      className="text-right text-sm"
                      placeholder="0.00"
                    />
                  </div>
                  <div className="col-span-3">
                    <Input
                      value={line.description}
                      onChange={(e) => updateLine(i, 'description', e.target.value)}
                      className="text-xs"
                      placeholder="Line desc."
                    />
                  </div>
                  <div className="col-span-1 flex justify-center">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeLine(i)}
                      disabled={lines.length <= 2}
                      className="text-red-400 hover:text-red-600"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t">
              <div className="grid grid-cols-12 gap-2 items-center">
                <div className="col-span-4 text-right font-medium text-sm">Total</div>
                <div className="col-span-2 text-right font-mono font-medium text-sm">{formatAmount(totalDebit)}</div>
                <div className="col-span-2 text-right font-mono font-medium text-sm">{formatAmount(totalCredit)}</div>
                <div className="col-span-4 flex items-center gap-2 pl-2">
                  {isBalanced ? (
                    <span className="flex items-center gap-1 text-xs text-green-600">
                      <CheckCircle className="w-3.5 h-3.5" /> Balanced
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs text-red-600">
                      <AlertTriangle className="w-3.5 h-3.5" /> Diff: {formatAmount(Math.abs(difference))}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2 mt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate({ to: '/finance/accounting/journal-entries' })}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={createJournal.isPending || !isBalanced}>
            {createJournal.isPending ? 'Creating...' : 'Create Entry'}
          </Button>
        </div>
      </form>
    </div>
  )
}
