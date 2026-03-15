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
import { useCreateTicket } from '@/hooks/useTickets'
import type { CreateTicketRequest, TicketStatus, TicketPriority } from '@thanamol/shared'

export const Route = createFileRoute('/_authenticated/tickets/create')({
  component: TicketCreatePage,
})

type TicketFormValues = {
  title: string
  description: string
  category: string
  priority: TicketPriority
  status: TicketStatus
  customerId: string
  unitId: string
  assignedTo: string
}

const EMPTY_FORM: TicketFormValues = {
  title: '',
  description: '',
  category: '',
  priority: 'MEDIUM',
  status: 'OPEN',
  customerId: '',
  unitId: '',
  assignedTo: '',
}

const PRIORITY_OPTIONS: { value: TicketPriority; label: string }[] = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'URGENT', label: 'Urgent' },
]

const STATUS_OPTIONS: { value: TicketStatus; label: string }[] = [
  { value: 'OPEN', label: 'Open' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'RESOLVED', label: 'Resolved' },
  { value: 'CLOSED', label: 'Closed' },
]

const CATEGORY_OPTIONS = [
  'Maintenance',
  'Billing',
  'Technical',
  'General',
  'Complaint',
  'Request',
]

function TicketCreatePage() {
  const navigate = useNavigate()
  const [form, setForm] = useState<TicketFormValues>(EMPTY_FORM)
  const [formError, setFormError] = useState<string | null>(null)

  const createTicket = useCreateTicket()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)

    if (!form.title.trim()) {
      setFormError('Ticket title is required')
      return
    }

    const payload: CreateTicketRequest = {
      title: form.title.trim(),
      description: form.description || undefined,
      customerId: form.customerId || undefined,
      unitId: form.unitId || undefined,
      category: form.category || undefined,
      priority: form.priority,
      status: form.status,
      assignedTo: form.assignedTo || undefined,
    }

    try {
      await createTicket.mutateAsync(payload)
      toast.success('Ticket created successfully')
      navigate({ to: '/tickets' })
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
          onClick={() => navigate({ to: '/tickets' })}
          className="h-8 w-8 p-0"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-lg font-light text-slate-800">New Ticket</h1>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-light text-slate-700">Ticket Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="ticketTitle">
                  Title <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="ticketTitle"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Describe the issue briefly"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ticketDescription">Description</Label>
                <Textarea
                  id="ticketDescription"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Provide additional details about the issue"
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ticketCategory">Category</Label>
                  <Input
                    id="ticketCategory"
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
                  <Label htmlFor="ticketPriority">Priority</Label>
                  <Select
                    value={form.priority}
                    onValueChange={(v) => setForm({ ...form, priority: v as TicketPriority })}
                  >
                    <SelectTrigger id="ticketPriority">
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

              <div className="space-y-2">
                <Label htmlFor="ticketStatus">Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) => setForm({ ...form, status: v as TicketStatus })}
                >
                  <SelectTrigger id="ticketStatus">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="customerId">Customer ID</Label>
                  <Input
                    id="customerId"
                    value={form.customerId}
                    onChange={(e) => setForm({ ...form, customerId: e.target.value })}
                    placeholder="Optional customer reference"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="unitId">Unit ID</Label>
                  <Input
                    id="unitId"
                    value={form.unitId}
                    onChange={(e) => setForm({ ...form, unitId: e.target.value })}
                    placeholder="Optional unit reference"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="assignedTo">Assigned To (User ID)</Label>
                <Input
                  id="assignedTo"
                  value={form.assignedTo}
                  onChange={(e) => setForm({ ...form, assignedTo: e.target.value })}
                  placeholder="Optional user ID"
                />
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
                  onClick={() => navigate({ to: '/tickets' })}
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
