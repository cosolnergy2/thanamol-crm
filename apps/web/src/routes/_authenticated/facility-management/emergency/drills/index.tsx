import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { Plus, ClipboardCheck, Search } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { PageHeader } from '@/components/PageHeader'
import { useEmergencyDrills, useDeleteEmergencyDrill } from '@/hooks/useEmergencyDrills'
import { useProjects } from '@/hooks/useProjects'
import type { DrillStatus, EmergencyDrillWithRelations } from '@thanamol/shared'

export const Route = createFileRoute(
  '/_authenticated/facility-management/emergency/drills/'
)({
  component: EmergencyDrillsListPage,
})

const STATUS_LABELS: Record<DrillStatus, string> = {
  SCHEDULED: 'Scheduled',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
}

const STATUS_COLORS: Record<DrillStatus, string> = {
  SCHEDULED: 'bg-amber-50 text-amber-700 border-amber-200',
  COMPLETED: 'bg-teal-50 text-teal-700 border-teal-200',
  CANCELLED: 'bg-slate-100 text-slate-500 border-slate-200',
}

function DrillActionsMenu({ drill }: { drill: EmergencyDrillWithRelations }) {
  const deleteMutation = useDeleteEmergencyDrill()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" variant="outline">
          Actions
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <Link to="/facility-management/emergency/drills/$drillId" params={{ drillId: drill.id }}>
            View Details
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem
          className="text-rose-600"
          onClick={async () => {
            await deleteMutation.mutateAsync(drill.id)
            toast.success('Drill deleted')
          }}
        >
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function EmergencyDrillsListPage() {
  const [search, setSearch] = useState('')
  const [projectId, setProjectId] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const { data: projectsData } = useProjects({ limit: 100 })
  const projects = projectsData?.data ?? []

  const { data: drillsData, isLoading } = useEmergencyDrills({
    projectId: projectId || undefined,
    status: (statusFilter || undefined) as DrillStatus | undefined,
    search: search || undefined,
  })
  const drills = drillsData?.data ?? []

  const scheduled = drills.filter((d) => d.status === 'SCHEDULED')
  const completed = drills.filter((d) => d.status === 'COMPLETED')

  return (
    <div className="space-y-6">
      <PageHeader
        title="Emergency Drills"
        subtitle="การซ้อมแผนฉุกเฉิน"
        actions={
          <Link to="/facility-management/emergency/drills/create">
            <Button className="bg-teal-600 hover:bg-teal-700 gap-2">
              <Plus className="w-4 h-4" />
              Schedule Drill
            </Button>
          </Link>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">Scheduled</p>
                <p className="text-2xl font-light text-slate-700 mt-1">{scheduled.length}</p>
              </div>
              <ClipboardCheck className="w-8 h-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">Completed</p>
                <p className="text-2xl font-light text-slate-700 mt-1">{completed.length}</p>
              </div>
              <ClipboardCheck className="w-8 h-8 text-teal-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">Total Drills</p>
                <p className="text-2xl font-light text-slate-700 mt-1">
                  {drillsData?.pagination.total ?? 0}
                </p>
              </div>
              <ClipboardCheck className="w-8 h-8 text-slate-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                className="pl-9"
                placeholder="Search drills..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={projectId || '__all__'} onValueChange={(v) => setProjectId(v === '__all__' ? '' : v)}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Projects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Projects</SelectItem>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter || '__all__'} onValueChange={(v) => setStatusFilter(v === '__all__' ? '' : v)}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Status</SelectItem>
                {Object.entries(STATUS_LABELS).map(([val, label]) => (
                  <SelectItem key={val} value={val}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Drill Type</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Scheduled Date</TableHead>
                  <TableHead>Actual Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {drills.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-slate-500 py-8">
                      No drills found
                    </TableCell>
                  </TableRow>
                ) : (
                  drills.map((drill) => (
                    <TableRow key={drill.id}>
                      <TableCell className="font-medium text-sm">
                        <Link
                          to="/facility-management/emergency/drills/$drillId"
                          params={{ drillId: drill.id }}
                          className="hover:text-teal-600 transition-colors"
                        >
                          {drill.drill_type}
                        </Link>
                      </TableCell>
                      <TableCell className="text-sm text-slate-500">{drill.plan.title}</TableCell>
                      <TableCell className="text-sm">{drill.project.name}</TableCell>
                      <TableCell className="text-sm">
                        {format(new Date(drill.scheduled_date), 'dd/MM/yyyy')}
                      </TableCell>
                      <TableCell className="text-sm">
                        {drill.actual_date
                          ? format(new Date(drill.actual_date), 'dd/MM/yyyy')
                          : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={STATUS_COLORS[drill.status as DrillStatus]}
                        >
                          {STATUS_LABELS[drill.status as DrillStatus]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DrillActionsMenu drill={drill} />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
