import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { Package, Pencil, Wrench, Gauge, ClipboardList, MapPin } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { PageHeader } from '@/components/PageHeader'
import { useAsset } from '@/hooks/useAssets'
import type { AssetStatus, WorkOrderStatus } from '@thanamol/shared'

export const Route = createFileRoute('/_authenticated/facility-management/assets/$assetId/')({
  component: AssetDetailPage,
})

const ASSET_STATUS_COLORS: Record<AssetStatus, string> = {
  OPERATIONAL: 'bg-teal-50 text-teal-700 border-teal-200',
  UNDER_MAINTENANCE: 'bg-amber-50 text-amber-700 border-amber-200',
  OUT_OF_SERVICE: 'bg-rose-50 text-rose-700 border-rose-200',
  DISPOSED: 'bg-slate-50 text-slate-600 border-slate-200',
  IN_STORAGE: 'bg-indigo-50 text-indigo-700 border-indigo-200',
}

const WO_STATUS_COLORS: Record<WorkOrderStatus, string> = {
  OPEN: 'bg-slate-50 text-slate-600 border-slate-200',
  ASSIGNED: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  IN_PROGRESS: 'bg-amber-50 text-amber-700 border-amber-200',
  ON_HOLD: 'bg-orange-50 text-orange-700 border-orange-200',
  COMPLETED: 'bg-teal-50 text-teal-700 border-teal-200',
  CANCELLED: 'bg-rose-50 text-rose-700 border-rose-200',
}

function AssetDetailPage() {
  const { assetId } = Route.useParams()
  const navigate = useNavigate()
  const { data, isLoading, isError } = useAsset(assetId)
  const asset = data?.asset

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    )
  }

  if (isError || !asset) {
    return (
      <div className="text-center py-16">
        <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <p className="text-slate-600">Asset not found</p>
        <Link to="/facility-management/assets">
          <Button variant="link" className="mt-2">
            Back to Assets
          </Button>
        </Link>
      </div>
    )
  }

  const workOrders = (asset.work_orders as Array<Record<string, unknown>>) ?? []
  const calibrations = (asset.calibrations as Array<Record<string, unknown>>) ?? []
  const pmSchedules = (asset.pm_schedules as Array<Record<string, unknown>>) ?? []

  return (
    <div className="space-y-4">
      <PageHeader
        title={asset.name}
        actions={
          <Button
            variant="outline"
            onClick={() => navigate({ to: `/facility-management/assets/${assetId}/edit` })}
          >
            <Pencil className="w-4 h-4 mr-2" />
            Edit
          </Button>
        }
      />

      <div className="flex items-center gap-3 -mt-2 mb-2">
        <span className="font-mono text-xs text-slate-500">{asset.asset_number}</span>
        <Badge
          variant="outline"
          className={`text-[10px] ${ASSET_STATUS_COLORS[asset.status as AssetStatus] ?? ''}`}
        >
          {asset.status.replace('_', ' ')}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-light text-slate-600 flex items-center gap-2">
              <Package className="w-4 h-4 text-slate-400" />
              Asset Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: 'Category', value: asset.category?.name },
              { label: 'Manufacturer', value: asset.manufacturer },
              { label: 'Model', value: asset.model_name },
              { label: 'Serial Number', value: asset.serial_number },
              {
                label: 'Purchase Date',
                value: asset.purchase_date
                  ? new Date(asset.purchase_date).toLocaleDateString()
                  : null,
              },
              {
                label: 'Purchase Cost',
                value: asset.purchase_cost != null
                  ? `฿${asset.purchase_cost.toLocaleString()}`
                  : null,
              },
              {
                label: 'Warranty Expiry',
                value: asset.warranty_expiry
                  ? new Date(asset.warranty_expiry).toLocaleDateString()
                  : null,
              },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between items-start">
                <span className="text-xs text-slate-400 font-extralight">{label}</span>
                <span className="text-xs text-slate-700 font-light text-right">
                  {value ?? '—'}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-light text-slate-600 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-slate-400" />
              Location
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: 'Project', value: asset.project.name },
              { label: 'Zone', value: asset.zone?.name },
              { label: 'Unit', value: asset.unit?.unit_number },
              { label: 'Location Detail', value: asset.location_detail },
              { label: 'Assigned To', value: asset.assignee ? `${asset.assignee.first_name} ${asset.assignee.last_name}` : null },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between items-start">
                <span className="text-xs text-slate-400 font-extralight">{label}</span>
                <span className="text-xs text-slate-700 font-light text-right">
                  {value ?? '—'}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

        {asset.description && (
          <Card className="lg:col-span-2">
            <CardContent className="pt-4">
              <p className="text-[10px] font-extralight text-slate-400 uppercase tracking-widest mb-2">
                Description
              </p>
              <p className="text-sm text-slate-600 font-light">{asset.description}</p>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-light text-slate-600 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Wrench className="w-4 h-4 text-slate-400" />
                Work Orders
              </span>
              <Badge variant="outline" className="text-[10px]">
                {asset._count.work_orders}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {workOrders.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">No work orders</p>
            ) : (
              <div className="space-y-2">
                {workOrders.slice(0, 5).map((wo) => (
                  <div
                    key={wo.id as string}
                    className="flex items-center justify-between text-xs"
                  >
                    <Link
                      to="/facility-management/work-orders/$workOrderId"
                      params={{ workOrderId: wo.id as string }}
                      className="text-indigo-600 hover:underline font-mono"
                    >
                      {wo.wo_number as string}
                    </Link>
                    <Badge
                      variant="outline"
                      className={`text-[9px] ${WO_STATUS_COLORS[wo.status as WorkOrderStatus] ?? ''}`}
                    >
                      {(wo.status as string).replace('_', ' ')}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-light text-slate-600 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Gauge className="w-4 h-4 text-slate-400" />
                Calibrations
              </span>
              <Badge variant="outline" className="text-[10px]">
                {asset._count.calibrations}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {calibrations.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">No calibration records</p>
            ) : (
              <div className="space-y-2">
                {calibrations.slice(0, 5).map((cal) => (
                  <div
                    key={cal.id as string}
                    className="flex items-center justify-between text-xs"
                  >
                    <span className="text-slate-600">
                      {new Date(cal.calibration_date as string).toLocaleDateString()}
                    </span>
                    <Badge variant="outline" className="text-[9px]">
                      {cal.status as string}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-light text-slate-600 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-slate-400" />
                PM Schedules
              </span>
              <Badge variant="outline" className="text-[10px]">
                {asset._count.pm_schedules}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pmSchedules.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">No PM schedules</p>
            ) : (
              <div className="space-y-2">
                {pmSchedules.slice(0, 5).map((pm) => (
                  <div
                    key={pm.id as string}
                    className="flex items-center justify-between text-xs"
                  >
                    <Link
                      to="/facility-management/preventive-maintenance/$pmId"
                      params={{ pmId: pm.id as string }}
                      className="text-indigo-600 hover:underline truncate max-w-[140px]"
                    >
                      {pm.title as string}
                    </Link>
                    <Badge variant="outline" className="text-[9px]">
                      {pm.frequency as string}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
