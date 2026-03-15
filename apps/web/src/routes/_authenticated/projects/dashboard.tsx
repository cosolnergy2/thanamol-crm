import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { useProjects, useProjectDashboard } from '@/hooks/useProjects'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { Building2, CheckCircle, Package, TrendingUp, Eye } from 'lucide-react'

export const Route = createFileRoute('/_authenticated/projects/dashboard')({
  component: ProjectDashboardPage,
})

const STATUS_LABELS: Record<string, string> = {
  PLANNING: 'Planning',
  ACTIVE: 'Active',
  COMPLETED: 'Completed',
  SUSPENDED: 'Suspended',
}

const STATUS_STYLES: Record<string, string> = {
  PLANNING: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  ACTIVE: 'bg-teal-50 text-teal-700 border-teal-200',
  COMPLETED: 'bg-slate-100 text-slate-700 border-slate-200',
  SUSPENDED: 'bg-amber-50 text-amber-700 border-amber-200',
}

const UNIT_STATUS_COLORS: Record<string, string> = {
  available: '#14b8a6',
  reserved: '#6366f1',
  sold: '#64748b',
  rented: '#10b981',
  under_maintenance: '#f59e0b',
}

const UNIT_STATUS_LABELS: Record<string, string> = {
  available: 'Available',
  reserved: 'Reserved',
  sold: 'Sold',
  rented: 'Rented',
  under_maintenance: 'Maintenance',
}

const PROJECT_TYPE_COLORS = ['#6366f1', '#14b8a6', '#f59e0b', '#10b981', '#64748b']

