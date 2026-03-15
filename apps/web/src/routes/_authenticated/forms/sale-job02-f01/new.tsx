import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
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
import { PageHeader } from '@/components/PageHeader'
import { useCreateLeaseAgreement } from '@/hooks/useLeaseAgreements'
import { useContracts } from '@/hooks/useContracts'
import type { LeaseStatus } from '@thanamol/shared'

export const Route = createFileRoute('/_authenticated/forms/sale-job02-f01/new')({
  component: LeaseAgreementNewPage,
})

type FormErrors = Partial<Record<string, string>>

function validate(fields: { contractId: string }): FormErrors {
  const errors: FormErrors = {}
  if (!fields.contractId) errors.contractId = 'Contract is required'
  return errors
}

function LeaseAgreementNewPage() {
  const navigate = useNavigate()

  const [contractId, setContractId] = useState('')
  const [status, setStatus] = useState<LeaseStatus>('DRAFT')
  const [specialConditions, setSpecialConditions] = useState('')
  const [leaseTermsText, setLeaseTermsText] = useState('')
  const [errors, setErrors] = useState<FormErrors>({})

  const { data: contractsData } = useContracts({ limit: 200 })
  const contracts = contractsData?.data ?? []

  const createAgreement = useCreateLeaseAgreement()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const validationErrors = validate({ contractId })
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }
    setErrors({})

    let leaseTerms: Record<string, unknown> = {}
    if (leaseTermsText.trim()) {
      try {
        leaseTerms = JSON.parse(leaseTermsText)
      } catch {
        leaseTerms = { notes: leaseTermsText }
      }
    }

    try {
      await createAgreement.mutateAsync({
        contractId,
        status,
        specialConditions: specialConditions || undefined,
        leaseTerms: Object.keys(leaseTerms).length > 0 ? leaseTerms : undefined,
      })
      toast.success('Lease agreement created successfully')
      navigate({ to: '/forms/sale-job02-f01' })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create lease agreement')
    }
  }

  return (
    <div className="space-y-3 max-w-5xl">
      <PageHeader
        title="New Lease Agreement"
        actions={
          <Link to="/forms/sale-job02-f01">
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
          <Link to="/forms/sale-job02-f01">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button
            type="submit"
            className="bg-indigo-600 hover:bg-indigo-700"
            disabled={createAgreement.isPending}
          >
            <Save className="w-4 h-4 mr-2" />
            {createAgreement.isPending ? 'Saving...' : 'Save Lease Agreement'}
          </Button>
        </div>
      </form>
    </div>
  )
}
