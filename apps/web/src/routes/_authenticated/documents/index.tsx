import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { toast } from 'sonner'
import { useDocuments, useCreateDocument, useDeleteDocument } from '@/hooks/useDocuments'
import type { DocumentQueryParams, CreateDocumentRequest, DocumentRecord } from '@thanamol/shared'
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
  FolderOpen,
  Search,
  Upload,
  Trash2,
  FileText,
  File,
  Plus,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { format } from 'date-fns'

export const Route = createFileRoute('/_authenticated/documents/')({
  component: DocumentCenterPage,
})

const DOCUMENT_CATEGORIES = [
  'Contract',
  'Quotation',
  'Handover',
  'Invoice',
  'Receipt',
  'Customer',
  'Project',
  'Unit',
  'Other',
] as const

const CATEGORY_STYLES: Record<string, string> = {
  Contract: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  Quotation: 'bg-amber-50 text-amber-700 border-amber-200',
  Handover: 'bg-teal-50 text-teal-700 border-teal-200',
  Invoice: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Receipt: 'bg-green-50 text-green-700 border-green-200',
  Customer: 'bg-purple-50 text-purple-700 border-purple-200',
  Project: 'bg-blue-50 text-blue-700 border-blue-200',
  Unit: 'bg-violet-50 text-violet-700 border-violet-200',
  Other: 'bg-slate-50 text-slate-700 border-slate-200',
}

const EMPTY_FORM: CreateDocumentRequest = {
  title: '',
  fileUrl: '',
  fileType: '',
  category: 'Other',
  tags: [],
}