function ProjectDashboardStats({ projectId }: { projectId: string }) {
  const { data, isLoading, isError } = useProjectDashboard(projectId)

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-64" />
      </div>
    )
  }

  if (isError || !data?.dashboard) {
    return (
      <p className="text-sm text-slate-500 py-4">
        Unable to load dashboard data for this project.
      </p>
    )
  }

  const { totalUnits, unitStatusCounts, occupancyRate, totalRevenuePotential } = data.dashboard

  const pieData = Object.entries(unitStatusCounts)
    .filter(([, count]) => count > 0)
    .map(([key, count]) => ({
      name: UNIT_STATUS_LABELS[key] ?? key,
      value: count,
      color: UNIT_STATUS_COLORS[key] ?? '#64748b',
    }))

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-slate-50 rounded-lg p-3 text-center">
          <p className="text-xs text-slate-500">Total Units</p>
          <p className="text-2xl font-bold text-indigo-600 mt-0.5">{totalUnits}</p>
        </div>
        <div className="bg-slate-50 rounded-lg p-3 text-center">
          <p className="text-xs text-slate-500">Available</p>
          <p className="text-2xl font-bold text-teal-600 mt-0.5">{unitStatusCounts.available}</p>
        </div>
        <div className="bg-slate-50 rounded-lg p-3 text-center">
          <p className="text-xs text-slate-500">Occupancy</p>
          <p className="text-2xl font-bold text-emerald-600 mt-0.5">{occupancyRate}%</p>
        </div>
        <div className="bg-slate-50 rounded-lg p-3 text-center">
          <p className="text-xs text-slate-500">Revenue Potential</p>
          <p className="text-xl font-bold text-slate-700 mt-0.5">
            ฿{(totalRevenuePotential / 1_000_000).toFixed(1)}M
          </p>
        </div>
      </div>

      {pieData.length > 0 && (
        <div>
          <p className="text-sm font-medium text-slate-700 mb-2">Unit Status Distribution</p>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label={({ name, value }) => `${name}: ${value}`}
                labelLine={false}
              >
                {pieData.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}

function buildProjectsByTypeChart(projects: Array<{ type: string }>) {
  const counts: Record<string, number> = {}
  for (const project of projects) {
    counts[project.type] = (counts[project.type] ?? 0) + 1
  }
  return Object.entries(counts).map(([type, count]) => ({ type, count }))
}

function ProjectDashboardPage() {
  const [selectedProjectId, setSelectedProjectId] = useState<string>('')

  const { data: allProjectsData, isLoading } = useProjects({ limit: 100 })
  const projects = allProjectsData?.data ?? []

  const totalProjects = projects.length
  const activeProjects = projects.filter((p) => p.status === 'ACTIVE').length
  const totalUnits = projects.reduce(
    (sum, p) => sum + (p._count?.units ?? p.total_units ?? 0),
    0
  )
  const avgUnits = totalProjects > 0 ? Math.round(totalUnits / totalProjects) : 0

  const byTypeData = buildProjectsByTypeChart(projects)

  const selectedProject = projects.find((p) => p.id === selectedProjectId)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Project Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">Portfolio overview and analytics</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-5 pb-5 text-center">
            <Building2 className="w-6 h-6 text-indigo-600 mx-auto mb-2" />
            <p className="text-xs text-slate-500 uppercase tracking-wide">Total Projects</p>
            {isLoading ? (
              <Skeleton className="h-9 w-16 mx-auto mt-1" />
            ) : (
              <p className="text-3xl font-bold text-indigo-600 mt-1">{totalProjects}</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-5 text-center">
            <CheckCircle className="w-6 h-6 text-teal-600 mx-auto mb-2" />
            <p className="text-xs text-slate-500 uppercase tracking-wide">Active Projects</p>
            {isLoading ? (
              <Skeleton className="h-9 w-16 mx-auto mt-1" />
            ) : (
              <p className="text-3xl font-bold text-teal-600 mt-1">{activeProjects}</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-5 text-center">
            <Package className="w-6 h-6 text-emerald-600 mx-auto mb-2" />
            <p className="text-xs text-slate-500 uppercase tracking-wide">Total Units</p>
            {isLoading ? (
              <Skeleton className="h-9 w-16 mx-auto mt-1" />
            ) : (
              <p className="text-3xl font-bold text-emerald-600 mt-1">{totalUnits}</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-5 text-center">
            <TrendingUp className="w-6 h-6 text-amber-600 mx-auto mb-2" />
            <p className="text-xs text-slate-500 uppercase tracking-wide">Avg Units / Project</p>
            {isLoading ? (
              <Skeleton className="h-9 w-16 mx-auto mt-1" />
            ) : (
              <p className="text-3xl font-bold text-amber-600 mt-1">{avgUnits}</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Projects by Type</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-64" />
            ) : byTypeData.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-8">No data available</p>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={byTypeData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="type" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip />
                  <Bar dataKey="count" name="Projects" radius={[4, 4, 0, 0]}>
                    {byTypeData.map((_, index) => (
                      <Cell
                        key={index}
                        fill={PROJECT_TYPE_COLORS[index % PROJECT_TYPE_COLORS.length]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Project Unit Analysis</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-slate-600 mb-2">Select a project to view its unit breakdown:</p>
              <Select
                value={selectedProjectId || 'none'}
                onValueChange={(v) => setSelectedProjectId(v === 'none' ? '' : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select project..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Select a project...</SelectItem>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} ({p.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedProjectId && <ProjectDashboardStats projectId={selectedProjectId} />}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Projects</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {projects.slice(0, 10).map((project) => (
                <div
                  key={project.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Building2 className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{project.name}</p>
                      <p className="text-xs text-slate-500">{project.code} · {project.type}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-sm text-slate-500">
                      {project._count?.units ?? project.total_units} units
                    </span>
                    <Badge
                      variant="outline"
                      className={STATUS_STYLES[project.status] ?? 'bg-slate-100 text-slate-700'}
                    >
                      {STATUS_LABELS[project.status] ?? project.status}
                    </Badge>
                    <Link to="/projects/$projectId" params={{ projectId: project.id }}>
                      <Button variant="ghost" size="icon" className="h-7 w-7">
                        <Eye className="w-3.5 h-3.5" />
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
