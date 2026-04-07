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
import { usePurchaseRequests, usePurchaseRequest } from '@/hooks/usePurchaseRequests'
import { useCompanies } from '@/hooks/useCompanies'
import { useProjects } from '@/hooks/useProjects'
import { useUnits } from '@/hooks/useUnits'
import { useVendors } from '@/hooks/useVendors'
import { useAuth } from '@/providers/AuthProvider'
import { PO_TYPES, PR_ITEM_TYPES } from '@thanamol/shared'
import type { POItem, POConditions } from '@thanamol/shared'

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

type PaymentInstallment = {
  _key: string
  label: string
  amount: number
  due_date: string
}

const EMPTY_CONDITIONS: POConditions = {
  payment_installments: [],
  wht_enabled: false,
  wht_rate: 3,
  vat_enabled: true,
  retention_enabled: false,
  retention_rate: 5,
  warranty: '',
  credit_terms: '',
  timeline: '',
  late_penalty: '',
  insurance: '',
}

function buildEmptyItem(): FormItem {
  return {
    _key: crypto.randomUUID(),
    item_name: '',
    quantity: 1,
    unit_price: 0,
    total: 0,
    item_type: '',
    buy_or_rent: 'buy',
    budget_code: '',
    supplier: '',
    specification: '',
    category: '',
    asset_id: '',
  }
}

