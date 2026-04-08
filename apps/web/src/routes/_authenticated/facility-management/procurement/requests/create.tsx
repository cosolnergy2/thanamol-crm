import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { ArrowLeft, Save, Plus, Trash2, Send } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useCreatePurchaseRequest } from '@/hooks/usePurchaseRequests'
import { useCompanies } from '@/hooks/useCompanies'
import { useUnits } from '@/hooks/useUnits'
import { useProjects } from '@/hooks/useProjects'
import { useBudgets } from '@/hooks/useBudgets'
import { useVendors } from '@/hooks/useVendors'
import { useAssets } from '@/hooks/useAssets'
import { usePreventiveMaintenances } from '@/hooks/usePreventiveMaintenance'
import { useAuth } from '@/providers/AuthProvider'
import { PR_PURPOSES, PR_ITEM_TYPES, generateUUID } from '@thanamol/shared'
import type { PRItem } from '@thanamol/shared'

export const Route = createFileRoute(
  '/_authenticated/facility-management/procurement/requests/create'
)({
  component: PRCreatePage,
})

type FormItem = PRItem & { _key: string }

type PaymentInstallment = {
  _key: string
  installment_number: number
  percentage: number
  milestone: string
}

type PRConditions = {
  installments: PaymentInstallment[]
  withholding_tax: boolean
  vat: boolean
  retention_percent: number | ''
  retention_years: number | ''
  warranty: boolean
  warranty_years: number | ''
  credit_terms_days: number | ''
  timeline_start: string
  timeline_end: string
  timeline_progress: string
  late_penalty_percent: number | ''
  insurance: boolean
}

const TODAY = new Date().toISOString().split('T')[0]

const INITIAL_CONDITIONS: PRConditions = {
  installments: [],
  withholding_tax: false,
  vat: false,
  retention_percent: '',
  retention_years: '',
  warranty: false,
  warranty_years: '',
  credit_terms_days: '',
  timeline_start: '',
  timeline_end: '',
  timeline_progress: '',
  late_penalty_percent: '',
  insurance: false,
}

