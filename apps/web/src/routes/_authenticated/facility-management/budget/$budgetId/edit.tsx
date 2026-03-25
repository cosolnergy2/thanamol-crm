import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { ArrowLeft, Save, Plus, Trash2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useBudget, useUpdateBudget } from '@/hooks/useBudgets'
import { useCreateBudgetLine, useDeleteBudgetLine } from '@/hooks/useBudgetLines'
import { useCreateBudgetTransaction } from '@/hooks/useBudgetTransactions'
import { useAuth } from '@/providers/AuthProvider'
import { BUDGET_LINE_CATEGORIES } from '@thanamol/shared'
import type { CreateBudgetLineRequest } from '@thanamol/shared'

export const Route = createFileRoute('/_authenticated/facility-management/budget/$budgetId/edit')({
  component: BudgetEditPage,
})

function BudgetEditPage() {
  const navigate = useNavigate()
  const { budgetId } = Route.useParams()
  const { currentUser } = useAuth()
  const { data, isLoading } = useBudget(budgetId)
  const updateBudget = useUpdateBudget(budgetId)
  const createLine = useCreateBudgetLine(budgetId)
  const deleteLine = useDeleteBudgetLine(budgetId)
  const createTransaction = useCreateBudgetTransaction(budgetId)

  const [form, setForm] = useState({
    title: '',
    periodStart: '',
    periodEnd: '',
    totalApproved: 0,
    notes: '',
  })

  const [newLine, setNewLine] = useState<CreateBudgetLineRequest>({
    category: 'OTHER',
    description: '',
    approved_amount: 0,
  })

  const [showAddLine, setShowAddLine] = useState(false)

  const [newTx, setNewTx] = useState({
    budgetLineId: '',
    amount: 0,
    transactionType: 'COMMITMENT' as 'COMMITMENT' | 'ACTUAL' | 'REVERSAL',
    description: '',
  })

  const [showAddTx, setShowAddTx] = useState(false)

  useEffect(() => {
    if (data?.budget) {
      const b = data.budget
      setForm({
        title: b.title,
        periodStart: b.period_start.slice(0, 10),
        periodEnd: b.period_end.slice(0, 10),
        totalApproved: b.total_approved,
        notes: b.notes ?? '',
      })
    }
  }, [data?.budget])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    await updateBudget.mutateAsync(form)
    navigate({ to: '/facility-management/budget/$budgetId', params: { budgetId } })
  }

  async function handleAddLine() {
    await createLine.mutateAsync(newLine)
    setNewLine({ category: 'OTHER', description: '', approved_amount: 0 })
    setShowAddLine(false)
  }

  async function handleDeleteLine(id: string) {
    if (!confirm('Delete this budget line?')) return
    await deleteLine.mutateAsync(id)
  }

  async function handleAddTransaction() {
    await createTransaction.mutateAsync({
      ...newTx,
      budgetLineId: newTx.budgetLineId || undefined,
      createdBy: currentUser?.id,
    })
    setNewTx({ budgetLineId: '', amount: 0, transactionType: 'COMMITMENT', description: '' })
    setShowAddTx(false)
  }

  if (isLoading) return <div className="py-12 text-center text-slate-400">Loading...</div>
  if (!data?.budget) return <div className="py-12 text-center text-slate-400">Budget not found</div>

  const { budget } = data
  const isEditable = budget.status !== 'CLOSED'

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="icon"
          onClick={() =>
            navigate({ to: '/facility-management/budget/$budgetId', params: { budgetId } })
          }
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-extralight tracking-[0.3em] text-slate-600 uppercase">
            Edit Budget
          </h1>
          <p className="text-sm text-slate-500 mt-1">{budget.budget_code}</p>
        </div>
      </div>

      {isEditable && (
        <form onSubmit={handleSave} className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-medium text-slate-700">Budget Details</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="periodStart">Period Start</Label>
                <Input
                  id="periodStart"
                  type="date"
                  value={form.periodStart}
                  onChange={(e) => setForm({ ...form, periodStart: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="periodEnd">Period End</Label>
                <Input
                  id="periodEnd"
                  type="date"
                  value={form.periodEnd}
                  onChange={(e) => setForm({ ...form, periodEnd: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="totalApproved">Total Approved (฿)</Label>
                <Input
                  id="totalApproved"
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.totalApproved}
                  onChange={(e) => setForm({ ...form, totalApproved: Number(e.target.value) })}
                />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </div>
            </CardContent>
          </Card>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                navigate({ to: '/facility-management/budget/$budgetId', params: { budgetId } })
              }
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-700 gap-2"
              disabled={updateBudget.isPending}
            >
              <Save className="w-4 h-4" />
              Save Changes
            </Button>
          </div>
        </form>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-medium text-slate-700">Budget Lines</CardTitle>
            {isEditable && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAddLine(!showAddLine)}
                className="gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Line
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {showAddLine && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 p-3 border border-indigo-200 rounded-lg bg-indigo-50">
              <div>
                <Label className="text-xs">Category</Label>
                <select
                  value={newLine.category}
                  onChange={(e) => setNewLine({ ...newLine, category: e.target.value })}
                  className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {BUDGET_LINE_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <Label className="text-xs">Description</Label>
                <Input
                  value={newLine.description ?? ''}
                  onChange={(e) => setNewLine({ ...newLine, description: e.target.value })}
                  placeholder="Optional"
                  className="text-sm"
                />
              </div>
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <Label className="text-xs">Amount (฿)</Label>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={newLine.approved_amount}
                    onChange={(e) =>
                      setNewLine({ ...newLine, approved_amount: Number(e.target.value) })
                    }
                    className="text-sm"
                  />
                </div>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleAddLine}
                  disabled={createLine.isPending}
                  className="bg-indigo-600 hover:bg-indigo-700"
                >
                  Add
                </Button>
              </div>
            </div>
          )}

          {budget.lines.length === 0 ? (
            <p className="text-slate-400 text-center py-4">No budget lines</p>
          ) : (
            budget.lines.map((line) => (
              <div
                key={line.id}
                className="flex items-center justify-between p-3 border border-slate-100 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xs font-medium bg-slate-100 text-slate-700 px-2 py-1 rounded">
                    {line.category}
                  </span>
                  <span className="text-sm text-slate-600">{line.description ?? '—'}</span>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span>฿{line.approved_amount.toLocaleString()}</span>
                  {isEditable && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-red-500 hover:text-red-700"
                      onClick={() => handleDeleteLine(line.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {budget.status === 'ACTIVE' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-medium text-slate-700">
                Add Transaction
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAddTx(!showAddTx)}
                className="gap-2"
              >
                <Plus className="w-4 h-4" />
                Record
              </Button>
            </div>
          </CardHeader>
          {showAddTx && (
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Budget Line (optional)</Label>
                  <select
                    value={newTx.budgetLineId}
                    onChange={(e) => setNewTx({ ...newTx, budgetLineId: e.target.value })}
                    className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">No specific line</option>
                    {budget.lines.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.category} {l.description ? `— ${l.description}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>Transaction Type</Label>
                  <select
                    value={newTx.transactionType}
                    onChange={(e) =>
                      setNewTx({
                        ...newTx,
                        transactionType: e.target.value as 'COMMITMENT' | 'ACTUAL' | 'REVERSAL',
                      })
                    }
                    className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="COMMITMENT">COMMITMENT</option>
                    <option value="ACTUAL">ACTUAL</option>
                    <option value="REVERSAL">REVERSAL</option>
                  </select>
                </div>
                <div>
                  <Label>Amount (฿)</Label>
                  <Input
                    type="number"
                    min={0.01}
                    step="0.01"
                    value={newTx.amount}
                    onChange={(e) => setNewTx({ ...newTx, amount: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label>Description</Label>
                  <Input
                    value={newTx.description}
                    onChange={(e) => setNewTx({ ...newTx, description: e.target.value })}
                    placeholder="Optional description"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowAddTx(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleAddTransaction}
                  disabled={createTransaction.isPending || newTx.amount <= 0}
                  className="bg-indigo-600 hover:bg-indigo-700"
                >
                  Record Transaction
                </Button>
              </div>
            </CardContent>
          )}
        </Card>
      )}
    </div>
  )
}
