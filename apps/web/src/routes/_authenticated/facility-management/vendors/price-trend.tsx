import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { z } from 'zod'
import { ArrowLeft, TrendingUp, TrendingDown, Minus, Search } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useVendors } from '@/hooks/useVendors'
import { useVendorPriceTrend } from '@/hooks/useVendorPerformance'

const searchSchema = z.object({
  vendorId: z.string().optional(),
})

export const Route = createFileRoute(
  '/_authenticated/facility-management/vendors/price-trend'
)({
  validateSearch: searchSchema,
  component: VendorPriceTrendPage,
})

function PriceTrendIndicator({ history }: { history: Array<{ unitPrice: number }> }) {
  if (history.length < 2) return <Minus className="w-3 h-3 text-slate-400" />
  const prev = history[history.length - 2].unitPrice
  const curr = history[history.length - 1].unitPrice
  if (curr > prev) return <TrendingUp className="w-3 h-3 text-red-500" />
  if (curr < prev) return <TrendingDown className="w-3 h-3 text-emerald-500" />
  return <Minus className="w-3 h-3 text-slate-400" />
}

function VendorPriceTrendPanel({ vendorId }: { vendorId: string }) {
  const { data, isLoading } = useVendorPriceTrend(vendorId)

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-slate-400 text-sm font-extralight">
          Loading price history...
        </CardContent>
      </Card>
    )
  }

  const items = data?.trend?.items ?? []

  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-slate-400 text-sm font-extralight">
          No price data recorded for this vendor
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {items.map((item) => (
        <Card key={item.itemName}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-light">{item.itemName}</CardTitle>
              <div className="flex items-center gap-2">
                <PriceTrendIndicator history={item.priceHistory} />
                <span className="font-semibold text-slate-700 text-sm">
                  {item.latestPrice.toLocaleString()} {item.currency}
                </span>
                {item.priceHistory.length > 0 && (
                  <Badge
                    className={`text-xs font-normal ${
                      item.priceHistory[item.priceHistory.length - 1]?.isActive
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {item.priceHistory[item.priceHistory.length - 1]?.isActive
                      ? 'Active'
                      : 'Inactive'}
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b text-slate-400">
                  <th className="text-left pb-2 font-normal">Date</th>
                  <th className="text-right pb-2 font-normal">Unit Price</th>
                  <th className="text-right pb-2 font-normal">Currency</th>
                  <th className="text-right pb-2 font-normal">Status</th>
                </tr>
              </thead>
              <tbody>
                {item.priceHistory
                  .slice()
                  .reverse()
                  .map((h, idx) => (
                    <tr key={idx} className="border-b last:border-0">
                      <td className="py-1.5 text-slate-500">
                        {new Date(h.date).toLocaleDateString()}
                      </td>
                      <td className="py-1.5 text-right font-mono">
                        {h.unitPrice.toLocaleString()}
                      </td>
                      <td className="py-1.5 text-right text-slate-500">{h.currency}</td>
                      <td className="py-1.5 text-right">
                        <span
                          className={`px-1.5 py-0.5 rounded text-xs ${
                            h.isActive
                              ? 'bg-emerald-50 text-emerald-600'
                              : 'bg-slate-50 text-slate-400'
                          }`}
                        >
                          {h.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function VendorPriceTrendPage() {
  const { vendorId: initialVendorId } = Route.useSearch()
  const [selectedVendorId, setSelectedVendorId] = useState(initialVendorId ?? '')
  const [search, setSearch] = useState('')

  const { data: vendorData, isLoading: vendorsLoading } = useVendors({ limit: 100 })

  const filteredVendors = (vendorData?.data ?? []).filter(
    (v) =>
      search === '' ||
      v.name.toLowerCase().includes(search.toLowerCase()) ||
      v.vendor_code.toLowerCase().includes(search.toLowerCase())
  )

  const selectedVendor = (vendorData?.data ?? []).find((v) => v.id === selectedVendorId)

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
            Price Trend
          </h1>
          <p className="text-sm text-slate-500 mt-1 font-extralight">
            Item price history per vendor
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-light">Select Vendor</CardTitle>
              <div className="relative mt-2">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search..."
                  className="w-full h-8 pl-8 pr-2 border rounded text-xs outline-none focus:ring-1 focus:ring-indigo-300"
                />
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {vendorsLoading ? (
                <p className="text-xs text-slate-400 text-center py-4">Loading...</p>
              ) : filteredVendors.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4">No vendors</p>
              ) : (
                <div className="space-y-1">
                  {filteredVendors.map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setSelectedVendorId(v.id)}
                      className={`w-full text-left px-3 py-2 rounded text-xs transition-colors ${
                        selectedVendorId === v.id
                          ? 'bg-indigo-50 text-indigo-700 font-medium'
                          : 'hover:bg-slate-50 text-slate-600'
                      }`}
                    >
                      <p className="truncate">{v.name}</p>
                      <p className="text-slate-400 font-mono truncate">{v.vendor_code}</p>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-3">
          {!selectedVendorId ? (
            <Card>
              <CardContent className="py-16 text-center text-slate-400 font-extralight">
                Select a vendor to view price trends
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-indigo-500" />
                <h2 className="text-lg font-light text-slate-700">
                  {selectedVendor?.name ?? selectedVendorId}
                </h2>
              </div>
              <VendorPriceTrendPanel vendorId={selectedVendorId} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