function PRCreatePage() {
  const navigate = useNavigate()
  const { currentUser } = useAuth()
  const createPR = useCreatePurchaseRequest()

  const { data: companiesData } = useCompanies({ limit: 200 })
  const { data: projectsData } = useProjects({ limit: 200 })
  const { data: budgetsData } = useBudgets({ limit: 200 })
  const { data: vendorsData } = useVendors({ limit: 200 })
  const { data: assetsData } = useAssets({ limit: 200 })
  const { data: pmData } = usePreventiveMaintenances({ limit: 200 })

  const companies = companiesData?.data ?? []
  const projects = projectsData?.data ?? []
  const budgets = budgetsData?.data ?? []
  const vendors = vendorsData?.data ?? []
  const assets = assetsData?.data ?? []
  const pmSchedules = pmData?.data ?? []

  const [companyId, setCompanyId] = useState('')
  const [siteId, setSiteId] = useState('')
  const [unitId, setUnitId] = useState('')
  const [date, setDate] = useState(TODAY)
  const [requiredDate, setRequiredDate] = useState('')
  const [purpose, setPurpose] = useState('')
  const [pmScheduleId, setPmScheduleId] = useState('')
  const [priority, setPriority] = useState('MEDIUM')

  const [items, setItems] = useState<FormItem[]>([
    {
      _key: generateUUID(),
      item_name: '',
      quantity: 1,
      estimated_unit_price: 0,
      item_type: '',
      mode: 'buy',
      budget_code: '',
      supplier: '',
      specification: '',
      category: '',
      asset_id: '',
    },
  ])

  const [notes, setNotes] = useState('')
  const [documents, setDocuments] = useState<string[]>([''])
  const [conditions, setConditions] = useState<PRConditions>(INITIAL_CONDITIONS)

  const { data: unitsData } = useUnits({ projectId: siteId || undefined, limit: 200 })
  const units = unitsData?.data ?? []

  function addItem() {
    setItems((prev) => [
      ...prev,
      {
        _key: generateUUID(),
        item_name: '',
        quantity: 1,
        estimated_unit_price: 0,
        item_type: '',
        mode: 'buy' as const,
        budget_code: '',
        supplier: '',
        specification: '',
        category: '',
        asset_id: '',
      },
    ])
  }

  function removeItem(key: string) {
    setItems((prev) => prev.filter((i) => i._key !== key))
  }

  function updateItem(key: string, field: keyof PRItem, value: string | number) {
    setItems((prev) =>
      prev.map((i) => {
        if (i._key !== key) return i
        const updated = { ...i, [field]: value }
        updated.total = (updated.quantity ?? 0) * (updated.estimated_unit_price ?? 0)
        return updated
      })
    )
  }

  const estimatedTotal = items.reduce(
    (sum, item) => sum + (item.quantity ?? 0) * (item.estimated_unit_price ?? 0),
    0
  )

  function addDocument() {
    setDocuments((prev) => [...prev, ''])
  }

  function updateDocument(index: number, value: string) {
    setDocuments((prev) => prev.map((d, i) => (i === index ? value : d)))
  }

  function removeDocument(index: number) {
    setDocuments((prev) => prev.filter((_, i) => i !== index))
  }

  function addInstallment() {
    setConditions((prev) => ({
      ...prev,
      installments: [
        ...prev.installments,
        {
          _key: generateUUID(),
          installment_number: prev.installments.length + 1,
          percentage: 0,
          milestone: '',
        },
      ],
    }))
  }

  function removeInstallment(key: string) {
    setConditions((prev) => ({
      ...prev,
      installments: prev.installments.filter((inst) => inst._key !== key),
    }))
  }

  function updateInstallment(
    key: string,
    field: keyof Omit<PaymentInstallment, '_key'>,
    value: string | number
  ) {
    setConditions((prev) => ({
      ...prev,
      installments: prev.installments.map((inst) =>
        inst._key === key ? { ...inst, [field]: value } : inst
      ),
    }))
  }

  const totalInstallmentPercent = conditions.installments.reduce(
    (sum, inst) => sum + (Number(inst.percentage) || 0),
    0
  )

  const documentPayload = documents.filter((d) => d.trim()).map((url) => ({ url }))

  async function handleSubmit(status: 'DRAFT' | 'SUBMITTED') {
    const title = purpose || items[0]?.item_name || 'Purchase Request'

    await createPR.mutateAsync({
      title,
      projectId: siteId || undefined,
      priority,
      items: items.map(({ _key: _, ...item }) => item),
      estimatedTotal,
      requestedBy: currentUser!.id,
      notes: notes || undefined,
      companyId: companyId || undefined,
      siteId: siteId || undefined,
      unitId: unitId || undefined,
      requiredDate: requiredDate || undefined,
      purpose: purpose || undefined,
      pmScheduleId: pmScheduleId || undefined,
      documents: documentPayload.length > 0 ? documentPayload : undefined,
      conditions: serializeConditions(conditions),
    })

    if (status === 'SUBMITTED') {
      // PR is created as DRAFT; submit action is separate via /submit endpoint
    }

    navigate({ to: '/facility-management/procurement' })
  }

  function serializeConditions(c: PRConditions) {
    return {
      installments: c.installments.map(({ _key: _, ...inst }) => inst),
      withholding_tax: c.withholding_tax,
      vat: c.vat,
      retention_percent: c.retention_percent === '' ? null : Number(c.retention_percent),
      retention_years: c.retention_years === '' ? null : Number(c.retention_years),
      warranty: c.warranty,
      warranty_years: c.warranty_years === '' ? null : Number(c.warranty_years),
      credit_terms_days: c.credit_terms_days === '' ? null : Number(c.credit_terms_days),
      timeline_start: c.timeline_start || null,
      timeline_end: c.timeline_end || null,
      timeline_progress: c.timeline_progress || null,
      late_penalty_percent: c.late_penalty_percent === '' ? null : Number(c.late_penalty_percent),
      insurance: c.insurance,
    }
  }

  const canSubmit = items.some((i) => i.item_name.trim())

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="icon"
          onClick={() => navigate({ to: '/facility-management/procurement' })}
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-extralight tracking-[0.3em] text-slate-600 uppercase">
            Create Purchase Request
          </h1>
          <p className="text-sm text-slate-500 mt-1">คำขอซื้อ</p>
        </div>
      </div>

      {/* General Info */}
      <Card>
        <CardHeader>
          <CardTitle>ข้อมูลทั่วไป — General Info</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                  <SelectItem value="__none__">— None —</SelectItem>
                  {companies.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Site (Project)</Label>
              <Select
                value={siteId || '__none__'}
                onValueChange={(v) => {
                  setSiteId(v === '__none__' ? '' : v)
                  setUnitId('')
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select site" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— None —</SelectItem>
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
                disabled={!siteId}
              >
                <SelectTrigger>
                  <SelectValue placeholder={siteId ? 'Select unit' : 'Select site first'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— None —</SelectItem>
                  {units.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.unit_number}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Date</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>

            <div>
              <Label>Required Date</Label>
              <Input
                type="date"
                value={requiredDate}
                onChange={(e) => setRequiredDate(e.target.value)}
              />
            </div>

            <div>
              <Label>Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {['LOW', 'MEDIUM', 'HIGH', 'URGENT'].map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Purpose</Label>
              <Select
                value={purpose || '__none__'}
                onValueChange={(v) => setPurpose(v === '__none__' ? '' : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select purpose" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— None —</SelectItem>
                  {PR_PURPOSES.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>PM Schedule (Optional)</Label>
              <Select
                value={pmScheduleId || '__none__'}
                onValueChange={(v) => setPmScheduleId(v === '__none__' ? '' : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select PM schedule" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— None —</SelectItem>
                  {pmSchedules.map((pm) => (
                    <SelectItem key={pm.id} value={pm.id}>
                      {pm.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Items */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>รายการสินค้า — Items</CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={addItem}>
              <Plus className="w-4 h-4 mr-2" />
              + Add Item
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {items.map((item, index) => (
            <div
              key={item._key}
              className="p-4 border border-slate-200 rounded-lg space-y-3 bg-slate-50"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-600">Item {index + 1}</span>
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

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div>
                  <Label className="text-xs">Type</Label>
                  <Select
                    value={item.item_type || '__none__'}
                    onValueChange={(v) =>
                      updateItem(item._key, 'item_type', v === '__none__' ? '' : v)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— None —</SelectItem>
                      {PR_ITEM_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <Label className="text-xs">Mode</Label>
                    <div className="flex items-center gap-2 h-10">
                      <span
                        className={`text-sm ${item.mode === 'buy' ? 'text-indigo-600 font-medium' : 'text-slate-400'}`}
                      >
                        ซื้อ
                      </span>
                      <Switch
                        checked={item.mode === 'rent'}
                        onCheckedChange={(checked) =>
                          updateItem(item._key, 'mode', checked ? 'rent' : 'buy')
                        }
                      />
                      <span
                        className={`text-sm ${item.mode === 'rent' ? 'text-indigo-600 font-medium' : 'text-slate-400'}`}
                      >
                        เช่า
                      </span>
                    </div>
                  </div>
                </div>

                <div className="md:col-span-2">
                  <Label className="text-xs">Item Description *</Label>
                  <Input
                    value={item.item_name}
                    onChange={(e) => updateItem(item._key, 'item_name', e.target.value)}
                    placeholder="Item description"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <Label className="text-xs">Quantity *</Label>
                  <Input
                    type="number"
                    min="0.001"
                    step="1"
                    value={item.quantity}
                    onChange={(e) => updateItem(item._key, 'quantity', Number(e.target.value))}
                  />
                </div>

                <div>
                  <Label className="text-xs">Unit Price</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.estimated_unit_price ?? 0}
                    onChange={(e) =>
                      updateItem(item._key, 'estimated_unit_price', Number(e.target.value))
                    }
                  />
                </div>

                <div>
                  <Label className="text-xs">Budget Code</Label>
                  <Select
                    value={item.budget_code || '__none__'}
                    onValueChange={(v) =>
                      updateItem(item._key, 'budget_code', v === '__none__' ? '' : v)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select budget" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— None —</SelectItem>
                      {budgets.map((b) => (
                        <SelectItem key={b.id} value={b.budget_code}>
                          {b.budget_code} — {b.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs">Supplier (Optional)</Label>
                  <Select
                    value={item.supplier || '__none__'}
                    onValueChange={(v) =>
                      updateItem(item._key, 'supplier', v === '__none__' ? '' : v)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select vendor" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— None —</SelectItem>
                      {vendors.map((v) => (
                        <SelectItem key={v.id} value={v.name}>
                          {v.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs">Specification</Label>
                  <Input
                    value={item.specification ?? ''}
                    onChange={(e) => updateItem(item._key, 'specification', e.target.value)}
                    placeholder="Technical specification"
                  />
                </div>

                <div>
                  <Label className="text-xs">Category</Label>
                  <Select
                    value={item.category || '__none__'}
                    onValueChange={(v) =>
                      updateItem(item._key, 'category', v === '__none__' ? '' : v)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— None —</SelectItem>
                      {PR_ITEM_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs">Asset Link (Optional)</Label>
                  <Select
                    value={item.asset_id || '__none__'}
                    onValueChange={(v) =>
                      updateItem(item._key, 'asset_id', v === '__none__' ? '' : v)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Link to asset" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— None —</SelectItem>
                      {assets.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.asset_number} — {a.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-end text-sm text-slate-600">
                Total:{' '}
                <span className="ml-2 font-medium">
                  ฿{((item.quantity ?? 0) * (item.estimated_unit_price ?? 0)).toLocaleString()}
                </span>
              </div>
            </div>
          ))}

          <div className="flex justify-end pt-2 border-t">
            <div className="text-right">
              <p className="text-sm text-slate-500">Estimated Total</p>
              <p className="text-2xl font-light text-indigo-700">
                ฿{estimatedTotal.toLocaleString()}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
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

      {/* Documents */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>เอกสารแนบ — Documents</CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={addDocument}>
              <Plus className="w-4 h-4 mr-2" />
              Add Document
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {documents.map((doc, index) => (
            <div key={index} className="flex gap-2">
              <Input
                value={doc}
                onChange={(e) => updateDocument(index, e.target.value)}
                placeholder="Document URL or file path"
                className="flex-1"
              />
              {documents.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-red-500"
                  onClick={() => removeDocument(index)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Conditions */}
      <Card>
        <CardHeader>
          <CardTitle>เงื่อนไขการจัดซื้อ — Conditions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Payment Installments */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium text-sm text-slate-700">Payment Installments</h3>
              <Button type="button" variant="outline" size="sm" onClick={addInstallment}>
                <Plus className="w-4 h-4 mr-1" />
                + เพิ่มงวด
              </Button>
            </div>

            {conditions.installments.length > 0 && (
              <div className="space-y-2">
                {conditions.installments.map((inst) => (
                  <div
                    key={inst._key}
                    className="grid grid-cols-12 gap-2 items-end p-2 bg-slate-50 rounded-lg"
                  >
                    <div className="col-span-2">
                      <Label className="text-xs">Installment #</Label>
                      <Input
                        type="number"
                        min="1"
                        value={inst.installment_number}
                        onChange={(e) =>
                          updateInstallment(inst._key, 'installment_number', Number(e.target.value))
                        }
                      />
                    </div>
                    <div className="col-span-3">
                      <Label className="text-xs">Percentage (%)</Label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={inst.percentage}
                        onChange={(e) =>
                          updateInstallment(inst._key, 'percentage', Number(e.target.value))
                        }
                      />
                    </div>
                    <div className="col-span-6">
                      <Label className="text-xs">Milestone</Label>
                      <Input
                        value={inst.milestone}
                        onChange={(e) =>
                          updateInstallment(inst._key, 'milestone', e.target.value)
                        }
                        placeholder="e.g. Upon delivery"
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
                <div
                  className={`text-sm text-right ${totalInstallmentPercent === 100 ? 'text-teal-600' : 'text-amber-600'}`}
                >
                  Total: {totalInstallmentPercent}%{' '}
                  {totalInstallmentPercent !== 100 && '(must equal 100%)'}
                </div>
              </div>
            )}
          </div>

          {/* Toggles: WHT, VAT, Insurance */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3">
              <Switch
                checked={conditions.withholding_tax}
                onCheckedChange={(v) =>
                  setConditions((prev) => ({ ...prev, withholding_tax: v }))
                }
              />
              <Label>Withholding Tax</Label>
            </div>

            <div className="flex items-center gap-3">
              <Switch
                checked={conditions.vat}
                onCheckedChange={(v) => setConditions((prev) => ({ ...prev, vat: v }))}
              />
              <Label>VAT</Label>
            </div>

            <div className="flex items-center gap-3">
              <Switch
                checked={conditions.insurance}
                onCheckedChange={(v) => setConditions((prev) => ({ ...prev, insurance: v }))}
              />
              <Label>Insurance</Label>
            </div>
          </div>

          {/* Retention */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Retention (%)</Label>
              <Input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={conditions.retention_percent}
                onChange={(e) =>
                  setConditions((prev) => ({
                    ...prev,
                    retention_percent: e.target.value === '' ? '' : Number(e.target.value),
                  }))
                }
                placeholder="e.g. 5"
              />
            </div>
            <div>
              <Label>Retention Duration (years)</Label>
              <Input
                type="number"
                min="0"
                step="1"
                value={conditions.retention_years}
                onChange={(e) =>
                  setConditions((prev) => ({
                    ...prev,
                    retention_years: e.target.value === '' ? '' : Number(e.target.value),
                  }))
                }
                placeholder="e.g. 1"
              />
            </div>
          </div>

          {/* Warranty */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <Switch
                checked={conditions.warranty}
                onCheckedChange={(v) => setConditions((prev) => ({ ...prev, warranty: v }))}
              />
              <Label>Warranty</Label>
            </div>
            {conditions.warranty && (
              <div>
                <Label>Warranty Duration (years)</Label>
                <Input
                  type="number"
                  min="0"
                  step="1"
                  value={conditions.warranty_years}
                  onChange={(e) =>
                    setConditions((prev) => ({
                      ...prev,
                      warranty_years: e.target.value === '' ? '' : Number(e.target.value),
                    }))
                  }
                  placeholder="e.g. 2"
                />
              </div>
            )}
          </div>

          {/* Credit Terms & Late Penalty */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Credit Terms (days)</Label>
              <Input
                type="number"
                min="0"
                step="1"
                value={conditions.credit_terms_days}
                onChange={(e) =>
                  setConditions((prev) => ({
                    ...prev,
                    credit_terms_days: e.target.value === '' ? '' : Number(e.target.value),
                  }))
                }
                placeholder="e.g. 30"
              />
            </div>
            <div>
              <Label>Late Penalty (% per day)</Label>
              <Input
                type="number"
                min="0"
                step="0.001"
                value={conditions.late_penalty_percent}
                onChange={(e) =>
                  setConditions((prev) => ({
                    ...prev,
                    late_penalty_percent: e.target.value === '' ? '' : Number(e.target.value),
                  }))
                }
                placeholder="e.g. 0.1"
              />
            </div>
          </div>

          {/* Timeline */}
          <div>
            <h3 className="font-medium text-sm text-slate-700 mb-2">Timeline</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={conditions.timeline_start}
                  onChange={(e) =>
                    setConditions((prev) => ({ ...prev, timeline_start: e.target.value }))
                  }
                />
              </div>
              <div>
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={conditions.timeline_end}
                  onChange={(e) =>
                    setConditions((prev) => ({ ...prev, timeline_end: e.target.value }))
                  }
                />
              </div>
              <div>
                <Label>Progress Notes</Label>
                <Input
                  value={conditions.timeline_progress}
                  onChange={(e) =>
                    setConditions((prev) => ({ ...prev, timeline_progress: e.target.value }))
                  }
                  placeholder="e.g. 30 days after PO"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          onClick={() => navigate({ to: '/facility-management/procurement' })}
        >
          Cancel
        </Button>
        <Button
          variant="outline"
          onClick={() => handleSubmit('DRAFT')}
          disabled={createPR.isPending || !canSubmit}
        >
          <Save className="w-4 h-4 mr-2" />
          Save Draft
        </Button>
        <Button
          onClick={() => handleSubmit('SUBMITTED')}
          disabled={createPR.isPending || !canSubmit}
          className="bg-indigo-600 hover:bg-indigo-700"
        >
          <Send className="w-4 h-4 mr-2" />
          Submit
        </Button>
      </div>
    </div>
  )
}
