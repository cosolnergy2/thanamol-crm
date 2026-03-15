import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { ArrowLeft, Save, Plus, Trash2, FileText } from 'lucide-react'
import { toast } from 'sonner'
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
import { PageHeader } from '@/components/PageHeader'
import { useCreateQuotation } from '@/hooks/useQuotations'
import { useCustomers } from '@/hooks/useCustomers'
import { useProjects } from '@/hooks/useProjects'
import { useUnits } from '@/hooks/useUnits'
import type { QuotationItem } from '@thanamol/shared'

export const Route = createFileRoute('/_authenticated/quotations/create')({
  component: QuotationCreatePage,
})

const TAX_RATE = 0.07

type LineItem = QuotationItem & { _key: number }

let itemKeyCounter = 0

function nextKey() {
  return ++itemKeyCounter
}

function emptyItem(): LineItem {
  return { _key: nextKey(), description: '', quantity: 1, unit_price: 0, amount: 0 }
}

function calculateTotals(items: LineItem[], discountAmount: number) {
  const totalAmount = items.reduce((sum, item) => sum + item.amount, 0)
  const discountedAmount = Math.max(0, totalAmount - discountAmount)
  const tax = Math.round(discountedAmount * TAX_RATE * 100) / 100
  const grandTotal = discountedAmount + tax
  return { totalAmount, tax, grandTotal }
}

function QuotationCreatePage() {
  const navigate = useNavigate()
  const today = new Date().toISOString().split('T')[0]
  const oneMonthLater = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const [customerId, setCustomerId] = useState('')
  const [projectId, setProjectId] = useState('')
  const [unitId, setUnitId] = useState('')
  const [validUntil, setValidUntil] = useState(oneMonthLater)
  const [notes, setNotes] = useState('')
  const [discount, setDiscount] = useState(0)
  const [items, setItems] = useState<LineItem[]>([emptyItem()])

  const { data: customersData } = useCustomers({ limit: 200 })
  const { data: projectsData } = useProjects({ limit: 200 })
  const { data: unitsData } = useUnits({ projectId: projectId || undefined, limit: 200 })

  const customers = customersData?.data ?? []
  const projects = projectsData?.data ?? []
  const units = unitsData?.data ?? []

  const createQuotation = useCreateQuotation()
  const { totalAmount, tax, grandTotal } = calculateTotals(items, discount)

  function updateItem(key: number, field: keyof QuotationItem, value: string | number) {
    setItems((prev) =>
      prev.map((item) => {
        if (item._key !== key) return item
        const updated = { ...item, [field]: value }
        updated.amount = updated.quantity * updated.unit_price
        return updated
      })
    )
  }

  function removeItem(key: number) {
    setItems((prev) => prev.filter((item) => item._key !== key))
  }

  function addItem() {
    setItems((prev) => [...prev, emptyItem()])
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!customerId) {
      toast.error('Please select a customer')
      return
    }
    if (!projectId) {
      toast.error('Please select a project')
      return
    }
    if (items.length === 0 || items.every((i) => !i.description)) {
      toast.error('Please add at least one line item')
      return
    }

    try {
      const validItems = items.filter((i) => i.description)
      await createQuotation.mutateAsync({
        customerId,
        projectId,
        unitId: unitId || undefined,
        items: validItems.map(({ _key: _, ...item }) => item),
        totalAmount,
        discount,
        tax,
        grandTotal,
        validUntil: validUntil || undefined,
        notes: notes || undefined,
        status: 'DRAFT',
      })
      toast.success('Quotation created successfully')
      navigate({ to: '/quotations' })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create quotation')
    }
  }

  return (
    <div className="space-y-3 max-w-5xl">
      <PageHeader
        title="New Quotation"
        actions={
          <Link to="/quotations">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
        }
      />

      <form onSubmit={handleSubmit} className="space-y-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center text-sm font-light tracking-wider text-slate-700">
              <FileText className="w-4 h-4 mr-2 text-indigo-600" />
              Basic Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Customer *</Label>
                <Select value={customerId} onValueChange={setCustomerId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Project *</Label>
                <Select
                  value={projectId}
                  onValueChange={(v) => {
                    setProjectId(v)
                    setUnitId('')
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Unit</Label>
                <Select value={unitId} onValueChange={setUnitId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select unit (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {units.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.unit_number}
                        {u.floor ? ` — Floor ${u.floor}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Valid Until</Label>
                <Input
                  type="date"
                  value={validUntil}
                  min={today}
                  onChange={(e) => setValidUntil(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-light tracking-wider text-slate-700">
                Line Items
              </CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={addItem} className="h-7 text-[10px] font-extralight">
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                Add Item
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            {items.map((item) => (
              <div key={item._key} className="p-4 border rounded-lg bg-slate-50 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                  <div className="md:col-span-5 space-y-1">
                    <Label className="text-[10px] text-slate-500">Description</Label>
                    <Input
                      value={item.description}
                      onChange={(e) => updateItem(item._key, 'description', e.target.value)}
                      placeholder="Item description"
                    />
                  </div>
                  <div className="md:col-span-2 space-y-1">
                    <Label className="text-[10px] text-slate-500">Qty</Label>
                    <Input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateItem(item._key, 'quantity', Number(e.target.value))}
                    />
                  </div>
                  <div className="md:col-span-2 space-y-1">
                    <Label className="text-[10px] text-slate-500">Unit Price</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.unit_price}
                      onChange={(e) => updateItem(item._key, 'unit_price', Number(e.target.value))}
                    />
                  </div>
                  <div className="md:col-span-2 space-y-1">
                    <Label className="text-[10px] text-slate-500">Amount</Label>
                    <Input
                      value={item.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      readOnly
                      className="bg-white"
                    />
                  </div>
                  <div className="md:col-span-1 flex justify-end">
                    {items.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-rose-600 hover:bg-rose-50"
                        onClick={() => removeItem(item._key)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}

            <div className="pt-2 border-t space-y-2">
              <div className="flex justify-end">
                <div className="w-64 space-y-2">
                  <div className="flex justify-between text-sm text-slate-600">
                    <span>Subtotal</span>
                    <span>฿{totalAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-600 flex-1">Discount</span>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={discount}
                      onChange={(e) => setDiscount(Number(e.target.value))}
                      className="w-28 h-7 text-sm"
                    />
                  </div>
                  <div className="flex justify-between text-sm text-slate-600">
                    <span>VAT 7%</span>
                    <span>฿{tax.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-slate-900 border-t pt-2">
                    <span>Grand Total</span>
                    <span>฿{grandTotal.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional notes..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-3 pb-8">
          <Link to="/quotations">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button
            type="submit"
            className="bg-indigo-600 hover:bg-indigo-700"
            disabled={createQuotation.isPending}
          >
            <Save className="w-4 h-4 mr-2" />
            {createQuotation.isPending ? 'Saving...' : 'Save Quotation'}
          </Button>
        </div>
      </form>
    </div>
  )
}
