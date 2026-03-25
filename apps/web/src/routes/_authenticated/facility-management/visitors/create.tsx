import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
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
import { PageHeader } from '@/components/PageHeader'
import { useCreateVisitor } from '@/hooks/useVisitors'
import { useProjects } from '@/hooks/useProjects'

export const Route = createFileRoute('/_authenticated/facility-management/visitors/create')({
  component: VisitorCreatePage,
})

function VisitorCreatePage() {
  const navigate = useNavigate()
  const { data: projectsData } = useProjects({ limit: 100 })
  const projects = projectsData?.data ?? []

  const createVisitor = useCreateVisitor()

  const [form, setForm] = useState({
    projectId: '',
    visitorName: '',
    company: '',
    purpose: '',
    hostName: '',
    expectedDate: '',
    idNumber: '',
    vehiclePlate: '',
    badgeNumber: '',
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.projectId || !form.visitorName) {
      toast.error('Project and visitor name are required')
      return
    }
    try {
      await createVisitor.mutateAsync({
        projectId: form.projectId,
        visitorName: form.visitorName,
        company: form.company || undefined,
        purpose: form.purpose || undefined,
        hostName: form.hostName || undefined,
        expectedDate: form.expectedDate || undefined,
        idNumber: form.idNumber || undefined,
        vehiclePlate: form.vehiclePlate || undefined,
        badgeNumber: form.badgeNumber || undefined,
      })
      toast.success('Visitor registered')
      navigate({ to: '/facility-management/visitors' })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to register visitor')
    }
  }

  return (
    <div className="space-y-3 max-w-2xl">
      <PageHeader title="Register Visitor" />

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-light">Visitor Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Project *</Label>
              <Select
                value={form.projectId}
                onValueChange={(v) => setForm({ ...form, projectId: v })}
              >
                <SelectTrigger className="mt-1">
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Visitor Name *</Label>
                <Input
                  value={form.visitorName}
                  onChange={(e) => setForm({ ...form, visitorName: e.target.value })}
                  placeholder="Full name"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Company</Label>
                <Input
                  value={form.company}
                  onChange={(e) => setForm({ ...form, company: e.target.value })}
                  placeholder="Company name"
                  className="mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Purpose of Visit</Label>
                <Input
                  value={form.purpose}
                  onChange={(e) => setForm({ ...form, purpose: e.target.value })}
                  placeholder="e.g. Meeting, Delivery"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Host Name</Label>
                <Input
                  value={form.hostName}
                  onChange={(e) => setForm({ ...form, hostName: e.target.value })}
                  placeholder="Person to visit"
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label>Expected Date/Time</Label>
              <Input
                type="datetime-local"
                value={form.expectedDate}
                onChange={(e) => setForm({ ...form, expectedDate: e.target.value })}
                className="mt-1"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>ID Number</Label>
                <Input
                  value={form.idNumber}
                  onChange={(e) => setForm({ ...form, idNumber: e.target.value })}
                  placeholder="National ID / Passport"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Vehicle Plate</Label>
                <Input
                  value={form.vehiclePlate}
                  onChange={(e) => setForm({ ...form, vehiclePlate: e.target.value })}
                  placeholder="License plate"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Badge Number</Label>
                <Input
                  value={form.badgeNumber}
                  onChange={(e) => setForm({ ...form, badgeNumber: e.target.value })}
                  placeholder="Visitor badge"
                  className="mt-1"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2 mt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate({ to: '/facility-management/visitors' })}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="bg-indigo-600 hover:bg-indigo-700"
            disabled={createVisitor.isPending}
          >
            {createVisitor.isPending ? 'Registering...' : 'Register Visitor'}
          </Button>
        </div>
      </form>
    </div>
  )
}
