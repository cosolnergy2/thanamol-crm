import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { ArrowLeft, Save, ArrowRight, Building2 } from 'lucide-react'
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
import { useLead, useUpdateLead } from '@/hooks/useLeads'
import { useCreateDeal } from '@/hooks/useDeals'
import { useCustomers } from '@/hooks/useCustomers'
import type { UpdateLeadRequest, LeadStatus } from '@thanamol/shared'

export const Route = createFileRoute('/_authenticated/leads/$leadId')({
  component: LeadDetailPage,
})

const LEAD_STATUS_CLASSES: Record<string, string> = {
  NEW: 'bg-slate-100 text-slate-700',
  CONTACTED: 'bg-blue-100 text-blue-700',
  QUALIFIED: 'bg-indigo-100 text-indigo-700',
  UNQUALIFIED: 'bg-rose-100 text-rose-700',
  CONVERTED: 'bg-teal-100 text-teal-700',
}

const LEAD_STATUS_LABELS: Record<string, string> = {
  NEW: 'New',
  CONTACTED: 'Contacted',
  QUALIFIED: 'Qualified',
  UNQUALIFIED: 'Unqualified',
  CONVERTED: 'Converted',
}

const LEAD_STATUSES: LeadStatus[] = ['NEW', 'CONTACTED', 'QUALIFIED', 'UNQUALIFIED', 'CONVERTED']

function LeadDetailPage() {
  const { leadId } = Route.useParams()
  const navigate = useNavigate()

  const { data, isLoading } = useLead(leadId)
  const { data: customersData } = useCustomers({ limit: 200 })

  const updateLead = useUpdateLead(leadId)
  const createDeal = useCreateDeal()

  const [formData, setFormData] = useState<UpdateLeadRequest>({})

  useEffect(() => {
    if (data?.lead) {
      const lead = data.lead
      setFormData({
        title: lead.title,
        customerId: lead.customer_id ?? undefined,
        contactId: lead.contact_id ?? undefined,
        source: lead.source ?? undefined,
        status: lead.status,
        value: lead.value ?? undefined,
        probability: lead.probability ?? undefined,
        expectedCloseDate: lead.expected_close_date ?? undefined,
        notes: lead.notes ?? undefined,
        assignedTo: lead.assigned_to ?? undefined,
      })
    }
  }, [data?.lead])

  const customers = customersData?.data ?? []
  const customer = customers.find((c) => c.id === formData.customerId)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    try {
      await updateLead.mutateAsync(formData)
      toast.success('Lead updated')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update lead')
    }
  }

  async function handleConvertToDeal() {
    if (!data?.lead) return
    const lead = data.lead
    try {
      await createDeal.mutateAsync({
        title: lead.title,
        customerId: lead.customer_id ?? undefined,
        leadId: lead.id,
        stage: 'PROSPECTING',
        value: lead.value ?? undefined,
        assignedTo: lead.assigned_to ?? undefined,
        notes: lead.notes ?? undefined,
      })
      toast.success('Lead converted to Deal')
      navigate({ to: '/deals' })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to convert lead')
    }
  }

  if (isLoading) {
    return <div className="py-12 text-center text-slate-500">Loading...</div>
  }

  if (!data?.lead) {
    return <div className="py-12 text-center text-slate-500">Lead not found</div>
  }

  const lead = data.lead
  const canConvert = lead.status !== 'CONVERTED' && lead.status !== 'UNQUALIFIED'

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link to="/leads">
            <Button variant="outline" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-extralight tracking-[0.3em] text-slate-600 uppercase">
                Lead Detail
              </h1>
              <Badge className={`${LEAD_STATUS_CLASSES[formData.status ?? lead.status]} text-[9px] h-4 px-1.5 font-extralight`}>
                {LEAD_STATUS_LABELS[formData.status ?? lead.status]}
              </Badge>
            </div>
            <p className="mt-1 text-sm text-slate-600 font-extralight">
              {customer?.name ?? 'No customer linked'}
            </p>
          </div>
        </div>
        {canConvert && (
          <Button
            onClick={handleConvertToDeal}
            disabled={createDeal.isPending}
            className="bg-teal-600 hover:bg-teal-700"
          >
            <ArrowRight className="w-4 h-4 mr-2" />
            {createDeal.isPending ? 'Converting...' : 'Convert to Deal'}
          </Button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-sm font-light tracking-wider text-slate-700">
              <Building2 className="w-4 h-4 mr-2 text-indigo-600" />
              Customer
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Customer</Label>
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
            </div>

            {customer && (
              <div className="p-4 bg-slate-50 rounded-lg space-y-1 text-sm">
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

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-light tracking-wider text-slate-700">
              Lead Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input
                value={formData.title ?? ''}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Lead title..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={formData.status ?? ''}
                  onValueChange={(v) => setFormData({ ...formData, status: v as LeadStatus })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LEAD_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {LEAD_STATUS_LABELS[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Source</Label>
                <Input
                  value={formData.source ?? ''}
                  onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                  placeholder="Facebook, Walk-in, Referral..."
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Value (THB)</Label>
                <Input
                  type="number"
                  value={formData.value ?? ''}
                  onChange={(e) =>
                    setFormData({ ...formData, value: e.target.value ? parseFloat(e.target.value) : undefined })
                  }
                  placeholder="0"
                />
              </div>

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

        <div className="flex items-center justify-end space-x-3 pb-8">
          <Link to="/leads">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button
            type="submit"
            className="bg-indigo-600 hover:bg-indigo-700"
            disabled={updateLead.isPending}
          >
            <Save className="w-4 h-4 mr-2" />
            {updateLead.isPending ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </form>
    </div>
  )
}
