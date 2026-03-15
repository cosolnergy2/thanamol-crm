import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { Plus, Calendar, User, DollarSign } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import { useDealPipeline, useCreateDeal, useUpdateDeal } from '@/hooks/useDeals'
import { useCustomers } from '@/hooks/useCustomers'
import type { Deal, DealStage, CreateDealRequest } from '@thanamol/shared'

export const Route = createFileRoute('/_authenticated/deals/')({
  component: DealPipelinePage,
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

type MoveDealDialogState = {
  deal: Deal
  targetStage: DealStage
} | null

function DealPipelinePage() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [moveDealDialog, setMoveDealDialog] = useState<MoveDealDialogState>(null)
  const [createForm, setCreateForm] = useState<CreateDealRequest>({ title: '' })

  const { data: pipelineData, isLoading } = useDealPipeline()
  const { data: customersData } = useCustomers({ limit: 200 })
  const createDeal = useCreateDeal()

  const pipeline = pipelineData?.pipeline ?? []
  const customers = customersData?.data ?? []

  const totalValue = pipeline
    .filter((g) => g.stage !== 'CLOSED_LOST')
    .reduce((sum, g) => sum + (g.totalValue ?? 0), 0)

  const activeCount = pipeline
    .filter((g) => g.stage !== 'CLOSED_WON' && g.stage !== 'CLOSED_LOST')
    .reduce((sum, g) => sum + g.count, 0)

  const wonCount = pipeline.find((g) => g.stage === 'CLOSED_WON')?.count ?? 0

  function getCustomerName(customerId: string | null): string {
    if (!customerId) return 'N/A'
    return customers.find((c) => c.id === customerId)?.name ?? 'N/A'
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!createForm.title) {
      toast.error('Title is required')
      return
    }
    try {
      await createDeal.mutateAsync(createForm)
      toast.success('Deal created')
      setCreateDialogOpen(false)
      setCreateForm({ title: '' })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create deal')
    }
  }

  return (
    <div className="space-y-3">
      <PageHeader
        title="Deal Pipeline"
        actions={
          <div className="flex gap-2">
            <Link to="/leads">
              <Button variant="outline">Leads</Button>
            </Link>
            <Button onClick={() => setCreateDialogOpen(true)} className="bg-indigo-600 hover:bg-indigo-700">
              <Plus className="w-4 h-4 mr-2" />
              New Deal
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card className="border border-slate-100 bg-white/90">
          <CardContent className="pt-5 pb-5 text-center">
            <p className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
              Total Pipeline Value
            </p>
            <p className="text-3xl font-extralight text-indigo-600 mt-1.5">
              ฿{totalValue.toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card className="border border-slate-100 bg-white/90">
          <CardContent className="pt-5 pb-5 text-center">
            <p className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
              Active Deals
            </p>
            <p className="text-3xl font-extralight text-slate-700 mt-1.5">{activeCount}</p>
          </CardContent>
        </Card>
        <Card className="border border-slate-100 bg-white/90">
          <CardContent className="pt-5 pb-5 text-center">
            <p className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
              Deals Won
            </p>
            <p className="text-3xl font-extralight text-teal-600 mt-1.5">{wonCount}</p>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="py-12 text-center text-slate-500">Loading pipeline...</CardContent>
        </Card>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {DEAL_STAGES.map((stage) => {
            const group = pipeline.find((g) => g.stage === stage)
            const stageDeals = group?.deals ?? []
            const stageValue = group?.totalValue ?? 0
            const stageCount = group?.count ?? 0

            return (
              <div key={stage} className="flex-shrink-0 w-72">
                <Card className="border border-slate-100 bg-white/90">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center justify-between text-sm font-light tracking-wider text-slate-700">
                      <span>{STAGE_LABELS[stage]}</span>
                      <Badge
                        variant="outline"
                        className={`${STAGE_CLASSES[stage]} text-[9px] h-4 px-1.5 font-extralight`}
                      >
                        {stageCount}
                      </Badge>
                    </CardTitle>
                    <p className="text-[10px] text-slate-400 mt-0.5 font-extralight">
                      ฿{stageValue.toLocaleString()}
                    </p>
                  </CardHeader>
                  <CardContent className="p-2 min-h-[200px] space-y-2">
                    {stageDeals.map((deal) => (
                      <DealCard
                        key={deal.id}
                        deal={deal}
                        customerName={getCustomerName(deal.customer_id)}
                        currentStage={stage}
                        onMoveStage={(targetStage) =>
                          setMoveDealDialog({ deal, targetStage })
                        }
                      />
                    ))}
                  </CardContent>
                </Card>
              </div>
            )
          })}
        </div>
      )}

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>New Deal</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Title *</Label>
                <Input
                  value={createForm.title}
                  onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                  placeholder="Deal title..."
                />
              </div>
              <div className="space-y-2">
                <Label>Customer</Label>
                <Select
                  value={createForm.customerId ?? ''}
                  onValueChange={(v) => setCreateForm({ ...createForm, customerId: v || undefined })}
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
              </div>
              <div className="space-y-2">
                <Label>Stage</Label>
                <Select
                  value={createForm.stage ?? 'PROSPECTING'}
                  onValueChange={(v) => setCreateForm({ ...createForm, stage: v as DealStage })}
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
                  value={createForm.value ?? ''}
                  onChange={(e) =>
                    setCreateForm({
                      ...createForm,
                      value: e.target.value ? parseFloat(e.target.value) : undefined,
                    })
                  }
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label>Expected Close Date</Label>
                <Input
                  type="date"
                  value={createForm.expectedCloseDate ?? ''}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, expectedCloseDate: e.target.value || undefined })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  value={createForm.notes ?? ''}
                  onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })}
                  placeholder="Additional notes..."
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-700"
                disabled={createDeal.isPending}
              >
                {createDeal.isPending ? 'Creating...' : 'Create Deal'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {moveDealDialog && (
        <MoveDealDialog
          deal={moveDealDialog.deal}
          targetStage={moveDealDialog.targetStage}
          onClose={() => setMoveDealDialog(null)}
        />
      )}
    </div>
  )
}

