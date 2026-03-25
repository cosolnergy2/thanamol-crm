import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { ArrowLeft, Plus, Trash2, Save, Edit } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  useBudgetTemplates,
  useCreateBudgetTemplate,
  useDeleteBudgetTemplate,
} from '@/hooks/useBudgetTemplates'
import { BUDGET_LINE_CATEGORIES } from '@thanamol/shared'
import type { BudgetTemplateLine } from '@thanamol/shared'

export const Route = createFileRoute('/_authenticated/facility-management/budget/templates')({
  component: BudgetTemplatesPage,
})

type LineForm = BudgetTemplateLine & { _key: number }

function BudgetTemplatesPage() {
  const navigate = useNavigate()
  const { data, isLoading } = useBudgetTemplates()
  const createTemplate = useCreateBudgetTemplate()
  const deleteTemplate = useDeleteBudgetTemplate()

  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ name: '', description: '' })
  const [lines, setLines] = useState<LineForm[]>([
    { _key: Date.now(), category: 'MAINTENANCE', approved_amount: 0 },
  ])

  function addLine() {
    setLines((prev) => [
      ...prev,
      { _key: Date.now(), category: 'OTHER', approved_amount: 0 },
    ])
  }

  function removeLine(key: number) {
    setLines((prev) => prev.filter((l) => l._key !== key))
  }

  function updateLine(key: number, field: keyof BudgetTemplateLine, value: string | number) {
    setLines((prev) => prev.map((l) => (l._key === key ? { ...l, [field]: value } : l)))
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    await createTemplate.mutateAsync({
      name: form.name,
      description: form.description || undefined,
      lines: lines.map(({ _key: _k, ...rest }) => rest),
    })
    setForm({ name: '', description: '' })
    setLines([{ _key: Date.now(), category: 'MAINTENANCE', approved_amount: 0 }])
    setShowCreate(false)
  }

  function handleDelete(id: string, name: string) {
    if (!confirm(`Delete template "${name}"?`)) return
    deleteTemplate.mutate(id)
  }

  const templates = data?.templates ?? []

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
            <h1 className="text-2xl font-extralight tracking-[0.3em] text-slate-600 uppercase">
              Budget Templates
            </h1>
            <p className="text-sm text-slate-500 mt-1">เทมเพลตงบประมาณ</p>
          </div>
        </div>
        <Button
          onClick={() => setShowCreate(!showCreate)}
          className="bg-indigo-600 hover:bg-indigo-700 gap-2"
        >
          <Plus className="w-4 h-4" />
          New Template
        </Button>
      </div>

      {showCreate && (
        <Card className="border-indigo-200 bg-indigo-50/30">
          <CardHeader>
            <CardTitle className="text-base font-medium text-slate-700">
              Create Template
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Template Name *</Label>
                  <Input
                    id="name"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. Standard Facility Budget"
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    rows={1}
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Optional description"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Template Lines</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addLine}>
                    <Plus className="w-4 h-4 mr-1" />
                    Add
                  </Button>
                </div>
                {lines.map((line) => (
                  <div
                    key={line._key}
                    className="grid grid-cols-1 md:grid-cols-4 gap-3 p-3 border border-slate-200 rounded-lg bg-white"
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
                        placeholder="Optional"
                        className="text-sm"
                      />
                    </div>
                    <div className="flex gap-2 items-end">
                      <div className="flex-1">
                        <Label className="text-xs">Default Amount (฿)</Label>
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
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-700 gap-2"
                  disabled={createTemplate.isPending}
                >
                  <Save className="w-4 h-4" />
                  Save Template
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="py-12 text-center text-slate-400">Loading...</div>
      ) : templates.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-slate-400">
            No templates yet. Create one to speed up budget creation.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {templates.map((template) => (
            <Card key={template.id}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-medium text-slate-700">{template.name}</h3>
                    {template.description && (
                      <p className="text-sm text-slate-500 mt-1">{template.description}</p>
                    )}
                    <div className="flex gap-2 mt-3 flex-wrap">
                      {(template.lines as BudgetTemplateLine[]).map((line, i) => (
                        <span
                          key={i}
                          className="text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded"
                        >
                          {line.category}: ฿{line.approved_amount.toLocaleString()}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(template.id, template.name)}
                      disabled={deleteTemplate.isPending}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
