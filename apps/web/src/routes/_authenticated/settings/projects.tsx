import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { Plus, Pencil, Trash2, FileText } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api-client'
import type { ProjectTemplate, CreateProjectTemplateRequest } from '@thanamol/shared'

export const Route = createFileRoute('/_authenticated/settings/projects')({
  component: SettingsProjectsPage,
})

type TemplateForm = {
  name: string
  description: string
  settings: string
}

const EMPTY_FORM: TemplateForm = { name: '', description: '', settings: '{}' }

function SettingsProjectsPage() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<ProjectTemplate | null>(null)
  const [form, setForm] = useState<TemplateForm>(EMPTY_FORM)
  const [formError, setFormError] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ProjectTemplate | null>(null)

  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['project-templates'],
    queryFn: () => apiGet<{ data: ProjectTemplate[] }>('/project-templates'),
  })

  const templates = data?.data ?? []

  const createTemplate = useMutation({
    mutationFn: (payload: CreateProjectTemplateRequest) =>
      apiPost<{ template: ProjectTemplate }>('/project-templates', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-templates'] })
      toast.success('Template created')
      closeDialog()
    },
    onError: (err) => setFormError(err instanceof Error ? err.message : 'Failed to create template'),
  })

  const updateTemplate = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: CreateProjectTemplateRequest }) =>
      apiPut<{ template: ProjectTemplate }>(`/project-templates/${id}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-templates'] })
      toast.success('Template updated')
      closeDialog()
    },
    onError: (err) => setFormError(err instanceof Error ? err.message : 'Failed to update template'),
  })

  const deleteTemplate = useMutation({
    mutationFn: (id: string) => apiDelete<{ success: boolean }>(`/project-templates/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-templates'] })
      toast.success('Template deleted')
      setDeleteTarget(null)
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : 'Failed to delete template'),
  })

  function openCreateDialog() {
    setEditingTemplate(null)
    setForm(EMPTY_FORM)
    setFormError(null)
    setDialogOpen(true)
  }

  function openEditDialog(template: ProjectTemplate) {
    setEditingTemplate(template)
    setForm({
      name: template.name,
      description: template.description ?? '',
      settings: JSON.stringify(template.settings, null, 2),
    })
    setFormError(null)
    setDialogOpen(true)
  }

  function closeDialog() {
    setDialogOpen(false)
    setEditingTemplate(null)
    setForm(EMPTY_FORM)
    setFormError(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)
    if (!form.name.trim()) {
      setFormError('Template name is required')
      return
    }

    let parsedSettings: Record<string, unknown> = {}
    try {
      parsedSettings = JSON.parse(form.settings || '{}')
    } catch {
      setFormError('Settings must be valid JSON')
      return
    }

    const payload: CreateProjectTemplateRequest = {
      name: form.name.trim(),
      description: form.description || undefined,
      settings: parsedSettings,
    }

    if (editingTemplate) {
      updateTemplate.mutate({ id: editingTemplate.id, payload })
    } else {
      createTemplate.mutate(payload)
    }
  }

  const isMutating = createTemplate.isPending || updateTemplate.isPending

  return (
    <div className="space-y-3">
      <PageHeader
        title="Project Templates"
        actions={
          <Button
            className="bg-indigo-600 hover:bg-indigo-700"
            size="sm"
            onClick={openCreateDialog}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Template
          </Button>
        }
      />

      <Card>
        <CardContent className="pt-4">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : templates.length === 0 ? (
            <div className="text-center py-10">
              <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm text-slate-500">No project templates yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {templates.map((template) => (
                <div
                  key={template.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:bg-slate-50/50"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-teal-600 rounded-md flex items-center justify-center">
                      <FileText className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <p className="text-[11px] font-light text-slate-800">{template.name}</p>
                      {template.description && (
                        <p className="text-[9px] text-slate-400">{template.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => openEditDialog(template)}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                      onClick={() => setDeleteTarget(template)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? 'Edit Template' : 'Create Template'}</DialogTitle>
            <DialogDescription>
              Project templates define default settings for new projects.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-3 py-2">
              <div className="space-y-1">
                <Label className="text-xs">Template Name *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Residential Project"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Description</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Describe this template..."
                  rows={2}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Settings (JSON)</Label>
                <Textarea
                  value={form.settings}
                  onChange={(e) => setForm({ ...form, settings: e.target.value })}
                  placeholder="{}"
                  rows={4}
                  className="font-mono text-xs"
                />
              </div>
              {formError && (
                <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded px-3 py-2">
                  {formError}
                </p>
              )}
            </div>
            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={closeDialog}>
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-700"
                disabled={isMutating}
              >
                {isMutating ? 'Saving...' : 'Save Template'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Template</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{deleteTarget?.name}</strong>? This cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleteTemplate.isPending}
              onClick={() => deleteTarget && deleteTemplate.mutate(deleteTarget.id)}
            >
              {deleteTemplate.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
