import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { ArrowLeft, Send, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  CommercialQuotationForm,
  type CommercialQuotationFormData,
} from '@/components/CommercialQuotationForm'
import { useCreateCommercialQuotation } from '@/hooks/useCommercialQuotations'

export const Route = createFileRoute('/_authenticated/quotations/commercial/new')({
  component: NewCommercialQuotationPage,
})

const INITIAL_FORM_DATA: CommercialQuotationFormData = {
  customerId: '',
  projectId: '',
  items: [],
  terms: '',
  conditions: '',
  totalAmount: 0,
  status: 'DRAFT',
}

function NewCommercialQuotationPage() {
  const navigate = useNavigate()
  const createMutation = useCreateCommercialQuotation()
  const [formData, setFormData] = useState<CommercialQuotationFormData>(INITIAL_FORM_DATA)

  function handleSubmit() {
    if (!formData.customerId || !formData.projectId) {
      toast.error('Please select a customer and a project')
      return
    }

    createMutation.mutate(
      {
        customerId: formData.customerId,
        projectId: formData.projectId,
        items: formData.items,
        terms: formData.terms || undefined,
        conditions: formData.conditions || undefined,
        totalAmount: formData.totalAmount,
        status: formData.status,
      },
      {
        onSuccess: ({ quotation }) => {
          toast.success('Commercial quotation created')
          navigate({ to: '/quotations/commercial/$id', params: { id: quotation.id } })
        },
        onError: (err) => {
          toast.error(err instanceof Error ? err.message : 'Failed to create quotation')
        },
      }
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
            onClick={() => navigate({ to: '/quotations/commercial' })}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
          </Button>
          <div>
            <h1 className="text-2xl font-extralight tracking-[0.3em] text-slate-600 uppercase">
              New Commercial Quotation
            </h1>
            <div className="h-px w-20 bg-gradient-to-r from-slate-300 to-transparent mt-2" />
          </div>
        </div>
        <Button
          onClick={handleSubmit}
          disabled={createMutation.isPending}
          className="bg-indigo-600 hover:bg-indigo-700"
        >
          {createMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Creating...
            </>
          ) : (
            <>
              <Send className="w-4 h-4 mr-2" />
              Create Quotation
            </>
          )}
        </Button>
      </div>

      <CommercialQuotationForm data={formData} onChange={setFormData} />
    </div>
  )
}
