import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { FileText, Save, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { SaleQuotationFormData, SaleQuotationItem } from '@thanamol/shared'

export const Route = createFileRoute('/_authenticated/forms/sale-quotation')({
  component: FormSaleQuotationPage,
})

const VAT_RATE = 0.07

const EMPTY_ITEM: SaleQuotationItem = {
  description: '',
  quantity: 1,
  unit_price: 0,
  amount: 0,
}

function buildEmptyForm(): SaleQuotationFormData {
  return {
    quotation_number: '',
    customer_name: '',
    quotation_date: new Date().toISOString().split('T')[0],
    valid_until: '',
    contact_person: '',
    phone: '',
    email: '',
    items: [{ ...EMPTY_ITEM }],
    subtotal: 0,
    vat: 0,
    total: 0,
    terms: '',
    notes: '',
  }
}

function recalculateTotals(items: SaleQuotationItem[]): Pick<SaleQuotationFormData, 'subtotal' | 'vat' | 'total'> {
  const subtotal = items.reduce((sum, item) => sum + item.amount, 0)
  const vat = subtotal * VAT_RATE
  return { subtotal, vat, total: subtotal + vat }
}

function FormSaleQuotationPage() {
  const [formData, setFormData] = useState<SaleQuotationFormData>(buildEmptyForm)
  const [isSaving, setIsSaving] = useState(false)

  function updateField<K extends keyof SaleQuotationFormData>(
    field: K,
    value: SaleQuotationFormData[K]
  ) {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  function addItem() {
    const newItems = [...formData.items, { ...EMPTY_ITEM }]
    setFormData((prev) => ({ ...prev, items: newItems, ...recalculateTotals(newItems) }))
  }

  function removeItem(index: number) {
    const newItems = formData.items.filter((_, i) => i !== index)
    setFormData((prev) => ({ ...prev, items: newItems, ...recalculateTotals(newItems) }))
  }

  function updateItem(index: number, field: keyof SaleQuotationItem, value: string | number) {
    const newItems = formData.items.map((item, i) => {
      if (i !== index) return item
      const updated = { ...item, [field]: value }
      if (field === 'quantity' || field === 'unit_price') {
        updated.amount = (updated.quantity as number) * (updated.unit_price as number)
      }
      return updated
    })
    setFormData((prev) => ({ ...prev, items: newItems, ...recalculateTotals(newItems) }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsSaving(true)
    try {
      // Print / save action: in this form context, printing is the primary action
      window.print()
      toast.success('Quotation ready to print')
    } catch {
      toast.error('Failed to prepare quotation')
    } finally {
      setIsSaving(false)
    }
  }

  function handleReset() {
    setFormData(buildEmptyForm())
  }

  return (
    <div className="max-w-5xl mx-auto">
      <Card>
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2 text-slate-800">
            <FileText className="w-5 h-5 text-indigo-600" />
            SALE-JOB01 — ใบเสนอราคา
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="quotation_number">
                  Quotation Number <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="quotation_number"
                  value={formData.quotation_number}
                  onChange={(e) => updateField('quotation_number', e.target.value)}
                  placeholder="QT-2026-001"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="customer_name">
                  Customer Name <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="customer_name"
                  value={formData.customer_name}
                  onChange={(e) => updateField('customer_name', e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="quotation_date">
                  Quotation Date <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="quotation_date"
                  type="date"
                  value={formData.quotation_date}
                  onChange={(e) => updateField('quotation_date', e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="valid_until">
                  Valid Until <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="valid_until"
                  type="date"
                  value={formData.valid_until}
                  onChange={(e) => updateField('valid_until', e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="contact_person">Contact Person</Label>
                <Input
                  id="contact_person"
                  value={formData.contact_person}
                  onChange={(e) => updateField('contact_person', e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => updateField('phone', e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => updateField('email', e.target.value)}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <Label>Items</Label>
                <Button type="button" size="sm" variant="outline" onClick={addItem}>
                  <Plus className="w-4 h-4 mr-1" />
                  Add Item
                </Button>
              </div>

              <div className="space-y-2">
                <div className="grid grid-cols-12 gap-2 text-[10px] font-medium text-slate-500 uppercase tracking-wider px-1">
                  <div className="col-span-5">Description</div>
                  <div className="col-span-2">Qty</div>
                  <div className="col-span-2">Unit Price</div>
                  <div className="col-span-2">Amount</div>
                  <div className="col-span-1" />
                </div>

                {formData.items.map((item, index) => (
                  <div key={index} className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-5">
                      <Input
                        placeholder="Item description"
                        value={item.description}
                        onChange={(e) => updateItem(index, 'description', e.target.value)}
                        required
                      />
                    </div>
                    <div className="col-span-2">
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) =>
                          updateItem(index, 'quantity', parseFloat(e.target.value) || 0)
                        }
                      />
                    </div>
                    <div className="col-span-2">
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unit_price}
                        onChange={(e) =>
                          updateItem(index, 'unit_price', parseFloat(e.target.value) || 0)
                        }
                      />
                    </div>
                    <div className="col-span-2">
                      <Input
                        value={item.amount.toFixed(2)}
                        disabled
                        className="bg-slate-50 text-right"
                      />
                    </div>
                    <div className="col-span-1 flex justify-center">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeItem(index)}
                        disabled={formData.items.length === 1}
                      >
                        <Trash2 className="w-4 h-4 text-rose-500" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 border-t pt-4 space-y-2">
                <div className="flex justify-end items-center gap-4">
                  <span className="text-sm font-medium text-slate-600">Subtotal:</span>
                  <span className="text-base font-semibold w-36 text-right text-slate-800">
                    ฿{formData.subtotal.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-end items-center gap-4">
                  <span className="text-sm font-medium text-slate-600">VAT (7%):</span>
                  <span className="text-base font-semibold w-36 text-right text-slate-800">
                    ฿{formData.vat.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-end items-center gap-4 border-t pt-2">
                  <span className="text-base font-bold text-slate-800">Total:</span>
                  <span className="text-xl font-bold text-indigo-600 w-36 text-right">
                    ฿{formData.total.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="terms">Terms &amp; Conditions</Label>
              <Textarea
                id="terms"
                value={formData.terms}
                onChange={(e) => updateField('terms', e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => updateField('notes', e.target.value)}
                rows={2}
              />
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <Button type="button" variant="outline" onClick={handleReset}>
                Reset
              </Button>
              <Button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-700"
                disabled={isSaving}
              >
                <Save className="w-4 h-4 mr-2" />
                {isSaving ? 'Preparing...' : 'Print / Save'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
