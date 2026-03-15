import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
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
import { Skeleton } from '@/components/ui/skeleton'
import { useHandoverById, useUpdateHandover } from '@/hooks/useHandovers'
import type { UpdateHandoverRequest, HandoverType, HandoverStatus } from '@thanamol/shared'

export const Route = createFileRoute('/_authenticated/contracts/handover/$id/edit')({
  component: HandoverEditPage,
})

const handoverSchema = z.object({
  handoverDate: z.string().min(1, 'Handover date is required'),
  handoverType: z.enum(['INITIAL', 'FINAL', 'PARTIAL']),
  status: z.enum(['PENDING', 'COMPLETED', 'REJECTED']),
  receivedBy: z.string().optional(),
  handedBy: z.string().optional(),
  notes: z.string().optional(),
})

type HandoverFormValues = z.infer<typeof handoverSchema>

function HandoverEditPage() {
  const { id } = Route.useParams()
  const navigate = useNavigate()
  const { data: handover, isLoading, isError } = useHandoverById(id)
  const updateHandover = useUpdateHandover()

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<HandoverFormValues>({
    resolver: zodResolver(handoverSchema),
    defaultValues: {
      handoverType: 'INITIAL',
      status: 'PENDING',
    },
  })

  useEffect(() => {
    if (handover) {
      reset({
        handoverDate: handover.handover_date.split('T')[0],
        handoverType: handover.handover_type,
        status: handover.status,
        receivedBy: handover.received_by ?? '',
        handedBy: handover.handed_by ?? '',
        notes: handover.notes ?? '',
      })
    }
  }, [handover, reset])

  const handoverTypeValue = watch('handoverType')
  const statusValue = watch('status')

  async function onSubmit(values: HandoverFormValues) {
    const payload: UpdateHandoverRequest = {
      handoverDate: values.handoverDate,
      handoverType: values.handoverType as HandoverType,
      status: values.status as HandoverStatus,
      receivedBy: values.receivedBy || undefined,
      handedBy: values.handedBy || undefined,
      notes: values.notes || undefined,
    }

    try {
      await updateHandover.mutateAsync({ id, data: payload })
      toast.success('Handover updated successfully')
      navigate({ to: '/contracts/handover/$id', params: { id } })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update handover')
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-3 max-w-4xl">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (isError || !handover) {
    return (
      <div className="space-y-3 max-w-4xl">
        <div className="flex items-center space-x-3 mb-4">
          <Link to="/contracts/handover">
            <Button variant="outline" size="icon" className="h-8 w-8">
              <ArrowLeft className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>
        <p className="text-slate-500">Handover not found.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3 max-w-4xl">
      <div className="flex items-center space-x-3 mb-4">
        <Link to="/contracts/handover/$id" params={{ id }}>
          <Button variant="outline" size="icon" className="h-8 w-8">
            <ArrowLeft className="w-3.5 h-3.5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-extralight tracking-[0.3em] text-slate-600 uppercase">
            Edit Handover
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
              <Label>Contract ID</Label>
              <p className="text-sm text-slate-600 font-light">{handover.contract_id}</p>
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
                <Label htmlFor="handoverType">Type</Label>
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
          <Link to="/contracts/handover/$id" params={{ id }}>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button
            type="submit"
            className="bg-indigo-600 hover:bg-indigo-700"
            disabled={updateHandover.isPending}
          >
            <Save className="w-4 h-4 mr-2" />
            {updateHandover.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </div>
  )
}
