import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useVendors } from '@/hooks/useVendors'
import { useVendorPerformance } from '@/hooks/useVendorPerformance'

export const Route = createFileRoute(
  '/_authenticated/facility-management/vendors/performance'
)({
  component: VendorPerformancePage,
})

const SCORE_COLORS = {
  excellent: 'text-emerald-600 bg-emerald-50',
  good: 'text-teal-600 bg-teal-50',
  average: 'text-amber-600 bg-amber-50',
  poor: 'text-red-600 bg-red-50',
} as const

function scoreColorClass(score: number) {
  if (score >= 80) return SCORE_COLORS.excellent
  if (score >= 60) return SCORE_COLORS.good
  if (score >= 40) return SCORE_COLORS.average
  return SCORE_COLORS.poor
}

function barColor(score: number) {
  if (score >= 80) return 'bg-emerald-500'
  if (score >= 60) return 'bg-teal-500'
  if (score >= 40) return 'bg-amber-500'
  return 'bg-red-500'
}

function ScoreBar({ score }: { score: number }) {
  return (
    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
      <div
        className={`h-full ${barColor(score)} rounded-full transition-all`}
        style={{ width: `${score}%` }}
      />
    </div>
  )
}

function VendorPerformanceCard({ vendorId }: { vendorId: string }) {
  const { data, isLoading } = useVendorPerformance(vendorId)

  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <CardContent className="h-32" />
      </Card>
    )
  }

  if (!data?.performance) return null

  const perf = data.performance

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base font-light">{perf.vendorName}</CardTitle>
            <p className="text-xs text-slate-500 font-mono mt-0.5">{perf.vendorCode}</p>
          </div>
          <span
            className={`text-lg font-semibold px-3 py-1 rounded-full ${scoreColorClass(perf.overallScore)}`}
          >
            {perf.overallScore}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Delivery (PO on-time)</span>
            <span className="font-medium text-slate-700">{perf.deliveryScore}%</span>
          </div>
          <ScoreBar score={perf.deliveryScore} />

          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Quality (GRN pass)</span>
            <span className="font-medium text-slate-700">{perf.qualityScore}%</span>
          </div>
          <ScoreBar score={perf.qualityScore} />

          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Pricing</span>
            <span className="font-medium text-slate-700">{perf.pricingScore}%</span>
          </div>
          <ScoreBar score={perf.pricingScore} />
        </div>

        <div className="grid grid-cols-3 gap-2 pt-2 border-t text-xs text-slate-500">
          <div className="text-center">
            <p className="font-medium text-slate-700">{perf.stats.totalPOs}</p>
            <p>POs</p>
          </div>
          <div className="text-center">
            <p className="font-medium text-slate-700">{perf.stats.totalGRNs}</p>
            <p>GRNs</p>
          </div>
          <div className="text-center">
            <p className="font-medium text-slate-700">
              {perf.stats.totalSpend.toLocaleString()}
            </p>
            <p>Spend</p>
          </div>
        </div>

        <Link
          to="/facility-management/vendors/$vendorId"
          params={{ vendorId: perf.vendorId }}
          className="block text-center text-xs text-indigo-600 hover:underline"
        >
          View vendor details
        </Link>
      </CardContent>
    </Card>
  )
}

function VendorPerformancePage() {
  const { data: vendorData, isLoading } = useVendors({ limit: 100 })
  const [search, setSearch] = useState('')

  const vendors = (vendorData?.data ?? []).filter(
    (v) =>
      v.status === 'ACTIVE' &&
      (search === '' ||
        v.name.toLowerCase().includes(search.toLowerCase()) ||
        v.vendor_code.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/facility-management/vendors">
          <button
            type="button"
            className="p-2 border rounded-md hover:bg-slate-50 text-slate-500"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
        </Link>
        <div>
          <h1 className="text-2xl font-extralight tracking-[0.3em] text-slate-600 uppercase">
            Vendor Performance
          </h1>
          <p className="text-sm text-slate-500 mt-1 font-extralight">
            Score cards per vendor — delivery, quality, pricing
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex-1">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search vendors..."
            className="w-full h-9 pl-3 pr-3 border rounded-md text-sm outline-none focus:ring-1 focus:ring-indigo-300"
          />
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
          <span>Excellent (80+)</span>
          <span className="w-2.5 h-2.5 rounded-full bg-teal-500 inline-block" />
          <span>Good (60+)</span>
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
          <span>Average (40+)</span>
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />
          <span>Poor</span>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-16 text-slate-400 font-extralight">Loading vendors...</div>
      ) : vendors.length === 0 ? (
        <div className="text-center py-16 text-slate-400 font-extralight">
          No active vendors found
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {vendors.map((vendor) => (
            <VendorPerformanceCard key={vendor.id} vendorId={vendor.id} />
          ))}
        </div>
      )}
    </div>
  )
}
