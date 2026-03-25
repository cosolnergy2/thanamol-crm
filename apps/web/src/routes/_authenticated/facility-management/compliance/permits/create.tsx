import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { ArrowLeft } from 'lucide-react'
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
import { useCreatePermitToWork } from '@/hooks/usePermitsToWork'
import { useProjects } from '@/hooks/useProjects'
import { PERMIT_TYPES } from '@thanamol/shared'

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
  permitType: string
  startDate: string
  endDate: string
  contractorName: string
  notes: string
}

const DEFAULT_FORM: FormState = {
  title: '',
  description: '',
  projectId: '',
  zoneId: '',
  permitType: 'General',
  startDate: '',
  endDate: '',
  contractorName: '',
  notes: '',
}

function CreatePermitPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState<FormState>(DEFAULT_FORM)

  const { data: projectsData } = useProjects({ limit: 100 })
  const projects = projectsData?.data ?? []

  const createMutation = useCreatePermitToWork()

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
      permitType: form.permitType || undefined,
      startDate: form.startDate || undefined,
      endDate: form.endDate || undefined,
      contractorName: form.contractorName || undefined,
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
                <Label>Contractor Name</Label>
                <Input
                  value={form.contractorName}
                  onChange={(e) => setForm({ ...form, contractorName: e.target.value })}
                  placeholder="Contractor or company name"
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
