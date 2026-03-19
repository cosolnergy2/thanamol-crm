import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { toast } from 'sonner'
import {
  usePDFTemplates,
  useCreatePDFTemplate,
  useUpdatePDFTemplate,
  useDeletePDFTemplate,
} from '@/hooks/usePDFTemplates'
import type { CreatePDFTemplateRequest, PDFTemplateType, PDFTemplateRecord } from '@thanamol/shared'
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
import { Switch } from '@/components/ui/switch'
import {
  FileText,
  Plus,
  Edit2,
  Trash2,
  Star,
} from 'lucide-react'
import { format } from 'date-fns'

export const Route = createFileRoute('/_authenticated/settings/pdf-template')({
  component: PDFTemplateSettingsPage,
})

const TEMPLATE_TYPE_LABELS: Record<PDFTemplateType, string> = {
  quotation: 'ใบเสนอราคา',
  contract: 'สัญญา',
  invoice: 'ใบแจ้งหนี้',
  receipt: 'ใบเสร็จ',
  handover: 'ใบส่งมอบ',
}

const TEMPLATE_TYPE_STYLES: Record<PDFTemplateType, string> = {
  quotation: 'bg-blue-50 text-blue-700 border-blue-200',
  contract: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  invoice: 'bg-amber-50 text-amber-700 border-amber-200',
  receipt: 'bg-teal-50 text-teal-700 border-teal-200',
  handover: 'bg-purple-50 text-purple-700 border-purple-200',
}

const EMPTY_FORM: CreatePDFTemplateRequest = {
  name: '',
  templateType: 'quotation',
  header: {},
  footer: {},
  styles: {},
  isDefault: false,
}

