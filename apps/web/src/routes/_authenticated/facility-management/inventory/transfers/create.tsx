import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { ArrowLeft, ArrowLeftRight, Plus, Save, Trash2 } from 'lucide-react'
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
import { generateUUID } from '@thanamol/shared'
import { useCreateStockTransfer } from '@/hooks/useStockTransfers'
import { useInventoryItems } from '@/hooks/useInventory'
import { useProjects } from '@/hooks/useProjects'
import { useAuth } from '@/providers/AuthProvider'

export const Route = createFileRoute(
  '/_authenticated/facility-management/inventory/transfers/create'
)({
  component: StockTransferCreatePage,
})

type TransferItem = {
  _key: string
  itemId: string
  quantity: number
}

function StockTransferCreatePage() {
  const navigate = useNavigate()
  const createTransfer = useCreateStockTransfer()
  const { data: inventoryData } = useInventoryItems({ isActive: true })
  const { data: projectsData } = useProjects({ limit: 100 })
  const { currentUser } = useAuth()

  const [form, setForm] = useState({
    sourceProjectId: '',
    destinationProjectId: '',
    transferDate: new Date().toISOString().split('T')[0],
    notes: '',
  })
  const [items, setItems] = useState<TransferItem[]>([
    { _key: generateUUID(), itemId: '', quantity: 1 },
  ])

  const inventoryItems = inventoryData?.data ?? []
  const projects = projectsData?.data ?? []

  function addItem() {
    setItems((prev) => [...prev, { _key: generateUUID(), itemId: '', quantity: 1 }])
  }

  function removeItem(key: string) {
    setItems((prev) => prev.filter((i) => i._key !== key))
  }

  function updateItem(key: string, patch: Partial<Omit<TransferItem, '_key'>>) {
    setItems((prev) => prev.map((i) => (i._key === key ? { ...i, ...patch } : i)))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const validItems = items.filter((i) => i.itemId && i.quantity > 0)
    if (validItems.length === 0) return

    createTransfer.mutate(
      {
        sourceProjectId: form.sourceProjectId || undefined,
        destinationProjectId: form.destinationProjectId || undefined,
        items: validItems.map(({ itemId, quantity }) => ({ itemId, quantity })),
        transferDate: form.transferDate,
        notes: form.notes || undefined,
        transferredBy: currentUser?.id,
      },
      {
        onSuccess: () => {
          navigate({ to: '/facility-management/inventory/transfers' })
        },
      }
    )
  }

  const hasValidItems = items.some((i) => i.itemId && i.quantity > 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="icon"
          onClick={() => navigate({ to: '/facility-management/inventory/transfers' })}
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-extralight tracking-[0.3em] text-slate-600 uppercase">
            New Stock Transfer
          </h1>
          <p className="text-sm text-slate-500 mt-1 font-extralight">
            Transfer inventory items between sites
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium">Transfer Details</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="transferNumber">Transfer Number</Label>
              <Input
                id="transferNumber"
                value="Auto-generated on save"
                readOnly
                disabled
                className="bg-slate-50 text-slate-400 font-mono"
              />
            </div>
            <div>
              <Label htmlFor="transferDate">Transfer Date *</Label>
              <Input
                id="transferDate"
                type="date"
                required
                value={form.transferDate}
                onChange={(e) => setForm({ ...form, transferDate: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="sourceProjectId">Source Site</Label>
              <Select
                value={form.sourceProjectId || '__none__'}
                onValueChange={(v) =>
                  setForm({ ...form, sourceProjectId: v === '__none__' ? '' : v })
                }
              >
                <SelectTrigger id="sourceProjectId">
                  <SelectValue placeholder="Select source site" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No specific site</SelectItem>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="destinationProjectId">Destination Site</Label>
              <Select
                value={form.destinationProjectId || '__none__'}
                onValueChange={(v) =>
                  setForm({ ...form, destinationProjectId: v === '__none__' ? '' : v })
                }
              >
                <SelectTrigger id="destinationProjectId">
                  <SelectValue placeholder="Select destination site" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No specific site</SelectItem>
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
                placeholder="Reason for transfer, additional information..."
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-medium">Items to Transfer</CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={addItem} className="gap-1">
                <Plus className="w-3.5 h-3.5" />
                Add Item
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {items.map((item) => {
              const selectedInv = inventoryItems.find((i) => i.id === item.itemId)
              return (
                <div
                  key={item._key}
                  className="flex gap-2 items-center p-3 bg-slate-50 rounded-lg border border-slate-200"
                >
                  <div className="flex-1">
                    <Select
                      value={item.itemId}
                      onValueChange={(v) => updateItem(item._key, { itemId: v })}
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
                      onChange={(e) =>
                        updateItem(item._key, { quantity: Number(e.target.value) })
                      }
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
            onClick={() => navigate({ to: '/facility-management/inventory/transfers' })}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={createTransfer.isPending || !hasValidItems}
            className="bg-indigo-600 hover:bg-indigo-700 gap-2"
          >
            <ArrowLeftRight className="w-4 h-4" />
            <Save className="w-4 h-4" />
            Create Transfer
          </Button>
        </div>
      </form>
    </div>
  )
}
