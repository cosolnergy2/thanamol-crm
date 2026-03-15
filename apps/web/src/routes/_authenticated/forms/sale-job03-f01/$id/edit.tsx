import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { ArrowLeft, Save, ClipboardCheck } from 'lucide-react'
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
import { Skeleton } from '@/components/ui/skeleton'
import { PageHeader } from '@/components/PageHeader'
import {
  usePreHandoverInspectionById,
  useUpdatePreHandoverInspection,
} from '@/hooks/usePreHandoverInspections'
import { InspectionChecklist } from '../-components/InspectionChecklist'
import type { InspectionItem, InspectionStatus } from '@thanamol/shared'

export const Route = createFileRoute('/_authenticated/forms/sale-job03-f01/$id/edit')({
  component: PreHandoverInspectionEditPage,
})

type FormErrors = Partial<Record<string, string>>

function validate(fields: {
  inspectionDate: string
  inspector: string
}): FormErrors {
  const errors: FormErrors = {}
  if (!fields.inspectionDate) errors.inspectionDate = 'Inspection date is required'
  if (!fields.inspector.trim()) errors.inspector = 'Inspector name is required'
  return errors
}

function PreHandoverInspectionEditPage() {
  const { id } = Route.useParams()
  const navigate = useNavigate()

  const { data, isLoading, isError } = usePreHandoverInspectionById(id)
  const inspection = data?.inspection

  const [inspectionDate, setInspectionDate] = useState('')
  const [inspector, setInspector] = useState('')
  const [overallStatus, setOverallStatus] = useState<InspectionStatus>('CONDITIONAL')
  const [items, setItems] = useState<InspectionItem[]>([])
  const [notes, setNotes] = useState('')
  const [errors, setErrors] = useState<FormErrors>({})

  useEffect(() => {
    if (!inspection) return
    setInspectionDate(inspection.inspection_date.split('T')[0])
    setInspector(inspection.inspector)
    setOverallStatus(inspection.overall_status as InspectionStatus)
    setItems(Array.isArray(inspection.items) ? (inspection.items as InspectionItem[]) : [])
    setNotes(inspection.notes ?? '')
  }, [inspection])

  const updateInspection = useUpdatePreHandoverInspection()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const validationErrors = validate({ inspectionDate, inspector })
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }
    setErrors({})

    try {
      await updateInspection.mutateAsync({
        id,
        data: {
          inspectionDate,
          inspector,
          overallStatus,
          items,
          notes: notes.trim() || undefined,
        },
      })
      toast.success('Inspection updated successfully')
      navigate({ to: '/forms/sale-job03-f01/$id', params: { id } })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update inspection')
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }

  if (isError || !inspection) {
    return (
      <div className="text-center py-16">
        <p className="text-slate-600">Inspection not found.</p>
        <Link to="/forms/sale-job03-f01">
          <Button variant="outline" className="mt-4">
            Back to List
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-3 max-w-5xl">
      <PageHeader
        title={`Edit: ${inspection.contract.contract_number}`}
        actions={
          <Link to="/forms/sale-job03-f01/$id" params={{ id }}>
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
              <ClipboardCheck className="w-4 h-4 mr-2 text-indigo-600" />
              SECTION 1: Document Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Contract</Label>
                <Input value={inspection.contract.contract_number} disabled />
              </div>

              <div className="space-y-2">
                <Label>Inspection Date *</Label>
                <Input
                  type="date"
                  value={inspectionDate}
                  onChange={(e) => setInspectionDate(e.target.value)}
                  className={errors.inspectionDate ? 'border-rose-400' : ''}
                />
                {errors.inspectionDate && (
                  <p className="text-[11px] text-rose-600">{errors.inspectionDate}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Inspector *</Label>
                <Input
                  value={inspector}
                  onChange={(e) => setInspector(e.target.value)}
                  placeholder="Inspector name"
                  className={errors.inspector ? 'border-rose-400' : ''}
                />
                {errors.inspector && (
                  <p className="text-[11px] text-rose-600">{errors.inspector}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Overall Status</Label>
                <Select
                  value={overallStatus}
                  onValueChange={(v) => setOverallStatus(v as InspectionStatus)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CONDITIONAL">Conditional</SelectItem>
                    <SelectItem value="PASS">Pass</SelectItem>
                    <SelectItem value="FAIL">Fail</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <InspectionChecklist items={items} onChange={setItems} />

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-light tracking-wider text-slate-700">
              SECTION 5: Notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes..."
              rows={4}
            />
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-3 pb-8">
          <Link to="/forms/sale-job03-f01/$id" params={{ id }}>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button
            type="submit"
            className="bg-indigo-600 hover:bg-indigo-700"
            disabled={updateInspection.isPending}
          >
            <Save className="w-4 h-4 mr-2" />
            {updateInspection.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </div>
  )
}
