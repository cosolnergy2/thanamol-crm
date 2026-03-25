import { createFileRoute, Link } from '@tanstack/react-router'
import { Factory, MapPin, Wrench, Package } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { useZones } from '@/hooks/useZones'
import { useProjects } from '@/hooks/useProjects'
import { useAssets } from '@/hooks/useAssets'
import { useWorkOrders } from '@/hooks/useWorkOrders'
import { useInventoryItems } from '@/hooks/useInventory'

export const Route = createFileRoute('/_authenticated/facility-management/')({
  component: FacilityManagementDashboard,
})

type FmsCardProps = {
  icon: React.ElementType
  label: string
  value: string | number
  sub: string
  href: string
  gradient: string
  comingSoon?: boolean
}

function FmsCard({ icon: Icon, label, value, sub, href, gradient, comingSoon }: FmsCardProps) {
  const inner = (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className={`bg-gradient-to-br ${gradient} p-4`}>
          <div className="mb-2">
            <div className="p-2 rounded-lg bg-white/20 inline-block">
              <Icon className="w-4 h-4 text-white" />
            </div>
          </div>
          <p className="text-[10px] text-white/80 uppercase tracking-widest font-extralight">
            {label}
          </p>
          <p className="text-2xl font-light text-white mt-0.5">{value}</p>
          <p className="text-[10px] text-white/70 mt-0.5">{sub}</p>
        </div>
        {comingSoon && (
          <div className="px-4 py-2 bg-white border-t border-slate-100">
            <span className="text-[10px] text-slate-400 font-extralight tracking-wider">
              Coming soon
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  )

  if (comingSoon) return inner

  return <Link to={href as Parameters<typeof Link>[0]['to']}>{inner}</Link>
}

function FacilityManagementDashboard() {
  const { data: projectsData } = useProjects({ limit: 1 })
  const firstProjectId = projectsData?.data?.[0]?.id ?? ''
  const { data: zonesData } = useZones({ projectId: firstProjectId })
  const { data: assetsData } = useAssets({ projectId: firstProjectId || undefined })
  const { data: woData } = useWorkOrders({ projectId: firstProjectId || undefined })
  const { data: inventoryData } = useInventoryItems({ projectId: firstProjectId || undefined })

  const zoneCount = zonesData?.pagination.total ?? 0
  const assetCount = assetsData?.pagination.total ?? 0
  const woCount = woData?.pagination.total ?? 0
  const inventoryCount = inventoryData?.pagination.total ?? 0

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-extralight tracking-[0.3em] text-slate-600 uppercase">
          Facility Management
        </h1>
        <div className="h-px w-20 bg-gradient-to-r from-slate-300 to-transparent mt-2" />
        <p className="mt-2 text-xs text-slate-400 font-extralight">
          Phase 1–2 — Asset Management, Work Orders & Inventory
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <FmsCard
          icon={MapPin}
          label="Zones"
          value={firstProjectId ? zoneCount : '—'}
          sub="Manage facility zones"
          href="/facility-management/zones"
          gradient="from-indigo-500 to-indigo-700"
        />
        <FmsCard
          icon={Factory}
          label="Assets"
          value={firstProjectId ? assetCount : '—'}
          sub="Track equipment & assets"
          href="/facility-management/assets"
          gradient="from-teal-500 to-teal-700"
        />
        <FmsCard
          icon={Wrench}
          label="Work Orders"
          value={firstProjectId ? woCount : '—'}
          sub="Maintenance requests"
          href="/facility-management/work-orders"
          gradient="from-amber-500 to-amber-700"
        />
        <FmsCard
          icon={Package}
          label="Inventory"
          value={firstProjectId ? inventoryCount : '—'}
          sub="Spare parts & supplies"
          href="/facility-management/inventory"
          gradient="from-emerald-500 to-emerald-700"
        />
      </div>

      <Card>
        <CardContent className="pt-4">
          <p className="text-[10px] font-extralight text-slate-400 uppercase tracking-widest mb-3">
            Quick Navigation
          </p>
          <div className="grid grid-cols-2 gap-2 max-w-sm">
            <Link to="/facility-management/zones">
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 transition-colors cursor-pointer group">
                <MapPin className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-500" />
                <span className="text-[11px] font-light text-slate-600 group-hover:text-indigo-600">
                  Manage Zones
                </span>
              </div>
            </Link>
            <Link to="/facility-management/assets">
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 hover:border-teal-300 hover:bg-teal-50 transition-colors cursor-pointer group">
                <Factory className="w-3.5 h-3.5 text-slate-400 group-hover:text-teal-500" />
                <span className="text-[11px] font-light text-slate-600 group-hover:text-teal-600">
                  Assets
                </span>
              </div>
            </Link>
            <Link to="/facility-management/work-orders">
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 hover:border-amber-300 hover:bg-amber-50 transition-colors cursor-pointer group">
                <Wrench className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-500" />
                <span className="text-[11px] font-light text-slate-600 group-hover:text-amber-600">
                  Work Orders
                </span>
              </div>
            </Link>
            <Link to="/facility-management/inventory">
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50 transition-colors cursor-pointer group">
                <Package className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-500" />
                <span className="text-[11px] font-light text-slate-600 group-hover:text-emerald-600">
                  Inventory
                </span>
              </div>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
