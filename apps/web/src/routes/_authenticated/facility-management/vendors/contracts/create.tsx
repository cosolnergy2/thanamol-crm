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
import { useCreateVendorContract } from '@/hooks/useVendorContracts'
import { useVendors } from '@/hooks/useVendors'
import { useProjects } from '@/hooks/useProjects'
import {
  VENDOR_CONTRACT_TYPES,
  VENDOR_SERVICE_CATEGORIES,
} from '@thanamol/shared'
import type { VendorContractStatus } from '@thanamol/shared'

export const Route = createFileRoute(
  '/_authenticated/facility-management/vendors/contracts/create'
)({
  component: VendorContractCreatePage,
})

type SlaRow = {
  id: string
  serviceType: string
  responseTimeHours: string
  resolutionTimeHours: string
  penaltyPerDay: string
}

type RateCardRow = {
  id: string
  service: string
  unit: string
  rate: string
}

function newSlaRow(): SlaRow {
  return { id: crypto.randomUUID(), serviceType: '', responseTimeHours: '', resolutionTimeHours: '', penaltyPerDay: '' }
}

function newRateCardRow(): RateCardRow {
  return { id: crypto.randomUUID(), service: '', unit: '', rate: '' }
}

function VendorContractCreatePage() {
  const navigate = useNavigate()
  const createContract = useCreateVendorContract()
  const { data: vendorsData } = useVendors({ limit: 200 })
  const { data: projectsData } = useProjects({ limit: 200 })

  const vendors = vendorsData?.data ?? []
  const projects = projectsData?.data ?? []

  const [vendorId, setVendorId] = useState('')
  const [title, setTitle] = useState('')
  const [contractType, setContractType] = useState('')
  const [serviceCategory, setServiceCategory] = useState('')
  const [projectId, setProjectId] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [value, setValue] = useState('')
  const [paymentTerms, setPaymentTerms] = useState('')
  const [documentUrl, setDocumentUrl] = useState('')
  const [slaRows, setSlaRows] = useState<SlaRow[]>([newSlaRow()])
  const [rateCardRows, setRateCardRows] = useState<RateCardRow[]>([newRateCardRow()])
  const [alertDays, setAlertDays] = useState('30')
  const [autoRenew, setAutoRenew] = useState(false)
  const [status, setStatus] = useState<VendorContractStatus>('DRAFT')
  const [scope, setScope] = useState('')

  function updateSlaRow(id: string, field: keyof Omit<SlaRow, 'id'>, val: string) {
    setSlaRows((rows) => rows.map((r) => (r.id === id ? { ...r, [field]: val } : r)))
  }

  function updateRateCardRow(id: string, field: keyof Omit<RateCardRow, 'id'>, val: string) {
    setRateCardRows((rows) => rows.map((r) => (r.id === id ? { ...r, [field]: val } : r)))
  }

  function buildSlaPayload() {
    const filled = slaRows.filter((r) => r.serviceType || r.responseTimeHours || r.resolutionTimeHours)
    if (filled.length === 0) return undefined
    return filled.map((r) => ({
      serviceType: r.serviceType,
      responseTimeHours: r.responseTimeHours ? Number(r.responseTimeHours) : null,
      resolutionTimeHours: r.resolutionTimeHours ? Number(r.resolutionTimeHours) : null,
      penaltyPerDay: r.penaltyPerDay ? Number(r.penaltyPerDay) : null,
    }))
  }

  function buildRateCardPayload() {
    const filled = rateCardRows.filter((r) => r.service || r.rate)
    if (filled.length === 0) return undefined
    return filled.map((r) => ({
      service: r.service,
      unit: r.unit,
      rate: r.rate ? Number(r.rate) : null,
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createContract.mutate(
      {
        vendorId,
        title,
        scope: scope || undefined,
        startDate,
        endDate,
        value: value ? Number(value) : undefined,
        paymentTerms: paymentTerms || undefined,
        status,
        documentUrl: documentUrl || undefined,
        projectId: projectId || undefined,
        contractType: contractType || undefined,
        serviceCategory: serviceCategory || undefined,
        sla: buildSlaPayload(),
        rateCard: buildRateCardPayload(),
        alertDaysBeforeExpiry: alertDays ? Number(alertDays) : undefined,
        autoRenew,
      },
      {
        onSuccess: () => {
          navigate({ to: '/facility-management/vendors/contracts' })
        },
      }
    )
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate({ to: '/facility-management/vendors/contracts' })}
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-extralight tracking-[0.3em] text-slate-600 uppercase">
            New Vendor Contract
          </h1>
          <p className="text-sm text-slate-500 mt-0.5 font-extralight">
            Contract number will be generated automatically
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-slate-600">ข้อมูลพื้นฐาน</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Contract Title *</Label>
              <Input
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. HVAC Maintenance Agreement 2026"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Vendor *</Label>
                <Select value={vendorId || '__none__'} onValueChange={(v) => setVendorId(v === '__none__' ? '' : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select vendor" />
                  </SelectTrigger>
                  <SelectContent>
                    {vendors.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Contract Type</Label>
                <Select value={contractType || '__none__'} onValueChange={(v) => setContractType(v === '__none__' ? '' : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {VENDOR_CONTRACT_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Service Category</Label>
                <Select value={serviceCategory || '__none__'} onValueChange={(v) => setServiceCategory(v === '__none__' ? '' : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {VENDOR_SERVICE_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Site / Project</Label>
                <Select value={projectId || '__none__'} onValueChange={(v) => setProjectId(v === '__none__' ? '' : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="No project" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">No project</SelectItem>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Start Date *</Label>
                <Input
                  required
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div>
                <Label>End Date *</Label>
                <Input
                  required
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
              <div>
                <Label>Contract Value (THB)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label>Payment Terms</Label>
                <Input
                  value={paymentTerms}
                  onChange={(e) => setPaymentTerms(e.target.value)}
                  placeholder="e.g. Net 30"
                />
              </div>
            </div>
            <div>
              <Label>Document URL</Label>
              <Input
                type="url"
                value={documentUrl}
                onChange={(e) => setDocumentUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-slate-600">เงื่อนไข SLA</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-4 gap-2 text-xs font-medium text-slate-500 pb-1 border-b">
              <span>Service Type</span>
              <span>Response Time (hrs)</span>
              <span>Resolution Time (hrs)</span>
              <span>Penalty (฿/day)</span>
            </div>
            {slaRows.map((row) => (
              <div key={row.id} className="grid grid-cols-4 gap-2 items-center">
                <Input
                  value={row.serviceType}
                  onChange={(e) => updateSlaRow(row.id, 'serviceType', e.target.value)}
                  placeholder="e.g. HVAC repair"
                  className="text-sm"
                />
                <Input
                  type="number"
                  min="0"
                  value={row.responseTimeHours}
                  onChange={(e) => updateSlaRow(row.id, 'responseTimeHours', e.target.value)}
                  placeholder="4"
                  className="text-sm"
                />
                <Input
                  type="number"
                  min="0"
                  value={row.resolutionTimeHours}
                  onChange={(e) => updateSlaRow(row.id, 'resolutionTimeHours', e.target.value)}
                  placeholder="24"
                  className="text-sm"
                />
                <div className="flex gap-1 items-center">
                  <Input
                    type="number"
                    min="0"
                    value={row.penaltyPerDay}
                    onChange={(e) => updateSlaRow(row.id, 'penaltyPerDay', e.target.value)}
                    placeholder="500"
                    className="text-sm"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-red-400 hover:text-red-600 shrink-0"
                    onClick={() => setSlaRows((rows) => rows.filter((r) => r.id !== row.id))}
                    disabled={slaRows.length === 1}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5 text-indigo-600 border-indigo-200"
              onClick={() => setSlaRows((rows) => [...rows, newSlaRow()])}
            >
              <Plus className="w-3.5 h-3.5" />
              เพิ่ม SLA
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-slate-600">อัตราค่าบริการ</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-3 gap-2 text-xs font-medium text-slate-500 pb-1 border-b">
              <span>Service</span>
              <span>Unit (ครั้ง, ชม., ...)</span>
              <span>Rate (฿)</span>
            </div>
            {rateCardRows.map((row) => (
              <div key={row.id} className="grid grid-cols-3 gap-2 items-center">
                <Input
                  value={row.service}
                  onChange={(e) => updateRateCardRow(row.id, 'service', e.target.value)}
                  placeholder="e.g. Preventive maintenance"
                  className="text-sm"
                />
                <Input
                  value={row.unit}
                  onChange={(e) => updateRateCardRow(row.id, 'unit', e.target.value)}
                  placeholder="ครั้ง"
                  className="text-sm"
                />
                <div className="flex gap-1 items-center">
                  <Input
                    type="number"
                    min="0"
                    value={row.rate}
                    onChange={(e) => updateRateCardRow(row.id, 'rate', e.target.value)}
                    placeholder="1500"
                    className="text-sm"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-red-400 hover:text-red-600 shrink-0"
                    onClick={() => setRateCardRows((rows) => rows.filter((r) => r.id !== row.id))}
                    disabled={rateCardRows.length === 1}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5 text-indigo-600 border-indigo-200"
              onClick={() => setRateCardRows((rows) => [...rows, newRateCardRow()])}
            >
              <Plus className="w-3.5 h-3.5" />
              เพิ่มรายการ
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-slate-600">การตั้งค่า</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Alert Before Expiry (days)</Label>
                <Input
                  type="number"
                  min="0"
                  value={alertDays}
                  onChange={(e) => setAlertDays(e.target.value)}
                  placeholder="30"
                />
              </div>
              <div>
                <Label>Status</Label>
                <Select
                  value={status}
                  onValueChange={(v) => setStatus(v as VendorContractStatus)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DRAFT">Draft</SelectItem>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="EXPIRED">Expired</SelectItem>
                    <SelectItem value="TERMINATED">Terminated</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                role="switch"
                aria-checked={autoRenew}
                onClick={() => setAutoRenew((v) => !v)}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${
                  autoRenew ? 'bg-indigo-600' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                    autoRenew ? 'translate-x-4' : 'translate-x-1'
                  }`}
                />
              </button>
              <Label className="cursor-pointer" onClick={() => setAutoRenew((v) => !v)}>
                Auto-renew
              </Label>
            </div>
            <div>
              <Label>Notes / Scope</Label>
              <Textarea
                value={scope}
                onChange={(e) => setScope(e.target.value)}
                rows={3}
                placeholder="Scope of work, additional notes..."
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3 pb-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate({ to: '/facility-management/vendors/contracts' })}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={!vendorId || !title || !startDate || !endDate || createContract.isPending}
            className="bg-indigo-600 hover:bg-indigo-700 gap-2"
          >
            <Save className="w-4 h-4" />
            Create Contract
          </Button>
        </div>
      </form>
    </div>
  )
}
