import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, Save, Briefcase } from 'lucide-react'
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
import { useSaleJob, useUpdateSaleJob } from '@/hooks/useSaleJobs'
import type { SaleJobStatus } from '@thanamol/shared'

export const Route = createFileRoute('/_authenticated/forms/sale-job04-f01/$id/edit')({
  component: SaleJob04F01EditPage,
})

const schema = z.object({
  projectId: z.string().min(1, 'Project is required'),
  customerId: z.string().min(1, 'Customer is required'),
  unitId: z.string().optional(),
  status: z.enum(['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED']),
  invoiceDate: z.string().optional(),
  companyName: z.string().optional(),
  notes: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

function SaleJob04F01EditPage() {
  const { id } = Route.useParams()
  const navigate = useNavigate()
  const { data: job, isLoading } = useSaleJob(id)
  const updateJob = useUpdateSaleJob()

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { status: 'DRAFT' },
  })

  useEffect(() => {
    if (!job) return
    const fd = job.form_data as Record<string, unknown>
    reset({
      projectId: job.project_id,
      customerId: job.customer_id,
      unitId: job.unit_id ?? undefined,
      status: job.status as FormValues['status'],
      invoiceDate: fd.invoiceDate ? String(fd.invoiceDate) : undefined,
      companyName: fd.companyName ? String(fd.companyName) : undefined,
      notes: fd.notes ? String(fd.notes) : undefined,
    })
  }, [job, reset])

  const statusValue = watch('status')

  async function onSubmit(values: FormValues) {
    try {
      await updateJob.mutateAsync({
        id,
        data: {
          projectId: values.projectId,
          customerId: values.customerId,
          unitId: values.unitId || undefined,
          status: values.status as SaleJobStatus,
          formData: {
            invoiceDate: values.invoiceDate,
            companyName: values.companyName,
            notes: values.notes,
          },
        },
      })
      toast.success('Sale job updated successfully')
      navigate({ to: '/forms/sale-job04-f01/$id', params: { id } })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update sale job')
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-3 max-w-4xl">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-3 max-w-4xl">
      <div className="flex items-center space-x-3 mb-4">
        <Link to="/forms/sale-job04-f01/$id" params={{ id }}>
          <Button variant="outline" size="icon" className="h-8 w-8">
            <ArrowLeft className="w-3.5 h-3.5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-extralight tracking-[0.3em] text-slate-600 uppercase">
            Edit Sale Job
          </h1>
          <div className="h-px w-20 bg-gradient-to-r from-slate-300 to-transparent mt-2" />
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <Card className="mb-3">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center text-sm font-light tracking-wider text-slate-700">
              <Briefcase className="w-4 h-4 mr-2 text-indigo-600" />
              Job Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="projectId">
                  Project ID <span className="text-rose-500">*</span>
                </Label>
                <Input id="projectId" {...register('projectId')} />
                {errors.projectId && (
                  <p className="text-xs text-rose-600">{errors.projectId.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="customerId">
                  Customer ID <span className="text-rose-500">*</span>
                </Label>
                <Input id="customerId" {...register('customerId')} />
                {errors.customerId && (
                  <p className="text-xs text-rose-600">{errors.customerId.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="unitId">Unit ID</Label>
                <Input id="unitId" {...register('unitId')} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={statusValue}
                  onValueChange={(v) => setValue('status', v as FormValues['status'])}
                >
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DRAFT">Draft</SelectItem>
                    <SelectItem value="SUBMITTED">Submitted</SelectItem>
                    <SelectItem value="APPROVED">Approved</SelectItem>
                    <SelectItem value="REJECTED">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-3">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-light tracking-wider text-slate-700">
              Invoice Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="invoiceDate">Invoice Date</Label>
                <Input id="invoiceDate" type="date" {...register('invoiceDate')} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="companyName">Company Name</Label>
                <Input id="companyName" {...register('companyName')} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" {...register('notes')} rows={4} />
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-end space-x-3 pb-8">
          <Link to="/forms/sale-job04-f01/$id" params={{ id }}>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button
            type="submit"
            className="bg-indigo-600 hover:bg-indigo-700"
            disabled={updateJob.isPending}
          >
            <Save className="w-4 h-4 mr-2" />
            {updateJob.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </div>
  )
}
