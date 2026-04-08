import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useCreateChartOfAccount, useChartOfAccounts } from '@/hooks/useChartOfAccounts'
import { ACCOUNT_TYPES, NORMAL_BALANCES, CASH_FLOW_CATEGORIES, VAT_TYPES } from '@thanamol/shared'
import { useToast } from '@/components/ui/use-toast'

export const Route = createFileRoute(
  '/_authenticated/finance/accounting/chart-of-accounts/create'
)({
  component: CreateChartOfAccountPage,
})

function CreateChartOfAccountPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const createAccount = useCreateChartOfAccount()
  const { data: existingAccounts } = useChartOfAccounts({ limit: 500 })

  const [form, setForm] = useState({
    accountCode: '',
    accountNameTh: '',
    accountNameEn: '',
    accountType: 'ASSET' as string,
    level: 3,
    parentAccountCode: '',
    normalBalance: 'DEBIT' as string,
    cashFlowCategory: 'NONE' as string,
    vatType: 'NONE' as string,
    taxApplicable: false,
    isSubledger: false,
    isActive: true,
    reportingGroup: '',
    description: '',
  })

  function updateForm(field: string, value: unknown) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.accountCode || !form.accountNameTh) {
      toast({ title: 'Please fill in required fields', variant: 'destructive' })
      return
    }

    try {
      await createAccount.mutateAsync({
        accountCode: form.accountCode,
        accountNameTh: form.accountNameTh,
        accountNameEn: form.accountNameEn || undefined,
        accountType: form.accountType as any,
        level: form.level,
        parentAccountCode: form.parentAccountCode || undefined,
        normalBalance: form.normalBalance as any,
        cashFlowCategory: form.cashFlowCategory as any,
        vatType: form.vatType,
        taxApplicable: form.taxApplicable,
        isSubledger: form.isSubledger,
        isActive: form.isActive,
        reportingGroup: form.reportingGroup || undefined,
        description: form.description || undefined,
      })
      toast({ title: 'Account created successfully' })
      navigate({ to: '/finance/accounting/chart-of-accounts' })
    } catch (err: any) {
      toast({ title: err?.message ?? 'Failed to create account', variant: 'destructive' })
    }
  }

  const parentAccounts = (existingAccounts?.data ?? []).filter(
    (a) => a.level < 3 && a.is_active
  )

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate({ to: '/finance/accounting/chart-of-accounts' })}
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-extralight tracking-[0.3em] text-slate-600 uppercase">
            Create Account
          </h1>
          <p className="text-sm text-slate-500 mt-1">สร้างบัญชีใหม่</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Account Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Account Code *</Label>
                <Input
                  value={form.accountCode}
                  onChange={(e) => updateForm('accountCode', e.target.value)}
                  placeholder="e.g. 1100-01"
                />
              </div>
              <div>
                <Label>Account Type *</Label>
                <Select value={form.accountType} onValueChange={(v) => updateForm('accountType', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ACCOUNT_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>{t.replace(/_/g, ' ')}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Account Name (Thai) *</Label>
              <Input
                value={form.accountNameTh}
                onChange={(e) => updateForm('accountNameTh', e.target.value)}
                placeholder="ชื่อบัญชี"
              />
            </div>

            <div>
              <Label>Account Name (English)</Label>
              <Input
                value={form.accountNameEn}
                onChange={(e) => updateForm('accountNameEn', e.target.value)}
                placeholder="Account name"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Level</Label>
                <Select
                  value={String(form.level)}
                  onValueChange={(v) => updateForm('level', Number(v))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 - Category</SelectItem>
                    <SelectItem value="2">2 - Sub-category</SelectItem>
                    <SelectItem value="3">3 - Detail</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Normal Balance</Label>
                <Select value={form.normalBalance} onValueChange={(v) => updateForm('normalBalance', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {NORMAL_BALANCES.map((b) => (
                      <SelectItem key={b} value={b}>{b}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Parent Account</Label>
                <Select
                  value={form.parentAccountCode || 'none'}
                  onValueChange={(v) => updateForm('parentAccountCode', v === 'none' ? '' : v)}
                >
                  <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {parentAccounts.map((a) => (
                      <SelectItem key={a.account_code} value={a.account_code}>
                        {a.account_code} - {a.account_name_th}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Cash Flow Category</Label>
                <Select value={form.cashFlowCategory} onValueChange={(v) => updateForm('cashFlowCategory', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CASH_FLOW_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>VAT Type</Label>
                <Select value={form.vatType} onValueChange={(v) => updateForm('vatType', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {VAT_TYPES.map((v) => (
                      <SelectItem key={v} value={v}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Reporting Group</Label>
              <Input
                value={form.reportingGroup}
                onChange={(e) => updateForm('reportingGroup', e.target.value)}
                placeholder="e.g. Current Assets"
              />
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={(e) => updateForm('description', e.target.value)}
                rows={2}
              />
            </div>

            <div className="flex gap-6">
              <div className="flex items-center gap-2">
                <Switch checked={form.taxApplicable} onCheckedChange={(v) => updateForm('taxApplicable', v)} />
                <Label>Tax Applicable</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.isSubledger} onCheckedChange={(v) => updateForm('isSubledger', v)} />
                <Label>Sub-ledger</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.isActive} onCheckedChange={(v) => updateForm('isActive', v)} />
                <Label>Active</Label>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2 mt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate({ to: '/finance/accounting/chart-of-accounts' })}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={createAccount.isPending}>
            {createAccount.isPending ? 'Creating...' : 'Create Account'}
          </Button>
        </div>
      </form>
    </div>
  )
}
