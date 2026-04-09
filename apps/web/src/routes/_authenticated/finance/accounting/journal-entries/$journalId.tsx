import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { ArrowLeft, Send, CheckCircle, BookOpen, XCircle, RotateCcw } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  useJournalEntry,
  useSubmitJournalEntry,
  useApproveJournalEntry,
  usePostJournalEntry,
  useCancelJournalEntry,
  useReverseJournalEntry,
} from '@/hooks/useJournalEntries'
import { JOURNAL_TYPE_LABELS, JOURNAL_STATUS_LABELS } from '@thanamol/shared'
import type { JournalType, JournalStatus } from '@thanamol/shared'
import { useToast } from '@/components/ui/use-toast'

export const Route = createFileRoute(
  '/_authenticated/finance/accounting/journal-entries/$journalId'
)({
  component: JournalEntryDetailPage,
})

function JournalEntryDetailPage() {
  const { journalId } = Route.useParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const { data, isLoading } = useJournalEntry(journalId)

  const submitJE = useSubmitJournalEntry()
  const approveJE = useApproveJournalEntry()
  const postJE = usePostJournalEntry()
  const cancelJE = useCancelJournalEntry()
  const reverseJE = useReverseJournalEntry()

  const journal = data?.journal

  if (isLoading) return <div className="p-8 text-center text-slate-400">Loading...</div>
  if (!journal) return <div className="p-8 text-center text-slate-400">Journal entry not found</div>

  function formatAmount(val: number) {
    return new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val)
  }

  async function handleAction(action: string) {
    const actions: Record<string, { fn: any; confirm: string }> = {
      submit: { fn: submitJE, confirm: 'Submit this entry for review?' },
      approve: { fn: approveJE, confirm: 'Approve this entry?' },
      post: { fn: postJE, confirm: 'Post this entry? This will affect the ledger.' },
      cancel: { fn: cancelJE, confirm: 'Cancel this entry?' },
      reverse: { fn: reverseJE, confirm: 'Create a reversing entry?' },
    }
    const a = actions[action]
    if (!a || !confirm(a.confirm)) return
    try {
      await a.fn.mutateAsync(journalId)
      toast({ title: `Entry ${action}${action === 'post' ? 'ed' : action === 'reverse' ? 'd' : 'ed'} successfully` })
    } catch (err: any) {
      toast({ title: err?.message ?? `Failed to ${action}`, variant: 'destructive' })
    }
  }

  const typeLabel = JOURNAL_TYPE_LABELS[journal.journal_type as JournalType]
  const statusLabel = JOURNAL_STATUS_LABELS[journal.status as JournalStatus]

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
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
              {journal.journal_number}
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              {typeLabel?.th ?? journal.journal_type}
              <Badge className={`ml-2 text-xs ${statusLabel?.color ?? ''}`}>
                {statusLabel?.th ?? journal.status}
              </Badge>
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {journal.status === 'DRAFT' && (
            <>
              <Button variant="outline" size="sm" onClick={() => handleAction('cancel')}>
                <XCircle className="w-4 h-4 mr-1" /> Cancel
              </Button>
              <Button size="sm" onClick={() => handleAction('submit')}>
                <Send className="w-4 h-4 mr-1" /> Submit
              </Button>
            </>
          )}
          {journal.status === 'SUBMITTED' && (
            <Button size="sm" onClick={() => handleAction('approve')}>
              <CheckCircle className="w-4 h-4 mr-1" /> Approve
            </Button>
          )}
          {journal.status === 'APPROVED' && (
            <Button size="sm" onClick={() => handleAction('post')}>
              <BookOpen className="w-4 h-4 mr-1" /> Post
            </Button>
          )}
          {journal.status === 'POSTED' && (
            <Button variant="outline" size="sm" onClick={() => handleAction('reverse')}>
              <RotateCcw className="w-4 h-4 mr-1" /> Reverse
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Entry Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="text-slate-500">Journal No:</span> <span className="font-mono">{journal.journal_number}</span></div>
            <div><span className="text-slate-500">Type:</span> {typeLabel?.en ?? journal.journal_type}</div>
            <div><span className="text-slate-500">Date:</span> {new Date(journal.journal_date).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
            <div><span className="text-slate-500">Period:</span> <span className="font-mono">{journal.posting_period}</span></div>
            <div><span className="text-slate-500">Reference:</span> {journal.reference_document ?? '-'}</div>
            <div><span className="text-slate-500">Source:</span> {journal.source_module ?? '-'}</div>
            <div className="col-span-2"><span className="text-slate-500">Narration:</span> {journal.narration ?? '-'}</div>
            <div><span className="text-slate-500">Prepared by:</span> {journal.preparer ? `${journal.preparer.first_name} ${journal.preparer.last_name}` : '-'}</div>
            <div><span className="text-slate-500">Approved by:</span> {journal.approver ? `${journal.approver.first_name} ${journal.approver.last_name}` : '-'}</div>
            {journal.posted_at && (
              <div><span className="text-slate-500">Posted:</span> {new Date(journal.posted_at).toLocaleString('th-TH')}</div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Journal Lines</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">#</TableHead>
                <TableHead className="w-28">Account Code</TableHead>
                <TableHead>Account Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="w-28 text-right">Debit</TableHead>
                <TableHead className="w-28 text-right">Credit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {journal.lines.map((line) => (
                <TableRow key={line.id}>
                  <TableCell className="text-xs text-slate-400">{line.line_number}</TableCell>
                  <TableCell className="font-mono text-sm">{line.account_code}</TableCell>
                  <TableCell className="text-sm">{line.account?.account_name_th ?? '-'}</TableCell>
                  <TableCell className="text-sm text-slate-500">{line.description ?? '-'}</TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {Number(line.debit) > 0 ? formatAmount(Number(line.debit)) : ''}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {Number(line.credit) > 0 ? formatAmount(Number(line.credit)) : ''}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="font-medium bg-slate-50">
                <TableCell colSpan={4} className="text-right">Total</TableCell>
                <TableCell className="text-right font-mono">{formatAmount(journal.total_debit)}</TableCell>
                <TableCell className="text-right font-mono">{formatAmount(journal.total_credit)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
