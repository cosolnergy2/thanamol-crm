import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { Plus, AlertTriangle, Search } from 'lucide-react'
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
import {
  useIncidents,
  useInvestigateIncident,
  useResolveIncident,
  useCloseIncident,
} from '@/hooks/useIncidents'
import { useProjects } from '@/hooks/useProjects'
import type { IncidentSeverity, IncidentStatus, IncidentWithRelations } from '@thanamol/shared'

export const Route = createFileRoute(
  '/_authenticated/facility-management/compliance/incidents/'
)({
  component: IncidentsListPage,
})

const SEVERITY_LABELS: Record<IncidentSeverity, string> = {
  MINOR: 'Minor',
  MODERATE: 'Moderate',
  MAJOR: 'Major',
  CRITICAL: 'Critical',
}

const SEVERITY_COLORS: Record<IncidentSeverity, string> = {
  MINOR: 'bg-slate-50 text-slate-600 border-slate-200',
  MODERATE: 'bg-amber-50 text-amber-700 border-amber-200',
  MAJOR: 'bg-orange-50 text-orange-700 border-orange-200',
  CRITICAL: 'bg-rose-50 text-rose-700 border-rose-200',
}

const STATUS_LABELS: Record<IncidentStatus, string> = {
  REPORTED: 'Reported',
  INVESTIGATING: 'Investigating',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed',
}

const STATUS_COLORS: Record<IncidentStatus, string> = {
  REPORTED: 'bg-rose-50 text-rose-700 border-rose-200',
  INVESTIGATING: 'bg-amber-50 text-amber-700 border-amber-200',
  RESOLVED: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  CLOSED: 'bg-slate-100 text-slate-500 border-slate-200',
}

function IncidentActionsMenu({ incident }: { incident: IncidentWithRelations }) {
  const investigateMutation = useInvestigateIncident(incident.id)
  const resolveMutation = useResolveIncident(incident.id)
  const closeMutation = useCloseIncident(incident.id)

  const actions = []

  if (incident.status === 'REPORTED') {
    actions.push(
      <DropdownMenuItem
        key="investigate"
        onClick={async () => {
          await investigateMutation.mutateAsync()
          toast.success('Investigation started')
        }}
      >
        Start Investigation
      </DropdownMenuItem>
    )
  }
  if (incident.status === 'INVESTIGATING') {
    actions.push(
      <DropdownMenuItem
        key="resolve"
        onClick={async () => {
          await resolveMutation.mutateAsync({})
          toast.success('Incident resolved')
        }}
      >
        Mark Resolved
      </DropdownMenuItem>
    )
  }
  if (incident.status === 'REPORTED' || incident.status === 'RESOLVED') {
    actions.push(
      <DropdownMenuItem
        key="close"
        onClick={async () => {
          await closeMutation.mutateAsync()
          toast.success('Incident closed')
        }}
      >
        Close Incident
      </DropdownMenuItem>
    )
  }

  if (actions.length === 0) return null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" variant="outline">
          Actions
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">{actions}</DropdownMenuContent>
    </DropdownMenu>
  )
}

function IncidentsListPage() {
  const [search, setSearch] = useState('')
  const [projectId, setProjectId] = useState('')
  const [severityFilter, setSeverityFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const { data: projectsData } = useProjects({ limit: 100 })
  const projects = projectsData?.data ?? []

  const { data: incidentsData, isLoading } = useIncidents({
    projectId: projectId || undefined,
    severity: (severityFilter || undefined) as IncidentSeverity | undefined,
    status: (statusFilter || undefined) as IncidentStatus | undefined,
    search: search || undefined,
  })
  const incidents = incidentsData?.data ?? []

  const open = incidents.filter((i) => i.status !== 'CLOSED')
  const critical = incidents.filter((i) => i.severity === 'CRITICAL')

  return (
    <div className="space-y-6">
      <PageHeader
        title="Incident Management"
        subtitle="รายงานและติดตาม Incidents"
        actions={
          <Link to="/facility-management/compliance/incidents/create">
            <Button className="bg-rose-600 hover:bg-rose-700 gap-2">
              <Plus className="w-4 h-4" />
              Report Incident
            </Button>
          </Link>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">Open Incidents</p>
                <p className="text-2xl font-light text-slate-700 mt-1">{open.length}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">Critical</p>
                <p className="text-2xl font-light text-slate-700 mt-1">{critical.length}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-rose-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">Total</p>
                <p className="text-2xl font-light text-slate-700 mt-1">
                  {incidentsData?.pagination.total ?? 0}
                </p>
              </div>
              <AlertTriangle className="w-8 h-8 text-slate-400" />
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
                placeholder="Search incidents..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Projects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Projects</SelectItem>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Severity</SelectItem>
                {Object.entries(SEVERITY_LABELS).map(([val, label]) => (
                  <SelectItem key={val} value={val}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Status</SelectItem>
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
                  <TableHead>Incident #</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {incidents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-slate-500 py-8">
                      No incidents found
                    </TableCell>
                  </TableRow>
                ) : (
                  incidents.map((incident) => (
                    <TableRow key={incident.id}>
                      <TableCell className="font-mono text-sm">
                        {incident.incident_number}
                      </TableCell>
                      <TableCell className="font-medium text-sm max-w-xs truncate">
                        {incident.title}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={SEVERITY_COLORS[incident.severity as IncidentSeverity]}
                        >
                          {SEVERITY_LABELS[incident.severity as IncidentSeverity]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {format(new Date(incident.incident_date), 'dd/MM/yyyy HH:mm')}
                      </TableCell>
                      <TableCell className="text-sm">{incident.project.name}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={STATUS_COLORS[incident.status as IncidentStatus]}
                        >
                          {STATUS_LABELS[incident.status as IncidentStatus]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <IncidentActionsMenu incident={incident} />
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
