import { Plus, Trash2 } from 'lucide-react'
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
import { useCustomers } from '@/hooks/useCustomers'
import { useProjects } from '@/hooks/useProjects'
import type { QuotationItem, QuotationStatus } from '@thanamol/shared'

export type CommercialQuotationFormData = {
  customerId: string
  projectId: string
  items: QuotationItem[]
  terms: string
  conditions: string
  totalAmount: number
  status: QuotationStatus
}

type Props = {
  data: CommercialQuotationFormData
  onChange: (data: CommercialQuotationFormData) => void
}

const QUOTATION_STATUSES: { value: QuotationStatus; label: string }[] = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'SENT', label: 'Sent' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'EXPIRED', label: 'Expired' },
]

function computeTotalAmount(items: QuotationItem[]): number {
  return items.reduce((sum, item) => sum + (item.amount ?? 0), 0)
}

export function CommercialQuotationForm({ data, onChange }: Props) {
  const { data: customersData } = useCustomers({ limit: 200 })
  const { data: projectsData } = useProjects({ limit: 200 })

  const customers = customersData?.data ?? []
  const projects = projectsData?.data ?? []

  function updateField<K extends keyof CommercialQuotationFormData>(
    key: K,
    value: CommercialQuotationFormData[K]
  ) {
    onChange({ ...data, [key]: value })
  }

  function addItem() {
    const newItem: QuotationItem = {
      description: '',
      quantity: 1,
      unit_price: 0,
      amount: 0,
    }
    const items = [...data.items, newItem]
    onChange({ ...data, items, totalAmount: computeTotalAmount(items) })
  }

  function updateItem(index: number, field: keyof QuotationItem, rawValue: string) {
    const items = data.items.map((item, i) => {
      if (i !== index) return item
      const updated = { ...item, [field]: field === 'description' ? rawValue : Number(rawValue) }
      if (field === 'quantity' || field === 'unit_price') {
        updated.amount = updated.quantity * updated.unit_price
      }
      return updated
    })
    onChange({ ...data, items, totalAmount: computeTotalAmount(items) })
  }

  function removeItem(index: number) {
    const items = data.items.filter((_, i) => i !== index)
    onChange({ ...data, items, totalAmount: computeTotalAmount(items) })
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-light tracking-wider text-slate-700">
            Customer &amp; Project
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="customerId">
                Customer <span className="text-rose-500">*</span>
              </Label>
              <Select
                value={data.customerId}
                onValueChange={(v) => updateField('customerId', v)}
              >
                <SelectTrigger id="customerId">
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
              <Label htmlFor="projectId">
                Project <span className="text-rose-500">*</span>
              </Label>
              <Select
                value={data.projectId}
                onValueChange={(v) => updateField('projectId', v)}
              >
                <SelectTrigger id="projectId">
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.code} — {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              value={data.status}
              onValueChange={(v) => updateField('status', v as QuotationStatus)}
            >
              <SelectTrigger id="status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {QUOTATION_STATUSES.map(({ value, label }) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-sm font-light tracking-wider text-slate-700">
            Line Items
          </CardTitle>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addItem}
            className="border-indigo-300 text-indigo-600 hover:bg-indigo-50"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Item
          </Button>
        </CardHeader>
        <CardContent className="pt-0">
          {data.items.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">
              No items yet. Click "Add Item" to start.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-2 px-2 text-slate-500 font-medium">Description</th>
                    <th className="text-right py-2 px-2 text-slate-500 font-medium w-24">Qty</th>
                    <th className="text-right py-2 px-2 text-slate-500 font-medium w-32">
                      Unit Price
                    </th>
                    <th className="text-right py-2 px-2 text-slate-500 font-medium w-32">Amount</th>
                    <th className="w-10" />
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((item, index) => (
                    <tr key={index} className="border-b border-slate-100">
                      <td className="py-2 px-2">
                        <Input
                          value={item.description}
                          onChange={(e) => updateItem(index, 'description', e.target.value)}
                          placeholder="Item description"
                          className="h-8"
                        />
                      </td>
                      <td className="py-2 px-2">
                        <Input
                          type="number"
                          min={0}
                          value={item.quantity}
                          onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                          className="h-8 text-right"
                        />
                      </td>
                      <td className="py-2 px-2">
                        <Input
                          type="number"
                          min={0}
                          value={item.unit_price}
                          onChange={(e) => updateItem(index, 'unit_price', e.target.value)}
                          className="h-8 text-right"
                        />
                      </td>
                      <td className="py-2 px-2 text-right text-slate-700 font-medium">
                        {item.amount.toLocaleString('th-TH')}
                      </td>
                      <td className="py-2 px-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                          onClick={() => removeItem(index)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={3} className="py-3 px-2 text-right font-medium text-slate-700">
                      Total
                    </td>
                    <td className="py-3 px-2 text-right font-bold text-indigo-700 text-base">
                      ฿{data.totalAmount.toLocaleString('th-TH')}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-light tracking-wider text-slate-700">
            Terms &amp; Conditions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          <div className="space-y-2">
            <Label htmlFor="terms">Terms</Label>
            <Textarea
              id="terms"
              value={data.terms}
              onChange={(e) => updateField('terms', e.target.value)}
              placeholder="Payment terms, delivery schedule..."
              rows={4}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="conditions">Conditions</Label>
            <Textarea
              id="conditions"
              value={data.conditions}
              onChange={(e) => updateField('conditions', e.target.value)}
              placeholder="Special conditions, warranty, notes..."
              rows={4}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
