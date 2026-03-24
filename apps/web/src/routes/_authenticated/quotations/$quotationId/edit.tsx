import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { ArrowLeft, Save, Plus, Trash2, FileText, DollarSign, Shield } from 'lucide-react'
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
import { Skeleton } from '@/components/ui/skeleton'
import { PageHeader } from '@/components/PageHeader'
import { useQuotation, useUpdateQuotation } from '@/hooks/useQuotations'
import { useCustomers } from '@/hooks/useCustomers'
import { useProjects } from '@/hooks/useProjects'
import { useUnits } from '@/hooks/useUnits'
import type { QuotationItem } from '@thanamol/shared'
import {
  RATE_TYPES,
  RESPONSIBILITY_OPTIONS,
  DEPOSIT_DECORATION_OPTIONS,
} from '@thanamol/shared'

export const Route = createFileRoute('/_authenticated/quotations/$quotationId/edit')({
  component: QuotationEditPage,
})

const TAX_RATE = 0.07

type LineItem = QuotationItem & { _key: number }

let itemKeyCounter = 100

function nextKey() {
  return ++itemKeyCounter
}

function calculateTotals(items: LineItem[], discountAmount: number) {
  const totalAmount = items.reduce((sum, item) => sum + item.amount, 0)
  const discountedAmount = Math.max(0, totalAmount - discountAmount)
  const tax = Math.round(discountedAmount * TAX_RATE * 100) / 100
  const grandTotal = discountedAmount + tax
  return { totalAmount, tax, grandTotal }
}

