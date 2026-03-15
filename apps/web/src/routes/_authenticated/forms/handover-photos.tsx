import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { Plus, Edit, Trash2, Camera, Image } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { PageHeader } from '@/components/PageHeader'
import {
  useHandoverPhotos,
  useCreateHandoverPhotos,
  useUpdateHandoverPhotos,
  useDeleteHandoverPhotos,
} from '@/hooks/useHandoverPhotos'
import type { HandoverPhotos } from '@thanamol/shared'

export const Route = createFileRoute('/_authenticated/forms/handover-photos')({
  component: FormHandoverPhotosPage,
})

const PHOTO_CATEGORIES = ['Interior', 'Exterior', 'Common Area', 'Utility', 'Other']

type PhotoFormData = {
  handoverId: string
  description: string
  category: string
}

function FormHandoverPhotosPage() {
  const [deleteTarget, setDeleteTarget] = useState<{ id: string } | null>(null)
  const [editTarget, setEditTarget] = useState<HandoverPhotos | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [formData, setFormData] = useState<PhotoFormData>({
    handoverId: '',
    description: '',
    category: '',
  })

  const { data, isLoading, isError } = useHandoverPhotos({ limit: 100 })
  const deletePhotos = useDeleteHandoverPhotos()
  const createPhotos = useCreateHandoverPhotos()
  const updatePhotos = useUpdateHandoverPhotos()

  async function confirmDelete() {
    if (!deleteTarget) return
    try {
      await deletePhotos.mutateAsync(deleteTarget.id)
      toast.success('Photo record deleted successfully')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete photo record')
    } finally {
      setDeleteTarget(null)
    }
  }

  async function handleCreate() {
    if (!formData.handoverId.trim()) {
      toast.error('Handover ID is required')
      return
    }
    try {
      await createPhotos.mutateAsync({
        handoverId: formData.handoverId,
        description: formData.description || undefined,
        category: formData.category || undefined,
        photos: [],
      })
      toast.success('Photo record created successfully')
      setShowCreateForm(false)
      setFormData({ handoverId: '', description: '', category: '' })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create photo record')
    }
  }

  async function handleUpdate() {
    if (!editTarget) return
    try {
      await updatePhotos.mutateAsync({
        id: editTarget.id,
        data: {
          description: formData.description || undefined,
          category: formData.category || undefined,
        },
      })
      toast.success('Photo record updated successfully')
      setEditTarget(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update photo record')
    }
  }

  function openEditForm(photo: HandoverPhotos) {
    setEditTarget(photo)
    setFormData({
      handoverId: photo.handover_id,
      description: photo.description ?? '',
      category: photo.category ?? '',
    })
  }

  const photoRecords = data?.data ?? []

  return (
    <div className="space-y-3">
      <PageHeader
        title="SALE-JOB04-F03: Handover Photos"
        actions={
          <Button
            className="bg-indigo-600 hover:bg-indigo-700"
            onClick={() => {
              setFormData({ handoverId: '', description: '', category: '' })
              setShowCreateForm(true)
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Photos
          </Button>
        }
      />

      <p className="text-slate-500 text-sm font-light -mt-2">
        จัดการภาพถ่ายและเอกสารการส่งมอบพื้นที่
      </p>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-48 w-full" />
          ))}
        </div>
      ) : isError ? (
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-slate-600">
              Failed to load handover photos. Please refresh and try again.
            </p>
          </CardContent>
        </Card>
      ) : photoRecords.length === 0 ? (
        <Card>
          <CardContent className="pt-6 flex flex-col items-center py-12">
            <Camera className="w-12 h-12 text-slate-300 mb-3" />
            <p className="text-slate-600">No handover photos yet</p>
            <p className="text-sm text-slate-400 mt-1">
              Add a new photo record to get started
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {photoRecords.map((record) => (
            <Card
              key={record.id}
              className="hover:shadow-md transition-shadow border-slate-200"
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-xs font-light tracking-wider text-slate-700 flex items-center">
                    <Camera className="w-3.5 h-3.5 mr-1.5 text-teal-600" />
                    Photo Record
                  </CardTitle>
                  {record.category && (
                    <Badge
                      variant="outline"
                      className="bg-teal-50 text-teal-700 border-teal-200 text-[9px] h-4 px-1.5 font-extralight"
                    >
                      {record.category}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-0 space-y-2">
                <div>
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest font-extralight">
                    Handover ID
                  </p>
                  <p className="text-xs text-slate-600 font-light truncate">
                    {record.handover_id}
                  </p>
                </div>

                {record.description && (
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase tracking-widest font-extralight">
                      Description
                    </p>
                    <p className="text-xs text-slate-600 font-light line-clamp-2">
                      {record.description}
                    </p>
                  </div>
                )}

                {/* Photo grid preview */}
                {Array.isArray(record.photos) && record.photos.length > 0 ? (
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase tracking-widest font-extralight mb-1">
                      Photos ({(record.photos as unknown[]).length})
                    </p>
                    <div className="grid grid-cols-3 gap-1">
                      {(record.photos as string[]).slice(0, 3).map((url, idx) => (
                        <div
                          key={idx}
                          className="aspect-square bg-slate-100 rounded overflow-hidden"
                        >
                          <img
                            src={url}
                            alt={`Photo ${idx + 1}`}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              ;(e.target as HTMLImageElement).style.display = 'none'
                            }}
                          />
                        </div>
                      ))}
                      {(record.photos as unknown[]).length > 3 && (
                        <div className="aspect-square bg-slate-100 rounded flex items-center justify-center">
                          <span className="text-xs text-slate-500">
                            +{(record.photos as unknown[]).length - 3}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center py-4 bg-slate-50 rounded border border-dashed border-slate-200">
                    <div className="text-center">
                      <Image className="w-6 h-6 text-slate-300 mx-auto mb-1" />
                      <p className="text-[10px] text-slate-400">No photos</p>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-end gap-1 pt-1 border-t border-slate-100">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0"
                    onClick={() => openEditForm(record)}
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                    onClick={() => setDeleteTarget({ id: record.id })}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Handover Photos</DialogTitle>
            <DialogDescription>
              Create a new handover photo record.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="create-handoverId">
                Handover ID <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="create-handoverId"
                value={formData.handoverId}
                onChange={(e) => setFormData((f) => ({ ...f, handoverId: e.target.value }))}
                placeholder="Enter handover ID"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-category">Category</Label>
              <Select
                value={formData.category}
                onValueChange={(v) => setFormData((f) => ({ ...f, category: v }))}
              >
                <SelectTrigger id="create-category">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {PHOTO_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-description">Description</Label>
              <Textarea
                id="create-description"
                value={formData.description}
                onChange={(e) =>
                  setFormData((f) => ({ ...f, description: e.target.value }))
                }
                placeholder="Describe the photos..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateForm(false)}>
              Cancel
            </Button>
            <Button
              className="bg-indigo-600 hover:bg-indigo-700"
              onClick={handleCreate}
              disabled={createPhotos.isPending}
            >
              {createPhotos.isPending ? 'Saving...' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editTarget} onOpenChange={() => setEditTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Photo Record</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="edit-category">Category</Label>
              <Select
                value={formData.category}
                onValueChange={(v) => setFormData((f) => ({ ...f, category: v }))}
              >
                <SelectTrigger id="edit-category">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {PHOTO_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) =>
                  setFormData((f) => ({ ...f, description: e.target.value }))
                }
                placeholder="Describe the photos..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTarget(null)}>
              Cancel
            </Button>
            <Button
              className="bg-indigo-600 hover:bg-indigo-700"
              onClick={handleUpdate}
              disabled={updatePhotos.isPending}
            >
              {updatePhotos.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Photo Record</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this photo record? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deletePhotos.isPending}
            >
              {deletePhotos.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
