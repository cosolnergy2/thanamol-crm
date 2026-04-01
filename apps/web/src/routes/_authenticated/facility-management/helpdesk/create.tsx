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
import { useCreateHelpdeskTicket } from '@/hooks/useHelpdesk'
import { useProjects } from '@/hooks/useProjects'
import type { CreateHelpdeskTicketRequest, TicketPriority } from '@thanamol/shared'

export const Route = createFileRoute('/_authenticated/facility-management/helpdesk/create')({
  component: HelpdeskCreatePage,
})

const PRIORITY_OPTIONS: { value: TicketPriority; label: string }[] = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'URGENT', label: 'Urgent' },
]

const CATEGORY_OPTIONS = [
  'Electrical',
  'Plumbing',
  'HVAC',
  'Structural',
  'Cleaning',
  'Security',
  'IT / Network',
  'General Maintenance',
  'Other',
]

type HelpdeskFormValues = {
  title: string
  description: string
  projectId: string
  site: string
  category: string
  priority: TicketPriority
}

const EMPTY_FORM: HelpdeskFormValues = {
  title: '',
  description: '',
  projectId: '',
  site: '',
  category: '',
  priority: 'MEDIUM',
}

function HelpdeskCreatePage() {
  const navigate = useNavigate()
  const [form, setForm] = useState<HelpdeskFormValues>(EMPTY_FORM)
  const [formError, setFormError] = useState<string | null>(null)

  const createTicket = useCreateHelpdeskTicket()
  const { data: projectsData } = useProjects({ limit: 100 })
  const projects = projectsData?.data ?? []

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)

    if (!form.title.trim()) {
      setFormError('Title is required')
      return
    }

    const payload: CreateHelpdeskTicketRequest = {
      title: form.title.trim(),
      description: form.description || undefined,
      projectId: form.projectId || undefined,
      site: form.site || undefined,
      category: form.category || undefined,
      priority: form.priority,
    }

    try {
      await createTicket.mutateAsync(payload)
      toast.success('Ticket created successfully')
      navigate({ to: '/facility-management/helpdesk' })
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to create ticket')
    }
  }

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate({ to: '/facility-management/helpdesk' })}
          className="h-8 w-8 p-0"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-lg font-light text-slate-800">New Service Request</h1>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-light text-slate-700">Ticket Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">
                  Title <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="title"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Brief description of the issue"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Provide details about the issue"
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="projectId">Project</Label>
                  <Select
                    value={form.projectId || 'none'}
                    onValueChange={(v) => setForm({ ...form, projectId: v === 'none' ? '' : v })}
                  >
                    <SelectTrigger id="projectId">
                      <SelectValue placeholder="Select project" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No project</SelectItem>
                      {projects.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="site">Site / Location</Label>
                  <Input
                    id="site"
                    value={form.site}
                    onChange={(e) => setForm({ ...form, site: e.target.value })}
                    placeholder="e.g. Building A, Floor 3"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Input
                    id="category"
                    list="category-options"
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    placeholder="Select or type category"
                  />
                  <datalist id="category-options">
                    {CATEGORY_OPTIONS.map((cat) => (
                      <option key={cat} value={cat} />
                    ))}
                  </datalist>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="priority">Priority</Label>
                  <Select
                    value={form.priority}
                    onValueChange={(v) => setForm({ ...form, priority: v as TicketPriority })}
                  >
                    <SelectTrigger id="priority">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PRIORITY_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {formError && (
                <p className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded px-3 py-2">
                  {formError}
                </p>
              )}

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate({ to: '/facility-management/helpdesk' })}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-700"
                  disabled={createTicket.isPending}
                >
                  {createTicket.isPending ? 'Creating...' : 'Create Ticket'}
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
