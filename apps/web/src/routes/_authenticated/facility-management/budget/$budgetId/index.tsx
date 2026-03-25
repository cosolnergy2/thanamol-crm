import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import {
  ArrowLeft,
  Edit,
  CheckCircle2,
  Play,
  XCircle,
  DollarSign,
  Activity,
  TrendingUp,
  Plus,
} from 'lucide-react'
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
  useBudget,
  useApproveBudget,
  useActivateBudget,
  useCloseBudget,
} from '@/hooks/useBudgets'
import { useBudgetTransactions } from '@/hooks/useBudgetTransactions'
import type { BudgetStatus } from '@thanamol/shared'

export const Route = createFileRoute('/_authenticated/facility-management/budget/$budgetId/')({
  component: BudgetDetailPage,
})

const STATUS_BADGE: Record<BudgetStatus, string> = {
  DRAFT: 'bg-slate-100 text-slate-700',
  APPROVED: 'bg-blue-100 text-blue-700',
  ACTIVE: 'bg-green-100 text-green-700',
  CLOSED: 'bg-slate-100 text-slate-500',
}

const TX_TYPE_BADGE: Record<string, string> = {
  COMMITMENT: 'bg-amber-100 text-amber-700',
  ACTUAL: 'bg-green-100 text-green-700',
  REVERSAL: 'bg-red-100 text-red-700',
}

