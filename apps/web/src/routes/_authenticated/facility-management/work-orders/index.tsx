import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { Plus, Wrench, Search, Eye } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import { useWorkOrders } from '@/hooks/useWorkOrders'
import { useProjects } from '@/hooks/useProjects'
import type { WorkOrderStatus, WorkOrderType } from '@thanamol/shared'

export const Route = createFileRoute('/_authenticated/facility-management/work-orders/')({
  component: WorkOrderListPage,
})

const WO_STATUS_LABELS: Record<WorkOrderStatus, string> = {
  OPEN: 'Open',
  ASSIGNED: 'Assigned',
  IN_PROGRESS: 'In Progress',
  ON_HOLD: 'On Hold',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
}

const WO_STATUS_COLORS: Record<WorkOrderStatus, string> = {
  OPEN: 'bg-slate-50 text-slate-600 border-slate-200',
  ASSIGNED: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  IN_PROGRESS: 'bg-amber-50 text-amber-700 border-amber-200',
  ON_HOLD: 'bg-orange-50 text-orange-700 border-orange-200',
  COMPLETED: 'bg-teal-50 text-teal-700 border-teal-200',
  CANCELLED: 'bg-rose-50 text-rose-700 border-rose-200',
}

const WO_TYPE_LABELS: Record<WorkOrderType, string> = {
  CORRECTIVE: 'Corrective',
  PREVENTIVE: 'Preventive',
  EMERGENCY: 'Emergency',
  INSPECTION: 'Inspection',
  CALIBRATION: 'Calibration',
}

const PRIORITY_COLORS: Record<string, string> = {
  LOW: 'bg-slate-50 text-slate-600 border-slate-200',
  MEDIUM: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  HIGH: 'bg-amber-50 text-amber-700 border-amber-200',
  URGENT: 'bg-rose-50 text-rose-700 border-rose-200',
}

function WorkOrderListPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [projectId, setProjectId] = useState('')
  const [status, setStatus] = useState('')
  const [type, setType] = useState('')

  const { data: projectsData } = useProjects({ limit: 100 })
  const projects = projectsData?.data ?? []

  const { data: woData, isLoading, isError } = useWorkOrders({
    projectId: projectId || undefined,
    status: status as WorkOrderStatus || undefined,
    type: type as WorkOrderType || undefined,
    search: search || undefined,
  })

  const workOrders = woData?.data ?? []
  const total = woData?.pagination.total ?? 0

  return (
    <div className="space-y-3">
      <PageHeader
        title="Work Orders"
        actions={
          <Link to="/facility-management/work-orders/create">
            <Button className="bg-indigo-600 hover:bg-indigo-700">
              <Plus className="w-4 h-4 mr-2" />
              Create WO
            </Button>
          </Link>
        }
      />

      <Card>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search work orders..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={projectId || '__all__'} onValueChange={(v) => setProjectId(v === '__all__' ? '' : v)}>
              <SelectTrigger>
                <SelectValue placeholder="All projects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All projects</SelectItem>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={status || '__all__'} onValueChange={(v) => setStatus(v === '__all__' ? '' : v)}>
              <SelectTrigger>
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All statuses</SelectItem>
                {Object.entries(WO_STATUS_LABELS).map(([val, label]) => (
                  <SelectItem key={val} value={val}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={type || '__all__'} onValueChange={(v) => setType(v === '__all__' ? '' : v)}>
              <SelectTrigger>
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All types</SelectItem>
                {Object.entries(WO_TYPE_LABELS).map(([val, label]) => (
                  <SelectItem key={val} value={val}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4 overflow-x-auto">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-slate-400 font-extralight">
              {total} work order{total !== 1 ? 's' : ''}
            </p>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="border-slate-100">
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                  WO #
                </TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                  Title
                </TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                  Type
                </TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                  Priority
                </TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                  Status
                </TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                  Asset
                </TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                  Assigned To
                </TableHead>
                <TableHead className="text-center text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={8}>
                      <Skeleton className="h-8 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : isError ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <p className="text-slate-600">Failed to load work orders.</p>
                  </TableCell>
                </TableRow>
              ) : workOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12">
                    <Wrench className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-600">No work orders found</p>
                  </TableCell>
                </TableRow>
              ) : (
                workOrders.map((wo) => (
                  <TableRow key={wo.id} className="hover:bg-slate-50/50 border-slate-100">
                    <TableCell className="font-mono text-xs text-slate-600">
                      {wo.wo_number}
                    </TableCell>
                    <TableCell className="text-sm text-slate-700 font-light max-w-[200px] truncate">
                      {wo.title}
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">
                      {WO_TYPE_LABELS[wo.type as WorkOrderType] ?? wo.type}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${PRIORITY_COLORS[wo.priority] ?? ''}`}
                      >
                        {wo.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${WO_STATUS_COLORS[wo.status as WorkOrderStatus] ?? ''}`}
                      >
                        {WO_STATUS_LABELS[wo.status as WorkOrderStatus] ?? wo.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">
                      {wo.asset?.name ?? '—'}
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">
                      {wo.assignee
                        ? `${wo.assignee.first_name} ${wo.assignee.last_name}`
                        : '—'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-slate-400 hover:text-indigo-600"
                          onClick={() =>
                            navigate({
                              to: `/facility-management/work-orders/${wo.id}`,
                            })
                          }
                          aria-label="View work order"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
