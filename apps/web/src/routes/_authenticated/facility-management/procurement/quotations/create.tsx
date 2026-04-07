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
import { useCreateVendorQuotation } from '@/hooks/useVendorQuotations'
import { usePurchaseRequest } from '@/hooks/usePurchaseRequests'
import { usePurchaseRequests } from '@/hooks/usePurchaseRequests'
import type { VQItem } from '@thanamol/shared'

const searchSchema = z.object({
  prId: z.string().optional(),
})

export const Route = createFileRoute(
  '/_authenticated/facility-management/procurement/quotations/create'
)({
  validateSearch: searchSchema,
  component: VQCreatePage,
})

type FormItem = VQItem & { _key: string }

function VQCreatePage() {
  const navigate = useNavigate()
  const { prId } = useSearch({
    from: '/_authenticated/facility-management/procurement/quotations/create',
  })
  const createVQ = useCreateVendorQuotation()

  const { data: prData } = usePurchaseRequest(prId ?? '')
  const { data: allPRsData } = usePurchaseRequests({ limit: 100, status: 'APPROVED' })

  const allPRs = allPRsData?.data ?? []

  const [vendorName, setVendorName] = useState('')
  const [quotationNumber, setQuotationNumber] = useState('')
  const [selectedPrId, setSelectedPrId] = useState(prId ?? '')
  const [validUntil, setValidUntil] = useState('')
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState<FormItem[]>([
    { _key: crypto.randomUUID(), item_name: '', quantity: 1, unit_price: 0, total: 0 },
  ])

  useEffect(() => {
    if (prData?.pr) {
      const pr = prData.pr
      const prItems = pr.items as Array<{
        item_name: string
        quantity: number
      }>

      if (prItems.length > 0) {
        setItems(
          prItems.map((item) => ({
            _key: crypto.randomUUID(),
            item_name: item.item_name,
            quantity: item.quantity,
            unit_price: 0,
            total: 0,
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

  function updateItem(key: string, field: keyof VQItem, value: string | number) {
    setItems((prev) =>
      prev.map((i) => {
        if (i._key !== key) return i
        const updated = { ...i, [field]: value }
        updated.total = updated.quantity * updated.unit_price
        return updated
      })
    )
  }

  const total = items.reduce((sum, item) => sum + item.total, 0)

  async function handleSubmit() {
    if (!vendorName.trim()) return

    await createVQ.mutateAsync({
      quotationNumber: quotationNumber || undefined,
      vendorName,
      prId: selectedPrId || undefined,
      items: items.map(({ _key: _, ...item }) => item),
      validUntil: validUntil || undefined,
      notes: notes || undefined,
    })

    navigate({ to: '/facility-management/procurement/quotations' })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="icon"
          onClick={() => navigate({ to: '/facility-management/procurement/quotations' })}
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-extralight tracking-[0.3em] text-slate-600 uppercase">
            Add Vendor Quotation
          </h1>
          {prData?.pr && (
            <p className="text-sm text-slate-500 mt-1">For PR: {prData.pr.pr_number}</p>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quotation Details</CardTitle>
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
              <Label>Quotation Number</Label>
              <Input
                value={quotationNumber}
                onChange={(e) => setQuotationNumber(e.target.value)}
                placeholder="e.g. Q2026-001"
              />
            </div>

            <div>
              <Label>Purchase Request (Optional)</Label>
              <Select value={selectedPrId || '__all__'} onValueChange={(v) => setSelectedPrId(v === '__all__' ? '' : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Link to PR" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">No PR</SelectItem>
                  {allPRs.map((pr) => (
                    <SelectItem key={pr.id} value={pr.id}>
                      {pr.pr_number} — {pr.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Valid Until</Label>
              <Input
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
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
                <Label className="text-xs">Qty</Label>
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
              <div className="col-span-2">
                <Label className="text-xs">Lead Time (days)</Label>
                <Input
                  type="number"
                  min="0"
                  value={item.lead_time_days ?? 0}
                  onChange={(e) =>
                    updateItem(item._key, 'lead_time_days', Number(e.target.value))
                  }
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

          <div className="flex justify-end pt-2 border-t">
            <div className="text-right">
              <p className="text-sm text-slate-500">Total</p>
              <p className="text-2xl font-light text-slate-700">฿{total.toLocaleString()}</p>
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
            placeholder="Notes from vendor or internal notes"
          />
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          onClick={() => navigate({ to: '/facility-management/procurement/quotations' })}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={createVQ.isPending || !vendorName.trim()}
          className="bg-indigo-600 hover:bg-indigo-700"
        >
          <Save className="w-4 h-4 mr-2" />
          Save Quotation
        </Button>
      </div>
    </div>
  )
}