function DocumentUploadDialog({
  open,
  onClose,
  onCreate,
  isLoading,
}: {
  open: boolean
  onClose: () => void
  onCreate: (data: CreateDocumentRequest) => void
  isLoading: boolean
}) {
  const [form, setForm] = useState<CreateDocumentRequest>(EMPTY_FORM)
  const [tagsInput, setTagsInput] = useState('')

  function handleSubmit() {
    if (!form.title.trim()) {
      toast.error('กรุณาระบุชื่อเอกสาร')
      return
    }
    if (!form.fileUrl?.trim()) {
      toast.error('กรุณาระบุ URL ไฟล์')
      return
    }
    const tags = tagsInput
      ? tagsInput.split(',').map((t) => t.trim()).filter(Boolean)
      : []
    onCreate({ ...form, tags })
  }

  function handleClose() {
    setForm(EMPTY_FORM)
    setTagsInput('')
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>เพิ่มเอกสารใหม่</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>ชื่อเอกสาร *</Label>
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="ระบุชื่อเอกสาร"
            />
          </div>
          <div className="space-y-1.5">
            <Label>URL ไฟล์ *</Label>
            <Input
              value={form.fileUrl}
              onChange={(e) => setForm({ ...form, fileUrl: e.target.value })}
              placeholder="https://..."
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>หมวดหมู่</Label>
              <Select
                value={form.category ?? 'Other'}
                onValueChange={(v) => setForm({ ...form, category: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DOCUMENT_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>ประเภทไฟล์</Label>
              <Input
                value={form.fileType ?? ''}
                onChange={(e) => setForm({ ...form, fileType: e.target.value })}
                placeholder="เช่น application/pdf"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>แท็ก (คั่นด้วยคอมม่า)</Label>
            <Input
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="เช่น สัญญา, โครงการ"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={handleClose}>
              ยกเลิก
            </Button>
            <Button
              onClick={handleSubmit}
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

function DocumentCenterPage() {
  const [params, setParams] = useState<DocumentQueryParams>({ page: 1, limit: 20 })
  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)

  const { data, isLoading } = useDocuments(params)
  const createDocument = useCreateDocument()
  const deleteDocument = useDeleteDocument()

  const documents = data?.data ?? []
  const pagination = data?.pagination

  function handleSearch() {
    setParams((prev: DocumentQueryParams) => ({ ...prev, search: search || undefined, page: 1 }))
  }

  function handleCategoryFilter(value: string) {
    setParams((prev: DocumentQueryParams) => ({
      ...prev,
      category: value === 'all' ? undefined : value,
      page: 1,
    }))
  }

  function handleCreate(formData: CreateDocumentRequest) {
    createDocument.mutate(formData, {
      onSuccess: () => {
        toast.success('เพิ่มเอกสารสำเร็จ')
        setDialogOpen(false)
      },
      onError: (err) => {
        toast.error('เพิ่มเอกสารไม่สำเร็จ: ' + err.message)
      },
    })
  }

  function handleDelete(id: string, title: string) {
    if (!confirm(`ต้องการลบเอกสาร "${title}"?`)) return
    deleteDocument.mutate(id, {
      onSuccess: () => toast.success('ลบเอกสารสำเร็จ'),
      onError: (err) => toast.error('ลบเอกสารไม่สำเร็จ: ' + err.message),
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extralight tracking-[0.3em] text-slate-600 uppercase">
            ศูนย์เอกสาร
          </h1>
          <div className="h-px w-20 bg-gradient-to-r from-slate-300 to-transparent mt-2" />
        </div>
        <Button
          onClick={() => setDialogOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          เพิ่มเอกสาร
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'เอกสารทั้งหมด', value: pagination?.total ?? 0, icon: FolderOpen, color: 'text-indigo-600' },
          { label: 'สัญญา', value: documents.filter((d: DocumentRecord) => d.category === 'Contract').length, icon: FileText, color: 'text-rose-600' },
          { label: 'ใบเสนอราคา', value: documents.filter((d: DocumentRecord) => d.category === 'Quotation').length, icon: FileText, color: 'text-amber-600' },
          { label: 'ใบแจ้งหนี้', value: documents.filter((d: DocumentRecord) => d.category === 'Invoice').length, icon: FileText, color: 'text-emerald-600' },
        ].map((stat) => (
          <Card key={stat.label} className="border border-slate-100 bg-white/90">
            <CardContent className="pt-5 pb-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                    {stat.label}
                  </p>
                  <p className="text-3xl font-extralight text-slate-700 mt-1.5">{stat.value}</p>
                </div>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
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
                placeholder="ค้นหาชื่อเอกสาร..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-10"
              />
            </div>
            <Button variant="outline" onClick={handleSearch}>
              ค้นหา
            </Button>
            <Select
              value={params.category ?? 'all'}
              onValueChange={handleCategoryFilter}
            >
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="ทุกหมวดหมู่" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทุกหมวดหมู่</SelectItem>
                {DOCUMENT_CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-light text-slate-700">
            รายการเอกสาร
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : documents.length === 0 ? (
            <div className="py-16 text-center">
              <FolderOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">ไม่พบเอกสาร</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left py-3 px-2 text-xs font-medium text-slate-500 uppercase tracking-wider">
                      ชื่อเอกสาร
                    </th>
                    <th className="text-left py-3 px-2 text-xs font-medium text-slate-500 uppercase tracking-wider">
                      หมวดหมู่
                    </th>
                    <th className="text-left py-3 px-2 text-xs font-medium text-slate-500 uppercase tracking-wider">
                      ประเภทไฟล์
                    </th>
                    <th className="text-left py-3 px-2 text-xs font-medium text-slate-500 uppercase tracking-wider">
                      อัปโหลดโดย
                    </th>
                    <th className="text-left py-3 px-2 text-xs font-medium text-slate-500 uppercase tracking-wider">
                      วันที่
                    </th>
                    <th className="py-3 px-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {documents.map((doc) => (
                    <tr key={doc.id} className="hover:bg-slate-50/50">
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-2">
                          <File className="w-4 h-4 text-slate-400 shrink-0" />
                          <a
                            href={doc.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-indigo-600 hover:underline truncate max-w-xs"
                          >
                            {doc.title}
                          </a>
                        </div>
                        {(doc.tags as string[]).length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1 pl-6">
                            {(doc.tags as string[]).slice(0, 3).map((tag) => (
                              <span
                                key={tag}
                                className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-2">
                        {doc.category ? (
                          <Badge
                            variant="outline"
                            className={`text-xs ${CATEGORY_STYLES[doc.category] ?? ''}`}
                          >
                            {doc.category}
                          </Badge>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="py-3 px-2 text-slate-600 text-xs">
                        {doc.file_type ?? '-'}
                      </td>
                      <td className="py-3 px-2 text-slate-600 text-xs">
                        {doc.uploader
                          ? `${doc.uploader.first_name} ${doc.uploader.last_name}`
                          : '-'}
                      </td>
                      <td className="py-3 px-2 text-slate-500 text-xs whitespace-nowrap">
                        {format(new Date(doc.created_at), 'dd/MM/yyyy')}
                      </td>
                      <td className="py-3 px-2">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-rose-500 hover:text-rose-700"
                          onClick={() => handleDelete(doc.id, doc.title)}
                          disabled={deleteDocument.isPending}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
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

      <DocumentUploadDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onCreate={handleCreate}
        isLoading={createDocument.isPending}
      />
    </div>
  )
}
