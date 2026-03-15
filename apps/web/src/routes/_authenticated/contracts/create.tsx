import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { ArrowLeft, Save, FileSignature } from 'lucide-react'
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
import { useCreateContract } from '@/hooks/useContracts'
import { useCustomers } from '@/hooks/useCustomers'
import { useProjects } from '@/hooks/useProjects'
import { useUnits } from '@/hooks/useUnits'
import type { ContractType } from '@thanamol/shared'

export const Route = createFileRoute('/_authenticated/contracts/create')({
  component: ContractCreatePage,
})

function ContractCreatePage() {
  const navigate = useNavigate()

  const [customerId, setCustomerId] = useState('')
  const [projectId, setProjectId] = useState('')
  const [unitId, setUnitId] = useState('')
  const [quotationId, setQuotationId] = useState('')
  const [type, setType] = useState<ContractType>('RENTAL')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [value, setValue] = useState<number>(0)
  const [monthlyRent, setMonthlyRent] = useState<number | ''>('')
  const [depositAmount, setDepositAmount] = useState<number | ''>('')
  const [terms, setTerms] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const { data: customersData } = useCustomers({ limit: 200 })
  const { data: projectsData } = useProjects({ limit: 200 })
  const { data: unitsData } = useUnits({ projectId: projectId || undefined, limit: 200 })

  const customers = customersData?.data ?? []
  const projects = projectsData?.data ?? []
  const units = unitsData?.data ?? []

  const createContract = useCreateContract()

  function validate(): boolean {
    const next: Record<string, string> = {}
    if (!customerId) next.customerId = 'Customer is required'
    if (!projectId) next.projectId = 'Project is required'
    if (!startDate) next.startDate = 'Start date is required'
    if (endDate && endDate < startDate) next.endDate = 'End date must be after start date'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return

    try {
      await createContract.mutateAsync({
        customerId,
        projectId,
        unitId: unitId || undefined,
        quotationId: quotationId || undefined,
        type,
        startDate,
        endDate: endDate || undefined,
        value: value || undefined,
        monthlyRent: monthlyRent !== '' ? Number(monthlyRent) : undefined,
        depositAmount: depositAmount !== '' ? Number(depositAmount) : undefined,
        terms: terms || undefined,
        status: 'DRAFT',
      })
      toast.success('Contract created successfully')
      navigate({ to: '/contracts' })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create contract')
    }
  }

  return (
    <div className="space-y-3 max-w-5xl">
      <PageHeader
        title="New Contract"
        actions={
          <Link to="/contracts">
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
              <FileSignature className="w-4 h-4 mr-2 text-indigo-600" />
              Contract Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Customer *</Label>
                <Select value={customerId} onValueChange={setCustomerId}>
                  <SelectTrigger className={errors.customerId ? 'border-rose-400' : ''}>
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
                  <p className="text-xs text-rose-500">{errors.customerId}</p>
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
                  <SelectTrigger className={errors.projectId ? 'border-rose-400' : ''}>
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
                  <p className="text-xs text-rose-500">{errors.projectId}</p>
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
                <Select value={type} onValueChange={(v) => setType(v as ContractType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SALE">Sale</SelectItem>
                    <SelectItem value="LEASE">Lease</SelectItem>
                    <SelectItem value="RENTAL">Rental</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Start Date *</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className={errors.startDate ? 'border-rose-400' : ''}
                />
                {errors.startDate && (
                  <p className="text-xs text-rose-500">{errors.startDate}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={endDate}
                  min={startDate || undefined}
                  onChange={(e) => setEndDate(e.target.value)}
                  className={errors.endDate ? 'border-rose-400' : ''}
                />
                {errors.endDate && (
                  <p className="text-xs text-rose-500">{errors.endDate}</p>
                )}
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Contract Value (฿)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={value}
                  onChange={(e) => setValue(Number(e.target.value))}
                  placeholder="0"
                />
              </div>

              {(type === 'LEASE' || type === 'RENTAL') && (
                <div className="space-y-2">
                  <Label>Monthly Rent (฿)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={monthlyRent}
                    onChange={(e) =>
                      setMonthlyRent(e.target.value === '' ? '' : Number(e.target.value))
                    }
                    placeholder="0"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label>Deposit Amount (฿)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={depositAmount}
                  onChange={(e) =>
                    setDepositAmount(e.target.value === '' ? '' : Number(e.target.value))
                  }
                  placeholder="0"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="space-y-2">
              <Label>Terms & Conditions</Label>
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
          <Link to="/contracts">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button
            type="submit"
            className="bg-indigo-600 hover:bg-indigo-700"
            disabled={createContract.isPending}
          >
            <Save className="w-4 h-4 mr-2" />
            {createContract.isPending ? 'Saving...' : 'Save Contract'}
          </Button>
        </div>
      </form>
    </div>
  )
}