function POCreatePage() {
  const navigate = useNavigate()
  const { prId: prIdParam } = useSearch({
    from: '/_authenticated/facility-management/procurement/orders/create',
  })
  const { currentUser } = useAuth()
  const createPO = useCreatePurchaseOrder()

  const { data: companiesData } = useCompanies({ limit: 100 })
  const { data: projectsData } = useProjects({ limit: 100 })
  const { data: unitsData } = useUnits({ limit: 100 })
  const { data: vendorsData } = useVendors({ limit: 100 })
  const { data: prsData } = usePurchaseRequests({ limit: 100 })

  const companies = companiesData?.data ?? []
  const projects = projectsData?.data ?? []
  const units = unitsData?.data ?? []
  const vendors = vendorsData?.data ?? []
  const prs = prsData?.data ?? []

  const [selectedPrId, setSelectedPrId] = useState(prIdParam ?? '')
  const { data: selectedPrData } = usePurchaseRequest(selectedPrId)

  const [vendorId, setVendorId] = useState('')
  const [companyId, setCompanyId] = useState('')
  const [siteId, setSiteId] = useState('')
  const [unitId, setUnitId] = useState('')
  const [poDate, setPoDate] = useState('')
  const [paymentDueDate, setPaymentDueDate] = useState('')
  const [paymentTerms, setPaymentTerms] = useState('')
  const [deliveryAddress, setDeliveryAddress] = useState('')
  const [poType, setPoType] = useState('')
  const [notes, setNotes] = useState('')
  const [documentUrls, setDocumentUrls] = useState<string[]>([''])

  const [items, setItems] = useState<FormItem[]>([buildEmptyItem()])
  const [installments, setInstallments] = useState<PaymentInstallment[]>([])
  const [conditions, setConditions] = useState<Omit<POConditions, 'payment_installments'>>(
    EMPTY_CONDITIONS
  )

  useEffect(() => {
    const pr = selectedPrData?.pr
    if (!pr) return

    if (pr.company_id) setCompanyId(pr.company_id)
    if (pr.site_id) setSiteId(pr.site_id)
    if (pr.unit_id) setUnitId(pr.unit_id)

    const prItems = pr.items as Array<{
      item_name: string
      description?: string
      quantity: number
      unit_of_measure?: string
      estimated_unit_price?: number
      item_type?: string
      budget_code?: string
      specification?: string
      category?: string
    }>

    if (prItems.length > 0) {
      setItems(
        prItems.map((item) => ({
          _key: crypto.randomUUID(),
          item_name: item.item_name,
          description: item.description,
          quantity: item.quantity,
          unit_of_measure: item.unit_of_measure,
          unit_price: item.estimated_unit_price ?? 0,
          total: item.quantity * (item.estimated_unit_price ?? 0),
          item_type: item.item_type ?? '',
          buy_or_rent: 'buy' as const,
          budget_code: item.budget_code ?? '',
          specification: item.specification ?? '',
          category: item.category ?? '',
          supplier: '',
          asset_id: '',
        }))
      )
    }

    const prConditions = pr.conditions as POConditions | null
    if (prConditions) {
      setConditions({
        wht_enabled: prConditions.wht_enabled ?? false,
        wht_rate: prConditions.wht_rate ?? 3,
        vat_enabled: prConditions.vat_enabled ?? true,
        retention_enabled: prConditions.retention_enabled ?? false,
        retention_rate: prConditions.retention_rate ?? 5,
        warranty: prConditions.warranty ?? '',
        credit_terms: prConditions.credit_terms ?? '',
        timeline: prConditions.timeline ?? '',
        late_penalty: prConditions.late_penalty ?? '',
        insurance: prConditions.insurance ?? '',
      })

      if (prConditions.payment_installments && prConditions.payment_installments.length > 0) {
        setInstallments(
          prConditions.payment_installments.map((inst) => ({
            _key: crypto.randomUUID(),
            label: inst.label,
            amount: inst.amount,
            due_date: inst.due_date ?? '',
          }))
        )
      }
    }
  }, [selectedPrData])

  function addItem() {
    setItems((prev) => [...prev, buildEmptyItem()])
  }

  function removeItem(key: string) {
    setItems((prev) => prev.filter((i) => i._key !== key))
  }

  function updateItem(key: string, field: keyof Omit<FormItem, '_key'>, value: string | number) {
    setItems((prev) =>
      prev.map((i) => {
        if (i._key !== key) return i
        const updated = { ...i, [field]: value }
        updated.total = updated.quantity * updated.unit_price
        return updated
      })
    )
  }

  function addInstallment() {
    setInstallments((prev) => [
      ...prev,
      { _key: crypto.randomUUID(), label: '', amount: 0, due_date: '' },
    ])
  }

  function removeInstallment(key: string) {
    setInstallments((prev) => prev.filter((i) => i._key !== key))
  }

  function updateInstallment(
    key: string,
    field: keyof Omit<PaymentInstallment, '_key'>,
    value: string | number
  ) {
    setInstallments((prev) =>
      prev.map((i) => (i._key === key ? { ...i, [field]: value } : i))
    )
  }

  function updateCondition<K extends keyof typeof conditions>(
    key: K,
    value: (typeof conditions)[K]
  ) {
    setConditions((prev) => ({ ...prev, [key]: value }))
  }

  function addDocumentUrl() {
    setDocumentUrls((prev) => [...prev, ''])
  }

  function updateDocumentUrl(index: number, value: string) {
    setDocumentUrls((prev) => prev.map((url, i) => (i === index ? value : url)))
  }

  function removeDocumentUrl(index: number) {
    setDocumentUrls((prev) => prev.filter((_, i) => i !== index))
  }

  const subtotal = items.reduce((sum, item) => sum + item.total, 0)
  const tax = conditions.vat_enabled ? subtotal * 0.07 : 0
  const total = subtotal + tax

  const selectedVendor = vendors.find((v) => v.id === vendorId)

  async function handleSubmit() {
    const vendorName = selectedVendor?.name ?? vendorId
    if (!vendorName.trim()) return

    const builtConditions: POConditions = {
      ...conditions,
      payment_installments: installments.map(({ _key: _, ...inst }) => inst),
    }

    const documents = documentUrls.filter((url) => url.trim())

    await createPO.mutateAsync({
      prId: selectedPrId || undefined,
      vendorName,
      companyId: companyId || undefined,
      siteId: siteId || undefined,
      unitId: unitId || undefined,
      poDate: poDate || undefined,
      paymentDueDate: paymentDueDate || undefined,
      paymentTerms: paymentTerms || undefined,
      poType: poType || undefined,
      deliveryAddress: deliveryAddress || undefined,
      items: items.map(({ _key: _, ...item }) => item),
      notes: notes || undefined,
      documents: documents.length > 0 ? documents : undefined,
      conditions: builtConditions,
      createdBy: currentUser!.id,
    })

    navigate({ to: '/facility-management/procurement/orders' })
  }

  const canSubmit = !createPO.isPending && (selectedVendor !== undefined || vendorId.trim() !== '')

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
          <p className="text-sm text-slate-500 mt-1">ใบสั่งซื้อ / Purchase Order</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>ข้อมูลทั่วไป / General Info</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>PR Link (Optional)</Label>
              <Select
                value={selectedPrId || '__none__'}
                onValueChange={(v) => setSelectedPrId(v === '__none__' ? '' : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select PR to auto-fill" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No PR</SelectItem>
                  {prs.map((pr) => (
                    <SelectItem key={pr.id} value={pr.id}>
                      {pr.pr_number} — {pr.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>PO Type</Label>
              <Select
                value={poType || '__none__'}
                onValueChange={(v) => setPoType(v === '__none__' ? '' : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select PO type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Select type</SelectItem>
                  {PO_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Company</Label>
              <Select
                value={companyId || '__none__'}
                onValueChange={(v) => setCompanyId(v === '__none__' ? '' : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select company" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No company</SelectItem>
                  {companies.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Site / Project</Label>
              <Select
                value={siteId || '__none__'}
                onValueChange={(v) => setSiteId(v === '__none__' ? '' : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select site / project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No site</SelectItem>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Unit</Label>
              <Select
                value={unitId || '__none__'}
                onValueChange={(v) => setUnitId(v === '__none__' ? '' : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select unit" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No unit</SelectItem>
                  {units.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.unit_number}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Vendor *</Label>
              <Select
                value={vendorId || '__none__'}
                onValueChange={(v) => setVendorId(v === '__none__' ? '' : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select vendor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Select vendor</SelectItem>
                  {vendors.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>PO Date</Label>
              <Input
                type="date"
                value={poDate}
                onChange={(e) => setPoDate(e.target.value)}
              />
            </div>

            <div>
              <Label>Payment Due Date</Label>
              <Input
                type="date"
                value={paymentDueDate}
                onChange={(e) => setPaymentDueDate(e.target.value)}
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

            <div>
              <Label>Delivery Address</Label>
              <Input
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                placeholder="Delivery address"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>รายการสินค้า / Items</CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={addItem}>
              <Plus className="w-4 h-4 mr-2" />
              Add Item
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {items.map((item, idx) => (
            <div key={item._key} className="p-4 bg-slate-50 rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-600">Item {idx + 1}</span>
                {items.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-red-500"
                    onClick={() => removeItem(item._key)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs">Type</Label>
                  <Select
                    value={item.item_type || '__none__'}
                    onValueChange={(v) =>
                      updateItem(item._key, 'item_type', v === '__none__' ? '' : v)
                    }
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Select type</SelectItem>
                      {PR_ITEM_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs">Buy / Rent</Label>
                  <Select
                    value={item.buy_or_rent ?? 'buy'}
                    onValueChange={(v) => updateItem(item._key, 'buy_or_rent', v)}
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="buy">Buy</SelectItem>
                      <SelectItem value="rent">Rent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="md:col-span-1">
                  <Label className="text-xs">Category</Label>
                  <Input
                    className="h-8 text-sm"
                    value={item.category ?? ''}
                    onChange={(e) => updateItem(item._key, 'category', e.target.value)}
                    placeholder="Category"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="md:col-span-2">
                  <Label className="text-xs">Item Description *</Label>
                  <Input
                    value={item.item_name}
                    onChange={(e) => updateItem(item._key, 'item_name', e.target.value)}
                    placeholder="Item name / description"
                  />
                </div>

                <div>
                  <Label className="text-xs">Specification</Label>
                  <Input
                    value={item.specification ?? ''}
                    onChange={(e) => updateItem(item._key, 'specification', e.target.value)}
                    placeholder="Specification"
                  />
                </div>

                <div>
                  <Label className="text-xs">Supplier</Label>
                  <Input
                    value={item.supplier ?? ''}
                    onChange={(e) => updateItem(item._key, 'supplier', e.target.value)}
                    placeholder="Supplier name"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <div>
                  <Label className="text-xs">UOM</Label>
                  <Input
                    className="h-8 text-sm"
                    value={item.unit_of_measure ?? ''}
                    onChange={(e) => updateItem(item._key, 'unit_of_measure', e.target.value)}
                    placeholder="pcs"
                  />
                </div>
                <div>
                  <Label className="text-xs">Qty *</Label>
                  <Input
                    className="h-8 text-sm"
                    type="number"
                    min="0.001"
                    value={item.quantity}
                    onChange={(e) =>
                      updateItem(item._key, 'quantity', Number(e.target.value))
                    }
                  />
                </div>
                <div>
                  <Label className="text-xs">Unit Price</Label>
                  <Input
                    className="h-8 text-sm"
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.unit_price}
                    onChange={(e) =>
                      updateItem(item._key, 'unit_price', Number(e.target.value))
                    }
                  />
                </div>
                <div>
                  <Label className="text-xs">Budget Code</Label>
                  <Input
                    className="h-8 text-sm"
                    value={item.budget_code ?? ''}
                    onChange={(e) => updateItem(item._key, 'budget_code', e.target.value)}
                    placeholder="Budget code"
                  />
                </div>
                <div>
                  <Label className="text-xs">Total</Label>
                  <div className="h-8 flex items-center px-3 bg-white border rounded-md text-sm font-mono text-slate-700">
                    ฿{item.total.toLocaleString()}
                  </div>
                </div>
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
              <span className="font-mono">{conditions.vat_enabled ? `฿${tax.toLocaleString()}` : '-'}</span>
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
          <CardTitle>เงื่อนไข / Conditions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <div className="flex items-center justify-between mb-3">
              <Label className="text-base font-medium">Payment Installments</Label>
              <Button type="button" variant="outline" size="sm" onClick={addInstallment}>
                <Plus className="w-4 h-4 mr-2" />
                Add Installment
              </Button>
            </div>
            {installments.length === 0 && (
              <p className="text-sm text-slate-400 italic">No installments added</p>
            )}
            {installments.map((inst) => (
              <div key={inst._key} className="grid grid-cols-12 gap-2 items-end mb-2">
                <div className="col-span-4">
                  <Label className="text-xs">Label</Label>
                  <Input
                    className="h-8 text-sm"
                    value={inst.label}
                    onChange={(e) => updateInstallment(inst._key, 'label', e.target.value)}
                    placeholder="e.g. 30% advance"
                  />
                </div>
                <div className="col-span-3">
                  <Label className="text-xs">Amount (฿)</Label>
                  <Input
                    className="h-8 text-sm"
                    type="number"
                    min="0"
                    step="0.01"
                    value={inst.amount}
                    onChange={(e) =>
                      updateInstallment(inst._key, 'amount', Number(e.target.value))
                    }
                  />
                </div>
                <div className="col-span-4">
                  <Label className="text-xs">Due Date</Label>
                  <Input
                    className="h-8 text-sm"
                    type="date"
                    value={inst.due_date}
                    onChange={(e) => updateInstallment(inst._key, 'due_date', e.target.value)}
                  />
                </div>
                <div className="col-span-1 flex justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-red-500"
                    onClick={() => removeInstallment(inst._key)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="vat_enabled"
                checked={conditions.vat_enabled ?? true}
                onChange={(e) => updateCondition('vat_enabled', e.target.checked)}
                className="w-4 h-4 accent-indigo-600"
              />
              <Label htmlFor="vat_enabled" className="cursor-pointer">
                VAT 7%
              </Label>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="wht_enabled"
                checked={conditions.wht_enabled ?? false}
                onChange={(e) => updateCondition('wht_enabled', e.target.checked)}
                className="w-4 h-4 accent-indigo-600"
              />
              <Label htmlFor="wht_enabled" className="cursor-pointer">
                WHT (Withholding Tax)
              </Label>
              {conditions.wht_enabled && (
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  className="w-20 h-8 text-sm"
                  value={conditions.wht_rate ?? 3}
                  onChange={(e) => updateCondition('wht_rate', Number(e.target.value))}
                />
              )}
              {conditions.wht_enabled && <span className="text-sm text-slate-500">%</span>}
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="retention_enabled"
                checked={conditions.retention_enabled ?? false}
                onChange={(e) => updateCondition('retention_enabled', e.target.checked)}
                className="w-4 h-4 accent-indigo-600"
              />
              <Label htmlFor="retention_enabled" className="cursor-pointer">
                Retention
              </Label>
              {conditions.retention_enabled && (
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  className="w-20 h-8 text-sm"
                  value={conditions.retention_rate ?? 5}
                  onChange={(e) => updateCondition('retention_rate', Number(e.target.value))}
                />
              )}
              {conditions.retention_enabled && (
                <span className="text-sm text-slate-500">%</span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Warranty</Label>
              <Input
                value={conditions.warranty ?? ''}
                onChange={(e) => updateCondition('warranty', e.target.value)}
                placeholder="e.g. 1 year"
              />
            </div>

            <div>
              <Label>Credit Terms</Label>
              <Input
                value={conditions.credit_terms ?? ''}
                onChange={(e) => updateCondition('credit_terms', e.target.value)}
                placeholder="e.g. 30 days"
              />
            </div>

            <div>
              <Label>Timeline / Delivery Period</Label>
              <Input
                value={conditions.timeline ?? ''}
                onChange={(e) => updateCondition('timeline', e.target.value)}
                placeholder="e.g. 14 working days"
              />
            </div>

            <div>
              <Label>Late Penalty</Label>
              <Input
                value={conditions.late_penalty ?? ''}
                onChange={(e) => updateCondition('late_penalty', e.target.value)}
                placeholder="e.g. 0.1% per day"
              />
            </div>

            <div className="md:col-span-2">
              <Label>Insurance</Label>
              <Input
                value={conditions.insurance ?? ''}
                onChange={(e) => updateCondition('insurance', e.target.value)}
                placeholder="Insurance requirements"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>หมายเหตุและเอกสาร / Notes & Documents</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Additional notes or remarks"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Documents (URLs)</Label>
              <Button type="button" variant="outline" size="sm" onClick={addDocumentUrl}>
                <Plus className="w-4 h-4 mr-2" />
                Add Document
              </Button>
            </div>
            {documentUrls.map((url, index) => (
              <div key={index} className="flex gap-2 mb-2">
                <Input
                  value={url}
                  onChange={(e) => updateDocumentUrl(index, e.target.value)}
                  placeholder="https://..."
                  className="flex-1"
                />
                {documentUrls.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-red-500 shrink-0"
                    onClick={() => removeDocumentUrl(index)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
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
          disabled={!canSubmit}
          className="bg-indigo-600 hover:bg-indigo-700"
        >
          <Save className="w-4 h-4 mr-2" />
          Create PO
        </Button>
      </div>
    </div>
  )
}
