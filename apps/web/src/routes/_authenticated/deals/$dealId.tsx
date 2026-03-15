import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { ArrowLeft, Save, Building2, DollarSign } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useDeal, useUpdateDeal } from '@/hooks/useDeals'
import { useCustomers } from '@/hooks/useCustomers'
import type { UpdateDealRequest, DealStage } from '@thanamol/shared'

export const Route = createFileRoute('/_authenticated/deals/$dealId')({
  component: DealDetailPage,
})

const DEAL_STAGES: DealStage[] = [
  'PROSPECTING',
  'QUALIFICATION',
  'PROPOSAL',
  'NEGOTIATION',
  'CLOSED_WON',
  'CLOSED_LOST',
]

const STAGE_LABELS: Record<DealStage, string> = {
  PROSPECTING: 'Prospecting',
  QUALIFICATION: 'Qualification',
  PROPOSAL: 'Proposal',
  NEGOTIATION: 'Negotiation',
  CLOSED_WON: 'Won',
  CLOSED_LOST: 'Lost',
}

const STAGE_CLASSES: Record<DealStage, string> = {
  PROSPECTING: 'bg-slate-100 text-slate-700',
  QUALIFICATION: 'bg-blue-100 text-blue-700',
  PROPOSAL: 'bg-indigo-100 text-indigo-700',
  NEGOTIATION: 'bg-amber-100 text-amber-700',
  CLOSED_WON: 'bg-teal-100 text-teal-700',
  CLOSED_LOST: 'bg-rose-100 text-rose-700',
}

const STAGE_ORDER: Record<DealStage, number> = {
  PROSPECTING: 0,
  QUALIFICATION: 1,
  PROPOSAL: 2,
  NEGOTIATION: 3,
  CLOSED_WON: 4,
  CLOSED_LOST: 5,
}

function DealDetailPage() {
  const { dealId } = Route.useParams()

  const { data, isLoading } = useDeal(dealId)
  const { data: customersData } = useCustomers({ limit: 200 })

  const updateDeal = useUpdateDeal(dealId)

  const [formData, setFormData] = useState<UpdateDealRequest>({})

  useEffect(() => {
    if (data?.deal) {
      const deal = data.deal
      setFormData({
        title: deal.title,
        customerId: deal.customer_id ?? undefined,
        leadId: deal.lead_id ?? undefined,
        stage: deal.stage,
        value: deal.value ?? undefined,
        probability: deal.probability ?? undefined,
        expectedCloseDate: deal.expected_close_date ?? undefined,
        notes: deal.notes ?? undefined,
        assignedTo: deal.assigned_to ?? undefined,
      })
    }
  }, [data?.deal])

  const customers = customersData?.data ?? []
  const customer = customers.find((c) => c.id === formData.customerId)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    try {
      await updateDeal.mutateAsync(formData)
      toast.success('Deal updated')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update deal')
    }
  }

  if (isLoading) {
    return <div className="py-12 text-center text-slate-500">Loading...</div>
  }

  if (!data?.deal) {
    return <div className="py-12 text-center text-slate-500">Deal not found</div>
  }

  const deal = data.deal
  const currentStageIndex = STAGE_ORDER[formData.stage ?? deal.stage]

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link to="/deals">
            <Button variant="outline" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-extralight tracking-[0.3em] text-slate-600 uppercase">
                Deal Detail
              </h1>
              <Badge
                className={`${STAGE_CLASSES[formData.stage ?? deal.stage]} text-[9px] h-4 px-1.5 font-extralight`}
              >
                {STAGE_LABELS[formData.stage ?? deal.stage]}
              </Badge>
            </div>
            <p className="mt-1 text-sm text-slate-600 font-extralight">
              {customer?.name ?? 'No customer linked'}
            </p>
          </div>
        </div>
      </div>

      <StageProgressBar currentIndex={currentStageIndex} />

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-sm font-light tracking-wider text-slate-700">
                  <DollarSign className="w-4 h-4 mr-2 text-indigo-600" />
                  Deal Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Title *</Label>
                  <Input
                    value={formData.title ?? ''}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Deal title..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Stage</Label>
                    <Select
                      value={formData.stage ?? ''}
                      onValueChange={(v) => setFormData({ ...formData, stage: v as DealStage })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DEAL_STAGES.map((s) => (
                          <SelectItem key={s} value={s}>
                            {STAGE_LABELS[s]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Value (THB)</Label>
                    <Input
                      type="number"
                      value={formData.value ?? ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          value: e.target.value ? parseFloat(e.target.value) : undefined,
                        })
                      }
                      placeholder="0"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Probability (%)</Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={formData.probability ?? ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          probability: e.target.value ? parseInt(e.target.value) : undefined,
                        })
                      }
                      placeholder="0-100"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Expected Close Date</Label>
                    <Input
                      type="date"
                      value={formData.expectedCloseDate ?? ''}
                      onChange={(e) =>
                        setFormData({ ...formData, expectedCloseDate: e.target.value || undefined })
                      }
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea
                    value={formData.notes ?? ''}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Additional notes..."
                    rows={4}
                  />
                </div>
              </CardContent>
            </Card>

            {deal.lead_id && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-light tracking-wider text-slate-700">
                    Linked Lead
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Link to="/leads/$leadId" params={{ leadId: deal.lead_id }}>
                    <Button variant="outline" size="sm" className="text-[11px] font-extralight">
                      View Lead
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-sm font-light tracking-wider text-slate-700">
                  <Building2 className="w-4 h-4 mr-2 text-indigo-600" />
                  Customer
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Select
                  value={formData.customerId ?? ''}
                  onValueChange={(v) => setFormData({ ...formData, customerId: v || undefined })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {customer && (
                  <div className="p-3 bg-slate-50 rounded-lg space-y-1 text-sm">
                    {customer.phone && (
                      <div>
                        <strong>Phone:</strong> {customer.phone}
                      </div>
                    )}
                    {customer.email && (
                      <div>
                        <strong>Email:</strong> {customer.email}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="flex items-center justify-end space-x-3 mt-6 pb-8">
          <Link to="/deals">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button
            type="submit"
            className="bg-indigo-600 hover:bg-indigo-700"
            disabled={updateDeal.isPending}
          >
            <Save className="w-4 h-4 mr-2" />
            {updateDeal.isPending ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </form>
    </div>
  )
}

const PROGRESS_STAGES: DealStage[] = [
  'PROSPECTING',
  'QUALIFICATION',
  'PROPOSAL',
  'NEGOTIATION',
  'CLOSED_WON',
]

type StageProgressBarProps = {
  currentIndex: number
}

function StageProgressBar({ currentIndex }: StageProgressBarProps) {
  return (
    <div className="flex items-center gap-0">
      {PROGRESS_STAGES.map((stage, index) => {
        const isCompleted = index < currentIndex
        const isActive = index === currentIndex
        const isLast = index === PROGRESS_STAGES.length - 1

        return (
          <div key={stage} className="flex items-center flex-1">
            <div
              className={`flex-1 h-1.5 rounded-sm ${
                isCompleted
                  ? 'bg-indigo-500'
                  : isActive
                    ? 'bg-indigo-300'
                    : 'bg-slate-100'
              }`}
            />
            {!isLast && (
              <div
                className={`w-2 h-2 rounded-full mx-0.5 flex-shrink-0 ${
                  isCompleted || isActive ? 'bg-indigo-500' : 'bg-slate-200'
                }`}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