function PDFTemplateDialog({
  open,
  onClose,
  onSave,
  isLoading,
  initialData,
  mode,
}: {
  open: boolean
  onClose: () => void
  onSave: (data: CreatePDFTemplateRequest) => void
  isLoading: boolean
  initialData?: CreatePDFTemplateRequest
  mode: 'create' | 'edit'
}) {
  const [form, setForm] = useState<CreatePDFTemplateRequest>(initialData ?? EMPTY_FORM)

  function handleSave() {
    if (!form.name.trim()) {
      toast.error('กรุณาระบุชื่อเทมเพลต')
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
          <DialogTitle>
            {mode === 'create' ? 'สร้างเทมเพลต PDF ใหม่' : 'แก้ไขเทมเพลต PDF'}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>ชื่อเทมเพลต *</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="เช่น Standard Quotation Template"
            />
          </div>
          <div className="space-y-1.5">
            <Label>ประเภทเอกสาร *</Label>
            <Select
              value={form.templateType}
              onValueChange={(v) => setForm({ ...form, templateType: v as PDFTemplateType })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(TEMPLATE_TYPE_LABELS) as PDFTemplateType[]).map((type) => (
                  <SelectItem key={type} value={type}>
                    {TEMPLATE_TYPE_LABELS[type]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
            <div>
              <p className="text-sm font-medium text-slate-700">ตั้งเป็นค่าเริ่มต้น</p>
              <p className="text-xs text-slate-500">เทมเพลตนี้จะถูกใช้โดยอัตโนมัติสำหรับประเภทนี้</p>
            </div>
            <Switch
              checked={form.isDefault ?? false}
              onCheckedChange={(checked) => setForm({ ...form, isDefault: checked })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Header JSON (ตัวเลือก)</Label>
            <Input
              value={JSON.stringify(form.header)}
              onChange={(e) => {
                try {
                  setForm({ ...form, header: JSON.parse(e.target.value) })
                } catch {
                  // ignore invalid JSON during typing
                }
              }}
              placeholder="{}"
              className="font-mono text-xs"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Footer JSON (ตัวเลือก)</Label>
            <Input
              value={JSON.stringify(form.footer)}
              onChange={(e) => {
                try {
                  setForm({ ...form, footer: JSON.parse(e.target.value) })
                } catch {
                  // ignore invalid JSON during typing
                }
              }}
              placeholder="{}"
              className="font-mono text-xs"
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

function PDFTemplateSettingsPage() {
  const [typeFilter, setTypeFilter] = useState<PDFTemplateType | 'all'>('all')
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<PDFTemplateRecord | null>(null)

  const { data, isLoading } = usePDFTemplates({
    type: typeFilter === 'all' ? undefined : typeFilter,
  })
  const createTemplate = useCreatePDFTemplate()
  const deleteTemplate = useDeletePDFTemplate()
  const updateTemplate = useUpdatePDFTemplate(editTarget?.id ?? '')

  const templates = data?.data ?? []

  function handleCreate(formData: CreatePDFTemplateRequest) {
    createTemplate.mutate(formData, {
      onSuccess: () => {
        toast.success('สร้างเทมเพลตสำเร็จ')
        setCreateDialogOpen(false)
      },
      onError: (err) => toast.error('สร้างเทมเพลตไม่สำเร็จ: ' + err.message),
    })
  }

  function handleUpdate(formData: CreatePDFTemplateRequest) {
    updateTemplate.mutate(formData, {
      onSuccess: () => {
        toast.success('แก้ไขเทมเพลตสำเร็จ')
        setEditTarget(null)
      },
      onError: (err) => toast.error('แก้ไขเทมเพลตไม่สำเร็จ: ' + err.message),
    })
  }

  function handleDelete(id: string, name: string) {
    if (!confirm(`ต้องการลบเทมเพลต "${name}"?`)) return
    deleteTemplate.mutate(id, {
      onSuccess: () => toast.success('ลบเทมเพลตสำเร็จ'),
      onError: (err) => toast.error('ลบเทมเพลตไม่สำเร็จ: ' + err.message),
    })
  }

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extralight tracking-[0.3em] text-slate-600 uppercase">
            ตั้งค่าเทมเพลต PDF
          </h1>
          <p className="text-xs text-slate-400 mt-1">จัดการรูปแบบ PDF สำหรับเอกสารต่างๆ</p>
          <div className="h-px w-20 bg-gradient-to-r from-slate-300 to-transparent mt-2" />
        </div>
        <Button
          onClick={() => setCreateDialogOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          สร้างเทมเพลต
        </Button>
      </div>

      {/* Filter */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex gap-3">
            <Select
              value={typeFilter}
              onValueChange={(v) => setTypeFilter(v as PDFTemplateType | 'all')}
            >
              <SelectTrigger className="w-56">
                <SelectValue placeholder="ทุกประเภท" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทุกประเภท</SelectItem>
                {(Object.keys(TEMPLATE_TYPE_LABELS) as PDFTemplateType[]).map((type) => (
                  <SelectItem key={type} value={type}>
                    {TEMPLATE_TYPE_LABELS[type]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Templates List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-light text-slate-700">
            เทมเพลต PDF ทั้งหมด
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : templates.length === 0 ? (
            <div className="py-16 text-center">
              <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 mb-4">ยังไม่มีเทมเพลต PDF</p>
              <Button
                variant="outline"
                onClick={() => setCreateDialogOpen(true)}
              >
                สร้างเทมเพลตแรก
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {templates.map((template) => (
                <div
                  key={template.id}
                  className="p-4 border border-slate-100 rounded-lg hover:border-indigo-200 transition-colors"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-slate-800">{template.name}</p>
                        {template.is_default && (
                          <span className="flex items-center gap-1 text-xs text-amber-600">
                            <Star className="w-3 h-3 fill-amber-500" />
                            ค่าเริ่มต้น
                          </span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Badge
                          variant="outline"
                          className={`text-xs ${TEMPLATE_TYPE_STYLES[template.template_type as PDFTemplateType]}`}
                        >
                          {TEMPLATE_TYPE_LABELS[template.template_type as PDFTemplateType] ??
                            template.template_type}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-400 mt-1.5">
                        อัปเดต: {format(new Date(template.updated_at), 'dd/MM/yyyy HH:mm')}
                      </p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-slate-500 hover:text-indigo-600"
                        onClick={() => setEditTarget(template)}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-rose-500 hover:text-rose-700"
                        onClick={() => handleDelete(template.id, template.name)}
                        disabled={deleteTemplate.isPending}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <PDFTemplateDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        onSave={handleCreate}
        isLoading={createTemplate.isPending}
        mode="create"
      />

      {editTarget && (
        <PDFTemplateDialog
          open={Boolean(editTarget)}
          onClose={() => setEditTarget(null)}
          onSave={handleUpdate}
          isLoading={updateTemplate.isPending}
          mode="edit"
          initialData={{
            name: editTarget.name,
            templateType: editTarget.template_type as PDFTemplateType,
            header: editTarget.header,
            footer: editTarget.footer,
            styles: editTarget.styles,
            isDefault: editTarget.is_default,
          }}
        />
      )}
    </div>
  )
}
