import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { ArrowLeft } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useChartOfAccount, useUpdateChartOfAccount, useChartOfAccounts } from '@/hooks/useChartOfAccounts'
import { ACCOUNT_TYPES, NORMAL_BALANCES, CASH_FLOW_CATEGORIES, VAT_TYPES, ACCOUNT_TYPE_LABELS } from '@thanamol/shared'
import type { AccountType } from '@thanamol/shared'
import { useToast } from '@/components/ui/use-toast'

export const Route = createFileRoute(
  '/_authenticated/finance/accounting/chart-of-accounts/$accountId'
)({
  component: ChartOfAccountDetailPage,
})

function ChartOfAccountDetailPage() {
  const { accountId } = Route.useParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const { data, isLoading } = useChartOfAccount(accountId)
  const updateAccount = useUpdateChartOfAccount(accountId)
  const { data: allAccounts } = useChartOfAccounts({ limit: 500 })
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<Record<string, any>>({})

  const account = data?.account

  useEffect(() => {
    if (account) {
      setForm({
        accountNameTh: account.account_name_th,
        accountNameEn: account.account_name_en ?? '',
        accountType: account.account_type,
        level: account.level,
        parentAccountCode: account.parent_account_code ?? '',
        normalBalance: account.normal_balance,
        cashFlowCategory: account.cash_flow_category,
        vatType: account.vat_type,
        taxApplicable: account.tax_applicable,
        isSubledger: account.is_subledger,
        isActive: account.is_active,
        reportingGroup: account.reporting_group ?? '',
        description: account.description ?? '',
      })
    }
  }, [account])

  if (isLoading) return <div className="p-8 text-center text-slate-400">Loading...</div>
  if (!account) return <div className="p-8 text-center text-slate-400">Account not found</div>

  function updateForm(field: string, value: unknown) {
    setForm((prev: Record<string, any>) => ({ ...prev, [field]: value }))
  }

  async function handleSave() {
    try {
      await updateAccount.mutateAsync({
        accountNameTh: form.accountNameTh,
        accountNameEn: form.accountNameEn || undefined,
        accountType: form.accountType,
        level: form.level,
        parentAccountCode: form.parentAccountCode || null,
        normalBalance: form.normalBalance,
        cashFlowCategory: form.cashFlowCategory,
        vatType: form.vatType,
        taxApplicable: form.taxApplicable,
        isSubledger: form.isSubledger,
        isActive: form.isActive,
        reportingGroup: form.reportingGroup || null,
        description: form.description || null,
      })
      toast({ title: 'Account updated' })
      setEditing(false)
    } catch (err: any) {
      toast({ title: err?.message ?? 'Failed to update', variant: 'destructive' })
    }
  }

  const typeLabel = ACCOUNT_TYPE_LABELS[account.account_type as AccountType]
  const parentAccounts = (allAccounts?.data ?? []).filter(
    (a) => a.level < 3 && a.is_active && a.account_code !== account.account_code
  )

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
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
              {account.account_code}
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              {account.account_name_th}
              {typeLabel && (
                <span className={`ml-2 text-xs px-2 py-0.5 rounded-full font-medium ${typeLabel.color}`}>
                  {typeLabel.th}
                </span>
              )}
            </p>
          </div>
        </div>
        <Button variant={editing ? 'outline' : 'default'} size="sm" onClick={() => setEditing(!editing)}>
          {editing ? 'Cancel' : 'Edit'}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Account Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {editing ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Account Name (Thai)</Label>
                  <Input value={form.accountNameTh} onChange={(e) => updateForm('accountNameTh', e.target.value)} />
                </div>
                <div>
                  <Label>Account Name (English)</Label>
                  <Input value={form.accountNameEn} onChange={(e) => updateForm('accountNameEn', e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Account Type</Label>
                  <Select value={form.accountType} onValueChange={(v) => updateForm('accountType', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ACCOUNT_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>{t.replace(/_/g, ' ')}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Normal Balance</Label>
                  <Select value={form.normalBalance} onValueChange={(v) => updateForm('normalBalance', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {NORMAL_BALANCES.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Cash Flow Category</Label>
                  <Select value={form.cashFlowCategory} onValueChange={(v) => updateForm('cashFlowCategory', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CASH_FLOW_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Level</Label>
                  <Select value={String(form.level)} onValueChange={(v) => updateForm('level', Number(v))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1</SelectItem>
                      <SelectItem value="2">2</SelectItem>
                      <SelectItem value="3">3</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>VAT Type</Label>
                  <Select value={form.vatType} onValueChange={(v) => updateForm('vatType', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {VAT_TYPES.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Parent Account</Label>
                  <Select value={form.parentAccountCode || 'none'} onValueChange={(v) => updateForm('parentAccountCode', v === 'none' ? '' : v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
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
              <div>
                <Label>Description</Label>
                <Textarea value={form.description} onChange={(e) => updateForm('description', e.target.value)} rows={2} />
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
              <div className="flex justify-end">
                <Button onClick={handleSave} disabled={updateAccount.isPending}>
                  {updateAccount.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </>
          ) : (
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-slate-500">Code:</span> <span className="font-mono">{account.account_code}</span></div>
              <div><span className="text-slate-500">Type:</span> {account.account_type.replace(/_/g, ' ')}</div>
              <div><span className="text-slate-500">Name (TH):</span> {account.account_name_th}</div>
              <div><span className="text-slate-500">Name (EN):</span> {account.account_name_en ?? '-'}</div>
              <div><span className="text-slate-500">Level:</span> {account.level}</div>
              <div><span className="text-slate-500">Normal Balance:</span> {account.normal_balance}</div>
              <div><span className="text-slate-500">Cash Flow:</span> {account.cash_flow_category}</div>
              <div><span className="text-slate-500">VAT Type:</span> {account.vat_type}</div>
              <div><span className="text-slate-500">Parent:</span> {account.parent_account_code ?? 'None'}</div>
              <div><span className="text-slate-500">Reporting Group:</span> {account.reporting_group ?? '-'}</div>
              <div>
                <span className="text-slate-500">Status:</span>{' '}
                <Badge variant={account.is_active ? 'default' : 'secondary'}>{account.is_active ? 'Active' : 'Inactive'}</Badge>
              </div>
              <div><span className="text-slate-500">Description:</span> {account.description ?? '-'}</div>
            </div>
          )}
        </CardContent>
      </Card>

      {account.children && account.children.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Child Accounts ({account.children.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {account.children.map((child: any) => (
                <div key={child.id} className="flex items-center gap-2 text-sm py-1 px-2 rounded hover:bg-slate-50">
                  <span className="font-mono text-xs">{child.account_code}</span>
                  <span>{child.account_name_th}</span>
                  <Badge variant={child.is_active ? 'default' : 'secondary'} className="text-xs ml-auto">
                    {child.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
