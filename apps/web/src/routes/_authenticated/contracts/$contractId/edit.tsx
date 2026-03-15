import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { ArrowLeft, Save, FileText } from 'lucide-react'
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
import { useContractById, useUpdateContract } from '@/hooks/useContracts'
import { useCustomers } from '@/hooks/useCustomers'
import { useProjects } from '@/hooks/useProjects'
import { useUnits } from '@/hooks/useUnits'

export const Route = createFileRoute('/_authenticated/contracts/$contractId/edit')({
  component: ContractEditPage,
})

type FormErrors = Partial<Record<string, string>>

function validate(fields: {
  customerId: string
  projectId: string
  type: string
  startDate: string
  contractValue: string
}): FormErrors {
  const errors: FormErrors = {}
  if (!fields.customerId) errors.customerId = 'Customer is required'
  if (!fields.projectId) errors.projectId = 'Project is required'
  if (!fields.type) errors.type = 'Contract type is required'
  if (!fields.startDate) errors.startDate = 'Start date is required'
  if (!fields.contractValue || Number(fields.contractValue) <= 0)
    errors.contractValue = 'Contract value must be greater than 0'
  return errors
}

function ContractEditPage() {
  const { contractId } = Route.useParams()
  const navigate = useNavigate()

  const [initialized, setInitialized] = useState(false)
  const [customerId, setCustomerId] = useState('')
  const [projectId, setProjectId] = useState('')
  const [unitId, setUnitId] = useState('')
  const [type, setType] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [contractValue, setContractValue] = useState('')
  const [monthlyRent, setMonthlyRent] = useState('')
  const [depositAmount, setDepositAmount] = useState('')
  const [terms, setTerms] = useState('')
  const [errors, setErrors] = useState<FormErrors>({})

  const { data, isLoading } = useContractById(contractId)
  const contract = data?.contract

  const { data: customersData } = useCustomers({ limit: 200 })
  const { data: projectsData } = useProjects({ limit: 200 })
  const { data: unitsData } = useUnits({ projectId: projectId || undefined, limit: 200 })

  const customers = customersData?.data ?? []
  const projects = projectsData?.data ?? []
  const units = unitsData?.data ?? []

  const updateContract = useUpdateContract()

  useEffect(() => {
    if (contract && !initialized) {
      setCustomerId(contract.customer_id)
      setProjectId(contract.project_id)
      setUnitId(contract.unit_id ?? '')
      setType(contract.type)
      setStartDate(contract.start_date.split('T')[0])
      setEndDate(contract.end_date ? contract.end_date.split('T')[0] : '')
      setContractValue(String(contract.value ?? ''))
      setMonthlyRent(contract.monthly_rent ? String(contract.monthly_rent) : '')
      setDepositAmount(contract.deposit_amount ? String(contract.deposit_amount) : '')
      setTerms(contract.terms ?? '')
      setInitialized(true)
    }
  }, [contract, initialized])

  const isLeaseOrRental = type === 'LEASE' || type === 'RENTAL'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const validationErrors = validate({ customerId, projectId, type, startDate, contractValue })
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

    setErrors({})

    try {
      await updateContract.mutateAsync({
        id: contractId,
        data: {
          customerId,
          projectId,
          unitId: unitId || undefined,
          type: type as 'SALE' | 'LEASE' | 'RENTAL',
          startDate,
          endDate: endDate || undefined,
          value: Number(contractValue),
          monthlyRent: monthlyRent ? Number(monthlyRent) : undefined,
          depositAmount: depositAmount ? Number(depositAmount) : undefined,
          terms: terms || undefined,
        },
      })
      toast.success('Contract updated successfully')
      navigate({ to: '/contracts/$contractId', params: { contractId } })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update contract')
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

  if (!contract) {
    return (
      <div className="text-center py-16">
        <p className="text-slate-600">Contract not found.</p>
        <Link to="/contracts">
          <Button variant="outline" className="mt-4">
            Back to Contracts
          </Button>
        </Link>
      </div>
    )
  }

  if (contract.status !== 'DRAFT') {
    return (
      <div className="text-center py-16">
        <p className="text-slate-600">Only DRAFT contracts can be edited.</p>
        <Link to="/contracts/$contractId" params={{ contractId }}>
          <Button variant="outline" className="mt-4">
            View Contract
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-3 max-w-5xl">
      <PageHeader
        title={`Edit ${contract.contract_number}`}
        actions={
          <Link to="/contracts/$contractId" params={{ contractId }}>
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
              Contract Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Customer *</Label>
                <Select value={customerId} onValueChange={setCustomerId}>
                  <SelectTrigger className={errors.customerId ? 'border-rose-500' : ''}>
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
                {errors.customerId && (
                  <p className="text-[11px] text-rose-600">{errors.customerId}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Project *</Label>
                <Select
                  value={projectId}
                  onValueChange={(v) => {
                    setProjectId(v)
                    setUnitId('')
                  }}
                >
                  <SelectTrigger className={errors.projectId ? 'border-rose-500' : ''}>
                    <SelectValue placeholder="Select project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.projectId && (
                  <p className="text-[11px] text-rose-600">{errors.projectId}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Unit</Label>
                <Select value={unitId} onValueChange={setUnitId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select unit (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {units.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.unit_number}
                        {u.floor ? ` — Floor ${u.floor}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Contract Type *</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger className={errors.type ? 'border-rose-500' : ''}>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SALE">Sale</SelectItem>
                    <SelectItem value="LEASE">Lease</SelectItem>
                    <SelectItem value="RENTAL">Rental</SelectItem>
                  </SelectContent>
                </Select>
                {errors.type && <p className="text-[11px] text-rose-600">{errors.type}</p>}
              </div>

              <div className="space-y-2">
                <Label>Start Date *</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className={errors.startDate ? 'border-rose-500' : ''}
                />
                {errors.startDate && (
                  <p className="text-[11px] text-rose-600">{errors.startDate}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={endDate}
                  min={startDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-light tracking-wider text-slate-700">
              Financial Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Contract Value (THB) *</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={contractValue}
                  onChange={(e) => setContractValue(e.target.value)}
                  placeholder="0.00"
                  className={errors.contractValue ? 'border-rose-500' : ''}
                />
                {errors.contractValue && (
                  <p className="text-[11px] text-rose-600">{errors.contractValue}</p>
                )}
              </div>

              {isLeaseOrRental && (
                <div className="space-y-2">
                  <Label>Monthly Rent (THB)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={monthlyRent}
                    onChange={(e) => setMonthlyRent(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label>Deposit Amount (THB)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  placeholder="0.00"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="space-y-2">
              <Label>Terms &amp; Conditions</Label>
              <Textarea
                value={terms}
                onChange={(e) => setTerms(e.target.value)}
                placeholder="Enter contract terms and conditions..."
                rows={4}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-3 pb-8">
          <Link to="/contracts/$contractId" params={{ contractId }}>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button
            type="submit"
            className="bg-indigo-600 hover:bg-indigo-700"
            disabled={updateContract.isPending}
          >
            <Save className="w-4 h-4 mr-2" />
            {updateContract.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </div>
  )
}
