import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { Search, FileCheck2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useBankReconciliations, useFinalizeBankReconciliation } from '@/hooks/useBankReconciliations'
import { useBankAccounts } from '@/hooks/useBankAccounts'
import { useToast } from '@/components/ui/use-toast'

export const Route = createFileRoute('/_authenticated/finance/banking/reconciliations/')({ component: ReconciliationsPage })

const STATUS_COLORS: Record<string, string> = { IN_PROGRESS: 'bg-yellow-100 text-yellow-700', BALANCED: 'bg-green-100 text-green-700', UNBALANCED: 'bg-red-100 text-red-700' }

function formatCurrency(val: number) { return new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val) }

function ReconciliationsPage() {
  const { toast } = useToast()
  const [bankAccountId, setBankAccountId] = useState<string>('all')
  const { data: bankData } = useBankAccounts({ isActive: 'true' })
  const { data, isLoading } = useBankReconciliations({ bankAccountId: bankAccountId === 'all' ? undefined : bankAccountId })
  const finalize = useFinalizeBankReconciliation()

  const recons = data?.data ?? []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extralight tracking-[0.3em] text-slate-600 uppercase">Bank Reconciliation</h1>
          <p className="text-sm text-slate-500 mt-1">กระทบยอดธนาคาร</p>
        </div>
      </div>
      <div className="flex gap-2">
        <Select value={bankAccountId} onValueChange={setBankAccountId}>
          <SelectTrigger className="w-60"><SelectValue placeholder="All Accounts" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Accounts</SelectItem>
            {(bankData?.data ?? []).map((a: any) => <SelectItem key={a.id} value={a.id}>{a.account_name} — {a.bank_name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Recon No.</TableHead><TableHead>Account</TableHead><TableHead>Month</TableHead>
                <TableHead className="text-right">Bank Balance</TableHead><TableHead className="text-right">Book Balance</TableHead>
                <TableHead className="text-right">Difference</TableHead><TableHead>Status</TableHead><TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? <TableRow><TableCell colSpan={8} className="text-center py-8 text-slate-400">Loading...</TableCell></TableRow>
              : recons.length === 0 ? <TableRow><TableCell colSpan={8} className="text-center py-8 text-slate-400"><FileCheck2 className="w-8 h-8 mx-auto mb-2 opacity-50" />No reconciliations</TableCell></TableRow>
              : recons.map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-sm">{r.reconciliation_number}</TableCell>
                  <TableCell>{r.bank_account?.account_name}</TableCell>
                  <TableCell className="font-mono text-sm">{r.reconciliation_month}</TableCell>
                  <TableCell className="text-right font-mono">{formatCurrency(r.bank_statement_balance)}</TableCell>
                  <TableCell className="text-right font-mono">{formatCurrency(r.book_balance)}</TableCell>
                  <TableCell className="text-right font-mono">{formatCurrency(r.difference)}</TableCell>
                  <TableCell><Badge className={`text-xs ${STATUS_COLORS[r.status] ?? ''}`}>{r.status}</Badge></TableCell>
                  <TableCell>
                    {r.status === 'IN_PROGRESS' && (
                      <Button variant="ghost" size="sm" className="text-xs" onClick={async () => {
                        try { await finalize.mutateAsync(r.id); toast({ title: 'Finalized' }) }
                        catch (err: any) { toast({ title: err?.message ?? 'Failed', variant: 'destructive' }) }
                      }}>Finalize</Button>
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
