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
import { useCreateEmergencyDrill } from '@/hooks/useEmergencyDrills'
import { useDisasterPlans } from '@/hooks/useDisasterPlans'
import { useProjects } from '@/hooks/useProjects'

export const Route = createFileRoute(
  '/_authenticated/facility-management/emergency/drills/create'
)({
  component: CreateEmergencyDrillPage,
})

const DRILL_TYPES = [
  'Fire Evacuation',
  'Earthquake Response',
  'Flood Response',
  'Chemical Spill',
  'Medical Emergency',
  'Lockdown',
  'Other',
]

type FormState = {
  planId: string
  drillType: string
  customDrillType: string
  scheduledDate: string
  projectId: string
  findings: string
}

const DEFAULT_FORM: FormState = {
  planId: '',
  drillType: '',
  customDrillType: '',
  scheduledDate: '',
  projectId: '',
  findings: '',
}

function CreateEmergencyDrillPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState<FormState>(DEFAULT_FORM)

  const { data: projectsData } = useProjects({ limit: 100 })
  const projects = projectsData?.data ?? []

  const { data: plansData } = useDisasterPlans({
    projectId: form.projectId || undefined,
    status: 'ACTIVE',
    limit: 100,
  })
  const plans = plansData?.data ?? []

  const createMutation = useCreateEmergencyDrill()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const drillType = form.drillType === 'Other' ? form.customDrillType : form.drillType
    if (!drillType || !form.planId || !form.scheduledDate || !form.projectId) {
      toast.error('Drill type, plan, scheduled date, and project are required')
      return
    }

    await createMutation.mutateAsync({
      planId: form.planId,
      drillType,
      scheduledDate: form.scheduledDate,
      projectId: form.projectId,
      findings: form.findings || undefined,
    })

    toast.success('Drill scheduled')
    navigate({ to: '/facility-management/emergency/drills' })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate({ to: '/facility-management/emergency/drills' })}
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-extralight tracking-[0.3em] text-slate-600 uppercase">
            Schedule Drill
          </h1>
          <p className="text-sm text-slate-500 mt-1">จัดการซ้อมแผนฉุกเฉิน</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Drill Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Project *</Label>
                <Select
                  value={form.projectId}
                  onValueChange={(v) => setForm({ ...form, projectId: v, planId: '' })}
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
                <Label>Disaster Plan *</Label>
                <Select
                  value={form.planId}
                  onValueChange={(v) => setForm({ ...form, planId: v })}
                  disabled={!form.projectId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={form.projectId ? 'Select plan' : 'Select project first'} />
                  </SelectTrigger>
                  <SelectContent>
                    {plans.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label>Drill Type *</Label>
                <Select
                  value={form.drillType}
                  onValueChange={(v) => setForm({ ...form, drillType: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select drill type" />
                  </SelectTrigger>
                  <SelectContent>
                    {DRILL_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {form.drillType === 'Other' && (
                <div className="space-y-1">
                  <Label>Custom Drill Type *</Label>
                  <Input
                    value={form.customDrillType}
                    onChange={(e) => setForm({ ...form, customDrillType: e.target.value })}
                    placeholder="Specify drill type"
                  />
                </div>
              )}

              <div className="space-y-1">
                <Label>Scheduled Date *</Label>
                <Input
                  type="date"
                  value={form.scheduledDate}
                  onChange={(e) => setForm({ ...form, scheduledDate: e.target.value })}
                  required
                />
              </div>

              <div className="md:col-span-2 space-y-1">
                <Label>Initial Findings / Notes</Label>
                <Textarea
                  value={form.findings}
                  onChange={(e) => setForm({ ...form, findings: e.target.value })}
                  placeholder="Any pre-drill notes or objectives..."
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
            onClick={() => navigate({ to: '/facility-management/emergency/drills' })}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="bg-teal-600 hover:bg-teal-700"
            disabled={createMutation.isPending}
          >
            Schedule Drill
          </Button>
        </div>
      </form>
    </div>
  )
}
