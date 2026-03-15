import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, Save, ClipboardList } from 'lucide-react'
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
import { useCreateHandover } from '@/hooks/useHandovers'
import type { CreateHandoverRequest, HandoverType, HandoverStatus } from '@thanamol/shared'

export const Route = createFileRoute('/_authenticated/contracts/handover/new')({
  component: HandoverNewPage,
})

const handoverSchema = z.object({
  contractId: z.string().min(1, 'Contract ID is required'),
  handoverDate: z.string().min(1, 'Handover date is required'),
  handoverType: z.enum(['INITIAL', 'FINAL', 'PARTIAL']),
  status: z.enum(['PENDING', 'COMPLETED', 'REJECTED']),
  receivedBy: z.string().optional(),
  handedBy: z.string().optional(),
  notes: z.string().optional(),
})

type HandoverFormValues = z.infer<typeof handoverSchema>

function HandoverNewPage() {
  const navigate = useNavigate()
  const createHandover = useCreateHandover()

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<HandoverFormValues>({
    resolver: zodResolver(handoverSchema),
    defaultValues: {
      handoverDate: new Date().toISOString().split('T')[0],
      handoverType: 'INITIAL',
      status: 'PENDING',
    },
  })

  const handoverTypeValue = watch('handoverType')
  const statusValue = watch('status')

  async function onSubmit(values: HandoverFormValues) {
    const payload: CreateHandoverRequest = {
      contractId: values.contractId,
      handoverDate: values.handoverDate,
      handoverType: values.handoverType as HandoverType,
      status: values.status as HandoverStatus,
      receivedBy: values.receivedBy || undefined,
      handedBy: values.handedBy || undefined,
      notes: values.notes || undefined,
    }

    try {
      const created = await createHandover.mutateAsync(payload)
      toast.success('Handover created successfully')
      navigate({ to: '/contracts/handover/$id', params: { id: created.id } })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create handover')
    }
  }

  return (
    <div className="space-y-3 max-w-4xl">
      <div className="flex items-center space-x-3 mb-4">
        <Link to="/contracts/handover">
          <Button variant="outline" size="icon" className="h-8 w-8">
            <ArrowLeft className="w-3.5 h-3.5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-extralight tracking-[0.3em] text-slate-600 uppercase">
            New Handover
          </h1>
          <div className="h-px w-20 bg-gradient-to-r from-slate-300 to-transparent mt-2" />
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <Card className="mb-3">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center text-sm font-light tracking-wider text-slate-700">
              <ClipboardList className="w-4 h-4 mr-2 text-indigo-600" />
              Handover Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-0">
            <div className="space-y-2">
              <Label htmlFor="contractId">
                Contract ID <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="contractId"
                {...register('contractId')}
                placeholder="Enter contract ID"
              />
              {errors.contractId && (
                <p className="text-xs text-rose-600">{errors.contractId.message}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="handoverDate">
                  Handover Date <span className="text-rose-500">*</span>
                </Label>
                <Input id="handoverDate" type="date" {...register('handoverDate')} />
                {errors.handoverDate && (
                  <p className="text-xs text-rose-600">{errors.handoverDate.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="handoverType">
                  Type <span className="text-rose-500">*</span>
                </Label>
                <Select
                  value={handoverTypeValue}
                  onValueChange={(v) =>
                    setValue('handoverType', v as HandoverFormValues['handoverType'])
                  }
                >
                  <SelectTrigger id="handoverType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INITIAL">Initial</SelectItem>
                    <SelectItem value="FINAL">Final</SelectItem>
                    <SelectItem value="PARTIAL">Partial</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={statusValue}
                onValueChange={(v) =>
                  setValue('status', v as HandoverFormValues['status'])
                }
              >
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="REJECTED">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="receivedBy">Received By</Label>
                <Input
                  id="receivedBy"
                  {...register('receivedBy')}
                  placeholder="Name of recipient"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="handedBy">Handed By</Label>
                <Input
                  id="handedBy"
                  {...register('handedBy')}
                  placeholder="Name of sender"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                {...register('notes')}
                placeholder="Additional notes..."
                rows={4}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-end space-x-3 pb-8">
          <Link to="/contracts/handover">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button
            type="submit"
            className="bg-indigo-600 hover:bg-indigo-700"
            disabled={createHandover.isPending}
          >
            <Save className="w-4 h-4 mr-2" />
            {createHandover.isPending ? 'Saving...' : 'Create Handover'}
          </Button>
        </div>
      </form>
    </div>
  )
}
