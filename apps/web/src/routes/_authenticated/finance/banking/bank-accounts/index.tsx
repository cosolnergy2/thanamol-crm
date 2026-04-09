import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { Plus, Search, Building2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useBankAccounts, useCreateBankAccount } from '@/hooks/useBankAccounts'
import { BANK_ACCOUNT_TYPES } from '@thanamol/shared'
import { useToast } from '@/components/ui/use-toast'

export const Route = createFileRoute('/_authenticated/finance/banking/bank-accounts/')({
  component: BankAccountsPage,
})

function formatCurrency(val: number) {
  return new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val)
}

function BankAccountsPage() {
  const { toast } = useToast()
  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState({ accountName: '', accountNumber: '', bankName: '', branchName: '', accountType: 'CURRENT', openingBalance: 0 })

  const { data, isLoading } = useBankAccounts({ search: search || undefined })
  const createAccount = useCreateBankAccount()

  const accounts = data?.data ?? []

  async function handleCreate() {
    try {
      await createAccount.mutateAsync(form as any)
      toast({ title: 'Bank account created' })
      setDialogOpen(false)
      setForm({ accountName: '', accountNumber: '', bankName: '', branchName: '', accountType: 'CURRENT', openingBalance: 0 })
    } catch (err: any) {
      toast({ title: err?.message ?? 'Failed', variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extralight tracking-[0.3em] text-slate-600 uppercase">Bank Accounts</h1>
          <p className="text-sm text-slate-500 mt-1">บัญชีธนาคาร</p>
        </div>
        <Button size="sm" onClick={() => setDialogOpen(true)}><Plus className="w-4 h-4 mr-1" /> Add Account</Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Account Name</TableHead>
                <TableHead>Account No.</TableHead>
                <TableHead>Bank</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Balance</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-slate-400">Loading...</TableCell></TableRow>
              ) : accounts.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-slate-400"><Building2 className="w-8 h-8 mx-auto mb-2 opacity-50" />No bank accounts</TableCell></TableRow>
              ) : accounts.map((acc) => (
                <TableRow key={acc.id}>
                  <TableCell className="font-medium">{acc.account_name}</TableCell>
                  <TableCell className="font-mono text-sm">{acc.account_number}</TableCell>
                  <TableCell>{acc.bank_name}{acc.branch_name ? ` — ${acc.branch_name}` : ''}</TableCell>
                  <TableCell className="text-sm">{acc.account_type}</TableCell>
                  <TableCell className="text-right font-mono">{formatCurrency(acc.current_balance)}</TableCell>
                  <TableCell><Badge variant={acc.is_active ? 'default' : 'secondary'}>{acc.is_active ? 'Active' : 'Inactive'}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Bank Account</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Account Name *</Label><Input value={form.accountName} onChange={(e) => setForm((f) => ({ ...f, accountName: e.target.value }))} /></div>
            <div><Label>Account Number *</Label><Input value={form.accountNumber} onChange={(e) => setForm((f) => ({ ...f, accountNumber: e.target.value }))} /></div>
            <div><Label>Bank Name *</Label><Input value={form.bankName} onChange={(e) => setForm((f) => ({ ...f, bankName: e.target.value }))} /></div>
            <div><Label>Branch</Label><Input value={form.branchName} onChange={(e) => setForm((f) => ({ ...f, branchName: e.target.value }))} /></div>
            <div>
              <Label>Account Type</Label>
              <Select value={form.accountType} onValueChange={(v) => setForm((f) => ({ ...f, accountType: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{BANK_ACCOUNT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Opening Balance</Label><Input type="number" step="0.01" value={form.openingBalance} onChange={(e) => setForm((f) => ({ ...f, openingBalance: Number(e.target.value) }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={createAccount.isPending}>{createAccount.isPending ? 'Creating...' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
