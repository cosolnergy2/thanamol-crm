import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { ArrowLeftRight, Plus, Search } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import { useStockTransfers } from '@/hooks/useStockTransfers'
import { useProjects } from '@/hooks/useProjects'
import type { StockTransferWithRelations } from '@thanamol/shared'

export const Route = createFileRoute(
  '/_authenticated/facility-management/inventory/transfers/'
)({
  component: StockTransferListPage,
})

function StockTransferListPage() {
  const [search, setSearch] = useState('')
  const [sourceProjectId, setSourceProjectId] = useState('')
  const [destinationProjectId, setDestinationProjectId] = useState('')

  const { data: transfersData, isLoading } = useStockTransfers({
    search: search || undefined,
    sourceProjectId: sourceProjectId || undefined,
    destinationProjectId: destinationProjectId || undefined,
  })
  const { data: projectsData } = useProjects({ limit: 100 })

  const transfers = transfersData?.data ?? []
  const projects = projectsData?.data ?? []
  const total = transfersData?.pagination.total ?? 0

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-extralight tracking-[0.2em] md:tracking-[0.3em] text-slate-600 uppercase">
            Stock Transfers
          </h1>
          <p className="text-xs md:text-sm text-slate-500 mt-1 font-extralight">
            Transfer inventory between sites
          </p>
        </div>
        <Link to="/facility-management/inventory/transfers/create">
          <Button className="bg-indigo-600 hover:bg-indigo-700 gap-2" size="sm">
            <Plus className="w-4 h-4" />
            New Transfer
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 font-extralight">Total Transfers</p>
                <p className="text-2xl font-light text-slate-700 mt-1">{total}</p>
              </div>
              <ArrowLeftRight className="w-7 h-7 text-indigo-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search by transfer number..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select
              value={sourceProjectId || '__all__'}
              onValueChange={(v) => setSourceProjectId(v === '__all__' ? '' : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Source Sites" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Source Sites</SelectItem>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={destinationProjectId || '__all__'}
              onValueChange={(v) => setDestinationProjectId(v === '__all__' ? '' : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Destination Sites" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Destination Sites</SelectItem>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Transfer #</TableHead>
                <TableHead>Transfer Date</TableHead>
                <TableHead>Source Site</TableHead>
                <TableHead>Destination Site</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-slate-400 py-8">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : transfers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12">
                    <ArrowLeftRight className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500">No stock transfers found</p>
                  </TableCell>
                </TableRow>
              ) : (
                transfers.map((transfer: StockTransferWithRelations) => {
                  const items = Array.isArray(transfer.items) ? transfer.items : []
                  return (
                    <TableRow key={transfer.id} className="hover:bg-slate-50">
                      <TableCell className="font-mono text-sm font-medium text-indigo-600">
                        {transfer.transfer_number}
                      </TableCell>
                      <TableCell className="text-sm">
                        {new Date(transfer.transfer_date).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-sm">
                        {transfer.source_project?.name ?? (
                          <span className="text-slate-400">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {transfer.destination_project?.name ?? (
                          <span className="text-slate-400">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-slate-500">
                        {items.length} item{items.length !== 1 ? 's' : ''}
                      </TableCell>
                      <TableCell className="text-sm text-slate-500 max-w-xs truncate">
                        {transfer.notes ?? '—'}
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
