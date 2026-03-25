import { createFileRoute, useNavigate, useSearch } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { z } from 'zod'
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
import { useCreatePurchaseOrder } from '@/hooks/usePurchaseOrders'
import { usePurchaseRequest } from '@/hooks/usePurchaseRequests'
import { useProjects } from '@/hooks/useProjects'
import { useAuth } from '@/providers/AuthProvider'
import type { POItem } from '@thanamol/shared'

const searchSchema = z.object({
  prId: z.string().optional(),
})

export const Route = createFileRoute(
  '/_authenticated/facility-management/procurement/orders/create'
)({
  validateSearch: searchSchema,
  component: POCreatePage,
})

type FormItem = POItem & { _key: string }

function POCreatePage() {
  const navigate = useNavigate()
  const { prId } = useSearch({ from: '/_authenticated/facility-management/procurement/orders/create' })
  const { currentUser } = useAuth()
  const createPO = useCreatePurchaseOrder()

  const { data: projectsData } = useProjects({ limit: 100 })
  const { data: prData } = usePurchaseRequest(prId ?? '')

  const projects = projectsData?.data ?? []

  const [vendorName, setVendorName] = useState('')
  const [projectId, setProjectId] = useState('')
  const [deliveryDate, setDeliveryDate] = useState('')
  const [paymentTerms, setPaymentTerms] = useState('')
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState<FormItem[]>([
    { _key: crypto.randomUUID(), item_name: '', quantity: 1, unit_price: 0, total: 0 },
  ])

  useEffect(() => {
    if (prData?.pr) {
      const pr = prData.pr
      if (pr.project_id) setProjectId(pr.project_id)
      if (pr.notes) setNotes(pr.notes)

      const prItems = pr.items as Array<{
        item_name: string
        quantity: number
        unit_of_measure?: string
        estimated_unit_price?: number
      }>

      if (prItems.length > 0) {
        setItems(
          prItems.map((item) => ({
            _key: crypto.randomUUID(),
            item_name: item.item_name,
            quantity: item.quantity,
            unit_of_measure: item.unit_of_measure,
            unit_price: item.estimated_unit_price ?? 0,
            total: item.quantity * (item.estimated_unit_price ?? 0),
          }))
        )
      }
    }
  }, [prData])

  function addItem() {
    setItems((prev) => [
      ...prev,
      { _key: crypto.randomUUID(), item_name: '', quantity: 1, unit_price: 0, total: 0 },
    ])
  }

  function removeItem(key: string) {
    setItems((prev) => prev.filter((i) => i._key !== key))
  }

  function updateItem(key: string, field: keyof POItem, value: string | number) {
    setItems((prev) =>
      prev.map((i) => {
        if (i._key !== key) return i
        const updated = { ...i, [field]: value }
        updated.total = updated.quantity * updated.unit_price
        return updated
      })
    )
  }

  const subtotal = items.reduce((sum, item) => sum + item.total, 0)
  const tax = subtotal * 0.07
  const total = subtotal + tax

  async function handleSubmit() {
    if (!vendorName.trim()) return

    await createPO.mutateAsync({
      prId: prId || undefined,
      vendorName,
      projectId: projectId || undefined,
      items: items.map(({ _key: _, ...item }) => item),
      deliveryDate: deliveryDate || undefined,
      paymentTerms: paymentTerms || undefined,
      notes: notes || undefined,
      createdBy: currentUser!.id,
    })

    navigate({ to: '/facility-management/procurement/orders' })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="icon"
          onClick={() => navigate({ to: '/facility-management/procurement/orders' })}
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-extralight tracking-[0.3em] text-slate-600 uppercase">
            Create Purchase Order
          </h1>
          {prData?.pr && (
            <p className="text-sm text-slate-500 mt-1">From PR: {prData.pr.pr_number}</p>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>General Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Vendor Name *</Label>
              <Input
                value={vendorName}
                onChange={(e) => setVendorName(e.target.value)}
                placeholder="Vendor / supplier name"
              />
            </div>

            <div>
              <Label>Project (Optional)</Label>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No project</SelectItem>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Expected Delivery Date</Label>
              <Input
                type="date"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
              />
            </div>

            <div>
              <Label>Payment Terms</Label>
              <Input
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
                placeholder="e.g. Net 30, COD"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Items</CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={addItem}>
              <Plus className="w-4 h-4 mr-2" />
              Add Item
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {items.map((item) => (
            <div
              key={item._key}
              className="grid grid-cols-12 gap-3 items-end p-3 bg-slate-50 rounded-lg"
            >
              <div className="col-span-5">
                <Label className="text-xs">Item Name *</Label>
                <Input
                  value={item.item_name}
                  onChange={(e) => updateItem(item._key, 'item_name', e.target.value)}
                  placeholder="Item name"
                />
              </div>
              <div className="col-span-2">
                <Label className="text-xs">UOM</Label>
                <Input
                  value={item.unit_of_measure ?? ''}
                  onChange={(e) => updateItem(item._key, 'unit_of_measure', e.target.value)}
                  placeholder="pcs"
                />
              </div>
              <div className="col-span-2">
                <Label className="text-xs">Qty *</Label>
                <Input
                  type="number"
                  min="0.001"
                  value={item.quantity}
                  onChange={(e) => updateItem(item._key, 'quantity', Number(e.target.value))}
                />
              </div>
              <div className="col-span-2">
                <Label className="text-xs">Unit Price</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={item.unit_price}
                  onChange={(e) => updateItem(item._key, 'unit_price', Number(e.target.value))}
                />
              </div>
              <div className="col-span-1 flex justify-end">
                {items.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-red-500"
                    onClick={() => removeItem(item._key)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}

          <div className="space-y-2 pt-4 border-t">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Subtotal</span>
              <span className="font-mono">฿{subtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">VAT (7%)</span>
              <span className="font-mono">฿{tax.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-lg font-medium pt-2 border-t">
              <span>Total</span>
              <span className="font-mono">฿{total.toLocaleString()}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Additional notes"
          />
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          onClick={() => navigate({ to: '/facility-management/procurement/orders' })}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={createPO.isPending || !vendorName.trim()}
          className="bg-indigo-600 hover:bg-indigo-700"
        >
          <Save className="w-4 h-4 mr-2" />
          Create PO
        </Button>
      </div>
    </div>
  )
}