function BudgetDetailPage() {
  const navigate = useNavigate()
  const { budgetId } = Route.useParams()
  const { data, isLoading } = useBudget(budgetId)
  const { data: txData } = useBudgetTransactions(budgetId)
  const approveBudget = useApproveBudget()
  const activateBudget = useActivateBudget()
  const closeBudget = useCloseBudget()

  if (isLoading) return <div className="py-12 text-center text-slate-400">Loading...</div>
  if (!data?.budget) return <div className="py-12 text-center text-slate-400">Budget not found</div>

  const { budget } = data
  const transactions = txData?.data ?? []
  const variance = budget.total_approved - budget.total_actual
  const utilizationPct =
    budget.total_approved > 0
      ? ((budget.total_actual / budget.total_approved) * 100).toFixed(1)
      : '0.0'

  function handleApprove() {
    if (!confirm('Approve this budget?')) return
    approveBudget.mutate({ id: budgetId })
  }

  function handleActivate() {
    if (!confirm('Activate this budget?')) return
    activateBudget.mutate(budgetId)
  }

  function handleClose() {
    if (!confirm('Close this budget? This action cannot be undone.')) return
    closeBudget.mutate(budgetId)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate({ to: '/facility-management/budget' })}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-extralight tracking-[0.3em] text-slate-600 uppercase">
                {budget.budget_code}
              </h1>
              <Badge className={STATUS_BADGE[budget.status]}>{budget.status}</Badge>
            </div>
            <p className="text-sm text-slate-500 mt-1">{budget.title}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {budget.status === 'DRAFT' && (
            <>
              <Link
                to="/facility-management/budget/$budgetId/edit"
                params={{ budgetId }}
              >
                <Button variant="outline" className="gap-2">
                  <Edit className="w-4 h-4" />
                  Edit
                </Button>
              </Link>
              <Button
                onClick={handleApprove}
                className="bg-blue-600 hover:bg-blue-700 gap-2"
                disabled={approveBudget.isPending}
              >
                <CheckCircle2 className="w-4 h-4" />
                Approve
              </Button>
            </>
          )}
          {budget.status === 'APPROVED' && (
            <Button
              onClick={handleActivate}
              className="bg-green-600 hover:bg-green-700 gap-2"
              disabled={activateBudget.isPending}
            >
              <Play className="w-4 h-4" />
              Activate
            </Button>
          )}
          {budget.status === 'ACTIVE' && (
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={closeBudget.isPending}
              className="gap-2"
            >
              <XCircle className="w-4 h-4" />
              Close Budget
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">Approved</p>
                <p className="text-xl font-light text-slate-700 mt-1">
                  ฿{budget.total_approved.toLocaleString()}
                </p>
              </div>
              <DollarSign className="w-7 h-7 text-indigo-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">Committed</p>
                <p className="text-xl font-light text-amber-600 mt-1">
                  ฿{budget.total_committed.toLocaleString()}
                </p>
              </div>
              <Activity className="w-7 h-7 text-amber-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">Actual ({utilizationPct}%)</p>
                <p className="text-xl font-light text-green-700 mt-1">
                  ฿{budget.total_actual.toLocaleString()}
                </p>
              </div>
              <TrendingUp className="w-7 h-7 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">Variance</p>
                <p
                  className={`text-xl font-light mt-1 ${variance >= 0 ? 'text-green-600' : 'text-red-600'}`}
                >
                  ฿{variance.toLocaleString()}
                </p>
              </div>
              <DollarSign
                className={`w-7 h-7 ${variance >= 0 ? 'text-green-500' : 'text-red-500'}`}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
        <div className="bg-slate-50 rounded-lg p-4 space-y-2">
          <p className="text-xs text-slate-500 uppercase tracking-wide">Details</p>
          <p>
            <span className="text-slate-500">Project:</span>{' '}
            <span className="font-medium">{budget.project.name}</span>
          </p>
          <p>
            <span className="text-slate-500">Fiscal Year:</span>{' '}
            <span className="font-medium">{budget.fiscal_year}</span>
          </p>
          <p>
            <span className="text-slate-500">Period:</span>{' '}
            <span className="font-medium">
              {new Date(budget.period_start).toLocaleDateString()} —{' '}
              {new Date(budget.period_end).toLocaleDateString()}
            </span>
          </p>
        </div>
        <div className="bg-slate-50 rounded-lg p-4 space-y-2">
          <p className="text-xs text-slate-500 uppercase tracking-wide">Created By</p>
          <p className="font-medium">
            {budget.creator.first_name} {budget.creator.last_name}
          </p>
          <p className="text-slate-500">{new Date(budget.created_at).toLocaleDateString()}</p>
        </div>
        {budget.approver && (
          <div className="bg-slate-50 rounded-lg p-4 space-y-2">
            <p className="text-xs text-slate-500 uppercase tracking-wide">Approved By</p>
            <p className="font-medium">
              {budget.approver.first_name} {budget.approver.last_name}
            </p>
          </div>
        )}
        {budget.notes && (
          <div className="bg-slate-50 rounded-lg p-4 md:col-span-3">
            <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Notes</p>
            <p className="text-slate-700">{budget.notes}</p>
          </div>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium text-slate-700">Budget Lines</CardTitle>
        </CardHeader>
        <CardContent>
          {budget.lines.length === 0 ? (
            <p className="text-slate-400 text-center py-4">No budget lines</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Approved</TableHead>
                  <TableHead className="text-right">Committed</TableHead>
                  <TableHead className="text-right">Actual</TableHead>
                  <TableHead className="text-right">Remaining</TableHead>
                  <TableHead className="text-right">%</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {budget.lines.map((line) => {
                  const remaining = line.approved_amount - line.actual_amount
                  const pct =
                    line.approved_amount > 0
                      ? ((line.actual_amount / line.approved_amount) * 100).toFixed(1)
                      : '0.0'
                  return (
                    <TableRow key={line.id}>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {line.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-slate-600">{line.description ?? '—'}</TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        ฿{line.approved_amount.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm text-amber-600">
                        ฿{line.committed_amount.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm text-green-700">
                        ฿{line.actual_amount.toLocaleString()}
                      </TableCell>
                      <TableCell
                        className={`text-right font-mono text-sm ${remaining < 0 ? 'text-red-600' : 'text-slate-700'}`}
                      >
                        ฿{remaining.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right text-sm">{pct}%</TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-medium text-slate-700">
              Transaction History
            </CardTitle>
            {budget.status === 'ACTIVE' && (
              <Link
                to="/facility-management/budget/$budgetId/edit"
                params={{ budgetId }}
              >
                <Button variant="outline" size="sm" className="gap-2">
                  <Plus className="w-4 h-4" />
                  Add Transaction
                </Button>
              </Link>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <p className="text-slate-400 text-center py-4">No transactions yet</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Line</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell className="text-sm text-slate-500">
                      {new Date(tx.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          TX_TYPE_BADGE[tx.transaction_type] ?? 'bg-slate-100 text-slate-700'
                        }
                      >
                        {tx.transaction_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {tx.budget_line ? (
                        <Badge variant="outline" className="text-xs">
                          {tx.budget_line.category}
                        </Badge>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell className="text-slate-600 text-sm">
                      {tx.description ?? '—'}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      ฿{tx.amount.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-sm text-slate-500">
                      {tx.creator
                        ? `${tx.creator.first_name} ${tx.creator.last_name}`
                        : '—'}
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
