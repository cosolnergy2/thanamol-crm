import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { ArrowLeft, Save, FileText, Plus, Trash2 } from 'lucide-react'
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
import { useCreateMeeting } from '@/hooks/useMeetings'
import type { MeetingMinuteStatus } from '@thanamol/shared'

export const Route = createFileRoute('/_authenticated/meetings/create')({
  component: MeetingCreatePage,
})

type Attendee = { name: string; role: string }
type AgendaItem = { title: string; description: string }
type ActionItem = { description: string; assignee: string; dueDate: string; status: string }

function MeetingCreatePage() {
  const navigate = useNavigate()

  const [title, setTitle] = useState('')
  const [meetingDate, setMeetingDate] = useState('')
  const [location, setLocation] = useState('')
  const [status, setStatus] = useState<MeetingMinuteStatus>('DRAFT')
  const [attendees, setAttendees] = useState<Attendee[]>([{ name: '', role: '' }])
  const [agenda, setAgenda] = useState<AgendaItem[]>([{ title: '', description: '' }])
  const [actionItems, setActionItems] = useState<ActionItem[]>([
    { description: '', assignee: '', dueDate: '', status: 'To Do' },
  ])
  const [errors, setErrors] = useState<Record<string, string>>({})

  const createMeeting = useCreateMeeting()

  function validate(): boolean {
    const next: Record<string, string> = {}
    if (!title.trim()) next.title = 'Title is required'
    if (!meetingDate) next.meetingDate = 'Meeting date is required'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  function updateAttendee(index: number, field: keyof Attendee, value: string) {
    setAttendees((prev) => prev.map((a, i) => (i === index ? { ...a, [field]: value } : a)))
  }

  function addAttendee() {
    setAttendees((prev) => [...prev, { name: '', role: '' }])
  }

  function removeAttendee(index: number) {
    setAttendees((prev) => prev.filter((_, i) => i !== index))
  }

  function updateAgendaItem(index: number, field: keyof AgendaItem, value: string) {
    setAgenda((prev) => prev.map((a, i) => (i === index ? { ...a, [field]: value } : a)))
  }

  function addAgendaItem() {
    setAgenda((prev) => [...prev, { title: '', description: '' }])
  }

  function removeAgendaItem(index: number) {
    setAgenda((prev) => prev.filter((_, i) => i !== index))
  }

  function updateActionItem(index: number, field: keyof ActionItem, value: string) {
    setActionItems((prev) => prev.map((a, i) => (i === index ? { ...a, [field]: value } : a)))
  }

  function addActionItem() {
    setActionItems((prev) => [
      ...prev,
      { description: '', assignee: '', dueDate: '', status: 'To Do' },
    ])
  }

  function removeActionItem(index: number) {
    setActionItems((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return

    const filteredAttendees = attendees.filter((a) => a.name.trim())
    const filteredAgenda = agenda.filter((a) => a.title.trim())
    const filteredActions = actionItems.filter((a) => a.description.trim())

    try {
      await createMeeting.mutateAsync({
        title,
        meetingDate,
        location: location || undefined,
        attendees: filteredAttendees,
        agenda: filteredAgenda,
        actionItems: filteredActions,
        status,
      })
      toast.success('Meeting created successfully')
      navigate({ to: '/meetings' })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create meeting')
    }
  }

  return (
    <div className="space-y-3 max-w-5xl">
      <PageHeader
        title="New Meeting Minute"
        actions={
          <Link to="/meetings">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
        }
      />

      <form onSubmit={handleSubmit} className="space-y-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center text-sm font-light tracking-wider text-slate-700">
              <FileText className="w-4 h-4 mr-2 text-indigo-600" />
              Meeting Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Meeting title"
                className={errors.title ? 'border-rose-400' : ''}
              />
              {errors.title && <p className="text-xs text-rose-500">{errors.title}</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Meeting Date *</Label>
                <Input
                  type="date"
                  value={meetingDate}
                  onChange={(e) => setMeetingDate(e.target.value)}
                  className={errors.meetingDate ? 'border-rose-400' : ''}
                />
                {errors.meetingDate && (
                  <p className="text-xs text-rose-500">{errors.meetingDate}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Location</Label>
                <Input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Meeting location"
                />
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as MeetingMinuteStatus)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DRAFT">Draft</SelectItem>
                    <SelectItem value="FINALIZED">Finalized</SelectItem>
                    <SelectItem value="DISTRIBUTED">Distributed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-light tracking-wider text-slate-700">
                Attendees
              </CardTitle>
              <Button type="button" size="sm" variant="outline" onClick={addAttendee}>
                <Plus className="w-3.5 h-3.5 mr-1" />
                Add
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {attendees.map((attendee, idx) => (
              <div key={idx} className="flex gap-2 items-start">
                <div className="flex-1 grid grid-cols-2 gap-2">
                  <Input
                    placeholder="Name"
                    value={attendee.name}
                    onChange={(e) => updateAttendee(idx, 'name', e.target.value)}
                  />
                  <Input
                    placeholder="Role / Title"
                    value={attendee.role}
                    onChange={(e) => updateAttendee(idx, 'role', e.target.value)}
                  />
                </div>
                {attendees.length > 1 && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-9 w-9 p-0 text-rose-500"
                    onClick={() => removeAttendee(idx)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-light tracking-wider text-slate-700">
                Agenda
              </CardTitle>
              <Button type="button" size="sm" variant="outline" onClick={addAgendaItem}>
                <Plus className="w-3.5 h-3.5 mr-1" />
                Add
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {agenda.map((item, idx) => (
              <div key={idx} className="p-3 bg-slate-50 rounded-lg space-y-2">
                <div className="flex gap-2 items-start">
                  <div className="flex-1 space-y-2">
                    <Input
                      placeholder="Agenda topic"
                      value={item.title}
                      onChange={(e) => updateAgendaItem(idx, 'title', e.target.value)}
                    />
                    <Textarea
                      placeholder="Description (optional)"
                      value={item.description}
                      onChange={(e) => updateAgendaItem(idx, 'description', e.target.value)}
                      rows={2}
                    />
                  </div>
                  {agenda.length > 1 && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-9 w-9 p-0 text-rose-500"
                      onClick={() => removeAgendaItem(idx)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-light tracking-wider text-slate-700">
                Action Items
              </CardTitle>
              <Button type="button" size="sm" variant="outline" onClick={addActionItem}>
                <Plus className="w-3.5 h-3.5 mr-1" />
                Add
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {actionItems.map((item, idx) => (
              <div key={idx} className="p-3 bg-slate-50 rounded-lg space-y-2">
                <div className="flex gap-2 items-start">
                  <div className="flex-1 space-y-2">
                    <Textarea
                      placeholder="Action description"
                      value={item.description}
                      onChange={(e) => updateActionItem(idx, 'description', e.target.value)}
                      rows={2}
                    />
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      <Input
                        placeholder="Assignee"
                        value={item.assignee}
                        onChange={(e) => updateActionItem(idx, 'assignee', e.target.value)}
                      />
                      <Input
                        type="date"
                        value={item.dueDate}
                        onChange={(e) => updateActionItem(idx, 'dueDate', e.target.value)}
                      />
                      <Select
                        value={item.status}
                        onValueChange={(v) => updateActionItem(idx, 'status', v)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="To Do">To Do</SelectItem>
                          <SelectItem value="In Progress">In Progress</SelectItem>
                          <SelectItem value="Done">Done</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  {actionItems.length > 1 && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-9 w-9 p-0 text-rose-500"
                      onClick={() => removeActionItem(idx)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-3 pb-8">
          <Link to="/meetings">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button
            type="submit"
            className="bg-indigo-600 hover:bg-indigo-700"
            disabled={createMeeting.isPending}
          >
            <Save className="w-4 h-4 mr-2" />
            {createMeeting.isPending ? 'Saving...' : 'Save Meeting'}
          </Button>
        </div>
      </form>
    </div>
  )
}