type DealCardProps = {
  deal: Deal
  customerName: string
  currentStage: DealStage
  onMoveStage: (stage: DealStage) => void
}

function DealCard({ deal, customerName, currentStage, onMoveStage }: DealCardProps) {
  const otherStages = DEAL_STAGES.filter((s) => s !== currentStage)

  return (
    <div className="bg-white border border-slate-100 rounded-lg p-3 hover:shadow-sm transition-shadow">
      <Link to="/deals/$dealId" params={{ dealId: deal.id }}>
        <h4 className="font-light text-slate-800 mb-1.5 text-[11px] hover:text-indigo-600">
          {deal.title}
        </h4>
      </Link>
      <p className="text-[10px] text-slate-600 mb-2 font-extralight">{customerName}</p>

      {deal.value != null && deal.value > 0 && (
        <div className="flex items-center text-[9px] text-slate-500 font-extralight mb-1">
          <DollarSign className="w-3 h-3 mr-1" />฿{deal.value.toLocaleString()}
        </div>
      )}

      {deal.expected_close_date && (
        <div className="flex items-center text-[9px] text-slate-500 font-extralight mb-1">
          <Calendar className="w-3 h-3 mr-1" />
          {new Date(deal.expected_close_date).toLocaleDateString('th-TH')}
        </div>
      )}

      {deal.probability != null && (
        <div className="flex items-center text-[9px] text-slate-500 font-extralight mb-1.5">
          <User className="w-3 h-3 mr-1" />
          {deal.probability}%
        </div>
      )}

      <Select value="" onValueChange={onMoveStage}>
        <SelectTrigger className="h-6 text-[9px] font-extralight border-slate-200 mt-1">
          <SelectValue placeholder="Move to..." />
        </SelectTrigger>
        <SelectContent>
          {otherStages.map((s) => (
            <SelectItem key={s} value={s} className="text-xs">
              {STAGE_LABELS[s]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

type MoveDealDialogProps = {
  deal: Deal
  targetStage: DealStage
  onClose: () => void
}

function MoveDealDialog({ deal, targetStage, onClose }: MoveDealDialogProps) {
  const updateDeal = useUpdateDeal(deal.id)

  async function handleConfirm() {
    try {
      await updateDeal.mutateAsync({ stage: targetStage })
      toast.success(`Deal moved to ${STAGE_LABELS[targetStage]}`)
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to move deal')
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Move Deal</DialogTitle>
        </DialogHeader>
        <div className="py-4 text-sm text-slate-600">
          Move <strong>{deal.title}</strong> to{' '}
          <strong>{STAGE_LABELS[targetStage]}</strong>?
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            className="bg-indigo-600 hover:bg-indigo-700"
            onClick={handleConfirm}
            disabled={updateDeal.isPending}
          >
            {updateDeal.isPending ? 'Moving...' : 'Confirm'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
