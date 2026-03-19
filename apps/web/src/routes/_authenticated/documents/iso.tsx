import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { toast } from 'sonner'
import { useISODocuments, useCreateISODocument, useUpdateISODocument, useDeleteISODocument } from '@/hooks/useISODocuments'
import type { ISODocumentQueryParams, CreateISODocumentRequest, ISODocumentStatus, ISODocumentRecord } from '@thanamol/shared'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Search,
  Plus,
  FileCheck,
  Trash2,
  Edit2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { format } from 'date-fns'

export const Route = createFileRoute('/_authenticated/documents/iso')({
  component: ISODocumentPage,
})

const ISO_CATEGORIES = ['Procedure', 'Work Instruction', 'Form', 'Record', 'Policy', 'Other'] as const

const STATUS_STYLES: Record<ISODocumentStatus, string> = {
  DRAFT: 'bg-slate-100 text-slate-700 border-slate-200',
  ACTIVE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  ARCHIVED: 'bg-amber-50 text-amber-700 border-amber-200',
  SUPERSEDED: 'bg-rose-50 text-rose-700 border-rose-200',
}

const STATUS_LABELS: Record<ISODocumentStatus, string> = {
  DRAFT: 'Draft',
  ACTIVE: 'Active',
  ARCHIVED: 'Archived',
  SUPERSEDED: 'Superseded',
}

const EMPTY_FORM: CreateISODocumentRequest = {
  documentNumber: '',
  title: '',
  category: 'Procedure',
  revision: '00',
  status: 'DRAFT',
  content: '',
  effectiveDate: '',
  reviewDate: '',
}

