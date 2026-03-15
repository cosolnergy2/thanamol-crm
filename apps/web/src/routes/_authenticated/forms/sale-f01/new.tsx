import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, Save, Warehouse } from 'lucide-react'
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
import { useCreateWarehouseRequirement } from '@/hooks/useWarehouseRequirements'
import type { CreateWarehouseRequirementRequest, WarehouseRequirementStatus } from '@thanamol/shared'

export const Route = createFileRoute('/_authenticated/forms/sale-f01/new')({
  component: SaleF01NewPage,
})

const schema = z.object({
  customerId: z.string().min(1, 'Customer is required'),
  projectId: z.string().optional(),
  status: z.enum(['DRAFT', 'SUBMITTED', 'REVIEWED', 'APPROVED', 'REJECTED']),
  warehouseSpaceSqm: z.coerce.number().min(0).optional(),
  ceilingHeightM: z.coerce.number().min(0).optional(),
  rentalPeriodYear: z.coerce.number().min(0).optional(),
  notes: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

function SaleF01NewPage() {
  const navigate = useNavigate()
  const createReq = useCreateWarehouseRequirement()

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { status: 'DRAFT' },
  })

  const statusValue = watch('status')

  async function onSubmit(values: FormValues) {
    const payload: CreateWarehouseRequirementRequest = {
      customerId: values.customerId,
      projectId: values.projectId || undefined,
      status: values.status as WarehouseRequirementStatus,
      requirements: {
        warehouseSpaceSqm: values.warehouseSpaceSqm,
        ceilingHeightM: values.ceilingHeightM,
        rentalPeriodYear: values.rentalPeriodYear,
      },
      specifications: {
        notes: values.notes,
      },
    }

    try {
      await createReq.mutateAsync(payload)
      toast.success('Warehouse requirement created successfully')
      navigate({ to: '/forms/sale-f01' })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create requirement')
    }
  }

  return (
    <div className="space-y-3 max-w-4xl">
      <div className="flex items-center space-x-3 mb-4">
        <Link to="/forms/sale-f01">
          <Button variant="outline" size="icon" className="h-8 w-8">
            <ArrowLeft className="w-3.5 h-3.5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-extralight tracking-[0.3em] text-slate-600 uppercase">
            New Warehouse Requirement
          </h1>
          <div className="h-px w-20 bg-gradient-to-r from-slate-300 to-transparent mt-2" />
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <Card className="mb-3">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center text-sm font-light tracking-wider text-slate-700">
              <Warehouse className="w-4 h-4 mr-2 text-indigo-600" />
              Customer Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="customerId">
                  Customer ID <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="customerId"
                  {...register('customerId')}
                  placeholder="Customer ID"
                />
                {errors.customerId && (
                  <p className="text-xs text-rose-600">{errors.customerId.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="projectId">Project ID</Label>
                <Input
                  id="projectId"
                  {...register('projectId')}
                  placeholder="Project ID (optional)"
                />
              </div>
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
                  <SelectItem value="REVIEWED">Reviewed</SelectItem>
                  <SelectItem value="APPROVED">Approved</SelectItem>
                  <SelectItem value="REJECTED">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-3">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-light tracking-wider text-slate-700">
              Warehouse Requirements
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-0">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="warehouseSpaceSqm">Warehouse Space (sqm)</Label>
                <Input
                  id="warehouseSpaceSqm"
                  type="number"
                  {...register('warehouseSpaceSqm')}
                  placeholder="0"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ceilingHeightM">Ceiling Height (m)</Label>
                <Input
                  id="ceilingHeightM"
                  type="number"
                  step="0.1"
                  {...register('ceilingHeightM')}
                  placeholder="0.0"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="rentalPeriodYear">Rental Period (years)</Label>
                <Input
                  id="rentalPeriodYear"
                  type="number"
                  {...register('rentalPeriodYear')}
                  placeholder="0"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Additional Notes</Label>
              <Textarea
                id="notes"
                {...register('notes')}
                placeholder="Additional requirements and specifications..."
                rows={4}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-end space-x-3 pb-8">
          <Link to="/forms/sale-f01">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button
            type="submit"
            className="bg-indigo-600 hover:bg-indigo-700"
            disabled={createReq.isPending}
          >
            <Save className="w-4 h-4 mr-2" />
            {createReq.isPending ? 'Saving...' : 'Save Requirement'}
          </Button>
        </div>
      </form>
    </div>
  )
}
