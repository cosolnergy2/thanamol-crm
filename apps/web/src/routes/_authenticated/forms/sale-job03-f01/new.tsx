import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
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
import { PageHeader } from '@/components/PageHeader'
import { useCreatePreHandoverInspection } from '@/hooks/usePreHandoverInspections'
import { useContracts } from '@/hooks/useContracts'
import { InspectionChecklist } from './-components/InspectionChecklist'
import type { InspectionItem, InspectionStatus } from '@thanamol/shared'

export const Route = createFileRoute('/_authenticated/forms/sale-job03-f01/new')({
  component: PreHandoverInspectionNewPage,
})

type FormErrors = Partial<Record<string, string>>

function validate(fields: {
  contractId: string
  inspectionDate: string
  inspector: string
}): FormErrors {
  const errors: FormErrors = {}
  if (!fields.contractId) errors.contractId = 'Contract is required'
  if (!fields.inspectionDate) errors.inspectionDate = 'Inspection date is required'
  if (!fields.inspector.trim()) errors.inspector = 'Inspector name is required'
  return errors
}

function PreHandoverInspectionNewPage() {
  const navigate = useNavigate()

  const [contractId, setContractId] = useState('')
  const [inspectionDate, setInspectionDate] = useState(new Date().toISOString().split('T')[0])
  const [inspector, setInspector] = useState('')
  const [overallStatus, setOverallStatus] = useState<InspectionStatus>('CONDITIONAL')
  const [items, setItems] = useState<InspectionItem[]>([])
  const [notes, setNotes] = useState('')
  const [errors, setErrors] = useState<FormErrors>({})

  const { data: contractsData } = useContracts({ limit: 200 })
  const contracts = contractsData?.data ?? []

  const createInspection = useCreatePreHandoverInspection()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const validationErrors = validate({ contractId, inspectionDate, inspector })
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }
    setErrors({})

    try {
      await createInspection.mutateAsync({
        contractId,
        inspectionDate,
        inspector,
        overallStatus,
        items,
        notes: notes.trim() || undefined,
      })
      toast.success('Inspection created successfully')
      navigate({ to: '/forms/sale-job03-f01' })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create inspection')
    }
  }

  return (
    <div className="space-y-3 max-w-5xl">
      <PageHeader
        title="New Pre-Handover Inspection"
        actions={
          <Link to="/forms/sale-job03-f01">
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
                <Label>Contract *</Label>
                <Select value={contractId} onValueChange={setContractId}>
                  <SelectTrigger className={errors.contractId ? 'border-rose-400' : ''}>
                    <SelectValue placeholder="Select contract" />
                  </SelectTrigger>
                  <SelectContent>
                    {contracts.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.contract_number}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.contractId && (
                  <p className="text-[11px] text-rose-600">{errors.contractId}</p>
                )}
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
          <Link to="/forms/sale-job03-f01">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button
            type="submit"
            className="bg-indigo-600 hover:bg-indigo-700"
            disabled={createInspection.isPending}
          >
            <Save className="w-4 h-4 mr-2" />
            {createInspection.isPending ? 'Saving...' : 'Save Inspection'}
          </Button>
        </div>
      </form>
    </div>
  )
}
