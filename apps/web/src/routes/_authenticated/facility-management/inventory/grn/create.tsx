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
import { useCreateGRN } from '@/hooks/useGRN'
import { useInventoryItems } from '@/hooks/useInventory'
import { usePurchaseOrders, usePurchaseOrder } from '@/hooks/usePurchaseOrders'
import { useAuth } from '@/providers/AuthProvider'
import { QC_STATUSES, generateUUID } from '@thanamol/shared'
import type { GRNItem } from '@thanamol/shared'

export const Route = createFileRoute(
  '/_authenticated/facility-management/inventory/grn/create'
)({
  component: GRNCreatePage,
})

type FormItem = GRNItem & { _key: string }

function buildEmptyItem(): FormItem {
  return {
    _key: generateUUID(),
    item_id: '',
    item_code: '',
    item_name: '',
    quantity: 1,
    unit_cost: null,
    unit_of_measure: null,
  }
}

function GRNCreatePage() {
  const navigate = useNavigate()
  const createGRN = useCreateGRN()
  const { data: inventoryData } = useInventoryItems({ isActive: true })
  const { data: posData } = usePurchaseOrders({ limit: 100 })
  const { currentUser } = useAuth()

  const [selectedPoId, setSelectedPoId] = useState('')
  const { data: poDetailData } = usePurchaseOrder(selectedPoId)

  const [form, setForm] = useState({
    receivedDate: new Date().toISOString().split('T')[0],
    qcStatus: '',
    inspectionNotes: '',
  })
  const [items, setItems] = useState<FormItem[]>([buildEmptyItem()])

  const inventoryItems = inventoryData?.data ?? []
  const purchaseOrders = posData?.data ?? []
  const selectedPo = poDetailData?.po ?? null

  function handlePoSelect(poId: string) {
    if (poId === '__none__') {
      setSelectedPoId('')
      setItems([buildEmptyItem()])
      return
    }
    setSelectedPoId(poId)
  }

  // When PO detail loads, populate items from PO
  function handlePopulateFromPo() {
    if (!selectedPo) return
    const poItems = selectedPo.items.map((poItem) => ({
      _key: generateUUID(),
      item_id: '',
      item_code: '',
      item_name: poItem.item_name,
      quantity: poItem.quantity,
      unit_cost: poItem.unit_price ?? null,
      unit_of_measure: poItem.unit_of_measure ?? null,
    }))
    if (poItems.length > 0) setItems(poItems)
  }

  function addItem() {
    setItems((prev) => [...prev, buildEmptyItem()])
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

  function updateItemField(key: string, field: keyof FormItem, value: unknown) {
    setItems((prev) =>
      prev.map((i) => (i._key === key ? { ...i, [field]: value } : i))
    )
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const validItems = items.filter((i) => i.item_id && i.quantity > 0)
    if (validItems.length === 0) return

    createGRN.mutate(
      {
        supplierName: selectedPo?.vendor_name ?? '',
        receivedDate: form.receivedDate,
        inspectionNotes: form.inspectionNotes || undefined,
        qcStatus: form.qcStatus || undefined,
        poId: selectedPoId || undefined,
        receivedBy: currentUser?.id,
        items: validItems.map(({ _key: _k, ...rest }) => rest),
      },
      {
        onSuccess: () => {
          navigate({ to: '/facility-management/inventory/grn' })
        },
      }
    )
  }

  const supplierName = selectedPo?.vendor_name ?? ''

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="icon"
          onClick={() => navigate({ to: '/facility-management/inventory/grn' })}
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-extralight tracking-[0.3em] text-slate-600 uppercase">
            Receive Goods
          </h1>
          <p className="text-sm text-slate-500 mt-1 font-extralight">
            Create a Goods Received Note (GRN)
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium">GRN Information</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="poId">Purchase Order</Label>
              <Select
                value={selectedPoId || '__none__'}
                onValueChange={handlePoSelect}
              >
                <SelectTrigger id="poId">
                  <SelectValue placeholder="Select PO (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No PO (manual entry)</SelectItem>
                  {purchaseOrders.map((po) => (
                    <SelectItem key={po.id} value={po.id}>
                      {po.po_number} — {po.vendor_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedPo && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-2 text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                  onClick={handlePopulateFromPo}
                >
                  Auto-fill items from PO
                </Button>
              )}
            </div>
            <div>
              <Label htmlFor="supplierName">Supplier</Label>
              <Input
                id="supplierName"
                value={supplierName}
                readOnly={Boolean(selectedPoId)}
                placeholder={selectedPoId ? 'Auto-filled from PO' : 'Select a PO'}
                className={selectedPoId ? 'bg-slate-50 text-slate-500' : ''}
              />
            </div>
            <div>
              <Label htmlFor="receivedDate">Received Date *</Label>
              <Input
                id="receivedDate"
                type="date"
                required
                value={form.receivedDate}
                onChange={(e) => setForm({ ...form, receivedDate: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="qcStatus">QC Status</Label>
              <Select
                value={form.qcStatus}
                onValueChange={(v) => setForm({ ...form, qcStatus: v })}
              >
                <SelectTrigger id="qcStatus">
                  <SelectValue placeholder="Select QC status" />
                </SelectTrigger>
                <SelectContent>
                  {QC_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="inspectionNotes">Notes</Label>
              <Textarea
                id="inspectionNotes"
                value={form.inspectionNotes}
                onChange={(e) => setForm({ ...form, inspectionNotes: e.target.value })}
                rows={2}
                placeholder="Inspection notes..."
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-medium">Items Received</CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={addItem} className="gap-1">
                <Plus className="w-3.5 h-3.5" />
                Add Item
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {items.map((item) => (
              <div
                key={item._key}
                className="grid grid-cols-12 gap-2 items-center p-3 bg-slate-50 rounded-lg border border-slate-200"
              >
                <div className="col-span-5">
                  <Select
                    value={item.item_id}
                    onValueChange={(v) => selectInventoryItem(item._key, v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={item.item_name || 'Select item...'} />
                    </SelectTrigger>
                    <SelectContent>
                      {inventoryItems.map((inv) => (
                        <SelectItem key={inv.id} value={inv.id}>
                          {inv.name} ({inv.item_code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {item.item_name && !item.item_id && (
                    <p className="text-xs text-slate-400 mt-1 truncate">{item.item_name}</p>
                  )}
                </div>
                <div className="col-span-2">
                  <Input
                    type="number"
                    min="0.001"
                    step="0.001"
                    placeholder="Qty"
                    value={item.quantity}
                    onChange={(e) => updateItemField(item._key, 'quantity', Number(e.target.value))}
                  />
                </div>
                <div className="col-span-2">
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Unit cost"
                    value={item.unit_cost ?? ''}
                    onChange={(e) =>
                      updateItemField(
                        item._key,
                        'unit_cost',
                        e.target.value ? Number(e.target.value) : null
                      )
                    }
                  />
                </div>
                <div className="col-span-2 text-sm text-slate-500 font-mono">
                  {item.unit_cost != null && item.quantity > 0
                    ? `฿${(item.unit_cost * item.quantity).toLocaleString()}`
                    : '—'}
                </div>
                <div className="col-span-1 flex justify-end">
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
              </div>
            ))}

            {items.some((i) => i.unit_cost != null) && (
              <div className="flex justify-end pt-2 border-t">
                <div className="text-right">
                  <p className="text-xs text-slate-500">Total Value</p>
                  <p className="text-xl font-light text-slate-700">
                    ฿
                    {items
                      .reduce((sum, i) => sum + (i.unit_cost ?? 0) * i.quantity, 0)
                      .toLocaleString()}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate({ to: '/facility-management/inventory/grn' })}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={createGRN.isPending || items.every((i) => !i.item_id)}
            className="bg-indigo-600 hover:bg-indigo-700 gap-2"
          >
            <Save className="w-4 h-4" />
            Create GRN
          </Button>
        </div>
      </form>
    </div>
  )
}
