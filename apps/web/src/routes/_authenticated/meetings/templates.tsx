import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { Plus, Edit, Trash2, FileText } from 'lucide-react'
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
import {
  useMeetingTemplates,
  useCreateMeetingTemplate,
  useUpdateMeetingTemplate,
  useDeleteMeetingTemplate,
} from '@/hooks/useMeetings'
import type { MeetingTemplate } from '@thanamol/shared'

export const Route = createFileRoute('/_authenticated/meetings/templates')({
  component: MeetingTemplatesPage,
})

type TemplateFormData = {
  name: string
  description: string
}

const EMPTY_FORM: TemplateFormData = { name: '', description: '' }

function MeetingTemplatesPage() {
  const { data, isLoading } = useMeetingTemplates()
  const createTemplate = useCreateMeetingTemplate()
  const updateTemplate = useUpdateMeetingTemplate()
  const deleteTemplate = useDeleteMeetingTemplate()

  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<MeetingTemplate | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<MeetingTemplate | null>(null)
  const [formData, setFormData] = useState<TemplateFormData>(EMPTY_FORM)
  const [formErrors, setFormErrors] = useState<Partial<TemplateFormData>>({})

  const templates = data?.data ?? []

  function openCreate() {
    setEditTarget(null)
    setFormData(EMPTY_FORM)
    setFormErrors({})
    setFormOpen(true)
  }

  function openEdit(template: MeetingTemplate) {
    setEditTarget(template)
    setFormData({ name: template.name, description: template.description ?? '' })
    setFormErrors({})
    setFormOpen(true)
  }

  function validateForm(): boolean {
    const errors: Partial<TemplateFormData> = {}
    if (!formData.name.trim()) errors.name = 'Name is required'
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  async function handleSave() {
    if (!validateForm()) return

    try {
      if (editTarget) {
        await updateTemplate.mutateAsync({
          id: editTarget.id,
          data: {
            name: formData.name,
            description: formData.description || undefined,
          },
        })
        toast.success('Template updated')
      } else {
        await createTemplate.mutateAsync({
          name: formData.name,
          description: formData.description || undefined,
        })
        toast.success('Template created')
      }
      setFormOpen(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save template')
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      await deleteTemplate.mutateAsync(deleteTarget.id)
      toast.success('Template deleted')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete template')
    } finally {
      setDeleteTarget(null)
    }
  }

  const isSaving = createTemplate.isPending || updateTemplate.isPending

  return (
    <div className="space-y-3">
      <PageHeader
        title="Meeting Templates"
        actions={
          <div className="flex gap-2">
            <Link to="/meetings">
              <Button variant="outline" size="sm">
                Minute List
              </Button>
            </Link>
            <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={openCreate}>
              <Plus className="w-4 h-4 mr-2" />
              New Template
            </Button>
          </div>
        }
      />

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : templates.length === 0 ? (
        <Card>
          <CardContent className="pt-12 pb-12 text-center">
            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-extralight">No templates yet</p>
            <Button className="mt-4 bg-indigo-600 hover:bg-indigo-700" onClick={openCreate}>
              <Plus className="w-4 h-4 mr-2" />
              Create First Template
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {templates.map((template) => (
            <Card key={template.id} className="border border-slate-100">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-light text-slate-800">{template.name}</p>
                    {template.description && (
                      <p className="text-[11px] text-slate-500 font-extralight mt-1">
                        {template.description}
                      </p>
                    )}
                    <p className="text-[10px] text-slate-400 font-extralight mt-2 tracking-widest uppercase">
                      {Array.isArray(template.sections) ? template.sections.length : 0} sections
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0"
                      onClick={() => openEdit(template)}
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                      onClick={() => setDeleteTarget(template)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editTarget ? 'Edit Template' : 'New Template'}</DialogTitle>
            <DialogDescription>
              {editTarget ? 'Update the template details.' : 'Create a new meeting template.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Template name"
                className={formErrors.name ? 'border-rose-400' : ''}
              />
              {formErrors.name && <p className="text-xs text-rose-500">{formErrors.name}</p>}
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, description: e.target.value }))
                }
                placeholder="Template description (optional)"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-indigo-600 hover:bg-indigo-700"
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? 'Saving...' : editTarget ? 'Save Changes' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Template</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{' '}
              <strong>{deleteTarget?.name}</strong>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteTemplate.isPending}
            >
              {deleteTemplate.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
