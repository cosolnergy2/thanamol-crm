import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { ArrowLeft, Plus, Trash2 } from 'lucide-react'
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
import { useCreateDisasterPlan } from '@/hooks/useDisasterPlans'
import { useProjects } from '@/hooks/useProjects'
import type { DisasterPlanType, DisasterPlanStatus } from '@thanamol/shared'

export const Route = createFileRoute(
  '/_authenticated/facility-management/emergency/plans/create'
)({
  component: CreateDisasterPlanPage,
})

const PLAN_TYPES: DisasterPlanType[] = ['FIRE', 'EARTHQUAKE', 'FLOOD', 'CHEMICAL', 'OTHER']
const PLAN_TYPE_LABELS: Record<DisasterPlanType, string> = {
  FIRE: 'Fire',
  EARTHQUAKE: 'Earthquake',
  FLOOD: 'Flood',
  CHEMICAL: 'Chemical',
  OTHER: 'Other',
}
const PLAN_STATUSES: DisasterPlanStatus[] = ['DRAFT', 'ACTIVE']
const STATUS_LABELS: Record<DisasterPlanStatus, string> = {
  DRAFT: 'Draft',
  ACTIVE: 'Active',
  ARCHIVED: 'Archived',
}

type ProcedureStep = { order: number; description: string }
type ResponsiblePerson = { name: string; role: string; contact: string }

type FormState = {
  title: string
  planType: DisasterPlanType
  projectId: string
  reviewDate: string
  status: DisasterPlanStatus
  notes: string
}

const DEFAULT_FORM: FormState = {
  title: '',
  planType: 'FIRE',
  projectId: '',
  reviewDate: '',
  status: 'DRAFT',
  notes: '',
}

function CreateDisasterPlanPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState<FormState>(DEFAULT_FORM)
  const [procedures, setProcedures] = useState<ProcedureStep[]>([
    { order: 1, description: '' },
  ])
  const [responsiblePersons, setResponsiblePersons] = useState<ResponsiblePerson[]>([
    { name: '', role: '', contact: '' },
  ])

  const { data: projectsData } = useProjects({ limit: 100 })
  const projects = projectsData?.data ?? []

  const createMutation = useCreateDisasterPlan()

  function addProcedure() {
    setProcedures((prev) => [
      ...prev,
      { order: prev.length + 1, description: '' },
    ])
  }

  function removeProcedure(index: number) {
    setProcedures((prev) =>
      prev.filter((_, i) => i !== index).map((s, i) => ({ ...s, order: i + 1 }))
    )
  }

  function updateProcedure(index: number, description: string) {
    setProcedures((prev) =>
      prev.map((s, i) => (i === index ? { ...s, description } : s))
    )
  }

  function addResponsiblePerson() {
    setResponsiblePersons((prev) => [...prev, { name: '', role: '', contact: '' }])
  }

  function removeResponsiblePerson(index: number) {
    setResponsiblePersons((prev) => prev.filter((_, i) => i !== index))
  }

  function updateResponsiblePerson(index: number, field: keyof ResponsiblePerson, value: string) {
    setResponsiblePersons((prev) =>
      prev.map((p, i) => (i === index ? { ...p, [field]: value } : p))
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!form.title || !form.projectId || !form.planType) {
      toast.error('Title, project, and plan type are required')
      return
    }

    const validProcedures = procedures.filter((s) => s.description.trim())
    const validPersons = responsiblePersons.filter((p) => p.name.trim())

    await createMutation.mutateAsync({
      title: form.title,
      planType: form.planType,
      projectId: form.projectId,
      procedures: validProcedures,
      responsiblePersons: validPersons,
      reviewDate: form.reviewDate || undefined,
      status: form.status,
      notes: form.notes || undefined,
    })

    toast.success('Disaster plan created')
    navigate({ to: '/facility-management/emergency/plans' })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate({ to: '/facility-management/emergency/plans' })}
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-extralight tracking-[0.3em] text-slate-600 uppercase">
            Create Disaster Plan
          </h1>
          <p className="text-sm text-slate-500 mt-1">สร้างแผนรับมือภัยพิบัติ</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Plan Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2 space-y-1">
                <Label>Title *</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Disaster plan title"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label>Plan Type *</Label>
                <Select
                  value={form.planType}
                  onValueChange={(v) => setForm({ ...form, planType: v as DisasterPlanType })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PLAN_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {PLAN_TYPE_LABELS[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label>Project *</Label>
                <Select
                  value={form.projectId}
                  onValueChange={(v) => setForm({ ...form, projectId: v })}
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
                <Label>Review Date</Label>
                <Input
                  type="date"
                  value={form.reviewDate}
                  onChange={(e) => setForm({ ...form, reviewDate: e.target.value })}
                />
              </div>

              <div className="space-y-1">
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) => setForm({ ...form, status: v as DisasterPlanStatus })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PLAN_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {STATUS_LABELS[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="md:col-span-2 space-y-1">
                <Label>Notes</Label>
                <Textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Additional notes..."
                  rows={3}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Procedures</CardTitle>
              <Button type="button" size="sm" variant="outline" onClick={addProcedure} className="gap-1">
                <Plus className="w-3 h-3" />
                Add Step
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {procedures.map((step, index) => (
              <div key={index} className="flex items-start gap-3">
                <div className="flex-shrink-0 w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-medium mt-2">
                  {step.order}
                </div>
                <Textarea
                  className="flex-1"
                  value={step.description}
                  onChange={(e) => updateProcedure(index, e.target.value)}
                  placeholder={`Step ${step.order} description...`}
                  rows={2}
                />
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="text-slate-400 hover:text-rose-500 mt-1"
                  onClick={() => removeProcedure(index)}
                  disabled={procedures.length === 1}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Responsible Persons</CardTitle>
              <Button type="button" size="sm" variant="outline" onClick={addResponsiblePerson} className="gap-1">
                <Plus className="w-3 h-3" />
                Add Person
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {responsiblePersons.map((person, index) => (
              <div key={index} className="grid grid-cols-3 gap-3 items-start">
                <div className="space-y-1">
                  <Label className="text-xs">Name</Label>
                  <Input
                    value={person.name}
                    onChange={(e) => updateResponsiblePerson(index, 'name', e.target.value)}
                    placeholder="Full name"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Role</Label>
                  <Input
                    value={person.role}
                    onChange={(e) => updateResponsiblePerson(index, 'role', e.target.value)}
                    placeholder="Role / position"
                  />
                </div>
                <div className="flex gap-2 items-end">
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs">Contact</Label>
                    <Input
                      value={person.contact}
                      onChange={(e) => updateResponsiblePerson(index, 'contact', e.target.value)}
                      placeholder="Phone / email"
                    />
                  </div>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="text-slate-400 hover:text-rose-500"
                    onClick={() => removeResponsiblePerson(index)}
                    disabled={responsiblePersons.length === 1}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate({ to: '/facility-management/emergency/plans' })}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="bg-indigo-600 hover:bg-indigo-700"
            disabled={createMutation.isPending}
          >
            Create Plan
          </Button>
        </div>
      </form>
    </div>
  )
}
