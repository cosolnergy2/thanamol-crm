import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import {
  Plus,
  DollarSign,
  Activity,
  TrendingUp,
  TrendingDown,
  Search,
  Eye,
  CheckCircle2,
  Play,
  XCircle,
  FileText,
} from 'lucide-react'
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
import { useBudgets, useApproveBudget, useActivateBudget, useCloseBudget } from '@/hooks/useBudgets'
import type { BudgetStatus } from '@thanamol/shared'

export const Route = createFileRoute('/_authenticated/facility-management/budget/')({
  component: BudgetListPage,
})

const STATUS_TABS: Array<{ label: string; value: BudgetStatus | 'all' }> = [
  { label: 'All', value: 'all' },
  { label: 'Draft', value: 'DRAFT' },
  { label: 'Approved', value: 'APPROVED' },
  { label: 'Active', value: 'ACTIVE' },
  { label: 'Closed', value: 'CLOSED' },
]

const STATUS_BADGE: Record<BudgetStatus, string> = {
  DRAFT: 'bg-slate-100 text-slate-700',
  APPROVED: 'bg-blue-100 text-blue-700',
  ACTIVE: 'bg-green-100 text-green-700',
  CLOSED: 'bg-slate-100 text-slate-500',
}

function BudgetListPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState<BudgetStatus | 'all'>('all')
  const [fiscalYear, setFiscalYear] = useState<number | undefined>(undefined)

  const { data, isLoading } = useBudgets({
    search: search || undefined,
    status: activeTab === 'all' ? undefined : activeTab,
    fiscalYear,
    limit: 50,
  })

  const approveBudget = useApproveBudget()
  const activateBudget = useActivateBudget()
  const closeBudget = useCloseBudget()

  const budgets = data?.data ?? []
  const total = data?.pagination.total ?? 0

  const totalApproved = budgets.reduce((sum, b) => sum + b.total_approved, 0)
  const totalCommitted = budgets.reduce((sum, b) => sum + b.total_committed, 0)
  const totalActual = budgets.reduce((sum, b) => sum + b.total_actual, 0)
  const totalVariance = totalApproved - totalActual

  function handleApprove(id: string) {
    if (!confirm('Approve this budget?')) return
    approveBudget.mutate({ id })
  }

  function handleActivate(id: string) {
    if (!confirm('Activate this budget?')) return
    activateBudget.mutate(id)
  }

  function handleClose(id: string) {
    if (!confirm('Close this budget? This action cannot be undone.')) return
    closeBudget.mutate(id)
  }

  const currentYear = new Date().getFullYear()
  const yearOptions = [currentYear - 1, currentYear, currentYear + 1]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extralight tracking-[0.3em] text-slate-600 uppercase">
            Budget Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">งบประมาณ — {total} total</p>
        </div>
        <div className="flex gap-2">
          <Link to="/facility-management/budget/templates">
            <Button variant="outline" className="gap-2">
              <FileText className="w-4 h-4" />
              Templates
            </Button>
          </Link>
          <Link to="/facility-management/budget/create">
            <Button className="bg-indigo-600 hover:bg-indigo-700 gap-2">
              <Plus className="w-4 h-4" />
              New Budget
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">Total Approved</p>
                <p className="text-2xl font-light text-slate-700 mt-1">
                  ฿{totalApproved.toLocaleString()}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-indigo-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">Committed</p>
                <p className="text-2xl font-light text-slate-700 mt-1">
                  ฿{totalCommitted.toLocaleString()}
                </p>
              </div>
              <Activity className="w-8 h-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">Actual Spent</p>
                <p className="text-2xl font-light text-slate-700 mt-1">
                  ฿{totalActual.toLocaleString()}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">Variance</p>
                <p
                  className={`text-2xl font-light mt-1 ${totalVariance >= 0 ? 'text-green-600' : 'text-red-600'}`}
                >
                  ฿{totalVariance.toLocaleString()}
                </p>
              </div>
              {totalVariance >= 0 ? (
                <TrendingDown className="w-8 h-8 text-green-500" />
              ) : (
                <TrendingUp className="w-8 h-8 text-red-500" />
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex gap-2 items-center flex-wrap">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search budget code or title..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <select
              value={fiscalYear ?? ''}
              onChange={(e) =>
                setFiscalYear(e.target.value ? Number(e.target.value) : undefined)
              }
              className="border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Years</option>
              {yearOptions.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-1 border-b">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.value
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {isLoading ? (
            <div className="py-12 text-center text-slate-400">Loading...</div>
          ) : budgets.length === 0 ? (
            <div className="py-12 text-center text-slate-400">No budgets found</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Year</TableHead>
                  <TableHead className="text-right">Approved</TableHead>
                  <TableHead className="text-right">Committed</TableHead>
                  <TableHead className="text-right">Actual</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {budgets.map((budget) => (
                  <TableRow key={budget.id}>
                    <TableCell className="font-mono text-sm">{budget.budget_code}</TableCell>
                    <TableCell className="font-medium">{budget.title}</TableCell>
                    <TableCell className="text-slate-600">{budget.project.name}</TableCell>
                    <TableCell>{budget.fiscal_year}</TableCell>
                    <TableCell className="text-right font-mono">
                      ฿{budget.total_approved.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right font-mono text-amber-600">
                      ฿{budget.total_committed.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right font-mono text-green-700">
                      ฿{budget.total_actual.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge className={STATUS_BADGE[budget.status]}>{budget.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() =>
                            navigate({
                              to: '/facility-management/budget/$budgetId',
                              params: { budgetId: budget.id },
                            })
                          }
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        {budget.status === 'DRAFT' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-blue-600 hover:text-blue-800"
                            onClick={() => handleApprove(budget.id)}
                            disabled={approveBudget.isPending}
                            title="Approve"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </Button>
                        )}
                        {budget.status === 'APPROVED' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-green-600 hover:text-green-800"
                            onClick={() => handleActivate(budget.id)}
                            disabled={activateBudget.isPending}
                            title="Activate"
                          >
                            <Play className="w-4 h-4" />
                          </Button>
                        )}
                        {budget.status === 'ACTIVE' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-600 hover:text-slate-800"
                            onClick={() => handleClose(budget.id)}
                            disabled={closeBudget.isPending}
                            title="Close"
                          >
                            <XCircle className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
