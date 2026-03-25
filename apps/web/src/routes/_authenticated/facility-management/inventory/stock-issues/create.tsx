import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { ArrowLeft, Save, Plus, Trash2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useCreateStockIssue } from '@/hooks/useStockIssues'
import { useInventoryItems } from '@/hooks/useInventory'
import { useProjects } from '@/hooks/useProjects'
import { useAuth } from '@/providers/AuthProvider'
import type { StockIssueItem } from '@thanamol/shared'

export const Route = createFileRoute(
  '/_authenticated/facility-management/inventory/stock-issues/create'
)({
  component: StockIssueCreatePage,
})

type FormItem = StockIssueItem & { _key: string }

function StockIssueCreatePage() {
  const navigate = useNavigate()
  const createIssue = useCreateStockIssue()
  const { data: inventoryData } = useInventoryItems({ isActive: true })
  const { data: projectsData } = useProjects({ limit: 100 })
  const { currentUser } = useAuth()

  const [form, setForm] = useState({
    projectId: '',
    issueDate: new Date().toISOString().split('T')[0],
    notes: '',
  })
  const [items, setItems] = useState<FormItem[]>([
    { _key: crypto.randomUUID(), item_id: '', item_code: '', item_name: '', quantity: 1, unit_cost: null, unit_of_measure: null },
  ])

  const inventoryItems = inventoryData?.data ?? []
  const projects = projectsData?.data ?? []

  function addItem() {
    setItems((prev) => [
      ...prev,
      { _key: crypto.randomUUID(), item_id: '', item_code: '', item_name: '', quantity: 1, unit_cost: null, unit_of_measure: null },
    ])
  }

  function removeItem(key: string) {
    setItems((prev) => prev.filter((i) => i._key !== key))
  }

  function selectInventoryItem(key: string, itemId: string) {
    const inv = inventoryItems.find((i) => i.id === itemId)
    if (!inv) return
    setItems((prev) =>
      prev.map((i) =>
        i._key === key
          ? {
              ...i,
              item_id: itemId,
              item_code: inv.item_code,
              item_name: inv.name,
              unit_cost: inv.unit_cost,
              unit_of_measure: inv.unit_of_measure,
            }
          : i
      )
    )
  }

  function updateQuantity(key: string, qty: number) {
    setItems((prev) => prev.map((i) => (i._key === key ? { ...i, quantity: qty } : i)))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const validItems = items.filter((i) => i.item_id && i.quantity > 0)
    if (validItems.length === 0) return

    createIssue.mutate(
      {
        projectId: form.projectId || undefined,
        issueDate: form.issueDate,
        notes: form.notes || undefined,
        issuedBy: currentUser?.id,
        items: validItems.map(({ _key: _k, ...rest }) => rest),
      },
      {
        onSuccess: () => {
          navigate({ to: '/facility-management/inventory/stock-issues' })
        },
      }
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="icon"
          onClick={() => navigate({ to: '/facility-management/inventory/stock-issues' })}
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-extralight tracking-[0.3em] text-slate-600 uppercase">
            Issue Stock
          </h1>
          <p className="text-sm text-slate-500 mt-1 font-extralight">
            Create a new stock issue
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium">Issue Information</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="issueDate">Issue Date *</Label>
              <Input
                id="issueDate"
                type="date"
                required
                value={form.issueDate}
                onChange={(e) => setForm({ ...form, issueDate: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="projectId">Project</Label>
              <Select
                value={form.projectId}
                onValueChange={(v) => setForm({ ...form, projectId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">No project</SelectItem>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={2}
                placeholder="Additional notes..."
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-medium">Items to Issue</CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={addItem} className="gap-1">
                <Plus className="w-3.5 h-3.5" />
                Add Item
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {items.map((item) => {
              const selectedInv = inventoryItems.find((i) => i.id === item.item_id)
              return (
                <div
                  key={item._key}
                  className="flex gap-2 items-center p-3 bg-slate-50 rounded-lg border border-slate-200"
                >
                  <div className="flex-1">
                    <Select
                      value={item.item_id}
                      onValueChange={(v) => selectInventoryItem(item._key, v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select item..." />
                      </SelectTrigger>
                      <SelectContent>
                        {inventoryItems.map((inv) => (
                          <SelectItem key={inv.id} value={inv.id}>
                            {inv.name} ({inv.item_code}) — Stock: {inv.current_stock}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-28">
                    <Input
                      type="number"
                      min="0.001"
                      step="0.001"
                      placeholder="Qty"
                      value={item.quantity}
                      onChange={(e) => updateQuantity(item._key, Number(e.target.value))}
                      max={selectedInv?.current_stock ?? undefined}
                    />
                  </div>
                  <div className="w-20 text-xs text-slate-500 text-right">
                    {selectedInv?.unit_of_measure ?? ''}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-red-500 hover:text-red-700"
                    onClick={() => removeItem(item._key)}
                    disabled={items.length === 1}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              )
            })}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate({ to: '/facility-management/inventory/stock-issues' })}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={createIssue.isPending || items.every((i) => !i.item_id)}
            className="bg-indigo-600 hover:bg-indigo-700 gap-2"
          >
            <Save className="w-4 h-4" />
            Create Stock Issue
          </Button>
        </div>
      </form>
    </div>
  )
}
