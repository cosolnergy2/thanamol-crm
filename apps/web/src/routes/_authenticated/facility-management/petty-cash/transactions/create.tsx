import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
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
import { useCreatePettyCashTransaction } from '@/hooks/usePettyCash'
import { usePettyCashFunds } from '@/hooks/usePettyCash'
import { useProjects } from '@/hooks/useProjects'
import { useAuth } from '@/providers/AuthProvider'
import { PETTY_CASH_CATEGORIES } from '@thanamol/shared'

export const Route = createFileRoute(
  '/_authenticated/facility-management/petty-cash/transactions/create'
)({
  component: CreatePettyCashTransactionPage,
})

function CreatePettyCashTransactionPage() {
  const navigate = useNavigate()
  const { currentUser: user } = useAuth()

  const [projectId, setProjectId] = useState('')
  const [fundId, setFundId] = useState('')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [transactionDate, setTransactionDate] = useState(
    new Date().toISOString().split('T')[0]
  )
  const [notes, setNotes] = useState('')

  const { data: projectsData } = useProjects({ limit: 100 })
  const projects = projectsData?.data ?? []

  const { data: fundsData } = usePettyCashFunds({
    projectId: projectId || undefined,
  })
  const funds = fundsData?.data ?? []

  const createTransaction = useCreatePettyCashTransaction()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!fundId || !projectId || !amount || !description || !transactionDate) {
      toast.error('Please fill in all required fields')
      return
    }

    if (!user?.id) {
      toast.error('User session not found. Please log in again.')
      return
    }

    const parsedAmount = parseFloat(amount)
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error('Amount must be a positive number')
      return
    }

    try {
      await createTransaction.mutateAsync({
        fundId,
        projectId,
        amount: parsedAmount,
        description,
        category: category || undefined,
        requestedBy: user.id,
        transactionDate,
        notes: notes || undefined,
      })
      toast.success('Transaction created and pending approval')
      navigate({ to: '/facility-management/petty-cash' })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create transaction')
    }
  }

  return (
    <div className="max-w-xl space-y-4">
      <PageHeader title="Create Petty Cash Transaction" />

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-light">Transaction Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>
                  Project <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={projectId}
                  onValueChange={(v) => {
                    setProjectId(v)
                    setFundId('')
                  }}
                >
                  <SelectTrigger>
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
              </div>

              <div className="space-y-1.5">
                <Label>
                  Fund <span className="text-red-500">*</span>
                </Label>
                <Select value={fundId} onValueChange={setFundId} disabled={!projectId}>
                  <SelectTrigger>
                    <SelectValue placeholder={projectId ? 'Select fund' : 'Select project first'} />
                  </SelectTrigger>
                  <SelectContent>
                    {funds.map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.fund_name} (฿{f.current_balance.toLocaleString()})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>
                  Amount (฿) <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  step="0.01"
                  min="0.01"
                />
              </div>

              <div className="space-y-1.5">
                <Label>
                  Transaction Date <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="date"
                  value={transactionDate}
                  onChange={(e) => setTransactionDate(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>
                Description <span className="text-red-500">*</span>
              </Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What is this expense for?"
                className="h-20"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {PETTY_CASH_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c.replace(/_/g, ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional notes (optional)"
                className="h-16"
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
                disabled={createTransaction.isPending}
              >
                {createTransaction.isPending ? 'Submitting...' : 'Submit Request'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
