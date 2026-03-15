import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { ArrowLeft, Save, FileText } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
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
import { useLeaseAgreementById, useUpdateLeaseAgreement } from '@/hooks/useLeaseAgreements'
import type { LeaseStatus } from '@thanamol/shared'

export const Route = createFileRoute('/_authenticated/forms/sale-job02-f01/$id/edit')({
  component: LeaseAgreementEditPage,
})

function LeaseAgreementEditPage() {
  const { id } = Route.useParams()
  const navigate = useNavigate()

  const [initialized, setInitialized] = useState(false)
  const [status, setStatus] = useState<LeaseStatus>('DRAFT')
  const [specialConditions, setSpecialConditions] = useState('')
  const [leaseTermsText, setLeaseTermsText] = useState('')

  const { data, isLoading } = useLeaseAgreementById(id)
  const agreement = data?.leaseAgreement

  const updateAgreement = useUpdateLeaseAgreement()

  useEffect(() => {
    if (agreement && !initialized) {
      setStatus(agreement.status as LeaseStatus)
      setSpecialConditions(agreement.special_conditions ?? '')
      setLeaseTermsText(
        Object.keys(agreement.lease_terms).length > 0
          ? JSON.stringify(agreement.lease_terms, null, 2)
          : '',
      )
      setInitialized(true)
    }
  }, [agreement, initialized])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    let leaseTerms: Record<string, unknown> | undefined
    if (leaseTermsText.trim()) {
      try {
        leaseTerms = JSON.parse(leaseTermsText)
      } catch {
        leaseTerms = { notes: leaseTermsText }
      }
    }

    try {
      await updateAgreement.mutateAsync({
        id,
        data: {
          status,
          specialConditions: specialConditions || undefined,
          leaseTerms,
        },
      })
      toast.success('Lease agreement updated successfully')
      navigate({ to: '/forms/sale-job02-f01/$id', params: { id } })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update lease agreement')
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-60 w-full" />
      </div>
    )
  }

  if (!agreement) {
    return (
      <div className="text-center py-16">
        <p className="text-slate-600">Lease agreement not found.</p>
        <Link to="/forms/sale-job02-f01">
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
        title={`Edit — ${agreement.contract.contract_number}`}
        actions={
          <Link to="/forms/sale-job02-f01/$id" params={{ id }}>
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
              <FileText className="w-4 h-4 mr-2 text-indigo-600" />
              Lease Agreement Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Contract</Label>
                <p className="text-sm font-light text-slate-700 py-2 px-3 bg-slate-50 rounded-md border border-slate-200">
                  {agreement.contract.contract_number}
                </p>
                <p className="text-[11px] text-slate-400">Contract cannot be changed after creation.</p>
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as LeaseStatus)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DRAFT">Draft</SelectItem>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="EXPIRED">Expired</SelectItem>
                    <SelectItem value="TERMINATED">Terminated</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-light tracking-wider text-slate-700">
              Lease Terms
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Lease Terms (JSON or plain text)</Label>
              <Textarea
                value={leaseTermsText}
                onChange={(e) => setLeaseTermsText(e.target.value)}
                placeholder='Enter lease terms as JSON, e.g. {"duration": "12 months", "rent": 50000}'
                rows={5}
                className="font-mono text-sm"
              />
              <p className="text-[11px] text-slate-400">
                You can enter JSON or plain text. Plain text will be stored under the "notes" key.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="space-y-2">
              <Label>Special Conditions</Label>
              <Textarea
                value={specialConditions}
                onChange={(e) => setSpecialConditions(e.target.value)}
                placeholder="Enter any special conditions for this lease agreement..."
                rows={4}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-3 pb-8">
          <Link to="/forms/sale-job02-f01/$id" params={{ id }}>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button
            type="submit"
            className="bg-indigo-600 hover:bg-indigo-700"
            disabled={updateAgreement.isPending}
          >
            <Save className="w-4 h-4 mr-2" />
            {updateAgreement.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </div>
  )
}
