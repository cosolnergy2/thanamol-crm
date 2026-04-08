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
import { useCreateIncident } from '@/hooks/useIncidents'
import { useProjects } from '@/hooks/useProjects'
import type { IncidentSeverity } from '@thanamol/shared'
import { INCIDENT_TYPES } from '@thanamol/shared'

export const Route = createFileRoute(
  '/_authenticated/facility-management/compliance/incidents/create'
)({
  component: CreateIncidentPage,
})

const SEVERITIES: IncidentSeverity[] = ['MINOR', 'MODERATE', 'MAJOR', 'CRITICAL']
const SEVERITY_LABELS: Record<IncidentSeverity, string> = {
  MINOR: 'Minor',
  MODERATE: 'Moderate',
  MAJOR: 'Major',
  CRITICAL: 'Critical',
}

type FormState = {
  title: string
  description: string
  projectId: string
  zoneId: string
  incidentDate: string
  severity: IncidentSeverity
  locationDetail: string
  investigationNotes: string
  rootCause: string
  incidentType: string
  vendorInvolved: string
  siteId: string
}

const DEFAULT_FORM: FormState = {
  title: '',
  description: '',
  projectId: '',
  zoneId: '',
  incidentDate: new Date().toISOString().slice(0, 16),
  severity: 'MINOR',
  locationDetail: '',
  investigationNotes: '',
  rootCause: '',
  incidentType: '',
  vendorInvolved: '',
  siteId: '',
}

function CreateIncidentPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState<FormState>(DEFAULT_FORM)

  const { data: projectsData } = useProjects({ limit: 100 })
  const projects = projectsData?.data ?? []

  const createMutation = useCreateIncident()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!form.title || !form.projectId || !form.incidentDate) {
      toast.error('Title, project, and incident date are required')
      return
    }

    await createMutation.mutateAsync({
      title: form.title,
      description: form.description || undefined,
      projectId: form.projectId,
      zoneId: form.zoneId || undefined,
      incidentDate: form.incidentDate,
      severity: form.severity,
      investigationNotes: form.investigationNotes || undefined,
      rootCause: form.rootCause || undefined,
      locationDetail: form.locationDetail || undefined,
      incidentType: form.incidentType || undefined,
      vendorInvolved: form.vendorInvolved || undefined,
      siteId: form.siteId || undefined,
    })

    toast.success('Incident reported')
    navigate({ to: '/facility-management/compliance/incidents' })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate({ to: '/facility-management/compliance/incidents' })}
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-extralight tracking-[0.3em] text-slate-600 uppercase">
            Report Incident
          </h1>
          <p className="text-sm text-slate-500 mt-1">รายงาน Incident</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Incident Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2 space-y-1">
                <Label>Title *</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Brief description of the incident"
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
                <Label>Incident Date & Time *</Label>
                <Input
                  type="datetime-local"
                  value={form.incidentDate}
                  onChange={(e) => setForm({ ...form, incidentDate: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-1">
                <Label>Incident Type</Label>
                <Select
                  value={form.incidentType}
                  onValueChange={(v) => setForm({ ...form, incidentType: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select incident type" />
                  </SelectTrigger>
                  <SelectContent>
                    {INCIDENT_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label>Severity *</Label>
                <Select
                  value={form.severity}
                  onValueChange={(v) => setForm({ ...form, severity: v as IncidentSeverity })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SEVERITIES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {SEVERITY_LABELS[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label>Location Detail</Label>
                <Input
                  value={form.locationDetail}
                  onChange={(e) => setForm({ ...form, locationDetail: e.target.value })}
                  placeholder="Specific location where incident occurred"
                />
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
                <Label>Vendor Involved</Label>
                <Input
                  value={form.vendorInvolved}
                  onChange={(e) => setForm({ ...form, vendorInvolved: e.target.value })}
                  placeholder="Name of vendor involved, if any"
                />
              </div>

              <div className="md:col-span-2 space-y-1">
                <Label>Description</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Detailed description of what happened..."
                  rows={4}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Investigation Notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label>Initial Investigation Notes</Label>
              <Textarea
                value={form.investigationNotes}
                onChange={(e) => setForm({ ...form, investigationNotes: e.target.value })}
                placeholder="Initial findings..."
                rows={3}
              />
            </div>
            <div className="space-y-1">
              <Label>Root Cause (if known)</Label>
              <Textarea
                value={form.rootCause}
                onChange={(e) => setForm({ ...form, rootCause: e.target.value })}
                placeholder="Identified root cause..."
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate({ to: '/facility-management/compliance/incidents' })}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="bg-rose-600 hover:bg-rose-700"
            disabled={createMutation.isPending}
          >
            Report Incident
          </Button>
        </div>
      </form>
    </div>
  )
}
