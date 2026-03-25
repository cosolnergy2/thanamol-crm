import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { ArrowLeft, Save, Plus, Trash2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useCreateBudget } from '@/hooks/useBudgets'
import { useProjects } from '@/hooks/useProjects'
import { useAuth } from '@/providers/AuthProvider'
import { BUDGET_LINE_CATEGORIES } from '@thanamol/shared'
import type { CreateBudgetLineInput } from '@thanamol/shared'

export const Route = createFileRoute('/_authenticated/facility-management/budget/create')({
  component: BudgetCreatePage,
})

type LineFormData = CreateBudgetLineInput & { _key: number }

function BudgetCreatePage() {
  const navigate = useNavigate()
  const { currentUser } = useAuth()
  const { data: projectsData } = useProjects({ limit: 100 })
  const createBudget = useCreateBudget()

  const [form, setForm] = useState({
    title: '',
    projectId: '',
    fiscalYear: new Date().getFullYear(),
    periodStart: '',
    periodEnd: '',
    totalApproved: 0,
    notes: '',
  })

  const [lines, setLines] = useState<LineFormData[]>([
    { _key: Date.now(), category: 'MAINTENANCE', description: '', approved_amount: 0 },
  ])

  function addLine() {
    setLines((prev) => [
      ...prev,
      { _key: Date.now(), category: 'OTHER', description: '', approved_amount: 0 },
    ])
  }

  function removeLine(key: number) {
    setLines((prev) => prev.filter((l) => l._key !== key))
  }

  function updateLine(key: number, field: keyof CreateBudgetLineInput, value: string | number) {
    setLines((prev) =>
      prev.map((l) => (l._key === key ? { ...l, [field]: value } : l))
    )
  }

  const linesTotal = lines.reduce((sum, l) => sum + (l.approved_amount || 0), 0)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!currentUser) return

    await createBudget.mutateAsync({
      ...form,
      createdBy: currentUser.id,
      lines: lines.map(({ _key: _k, ...rest }) => rest),
    })

    navigate({ to: '/facility-management/budget' })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="icon"
          onClick={() => navigate({ to: '/facility-management/budget' })}
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-extralight tracking-[0.3em] text-slate-600 uppercase">
            Create Budget
          </h1>
          <p className="text-sm text-slate-500 mt-1">สร้างงบประมาณใหม่</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium text-slate-700">Budget Details</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Annual Operations Budget 2026"
              />
            </div>

            <div>
              <Label htmlFor="projectId">Project *</Label>
              <select
                id="projectId"
                required
                value={form.projectId}
                onChange={(e) => setForm({ ...form, projectId: e.target.value })}
                className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Select project</option>
                {(projectsData?.data ?? []).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="fiscalYear">Fiscal Year *</Label>
              <Input
                id="fiscalYear"
                type="number"
                required
                min={2000}
                max={2100}
                value={form.fiscalYear}
                onChange={(e) => setForm({ ...form, fiscalYear: Number(e.target.value) })}
              />
            </div>

            <div>
              <Label htmlFor="periodStart">Period Start *</Label>
              <Input
                id="periodStart"
                type="date"
                required
                value={form.periodStart}
                onChange={(e) => setForm({ ...form, periodStart: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="periodEnd">Period End *</Label>
              <Input
                id="periodEnd"
                type="date"
                required
                value={form.periodEnd}
                onChange={(e) => setForm({ ...form, periodEnd: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="totalApproved">Total Approved Amount (฿) *</Label>
              <Input
                id="totalApproved"
                type="number"
                required
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
                placeholder="Optional notes"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-medium text-slate-700">Budget Lines</CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={addLine} className="gap-2">
                <Plus className="w-4 h-4" />
                Add Line
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {lines.map((line) => (
              <div
                key={line._key}
                className="grid grid-cols-1 md:grid-cols-4 gap-3 p-3 border border-slate-100 rounded-lg"
              >
                <div>
                  <Label className="text-xs">Category</Label>
                  <select
                    value={line.category}
                    onChange={(e) => updateLine(line._key, 'category', e.target.value)}
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
                    value={line.description ?? ''}
                    onChange={(e) => updateLine(line._key, 'description', e.target.value)}
                    placeholder="Optional description"
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
                      value={line.approved_amount}
                      onChange={(e) =>
                        updateLine(line._key, 'approved_amount', Number(e.target.value))
                      }
                      className="text-sm"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 text-red-500 hover:text-red-700"
                    onClick={() => removeLine(line._key)}
                    disabled={lines.length === 1}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}

            <div className="flex justify-end text-sm text-slate-600 border-t pt-2">
              <span>Lines Total:&nbsp;</span>
              <span className="font-semibold">฿{linesTotal.toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate({ to: '/facility-management/budget' })}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="bg-indigo-600 hover:bg-indigo-700 gap-2"
            disabled={createBudget.isPending}
          >
            <Save className="w-4 h-4" />
            {createBudget.isPending ? 'Saving...' : 'Create Budget'}
          </Button>
        </div>
      </form>
    </div>
  )
}
