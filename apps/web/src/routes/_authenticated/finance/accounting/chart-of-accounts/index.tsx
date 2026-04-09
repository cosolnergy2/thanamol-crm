import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { Plus, Search, Download, BookOpen } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useChartOfAccounts, useDeleteChartOfAccount } from '@/hooks/useChartOfAccounts'
import { ACCOUNT_TYPE_LABELS } from '@thanamol/shared'
import type { AccountType } from '@thanamol/shared'

export const Route = createFileRoute('/_authenticated/finance/accounting/chart-of-accounts/')({
  component: ChartOfAccountsPage,
})

const TYPE_TABS: Array<{ label: string; value: AccountType | 'all' }> = [
  { label: 'All', value: 'all' },
  { label: 'Asset', value: 'ASSET' },
  { label: 'Liability', value: 'LIABILITY' },
  { label: 'Equity', value: 'EQUITY' },
  { label: 'Revenue', value: 'REVENUE' },
  { label: 'Cost of Sales', value: 'COST_OF_SALES' },
  { label: 'Operating Exp', value: 'OPERATING_EXPENSE' },
  { label: 'Other Income', value: 'OTHER_INCOME' },
  { label: 'Other Expense', value: 'OTHER_EXPENSE' },
]

function ChartOfAccountsPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState<AccountType | 'all'>('all')

  const { data, isLoading } = useChartOfAccounts({
    search: search || undefined,
    accountType: activeTab === 'all' ? undefined : activeTab,
    limit: 200,
  })

  const deleteAccount = useDeleteChartOfAccount()

  const accounts = data?.data ?? []
  const total = data?.pagination.total ?? 0

  function handleDelete(id: string, code: string) {
    if (!confirm(`Delete account ${code}?`)) return
    deleteAccount.mutate(id)
  }

  function exportCSV() {
    const rows = [['Account Code', 'Account Name (TH)', 'Account Name (EN)', 'Type', 'Level', 'Parent', 'Normal Balance', 'Active']]
    accounts.forEach((a) =>
      rows.push([a.account_code, a.account_name_th, a.account_name_en ?? '', a.account_type, String(a.level), a.parent_account_code ?? '', a.normal_balance, a.is_active ? 'Yes' : 'No'])
    )
    const csv = rows.map((r) => r.join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'chart_of_accounts.csv'
    a.click()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extralight tracking-[0.3em] text-slate-600 uppercase">
            Chart of Accounts
          </h1>
          <p className="text-sm text-slate-500 mt-1">ผังบัญชี — {total} accounts</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportCSV}>
            <Download className="w-4 h-4 mr-1" /> Export
          </Button>
          <Button
            size="sm"
            onClick={() => navigate({ to: '/finance/accounting/chart-of-accounts/create' })}
          >
            <Plus className="w-4 h-4 mr-1" /> Add Account
          </Button>
        </div>
      </div>

      <div className="flex gap-2 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search code, name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <div className="flex gap-1 flex-wrap">
        {TYPE_TABS.map((tab) => (
          <Button
            key={tab.value}
            variant={activeTab === tab.value ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab(tab.value)}
            className="text-xs"
          >
            {tab.label}
          </Button>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-32">Code</TableHead>
                <TableHead>Account Name</TableHead>
                <TableHead className="w-36">Type</TableHead>
                <TableHead className="w-16 text-center">Lvl</TableHead>
                <TableHead className="w-20 text-center">Dr/Cr</TableHead>
                <TableHead className="w-20 text-center">Active</TableHead>
                <TableHead className="w-24"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-slate-400">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : accounts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-slate-400">
                    <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    No accounts found
                  </TableCell>
                </TableRow>
              ) : (
                accounts.map((account) => {
                  const typeLabel = ACCOUNT_TYPE_LABELS[account.account_type as AccountType]
                  return (
                    <TableRow key={account.id} className="cursor-pointer hover:bg-slate-50">
                      <TableCell className="font-mono text-sm font-medium">
                        {account.account_code}
                      </TableCell>
                      <TableCell>
                        <Link
                          to="/finance/accounting/chart-of-accounts/$accountId"
                          params={{ accountId: account.id }}
                          className="hover:text-indigo-600"
                        >
                          <div style={{ paddingLeft: `${(account.level - 1) * 16}px` }}>
                            {account.account_name_th}
                            {account.account_name_en && (
                              <span className="text-xs text-slate-400 ml-2">
                                {account.account_name_en}
                              </span>
                            )}
                          </div>
                        </Link>
                      </TableCell>
                      <TableCell>
                        {typeLabel && (
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${typeLabel.color}`}>
                            {typeLabel.th}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">{account.level}</TableCell>
                      <TableCell className="text-center text-xs">
                        {account.normal_balance === 'DEBIT' ? 'Dr' : 'Cr'}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={account.is_active ? 'default' : 'secondary'} className="text-xs">
                          {account.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs text-red-500"
                          onClick={() => handleDelete(account.id, account.account_code)}
                        >
                          Delete
                        </Button>
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
