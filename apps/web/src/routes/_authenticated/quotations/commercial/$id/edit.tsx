import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { ArrowLeft, Save, Loader2, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  CommercialQuotationForm,
  type CommercialQuotationFormData,
} from '@/components/CommercialQuotationForm'
import {
  useCommercialQuotation,
  useUpdateCommercialQuotation,
} from '@/hooks/useCommercialQuotations'
import type { QuotationStatus } from '@thanamol/shared'

export const Route = createFileRoute('/_authenticated/quotations/commercial/$id/edit')({
  component: EditCommercialQuotationPage,
})

function EditCommercialQuotationPage() {
  const { id } = Route.useParams()
  const navigate = useNavigate()
  const { data, isLoading, isError } = useCommercialQuotation(id)
  const updateMutation = useUpdateCommercialQuotation()

  const quotation = data?.quotation
  const [formData, setFormData] = useState<CommercialQuotationFormData>({
    customerId: '',
    projectId: '',
    items: [],
    terms: '',
    conditions: '',
    totalAmount: 0,
    status: 'DRAFT',
  })

  useEffect(() => {
    if (quotation) {
      setFormData({
        customerId: quotation.customer_id,
        projectId: quotation.project_id,
        items: Array.isArray(quotation.items) ? quotation.items : [],
        terms: quotation.terms ?? '',
        conditions: quotation.conditions ?? '',
        totalAmount: quotation.total_amount,
        status: quotation.status as QuotationStatus,
      })
    }
  }, [quotation])

  function handleSave() {
    if (!formData.customerId || !formData.projectId) {
      toast.error('Please select a customer and a project')
      return
    }

    updateMutation.mutate(
      {
        id,
        data: {
          customerId: formData.customerId,
          projectId: formData.projectId,
          items: formData.items,
          terms: formData.terms || undefined,
          conditions: formData.conditions || undefined,
          totalAmount: formData.totalAmount,
          status: formData.status,
        },
      },
      {
        onSuccess: () => {
          toast.success('Quotation updated')
          navigate({ to: '/quotations/commercial/$id', params: { id } })
        },
        onError: (err) => {
          toast.error(err instanceof Error ? err.message : 'Failed to update quotation')
        },
      }
    )
  }

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto space-y-6 pb-8">
        <Skeleton className="h-10 w-80" />
        <Skeleton className="h-64" />
        <Skeleton className="h-48" />
      </div>
    )
  }

  if (isError || !quotation) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <AlertCircle className="w-16 h-16 text-slate-300 mb-4" />
        <p className="text-slate-600 mb-4">Quotation not found</p>
        <Button variant="outline" onClick={() => navigate({ to: '/quotations/commercial' })}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to list
        </Button>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => navigate({ to: '/quotations/commercial/$id', params: { id } })}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
          </Button>
          <div>
            <h1 className="text-2xl font-extralight tracking-[0.3em] text-slate-600 uppercase">
              Edit Quotation
            </h1>
            <p className="text-sm text-slate-500 mt-1">{quotation.quotation_number}</p>
            <div className="h-px w-20 bg-gradient-to-r from-slate-300 to-transparent mt-1" />
          </div>
        </div>
        <Button
          onClick={handleSave}
          disabled={updateMutation.isPending}
          className="bg-indigo-600 hover:bg-indigo-700"
        >
          {updateMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </>
          )}
        </Button>
      </div>

      <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-lg text-sm text-indigo-800">
        <strong>Note:</strong> Saving will update the quotation in-place.
      </div>

      <CommercialQuotationForm data={formData} onChange={setFormData} />
    </div>
  )
}
