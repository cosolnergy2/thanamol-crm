import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { Plus, Pencil, Trash2, Zap } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { PageHeader } from '@/components/PageHeader'
import {
  useAutomationRules,
  useCreateAutomationRule,
  useUpdateAutomationRule,
  useDeleteAutomationRule,
} from '@/hooks/useTaskConfig'
import type { AutomationRule, CreateAutomationRuleRequest } from '@thanamol/shared'

export const Route = createFileRoute('/_authenticated/tasks/automation')({
  component: TaskAutomationPage,
})

type RuleFormValues = {
  name: string
  triggerEvent: string
  conditions: string
  actions: string
  isActive: boolean
}

const EMPTY_FORM: RuleFormValues = {
  name: '',
  triggerEvent: '',
  conditions: '{}',
  actions: '[]',
  isActive: true,
}

const TRIGGER_EVENT_OPTIONS = [
  { value: 'task.created', label: 'Task Created' },
  { value: 'task.status_changed', label: 'Task Status Changed' },
  { value: 'task.assigned', label: 'Task Assigned' },
  { value: 'task.due_soon', label: 'Task Due Soon' },
  { value: 'task.overdue', label: 'Task Overdue' },
  { value: 'task.completed', label: 'Task Completed' },
]

function TaskAutomationPage() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingRule, setEditingRule] = useState<AutomationRule | null>(null)
  const [form, setForm] = useState<RuleFormValues>(EMPTY_FORM)
  const [formError, setFormError] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null)

  const { data, isLoading, isError } = useAutomationRules()
  const createRule = useCreateAutomationRule()
  const updateRule = useUpdateAutomationRule()
  const deleteRule = useDeleteAutomationRule()

  const rules = data?.data ?? []

  function openCreateDialog() {
    setEditingRule(null)
    setForm(EMPTY_FORM)
    setFormError(null)
    setDialogOpen(true)
  }

  function openEditDialog(rule: AutomationRule) {
    setEditingRule(rule)
    setForm({
      name: rule.name,
      triggerEvent: rule.trigger_event,
      conditions: JSON.stringify(rule.conditions, null, 2),
      actions: JSON.stringify(rule.actions, null, 2),
      isActive: rule.is_active,
    })
    setFormError(null)
    setDialogOpen(true)
  }

  function parseJsonField(value: string, fieldName: string): unknown {
    try {
      return JSON.parse(value)
    } catch {
      throw new Error(`Invalid JSON in ${fieldName}`)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)

    if (!form.name.trim()) {
      setFormError('Rule name is required')
      return
    }
    if (!form.triggerEvent.trim()) {
      setFormError('Trigger event is required')
      return
    }

    let conditions: Record<string, unknown>
    let actions: unknown[]

    try {
      conditions = parseJsonField(form.conditions, 'Conditions') as Record<string, unknown>
      actions = parseJsonField(form.actions, 'Actions') as unknown[]
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Invalid JSON')
      return
    }

    const payload: CreateAutomationRuleRequest = {
      name: form.name.trim(),
      triggerEvent: form.triggerEvent.trim(),
      conditions,
      actions,
      isActive: form.isActive,
    }

    try {
      if (editingRule) {
        await updateRule.mutateAsync({ id: editingRule.id, data: payload })
        toast.success('Rule updated successfully')
      } else {
        await createRule.mutateAsync(payload)
        toast.success('Rule created successfully')
      }
      setDialogOpen(false)
      setEditingRule(null)
      setForm(EMPTY_FORM)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save rule')
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    try {
      await deleteRule.mutateAsync(deleteTarget.id)
      toast.success('Rule deleted successfully')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete rule')
    } finally {
      setDeleteTarget(null)
    }
  }

  const isMutating = createRule.isPending || updateRule.isPending

  return (
    <div className="space-y-3">
      <PageHeader
        title="Task Automation Rules"
        actions={
          <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={openCreateDialog}>
            <Plus className="w-4 h-4 mr-2" />
            Add Rule
          </Button>
        }
      />

      <Card>
        <CardContent className="pt-4 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-100">
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                  Rule
                </TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                  Trigger
                </TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                  Status
                </TableHead>
                <TableHead className="text-center text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={4}>
                      <Skeleton className="h-8 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : isError ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8">
                    <p className="text-slate-600">Failed to load rules. Please refresh.</p>
                  </TableCell>
                </TableRow>
              ) : rules.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8">
                    <div className="flex flex-col items-center">
                      <Zap className="w-12 h-12 text-slate-300 mb-3" />
                      <p className="text-slate-600">No automation rules yet</p>
                      <p className="text-sm text-slate-400 mt-1">
                        Click "Add Rule" to create an automation
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                rules.map((rule) => (
                  <TableRow key={rule.id} className="hover:bg-slate-50/50 border-slate-100">
                    <TableCell className="py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-shrink-0 w-7 h-7 bg-gradient-to-br from-indigo-500 to-teal-600 rounded-md flex items-center justify-center">
                          <Zap className="w-3.5 h-3.5 text-white" />
                        </div>
                        <span className="text-[11px] font-light text-slate-800">{rule.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="py-3">
                      <code className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-mono">
                        {rule.trigger_event}
                      </code>
                    </TableCell>
                    <TableCell className="py-3">
                      <Badge
                        variant="outline"
                        className={
                          rule.is_active
                            ? 'bg-teal-50 text-teal-700 border-teal-200 text-[9px] h-4 px-1.5 font-extralight'
                            : 'bg-slate-100 text-slate-500 border-slate-200 text-[9px] h-4 px-1.5 font-extralight'
                        }
                      >
                        {rule.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center py-3">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0"
                          onClick={() => openEditDialog(rule)}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                          onClick={() => setDeleteTarget({ id: rule.id, name: rule.name })}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingRule ? 'Edit Rule' : 'Add Automation Rule'}</DialogTitle>
            <DialogDescription>
              {editingRule
                ? 'Update automation rule configuration'
                : 'Define a trigger event, conditions, and actions'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="ruleName">
                  Name <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="ruleName"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Auto-assign high priority tickets"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="triggerEvent">
                  Trigger Event <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="triggerEvent"
                  list="trigger-options"
                  value={form.triggerEvent}
                  onChange={(e) => setForm({ ...form, triggerEvent: e.target.value })}
                  placeholder="task.created"
                />
                <datalist id="trigger-options">
                  {TRIGGER_EVENT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </datalist>
              </div>

              <div className="space-y-2">
                <Label htmlFor="conditions">Conditions (JSON)</Label>
                <Textarea
                  id="conditions"
                  value={form.conditions}
                  onChange={(e) => setForm({ ...form, conditions: e.target.value })}
                  rows={4}
                  className="font-mono text-xs"
                  placeholder='{"priority": "HIGH"}'
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="actions">Actions (JSON Array)</Label>
                <Textarea
                  id="actions"
                  value={form.actions}
                  onChange={(e) => setForm({ ...form, actions: e.target.value })}
                  rows={4}
                  className="font-mono text-xs"
                  placeholder='[{"type": "notify", "target": "assignee"}]'
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="ruleActive">Active</Label>
                <Switch
                  id="ruleActive"
                  checked={form.isActive}
                  onCheckedChange={(checked) => setForm({ ...form, isActive: checked })}
                />
              </div>

              {formError && (
                <p className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded px-3 py-2">
                  {formError}
                </p>
              )}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setDialogOpen(false)
                  setEditingRule(null)
                  setFormError(null)
                }}
              >
                Cancel
              </Button>
              <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700" disabled={isMutating}>
                {isMutating ? 'Saving...' : 'Save'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Rule</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{deleteTarget?.name}</strong>? This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleteRule.isPending}
            >
              {deleteRule.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
