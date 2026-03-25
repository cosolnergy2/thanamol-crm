import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { Plus, Search, Trash2, Star, GitCompare } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  useVendorQuotations,
  useDeleteVendorQuotation,
  useSelectVendorQuotation,
} from '@/hooks/useVendorQuotations'
import { usePurchaseRequests } from '@/hooks/usePurchaseRequests'

export const Route = createFileRoute(
  '/_authenticated/facility-management/procurement/quotations/'
)({
  component: QuotationListPage,
})

function QuotationListPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [filterPrId, setFilterPrId] = useState('')

  const { data, isLoading } = useVendorQuotations({
    search: search || undefined,
    prId: filterPrId || undefined,
    limit: 100,
  })

  const { data: prData } = usePurchaseRequests({ limit: 100, status: 'APPROVED' })

  const deleteVQ = useDeleteVendorQuotation()
  const selectVQ = useSelectVendorQuotation()

  const quotations = data?.data ?? []
  const prs = prData?.data ?? []

  // Group quotations by PR for comparison view
  const byPR = quotations.reduce(
    (acc, vq) => {
      const key = vq.pr_id ?? 'no-pr'
      if (!acc[key]) acc[key] = []
      acc[key].push(vq)
      return acc
    },
    {} as Record<string, typeof quotations>
  )

  function handleDelete(id: string) {
    if (!confirm('Delete this quotation?')) return
    deleteVQ.mutate(id)
  }

  function handleSelect(id: string) {
    selectVQ.mutate(id)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extralight tracking-[0.3em] text-slate-600 uppercase">
            Vendor Quotations
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {data?.pagination.total ?? 0} quotations
          </p>
        </div>
        <Button
          className="bg-indigo-600 hover:bg-indigo-700 gap-2"
          onClick={() =>
            navigate({ to: '/facility-management/procurement/quotations/create' })
          }
        >
          <Plus className="w-4 h-4" />
          Add Quotation
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search vendor or quotation #..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <select
              className="border rounded-md px-3 py-2 text-sm"
              value={filterPrId}
              onChange={(e) => setFilterPrId(e.target.value)}
            >
              <option value="">All PRs</option>
              {prs.map((pr) => (
                <option key={pr.id} value={pr.id}>
                  {pr.pr_number} — {pr.title}
                </option>
              ))}
            </select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-12 text-center text-slate-400">Loading...</div>
          ) : Object.keys(byPR).length === 0 ? (
            <div className="py-12 text-center text-slate-400">No quotations found</div>
          ) : (
            <div className="space-y-6">
              {Object.entries(byPR).map(([prKey, prQuotations]) => {
                const pr =
                  prKey !== 'no-pr'
                    ? prQuotations[0]?.purchase_request
                    : null

                return (
                  <div key={prKey} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-slate-700">
                        {pr ? `PR: ${pr.pr_number} — ${pr.title}` : 'No PR linked'}
                      </h3>
                      {prQuotations.length > 1 && (
                        <Badge variant="outline" className="gap-1">
                          <GitCompare className="w-3 h-3" />
                          {prQuotations.length} quotations
                        </Badge>
                      )}
                    </div>

                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Quotation #</TableHead>
                          <TableHead>Vendor</TableHead>
                          <TableHead>Valid Until</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                          <TableHead>Selected</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {prQuotations.map((vq) => (
                          <TableRow
                            key={vq.id}
                            className={vq.is_selected ? 'bg-green-50' : undefined}
                          >
                            <TableCell className="font-mono text-sm">
                              {vq.quotation_number ?? '-'}
                            </TableCell>
                            <TableCell>{vq.vendor_name}</TableCell>
                            <TableCell>
                              {vq.valid_until
                                ? new Date(vq.valid_until).toLocaleDateString()
                                : '-'}
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              ฿{vq.total.toLocaleString()}
                            </TableCell>
                            <TableCell>
                              {vq.is_selected ? (
                                <Badge className="bg-green-100 text-green-700">Selected</Badge>
                              ) : (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="gap-1 text-xs"
                                  onClick={() => handleSelect(vq.id)}
                                  disabled={selectVQ.isPending}
                                >
                                  <Star className="w-3 h-3" />
                                  Select
                                </Button>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-red-500 hover:text-red-700"
                                onClick={() => handleDelete(vq.id)}
                                disabled={deleteVQ.isPending}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>

                    {prQuotations.length > 1 && (
                      <div className="pt-2 border-t">
                        <p className="text-xs text-slate-500">
                          Cheapest:{' '}
                          <span className="font-medium text-green-700">
                            {
                              prQuotations.reduce((min, vq) =>
                                vq.total < min.total ? vq : min
                              ).vendor_name
                            }{' '}
                            (฿
                            {Math.min(...prQuotations.map((v) => v.total)).toLocaleString()})
                          </span>
                        </p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
