import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import {
  Plus,
  Settings2,
  Trash2,
  Edit,
  CheckCircle2,
  XCircle,
  ChevronRight,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  useApprovalWorkflows,
  useCreateApprovalWorkflow,
  useUpdateApprovalWorkflow,
  useDeleteApprovalWorkflow,
} from '@/hooks/useApprovals'
import type { ApprovalWorkflow, ApprovalWorkflowStep } from '@thanamol/shared'

export const Route = createFileRoute(
  '/_authenticated/facility-management/approvals/workflows'
)({
  component: ApprovalWorkflowsPage,
})

const ENTITY_TYPE_OPTIONS = [
  { value: 'PR', label: 'Purchase Request' },
  { value: 'PO', label: 'Purchase Order' },
  { value: 'BUDGET', label: 'Budget' },
]

type WorkflowFormState = {
  name: string
  entityType: string
  steps: Array<{ step: number; role: string; threshold: string }>
}

const DEFAULT_FORM_STATE: WorkflowFormState = {
  name: '',
  entityType: 'PR',
  steps: [{ step: 1, role: '', threshold: '' }],
}

type DialogMode =
  | { type: 'create' }
  | { type: 'edit'; workflow: ApprovalWorkflow }
  | null

function ApprovalWorkflowsPage() {
  const [dialogMode, setDialogMode] = useState<DialogMode>(null)
  const [form, setForm] = useState<WorkflowFormState>(DEFAULT_FORM_STATE)
  const [entityTypeFilter, setEntityTypeFilter] = useState<string>('all')

  const { data, isLoading } = useApprovalWorkflows({
    entityType: entityTypeFilter === 'all' ? undefined : entityTypeFilter,
    limit: 50,
  })

  const createWorkflow = useCreateApprovalWorkflow()
  const updateWorkflow = useUpdateApprovalWorkflow()
  const deleteWorkflow = useDeleteApprovalWorkflow()

  const workflows = data?.data ?? []

  function openCreate() {
    setForm(DEFAULT_FORM_STATE)
    setDialogMode({ type: 'create' })
  }

  function openEdit(workflow: ApprovalWorkflow) {
    setForm({
      name: workflow.name,
      entityType: workflow.entity_type,
      steps: workflow.steps.map((s) => ({
        step: s.step,
        role: s.role,
        threshold: s.threshold !== undefined ? String(s.threshold) : '',
      })),
    })
    setDialogMode({ type: 'edit', workflow })
  }

  function closeDialog() {
    setDialogMode(null)
  }

  function addStep() {
    setForm((prev) => ({
      ...prev,
      steps: [...prev.steps, { step: prev.steps.length + 1, role: '', threshold: '' }],
    }))
  }

  function removeStep(index: number) {
    setForm((prev) => ({
      ...prev,
      steps: prev.steps
        .filter((_, i) => i !== index)
        .map((s, i) => ({ ...s, step: i + 1 })),
    }))
  }

  function updateStep(index: number, field: 'role' | 'threshold', value: string) {
    setForm((prev) => ({
      ...prev,
      steps: prev.steps.map((s, i) =>
        i === index ? { ...s, [field]: value } : s
      ),
    }))
  }

  function buildStepsPayload(): ApprovalWorkflowStep[] {
    return form.steps.map((s) => ({
      step: s.step,
      role: s.role,
      ...(s.threshold ? { threshold: Number(s.threshold) } : {}),
    }))
  }

  function handleSave() {
    const steps = buildStepsPayload()
    if (!form.name.trim() || steps.some((s) => !s.role.trim())) return

    if (dialogMode?.type === 'create') {
      createWorkflow.mutate(
        { name: form.name, entityType: form.entityType, steps },
        { onSuccess: closeDialog }
      )
    } else if (dialogMode?.type === 'edit') {
      updateWorkflow.mutate(
        { id: dialogMode.workflow.id, name: form.name, steps },
        { onSuccess: closeDialog }
      )
    }
  }

  function handleDelete(id: string, name: string) {
    if (!confirm(`Delete workflow "${name}"?`)) return
    deleteWorkflow.mutate(id)
  }

  const isSaving = createWorkflow.isPending || updateWorkflow.isPending

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-extralight tracking-[0.3em] text-slate-600 uppercase">
            Approval Workflows
          </h1>
          <div className="h-px w-20 bg-gradient-to-r from-slate-300 to-transparent mt-2" />
          <p className="mt-2 text-xs text-slate-400 font-extralight">
            Configure multi-step approval workflows for PR, PO, and Budget
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Select value={entityTypeFilter} onValueChange={setEntityTypeFilter}>
            <SelectTrigger className="w-44 h-8 text-xs">
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All types</SelectItem>
              {ENTITY_TYPE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} className="text-xs">
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button size="sm" className="h-8 text-xs" onClick={openCreate}>
            <Plus className="w-3.5 h-3.5 mr-1" />
            New Workflow
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-36 w-full" />
          ))
        ) : workflows.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-400">
            <Settings2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-light">No workflows configured</p>
            <p className="text-xs mt-1 opacity-60">Create one to start routing approvals</p>
          </div>
        ) : (
          workflows.map((workflow) => (
            <WorkflowCard
              key={workflow.id}
              workflow={workflow}
              onEdit={() => openEdit(workflow)}
              onDelete={() => handleDelete(workflow.id, workflow.name)}
            />
          ))
        )}
      </div>

      <Dialog open={dialogMode !== null} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-sm font-light">
              {dialogMode?.type === 'create' ? 'New Workflow' : 'Edit Workflow'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-slate-500 block mb-1">Name</label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. Standard PR Approval"
                  className="text-xs h-8"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 block mb-1">Entity Type</label>
                <Select
                  value={form.entityType}
                  onValueChange={(v) => setForm((prev) => ({ ...prev, entityType: v }))}
                  disabled={dialogMode?.type === 'edit'}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ENTITY_TYPE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value} className="text-xs">
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs text-slate-500">Approval Steps</label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-6 text-[10px] px-2"
                  onClick={addStep}
                >
                  <Plus className="w-3 h-3 mr-0.5" />
                  Add Step
                </Button>
              </div>

              <div className="space-y-2">
                {form.steps.map((step, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center">
                      <span className="text-[10px] font-medium text-indigo-700">{step.step}</span>
                    </div>
                    <Input
                      value={step.role}
                      onChange={(e) => updateStep(i, 'role', e.target.value)}
                      placeholder="Role (e.g. manager)"
                      className="text-xs h-7 flex-1"
                    />
                    <Input
                      value={step.threshold}
                      onChange={(e) => updateStep(i, 'threshold', e.target.value)}
                      placeholder="Threshold (฿)"
                      type="number"
                      className="text-xs h-7 w-28"
                    />
                    {form.steps.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-rose-400 hover:text-rose-600"
                        onClick={() => removeStep(i)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={closeDialog} className="text-xs">
              Cancel
            </Button>
            <Button
              size="sm"
              className="text-xs"
              onClick={handleSave}
              disabled={isSaving || !form.name.trim() || form.steps.some((s) => !s.role.trim())}
            >
              {isSaving ? 'Saving...' : dialogMode?.type === 'create' ? 'Create' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

type WorkflowCardProps = {
  workflow: ApprovalWorkflow
  onEdit: () => void
  onDelete: () => void
}

function WorkflowCard({ workflow, onEdit, onDelete }: WorkflowCardProps) {
  const entityLabel =
    ENTITY_TYPE_OPTIONS.find((o) => o.value === workflow.entity_type)?.label ??
    workflow.entity_type

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-sm font-light text-slate-700 truncate">
              {workflow.name}
            </CardTitle>
            <Badge
              variant="outline"
              className="mt-1 text-[9px] h-4 px-1.5 font-extralight bg-indigo-50 text-indigo-700 border-indigo-200"
            >
              {entityLabel}
            </Badge>
          </div>
          <div className="flex items-center gap-1 ml-2 flex-shrink-0">
            {workflow.is_active ? (
              <CheckCircle2 className="w-4 h-4 text-teal-500" aria-label="Active" />
            ) : (
              <XCircle className="w-4 h-4 text-slate-400" aria-label="Inactive" />
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pb-3">
        <div className="flex items-center gap-1 mb-3">
          {workflow.steps.map((step, i) => (
            <div key={i} className="flex items-center gap-1">
              <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100">
                <span className="text-[9px] text-slate-500 font-medium">{step.step}</span>
                <span className="text-[9px] text-slate-600 truncate max-w-[60px]">{step.role}</span>
              </div>
              {i < workflow.steps.length - 1 && (
                <ChevronRight className="w-3 h-3 text-slate-300 flex-shrink-0" />
              )}
            </div>
          ))}
        </div>

        <div className="flex items-center gap-1.5 pt-2 border-t border-slate-100">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-[10px] px-2 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
            onClick={onEdit}
          >
            <Edit className="w-3 h-3 mr-0.5" />
            Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-[10px] px-2 text-rose-500 hover:text-rose-600 hover:bg-rose-50"
            onClick={onDelete}
          >
            <Trash2 className="w-3 h-3 mr-0.5" />
            Delete
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