function QuotationEditPage() {
  const { quotationId } = Route.useParams()
  const navigate = useNavigate()

  const [customerId, setCustomerId] = useState('')
  const [projectId, setProjectId] = useState('')
  const [unitId, setUnitId] = useState('')
  const [validUntil, setValidUntil] = useState('')
  const [notes, setNotes] = useState('')
  const [discount, setDiscount] = useState(0)
  const [items, setItems] = useState<LineItem[]>([])
  const [initialized, setInitialized] = useState(false)

  // Cost & Deposit
  const [depositMonths, setDepositMonths] = useState<string>('')
  const [advanceRentMonths, setAdvanceRentMonths] = useState<string>('')

  // Utility Rates
  const [electricityRateType, setElectricityRateType] = useState<string>('')
  const [electricityRate, setElectricityRate] = useState<string>('')
  const [waterRate, setWaterRate] = useState<string>('')

  // Responsibility
  const [depositDecoration, setDepositDecoration] = useState<string>('')
  const [registrationFee, setRegistrationFee] = useState<string>('')
  const [propertyTax, setPropertyTax] = useState<string>('')
  const [buildingInsurance, setBuildingInsurance] = useState<string>('')
  const [goodsInsurance, setGoodsInsurance] = useState<string>('')

  // Conditions
  const [specialConditions, setSpecialConditions] = useState('')
  const [remarks, setRemarks] = useState('')

  const { data, isLoading } = useQuotation(quotationId)
  const { data: customersData } = useCustomers({ limit: 200 })
  const { data: projectsData } = useProjects({ limit: 200 })
  const { data: unitsData } = useUnits({ projectId: projectId || undefined, limit: 200 })
  const updateQuotation = useUpdateQuotation()

  const quotation = data?.quotation
  const customers = customersData?.data ?? []
  const projects = projectsData?.data ?? []
  const units = unitsData?.data ?? []

  useEffect(() => {
    if (quotation && !initialized) {
      setCustomerId(quotation.customer_id)
      setProjectId(quotation.project_id)
      setUnitId(quotation.unit_id ?? '')
      setValidUntil(quotation.valid_until ? quotation.valid_until.split('T')[0] : '')
      setNotes(quotation.notes ?? '')
      setDiscount(quotation.discount)
      setItems(
        (quotation.items ?? []).map((item) => ({ ...item, _key: nextKey() }))
      )
      setDepositMonths(quotation.deposit_months != null ? String(quotation.deposit_months) : '')
      setAdvanceRentMonths(quotation.advance_rent_months != null ? String(quotation.advance_rent_months) : '')
      setElectricityRateType(quotation.electricity_rate_type ?? '')
      setElectricityRate(quotation.electricity_rate != null ? String(quotation.electricity_rate) : '')
      setWaterRate(quotation.water_rate != null ? String(quotation.water_rate) : '')
      setDepositDecoration(quotation.deposit_decoration ?? '')
      setRegistrationFee(quotation.registration_fee ?? '')
      setPropertyTax(quotation.property_tax ?? '')
      setBuildingInsurance(quotation.building_insurance ?? '')
      setGoodsInsurance(quotation.goods_insurance ?? '')
      setSpecialConditions(quotation.special_conditions ?? '')
      setRemarks(quotation.remarks ?? '')
      setInitialized(true)
    }
  }, [quotation, initialized])

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
    setItems((prev) => [
      ...prev,
      { _key: nextKey(), description: '', quantity: 1, unit_price: 0, amount: 0 },
    ])
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

    try {
      const validItems = items.filter((i) => i.description)
      await updateQuotation.mutateAsync({
        id: quotationId,
        data: {
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
          depositMonths: depositMonths ? Number(depositMonths) : undefined,
          advanceRentMonths: advanceRentMonths ? Number(advanceRentMonths) : undefined,
          electricityRateType: electricityRateType || undefined,
          electricityRate: electricityRate ? Number(electricityRate) : undefined,
          waterRate: waterRate ? Number(waterRate) : undefined,
          depositDecoration: depositDecoration || undefined,
          registrationFee: registrationFee || undefined,
          propertyTax: propertyTax || undefined,
          buildingInsurance: buildingInsurance || undefined,
          goodsInsurance: goodsInsurance || undefined,
          specialConditions: specialConditions || undefined,
          remarks: remarks || undefined,
        },
      })
      toast.success('Quotation updated')
      navigate({ to: '/quotations/$quotationId', params: { quotationId } })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update quotation')
    }
  }

  if (isLoading || !initialized) {
    return (
      <div className="space-y-4 max-w-5xl">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  if (!quotation) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-600">Quotation not found</p>
        <Link to="/quotations">
          <Button className="mt-4" variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Quotations
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-3 max-w-5xl">
      <PageHeader
        title={`Edit — ${quotation.quotation_number}`}
        actions={
          <Link to="/quotations/$quotationId" params={{ quotationId }}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Cancel
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
                <Select value={unitId || "__none__"} onValueChange={(v) => setUnitId(v === "__none__" ? "" : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select unit (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
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
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addItem}
                className="h-7 text-[10px] font-extralight"
              >
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
                      value={item.amount.toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
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
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center text-sm font-light tracking-wider text-slate-700">
              <DollarSign className="w-4 h-4 mr-2 text-indigo-600" />
              Cost & Deposit
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Deposit (Months)</Label>
                <Input
                  type="number"
                  min="0"
                  value={depositMonths}
                  onChange={(e) => setDepositMonths(e.target.value)}
                  placeholder="e.g. 2"
                />
              </div>
              <div className="space-y-2">
                <Label>Advance Rent (Months)</Label>
                <Input
                  type="number"
                  min="0"
                  value={advanceRentMonths}
                  onChange={(e) => setAdvanceRentMonths(e.target.value)}
                  placeholder="e.g. 1"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Electricity Rate Type</Label>
                <Select
                  value={electricityRateType || '__none__'}
                  onValueChange={(v) => setElectricityRateType(v === '__none__' ? '' : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">—</SelectItem>
                    {RATE_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Electricity Rate (฿/unit)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={electricityRate}
                  onChange={(e) => setElectricityRate(e.target.value)}
                  placeholder="e.g. 5.00"
                  disabled={electricityRateType === 'Actual'}
                />
              </div>
              <div className="space-y-2">
                <Label>Water Rate (฿/unit)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={waterRate}
                  onChange={(e) => setWaterRate(e.target.value)}
                  placeholder="e.g. 18.00"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center text-sm font-light tracking-wider text-slate-700">
              <Shield className="w-4 h-4 mr-2 text-indigo-600" />
              Responsibility
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Deposit Decoration</Label>
                <Select
                  value={depositDecoration || '__none__'}
                  onValueChange={(v) => setDepositDecoration(v === '__none__' ? '' : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">—</SelectItem>
                    {DEPOSIT_DECORATION_OPTIONS.map((opt) => (
                      <SelectItem key={opt} value={opt}>
                        {opt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Registration Fee</Label>
                <Select
                  value={registrationFee || '__none__'}
                  onValueChange={(v) => setRegistrationFee(v === '__none__' ? '' : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">—</SelectItem>
                    {RESPONSIBILITY_OPTIONS.map((opt) => (
                      <SelectItem key={opt} value={opt}>
                        {opt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Property Tax / Land Tax</Label>
                <Select
                  value={propertyTax || '__none__'}
                  onValueChange={(v) => setPropertyTax(v === '__none__' ? '' : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">—</SelectItem>
                    {RESPONSIBILITY_OPTIONS.map((opt) => (
                      <SelectItem key={opt} value={opt}>
                        {opt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Building Insurance</Label>
                <Select
                  value={buildingInsurance || '__none__'}
                  onValueChange={(v) => setBuildingInsurance(v === '__none__' ? '' : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">—</SelectItem>
                    {RESPONSIBILITY_OPTIONS.map((opt) => (
                      <SelectItem key={opt} value={opt}>
                        {opt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Products / Goods Insurance</Label>
                <Select
                  value={goodsInsurance || '__none__'}
                  onValueChange={(v) => setGoodsInsurance(v === '__none__' ? '' : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">—</SelectItem>
                    {RESPONSIBILITY_OPTIONS.map((opt) => (
                      <SelectItem key={opt} value={opt}>
                        {opt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 space-y-4">
            <div className="space-y-2">
              <Label>Special Conditions</Label>
              <Textarea
                value={specialConditions}
                onChange={(e) => setSpecialConditions(e.target.value)}
                placeholder="Special conditions..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Remarks</Label>
              <Textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Remarks..."
                rows={3}
              />
            </div>
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
          <Link to="/quotations/$quotationId" params={{ quotationId }}>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button
            type="submit"
            className="bg-indigo-600 hover:bg-indigo-700"
            disabled={updateQuotation.isPending}
          >
            <Save className="w-4 h-4 mr-2" />
            {updateQuotation.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </div>
  )
}
