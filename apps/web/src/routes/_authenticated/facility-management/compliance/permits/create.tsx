import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { ArrowLeft, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useCreatePermitToWork } from '@/hooks/usePermitsToWork'
import { useProjects } from '@/hooks/useProjects'
import { useCompanies } from '@/hooks/useCompanies'
import { PERMIT_TYPES, PPE_OPTIONS } from '@thanamol/shared'
import type { PermitWorker } from '@thanamol/shared'

export const Route = createFileRoute(
  '/_authenticated/facility-management/compliance/permits/create'
)({
  component: CreatePermitPage,
})

type FormState = {
  title: string
  description: string
  projectId: string
  zoneId: string
  companyId: string
  siteId: string
  location: string
  unit: string
  permitType: string
  contractorName: string
  contractorContact: string
  startDate: string
  endDate: string
}

const DEFAULT_FORM: FormState = {
  title: '',
  description: '',
  projectId: '',
  zoneId: '',
  companyId: '',
  siteId: '',
  location: '',
  unit: '',
  permitType: 'General',
  contractorName: '',
  contractorContact: '',
  startDate: '',
  endDate: '',
}

function CreatePermitPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState<FormState>(DEFAULT_FORM)
  const [workers, setWorkers] = useState<PermitWorker[]>([])
  const [ppeRequired, setPpeRequired] = useState<string[]>([])

  const { data: projectsData } = useProjects({ limit: 100 })
  const projects = projectsData?.data ?? []

  const { data: companiesData } = useCompanies({ limit: 100 })
  const companies = companiesData?.data ?? []

  const createMutation = useCreatePermitToWork()

  function addWorker() {
    setWorkers([...workers, { name: '', id_number: '' }])
  }

  function removeWorker(index: number) {
    setWorkers(workers.filter((_, i) => i !== index))
  }

  function updateWorker(index: number, field: keyof PermitWorker, value: string) {
    const updated = workers.map((w, i) => (i === index ? { ...w, [field]: value } : w))
    setWorkers(updated)
  }

  function togglePpe(option: string) {
    setPpeRequired((prev) =>
      prev.includes(option) ? prev.filter((p) => p !== option) : [...prev, option]
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!form.title || !form.projectId) {
      toast.error('Title and project are required')
      return
    }

    await createMutation.mutateAsync({
      title: form.title,
      description: form.description || undefined,
      projectId: form.projectId,
      zoneId: form.zoneId || undefined,
      companyId: form.companyId || undefined,
      siteId: form.siteId || undefined,
      location: form.location || undefined,
      unit: form.unit || undefined,
      permitType: form.permitType || undefined,
      contractorName: form.contractorName || undefined,
      contractorContact: form.contractorContact || undefined,
      startDate: form.startDate || undefined,
      endDate: form.endDate || undefined,
      workers: workers.length > 0 ? workers : undefined,
      ppeRequired: ppeRequired.length > 0 ? ppeRequired : undefined,
    })

    toast.success('Permit to work created')
    navigate({ to: '/facility-management/compliance/permits' })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate({ to: '/facility-management/compliance/permits' })}
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-extralight tracking-[0.3em] text-slate-600 uppercase">
            New Permit to Work
          </h1>
          <p className="text-sm text-slate-500 mt-1">ออกใบอนุญาตทำงาน</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2 space-y-1">
                <Label>Title *</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g., Hot Work - Welding 2nd Floor"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label>Project *</Label>
                <Select
                  value={form.projectId}
                  onValueChange={(v) => setForm({ ...form, projectId: v })}
                  required
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

              <div className="space-y-1">
                <Label>Permit Type</Label>
                <Select
                  value={form.permitType}
                  onValueChange={(v) => setForm({ ...form, permitType: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PERMIT_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label>Company</Label>
                <Select
                  value={form.companyId}
                  onValueChange={(v) => setForm({ ...form, companyId: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select company" />
                  </SelectTrigger>
                  <SelectContent>
                    {companies.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label>Site ID</Label>
                <Input
                  value={form.siteId}
                  onChange={(e) => setForm({ ...form, siteId: e.target.value })}
                  placeholder="Site identifier"
                />
              </div>

              <div className="space-y-1">
                <Label>Location</Label>
                <Input
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  placeholder="e.g., 2nd Floor, Block A"
                />
              </div>

              <div className="space-y-1">
                <Label>Unit</Label>
                <Input
                  value={form.unit}
                  onChange={(e) => setForm({ ...form, unit: e.target.value })}
                  placeholder="e.g., Unit 201"
                />
              </div>

              <div className="space-y-1">
                <Label>Contractor Name</Label>
                <Input
                  value={form.contractorName}
                  onChange={(e) => setForm({ ...form, contractorName: e.target.value })}
                  placeholder="Contractor or company name"
                />
              </div>

              <div className="space-y-1">
                <Label>Contractor Contact</Label>
                <Input
                  value={form.contractorContact}
                  onChange={(e) => setForm({ ...form, contractorContact: e.target.value })}
                  placeholder="Phone or email"
                />
              </div>

              <div className="space-y-1">
                <Label>Start Date & Time</Label>
                <Input
                  type="datetime-local"
                  value={form.startDate}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                />
              </div>

              <div className="space-y-1">
                <Label>End Date & Time</Label>
                <Input
                  type="datetime-local"
                  value={form.endDate}
                  onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                />
              </div>

              <div className="md:col-span-2 space-y-1">
                <Label>Description</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Describe the work to be performed..."
                  rows={3}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Workers</CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={addWorker}>
              <Plus className="w-4 h-4 mr-1" />
              Add Worker
            </Button>
          </CardHeader>
          <CardContent>
            {workers.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">
                No workers added. Click "Add Worker" to add workers.
              </p>
            ) : (
              <div className="space-y-3">
                {workers.map((worker, index) => (
                  <div key={index} className="flex gap-3 items-start">
                    <div className="flex-1 space-y-1">
                      <Label>Name</Label>
                      <Input
                        value={worker.name}
                        onChange={(e) => updateWorker(index, 'name', e.target.value)}
                        placeholder="Worker name"
                      />
                    </div>
                    <div className="flex-1 space-y-1">
                      <Label>ID Number</Label>
                      <Input
                        value={worker.id_number}
                        onChange={(e) => updateWorker(index, 'id_number', e.target.value)}
                        placeholder="ID / Passport number"
                      />
                    </div>
                    <div className="pt-6">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeWorker(index)}
                        className="text-red-500 hover:text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>PPE Required</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {PPE_OPTIONS.map((option) => (
                <div key={option} className="flex items-center gap-2">
                  <Checkbox
                    id={`ppe-${option}`}
                    checked={ppeRequired.includes(option)}
                    onCheckedChange={() => togglePpe(option)}
                  />
                  <label
                    htmlFor={`ppe-${option}`}
                    className="text-sm text-slate-700 cursor-pointer select-none"
                  >
                    {option}
                  </label>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate({ to: '/facility-management/compliance/permits' })}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={createMutation.isPending}>
            Create Permit
          </Button>
        </div>
      </form>
    </div>
  )
}