function ISODocumentDialog({
  open,
  onClose,
  onSave,
  isLoading,
  initialData,
}: {
  open: boolean
  onClose: () => void
  onSave: (data: CreateISODocumentRequest) => void
  isLoading: boolean
  initialData?: CreateISODocumentRequest
}) {
  const [form, setForm] = useState<CreateISODocumentRequest>(initialData ?? EMPTY_FORM)

  function handleSave() {
    if (!form.documentNumber.trim()) {
      toast.error('กรุณาระบุรหัสเอกสาร')
      return
    }
    if (!form.title.trim()) {
      toast.error('กรุณาระบุชื่อเอกสาร')
      return
    }
    onSave(form)
  }

  function handleClose() {
    setForm(initialData ?? EMPTY_FORM)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{initialData ? 'แก้ไขเอกสาร ISO' : 'เพิ่มเอกสาร ISO ใหม่'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>รหัสเอกสาร (DCN) *</Label>
              <Input
                value={form.documentNumber}
                onChange={(e) => setForm({ ...form, documentNumber: e.target.value.toUpperCase() })}
                placeholder="เช่น DCN-XXX-ADM-PR-2026-001"
                className="font-mono text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Revision</Label>
              <Input
                value={form.revision}
                onChange={(e) => setForm({ ...form, revision: e.target.value })}
                placeholder="เช่น 00, 01, A"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>ชื่อเอกสาร *</Label>
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="ระบุชื่อเอกสาร"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>ประเภทเอกสาร</Label>
              <Select
                value={form.category}
                onValueChange={(v) => setForm({ ...form, category: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ISO_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>สถานะ</Label>
              <Select
                value={form.status ?? 'DRAFT'}
                onValueChange={(v) => setForm({ ...form, status: v as ISODocumentStatus })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DRAFT">Draft</SelectItem>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="ARCHIVED">Archived</SelectItem>
                  <SelectItem value="SUPERSEDED">Superseded</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>วันที่มีผล (Effective Date)</Label>
              <Input
                type="date"
                value={form.effectiveDate ?? ''}
                onChange={(e) => setForm({ ...form, effectiveDate: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>วันที่ทบทวน (Review Date)</Label>
              <Input
                type="date"
                value={form.reviewDate ?? ''}
                onChange={(e) => setForm({ ...form, reviewDate: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>เนื้อหา / รายละเอียด</Label>
            <Textarea
              value={form.content ?? ''}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              placeholder="รายละเอียดเอกสาร..."
              rows={3}
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={handleClose}>
              ยกเลิก
            </Button>
            <Button
              onClick={handleSave}
              disabled={isLoading}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {isLoading ? 'กำลังบันทึก...' : 'บันทึก'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function ISODocumentPage() {
  const [params, setParams] = useState<ISODocumentQueryParams>({ page: 1, limit: 20 })
  const [search, setSearch] = useState('')
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<string | null>(null)

  const { data, isLoading } = useISODocuments(params)
  const createISO = useCreateISODocument()
  const deleteISO = useDeleteISODocument()

  const isoDocuments = data?.data ?? []
  const pagination = data?.pagination

  const editDocument = isoDocuments.find((d) => d.id === editTarget)
  const updateISO = useUpdateISODocument(editTarget ?? '')

  function handleSearch() {
    setParams((prev) => ({ ...prev, search: search || undefined, page: 1 }))
  }

  function handleStatusFilter(value: string) {
    setParams((prev) => ({
      ...prev,
      status: value === 'all' ? undefined : (value as ISODocumentStatus),
      page: 1,
    }))
  }

  function handleCategoryFilter(value: string) {
    setParams((prev) => ({
      ...prev,
      category: value === 'all' ? undefined : value,
      page: 1,
    }))
  }

  function handleCreate(formData: CreateISODocumentRequest) {
    createISO.mutate(formData, {
      onSuccess: () => {
        toast.success('เพิ่มเอกสาร ISO สำเร็จ')
        setCreateDialogOpen(false)
      },
      onError: (err) => toast.error('เพิ่มเอกสารไม่สำเร็จ: ' + err.message),
    })
  }

  function handleUpdate(formData: CreateISODocumentRequest) {
    updateISO.mutate(formData, {
      onSuccess: () => {
        toast.success('แก้ไขเอกสาร ISO สำเร็จ')
        setEditTarget(null)
      },
      onError: (err) => toast.error('แก้ไขเอกสารไม่สำเร็จ: ' + err.message),
    })
  }

  function handleDelete(id: string, title: string) {
    if (!confirm(`ต้องการลบเอกสาร "${title}"?`)) return
    deleteISO.mutate(id, {
      onSuccess: () => toast.success('ลบเอกสารสำเร็จ'),
      onError: (err) => toast.error('ลบเอกสารไม่สำเร็จ: ' + err.message),
    })
  }

  const stats = {
    total: pagination?.total ?? 0,
    draft: isoDocuments.filter((d) => d.status === 'DRAFT').length,
    active: isoDocuments.filter((d) => d.status === 'ACTIVE').length,
    archived: isoDocuments.filter((d) => d.status === 'ARCHIVED').length,
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extralight tracking-[0.3em] text-slate-600 uppercase">
            ISO Document Control
          </h1>
          <p className="text-xs text-slate-400 mt-1">ระบบควบคุมเอกสารตามมาตรฐาน ISO</p>
          <div className="h-px w-20 bg-gradient-to-r from-slate-300 to-transparent mt-2" />
        </div>
        <Button
          onClick={() => setCreateDialogOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          ลงทะเบียนเอกสาร
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'เอกสารทั้งหมด', value: stats.total, color: 'text-slate-700' },
          { label: 'Draft', value: stats.draft, color: 'text-slate-600' },
          { label: 'Active', value: stats.active, color: 'text-emerald-600' },
          { label: 'Archived', value: stats.archived, color: 'text-amber-600' },
        ].map((stat) => (
          <Card key={stat.label} className="border border-slate-100">
            <CardContent className="pt-5 pb-5">
              <div className="text-center">
                <p className={`text-2xl font-light ${stat.color}`}>{stat.value}</p>
                <p className="text-xs text-slate-500 mt-1">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="ค้นหาชื่อหรือรหัสเอกสาร..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-10"
              />
            </div>
            <Button variant="outline" onClick={handleSearch}>
              ค้นหา
            </Button>
            <Select value={params.status ?? 'all'} onValueChange={handleStatusFilter}>
              <SelectTrigger className="w-full md:w-44">
                <SelectValue placeholder="สถานะทั้งหมด" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">สถานะทั้งหมด</SelectItem>
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="ARCHIVED">Archived</SelectItem>
                <SelectItem value="SUPERSEDED">Superseded</SelectItem>
              </SelectContent>
            </Select>
            <Select value={params.category ?? 'all'} onValueChange={handleCategoryFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="ประเภททั้งหมด" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ประเภททั้งหมด</SelectItem>
                {ISO_CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-light text-slate-700">รายการเอกสาร ISO</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : isoDocuments.length === 0 ? (
            <div className="py-16 text-center">
              <FileCheck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">ไม่พบเอกสาร ISO</p>
            </div>
          ) : (
            <div className="space-y-3">
              {isoDocuments.map((doc) => (
                <div
                  key={doc.id}
                  className="p-4 border border-slate-100 rounded-lg hover:border-indigo-200 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-mono text-xs text-indigo-600">{doc.document_number}</p>
                        <Badge
                          variant="outline"
                          className={`text-xs ${STATUS_STYLES[doc.status]}`}
                        >
                          {STATUS_LABELS[doc.status]}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {doc.category}
                        </Badge>
                        <span className="text-xs text-slate-400">Rev {doc.revision}</span>
                      </div>
                      <p className="font-medium text-slate-800 truncate">{doc.title}</p>
                      {doc.content && (
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2">{doc.content}</p>
                      )}
                      <div className="flex gap-4 mt-2 text-xs text-slate-400">
                        {doc.effective_date && (
                          <span>
                            Effective: {format(new Date(doc.effective_date), 'dd/MM/yyyy')}
                          </span>
                        )}
                        {doc.review_date && (
                          <span>
                            Review: {format(new Date(doc.review_date), 'dd/MM/yyyy')}
                          </span>
                        )}
                        <span>สร้าง: {format(new Date(doc.created_at), 'dd/MM/yyyy')}</span>
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-slate-500 hover:text-indigo-600"
                        onClick={() => setEditTarget(doc.id)}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-rose-500 hover:text-rose-700"
                        onClick={() => handleDelete(doc.id, doc.title)}
                        disabled={deleteISO.isPending}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <span className="text-xs text-slate-500">
                แสดง {(pagination.page - 1) * pagination.limit + 1}–
                {Math.min(pagination.page * pagination.limit, pagination.total)} จาก {pagination.total} รายการ
              </span>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  disabled={pagination.page <= 1}
                  onClick={() => setParams((p) => ({ ...p, page: p.page! - 1 }))}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => setParams((p) => ({ ...p, page: p.page! + 1 }))}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <ISODocumentDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        onSave={handleCreate}
        isLoading={createISO.isPending}
      />

      {editDocument && (
        <ISODocumentDialog
          open={Boolean(editTarget)}
          onClose={() => setEditTarget(null)}
          onSave={handleUpdate}
          isLoading={updateISO.isPending}
          initialData={{
            documentNumber: editDocument.document_number,
            title: editDocument.title,
            category: editDocument.category,
            revision: editDocument.revision,
            status: editDocument.status,
            content: editDocument.content ?? '',
            effectiveDate: editDocument.effective_date
              ? editDocument.effective_date.split('T')[0]
              : '',
            reviewDate: editDocument.review_date
              ? editDocument.review_date.split('T')[0]
              : '',
          }}
        />
      )}
    </div>
  )
}
