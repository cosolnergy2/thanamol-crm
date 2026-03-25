import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { PageHeader } from '@/components/PageHeader'
import { useCreatePettyCashFund } from '@/hooks/usePettyCash'
import { useProjects } from '@/hooks/useProjects'

export const Route = createFileRoute(
  '/_authenticated/facility-management/petty-cash/funds/create'
)({
  component: CreatePettyCashFundPage,
})

function CreatePettyCashFundPage() {
  const navigate = useNavigate()
  const [projectId, setProjectId] = useState('')
  const [fundName, setFundName] = useState('')
  const [totalAmount, setTotalAmount] = useState('')

  const { data: projectsData } = useProjects({ limit: 100 })
  const projects = projectsData?.data ?? []

  const createFund = useCreatePettyCashFund()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!projectId || !fundName || !totalAmount) {
      toast.error('Please fill in all required fields')
      return
    }

    const amount = parseFloat(totalAmount)
    if (isNaN(amount) || amount <= 0) {
      toast.error('Total amount must be a positive number')
      return
    }

    try {
      await createFund.mutateAsync({ projectId, fundName, totalAmount: amount })
      toast.success('Petty cash fund created')
      navigate({ to: '/facility-management/petty-cash' })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create fund')
    }
  }

  return (
    <div className="max-w-xl space-y-4">
      <PageHeader title="Create Petty Cash Fund" />

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-light">Fund Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label>
                Project <span className="text-red-500">*</span>
              </Label>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>
                Fund Name <span className="text-red-500">*</span>
              </Label>
              <Input
                value={fundName}
                onChange={(e) => setFundName(e.target.value)}
                placeholder="e.g. Office Petty Cash Fund"
              />
            </div>

            <div className="space-y-1.5">
              <Label>
                Total Amount (฿) <span className="text-red-500">*</span>
              </Label>
              <Input
                type="number"
                value={totalAmount}
                onChange={(e) => setTotalAmount(e.target.value)}
                placeholder="0.00"
                step="0.01"
                min="0.01"
              />
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate({ to: '/facility-management/petty-cash' })}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-700"
                disabled={createFund.isPending}
              >
                {createFund.isPending ? 'Creating...' : 'Create Fund'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
