import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { z } from 'zod'
import { ArrowLeft, GitCompare, Star, Trophy } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useVendorQuotations, useSelectVendorQuotation } from '@/hooks/useVendorQuotations'
import { usePurchaseRequests } from '@/hooks/usePurchaseRequests'
import type { VendorQuotationWithRelations, VQItem } from '@thanamol/shared'

const searchSchema = z.object({
  prId: z.string().optional(),
})

export const Route = createFileRoute(
  '/_authenticated/facility-management/procurement/quotations/compare'
)({
  validateSearch: searchSchema,
  component: QuotationComparePage,
})

function resolveItems(vq: VendorQuotationWithRelations): VQItem[] {
  return vq.items as VQItem[]
}

export function lowestTotalId(quotations: Array<{ id: string; total: number }>): string | null {
  if (quotations.length === 0) return null
  return quotations.reduce((min, vq) => (vq.total < min.total ? vq : min)).id
}

function QuotationComparePage() {
  const navigate = useNavigate()
  const { prId: initialPrId } = Route.useSearch()
  const [selectedPrId, setSelectedPrId] = useState(initialPrId ?? '')

  const { data: prListData } = usePurchaseRequests({ limit: 100 })
  const prs = prListData?.data ?? []

  const { data: vqData, isLoading } = useVendorQuotations({
    prId: selectedPrId || undefined,
    limit: 100,
  })

  const quotations = vqData?.data ?? []
  const selectVQ = useSelectVendorQuotation()
  const cheapestId = lowestTotalId(quotations)

  const allItemNames = Array.from(
    new Set(quotations.flatMap((vq) => resolveItems(vq).map((item) => item.item_name)))
  )

  function handlePrChange(value: string) {
    setSelectedPrId(value === '__none__' ? '' : value)
  }

  function handleSelect(id: string) {
    selectVQ.mutate(id)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="icon"
          onClick={() => navigate({ to: '/facility-management/procurement/quotations' })}
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-extralight tracking-[0.3em] text-slate-600 uppercase">
            Quotation Comparison
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Compare vendor quotes for a purchase request side by side
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Select Purchase Request</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedPrId || '__none__'} onValueChange={handlePrChange}>
            <SelectTrigger className="max-w-md">
              <SelectValue placeholder="Choose a PR to compare quotations..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">&mdash; Select a PR &mdash;</SelectItem>
              {prs.map((pr) => (
                <SelectItem key={pr.id} value={pr.id}>
                  {pr.pr_number} &mdash; {pr.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedPrId && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <GitCompare className="w-5 h-5 text-indigo-500" />
                Side-by-Side Comparison
              </CardTitle>
              {quotations.length > 0 && (
                <Badge variant="outline">
                  {quotations.length} quotation{quotations.length !== 1 ? 's' : ''}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="py-12 text-center text-slate-400">Loading quotations...</div>
            ) : quotations.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                No quotations found for this purchase request.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[160px]">Criteria</TableHead>
                      {quotations.map((vq) => (
                        <TableHead key={vq.id} className="min-w-[200px] text-center">
                          <div className="space-y-1">
                            <div className="flex items-center justify-center gap-1">
                              {vq.id === cheapestId && (
                                <Trophy className="w-3 h-3 text-amber-500" />
                              )}
                              <span className="font-medium text-slate-700">{vq.vendor_name}</span>
                            </div>
                            {vq.quotation_number && (
                              <div className="text-xs text-slate-400 font-mono">
                                {vq.quotation_number}
                              </div>
                            )}
                            {vq.is_selected ? (
                              <Badge className="bg-teal-100 text-teal-700 text-xs">Selected</Badge>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 text-xs gap-1"
                                onClick={() => handleSelect(vq.id)}
                                disabled={selectVQ.isPending}
                              >
                                <Star className="w-3 h-3" />
                                Select
                              </Button>
                            )}
                          </div>
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow className="bg-slate-50">
                      <TableCell className="font-medium text-slate-600">Valid Until</TableCell>
                      {quotations.map((vq) => (
                        <TableCell key={vq.id} className="text-center text-sm">
                          {vq.valid_until ? new Date(vq.valid_until).toLocaleDateString() : '\u2014'}
                        </TableCell>
                      ))}
                    </TableRow>
                    <TableRow className="bg-slate-50">
                      <TableCell className="font-medium text-slate-600">
                        Notes / Delivery Terms
                      </TableCell>
                      {quotations.map((vq) => (
                        <TableCell key={vq.id} className="text-center text-sm text-slate-500">
                          {vq.notes ?? '\u2014'}
                        </TableCell>
                      ))}
                    </TableRow>
                    {allItemNames.length > 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={quotations.length + 1}
                          className="text-xs font-semibold text-slate-400 uppercase tracking-wider pt-4 pb-1"
                        >
                          Item Prices
                        </TableCell>
                      </TableRow>
                    )}
                    {allItemNames.map((itemName) => {
                      const pricesForItem = quotations.map((vq) => {
                        const found = resolveItems(vq).find((i) => i.item_name === itemName)
                        return found ? found.unit_price : null
                      })
                      const validPrices = pricesForItem.filter((p): p is number => p !== null)
                      const minPrice = validPrices.length > 0 ? Math.min(...validPrices) : null
                      return (
                        <TableRow key={itemName}>
                          <TableCell className="text-sm text-slate-600 pl-4">{itemName}</TableCell>
                          {quotations.map((vq) => {
                            const found = resolveItems(vq).find((i) => i.item_name === itemName)
                            const isLowest =
                              found !== undefined && minPrice !== null && found.unit_price === minPrice
                            return (
                              <TableCell
                                key={vq.id}
                                className={`text-center text-sm font-mono ${
                                  isLowest ? 'text-teal-700 font-medium bg-teal-50' : 'text-slate-600'
                                }`}
                              >
                                {found ? (
                                  <div>
                                    <span>\u0e3f{found.unit_price.toLocaleString()}</span>
                                    {found.lead_time_days != null && found.lead_time_days > 0 && (
                                      <div className="text-xs text-slate-400">
                                        {found.lead_time_days}d lead
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-slate-300">\u2014</span>
                                )}
                              </TableCell>
                            )
                          })}
                        </TableRow>
                      )
                    })}
                    <TableRow className="border-t-2">
                      <TableCell className="font-semibold text-slate-700">Grand Total</TableCell>
                      {quotations.map((vq) => (
                        <TableCell
                          key={vq.id}
                          className={`text-center font-mono font-semibold text-base ${
                            vq.id === cheapestId ? 'text-teal-700 bg-teal-50' : 'text-slate-700'
                          }`}
                        >
                          \u0e3f{vq.total.toLocaleString()}
                          {vq.id === cheapestId && (
                            <div className="text-xs font-normal text-teal-600 mt-0.5">
                              Lowest Price
                            </div>
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
