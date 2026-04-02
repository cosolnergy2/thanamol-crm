import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { Plus, Gauge, Eye, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
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
import { Skeleton } from '@/components/ui/skeleton'
import { PageHeader } from '@/components/PageHeader'
import { useFmsMeterReadings, useDeleteFmsMeterReading } from '@/hooks/useMeters'
import { useProjects } from '@/hooks/useProjects'
import type { FmsMeterType } from '@thanamol/shared'

export const Route = createFileRoute('/_authenticated/facility-management/meters/')({
  component: MeterListPage,
})

const METER_TYPE_LABELS: Record<FmsMeterType, string> = {
  ELECTRICITY: 'Electricity',
  WATER: 'Water',
  GAS: 'Gas',
}

const METER_TYPE_COLORS: Record<FmsMeterType, string> = {
  ELECTRICITY: 'bg-amber-50 text-amber-700 border-amber-200',
  WATER: 'bg-teal-50 text-teal-700 border-teal-200',
  GAS: 'bg-indigo-50 text-indigo-700 border-indigo-200',
}

const PAGE_SIZE = 20

function MeterListPage() {
  const [projectId, setProjectId] = useState('')
  const [meterType, setMeterType] = useState<FmsMeterType | 'all'>('all')
  const [page, setPage] = useState(1)

  const { data: projectsData } = useProjects({ limit: 100 })
  const projects = projectsData?.data ?? []

  const { data, isLoading, isError } = useFmsMeterReadings({
    page,
    limit: PAGE_SIZE,
    projectId: projectId || undefined,
    meterType: meterType !== 'all' ? meterType : undefined,
  })

  const deleteMutation = useDeleteFmsMeterReading()
  const readings = data?.data ?? []
  const totalPages = data?.pagination.totalPages ?? 1

  function handleDelete(id: string) {
    if (!confirm('Delete this meter reading?')) return
    deleteMutation.mutate(id, {
      onSuccess: () => toast.success('Reading deleted'),
      onError: () => toast.error('Failed to delete reading'),
    })
  }

  return (
    <div className="space-y-3">
      <PageHeader
        title="Meter Readings"
        actions={
          <div className="flex gap-2">
            <Link to="/facility-management/meters/create">
              <Button className="bg-indigo-600 hover:bg-indigo-700">
                <Plus className="w-4 h-4 mr-2" />
                New Reading
              </Button>
            </Link>
          </div>
        }
      />

      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col md:flex-row gap-4">
            <Select
              value={projectId || 'all'}
              onValueChange={(v) => {
                setProjectId(v === 'all' ? '' : v)
                setPage(1)
              }}
            >
              <SelectTrigger className="w-full md:w-52">
                <SelectValue placeholder="All Projects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Projects</SelectItem>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={meterType}
              onValueChange={(v) => {
                setMeterType(v as FmsMeterType | 'all')
                setPage(1)
              }}
            >
              <SelectTrigger className="w-full md:w-44">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {(Object.keys(METER_TYPE_LABELS) as FmsMeterType[]).map((t) => (
                  <SelectItem key={t} value={t}>
                    {METER_TYPE_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : isError ? (
            <div className="p-8 text-center text-slate-500">Failed to load meter readings.</div>
          ) : readings.length === 0 ? (
            <div className="p-8 text-center">
              <Gauge className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-slate-500 text-sm">No meter readings found.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Reading Date</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                  <TableHead className="text-right">Previous</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {readings.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <Badge className={`text-xs ${METER_TYPE_COLORS[r.meter_type]}`} variant="outline">
                        {METER_TYPE_LABELS[r.meter_type]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{r.location || '—'}</TableCell>
                    <TableCell className="text-sm">{r.project?.name ?? '—'}</TableCell>
                    <TableCell className="text-sm">
                      {new Date(r.reading_date).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right text-sm font-mono">{r.value.toLocaleString()}</TableCell>
                    <TableCell className="text-right text-sm font-mono">
                      {r.previous_value != null ? r.previous_value.toLocaleString() : '—'}
                    </TableCell>
                    <TableCell className="text-sm">{r.unit}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Link to={`/facility-management/meters/$readingId`} params={{ readingId: r.id }}>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-rose-600 hover:text-rose-700"
                          onClick={() => handleDelete(r.id)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Previous
          </Button>
          <span className="text-sm text-slate-500 self-center">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  )
}
