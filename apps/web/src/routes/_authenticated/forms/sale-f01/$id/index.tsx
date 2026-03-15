import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowLeft, Pencil, Warehouse } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusBadge } from '@/components/StatusBadge'
import { useWarehouseRequirement } from '@/hooks/useWarehouseRequirements'

export const Route = createFileRoute('/_authenticated/forms/sale-f01/$id/')({
  component: SaleF01DetailPage,
})

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="py-2 border-b border-slate-100">
      <p className="text-[9px] text-slate-400 font-extralight uppercase tracking-widest mb-0.5">
        {label}
      </p>
      <p className="text-[11px] font-light text-slate-800">{value ?? '-'}</p>
    </div>
  )
}

function SaleF01DetailPage() {
  const { id } = Route.useParams()
  const { data: req, isLoading, isError } = useWarehouseRequirement(id)

  if (isLoading) {
    return (
      <div className="space-y-3 max-w-4xl">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (isError || !req) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-600">Requirement not found.</p>
        <Link to="/forms/sale-f01">
          <Button variant="outline" className="mt-4">
            Back to List
          </Button>
        </Link>
      </div>
    )
  }

  const requirements = req.requirements as Record<string, unknown>
  const specifications = req.specifications as Record<string, unknown>

  return (
    <div className="space-y-3 max-w-4xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Link to="/forms/sale-f01">
            <Button variant="outline" size="icon" className="h-8 w-8">
              <ArrowLeft className="w-3.5 h-3.5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-extralight tracking-[0.3em] text-slate-600 uppercase">
              Warehouse Requirement
            </h1>
            <div className="h-px w-20 bg-gradient-to-r from-slate-300 to-transparent mt-2" />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge value={req.status} variant="warehouseStatus" />
          <Link to="/forms/sale-f01/$id/edit" params={{ id }}>
            <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700">
              <Pencil className="w-3.5 h-3.5 mr-2" />
              Edit
            </Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center text-sm font-light tracking-wider text-slate-700">
            <Warehouse className="w-4 h-4 mr-2 text-indigo-600" />
            Customer Information
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
            <InfoRow label="Customer" value={req.customer?.name ?? req.customer_id} />
            <InfoRow label="Project" value={req.project?.name ?? '-'} />
            <InfoRow label="Created By" value={req.creator ? `${req.creator.first_name} ${req.creator.last_name}` : '-'} />
            <InfoRow label="Created At" value={new Date(req.created_at).toLocaleString()} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-light tracking-wider text-slate-700">
            Warehouse Requirements
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8">
            <InfoRow
              label="Warehouse Space (sqm)"
              value={requirements.warehouseSpaceSqm != null ? String(requirements.warehouseSpaceSqm) : '-'}
            />
            <InfoRow
              label="Ceiling Height (m)"
              value={requirements.ceilingHeightM != null ? String(requirements.ceilingHeightM) : '-'}
            />
            <InfoRow
              label="Rental Period (years)"
              value={requirements.rentalPeriodYear != null ? String(requirements.rentalPeriodYear) : '-'}
            />
          </div>
        </CardContent>
      </Card>

      {Boolean(specifications.notes) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-light tracking-wider text-slate-700">
              Additional Notes
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-[11px] font-light text-slate-700 whitespace-pre-wrap">
              {String(specifications.notes)}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
