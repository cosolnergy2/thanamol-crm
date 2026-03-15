import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { Building2, Users, Eye, Search } from 'lucide-react'
import type { ProjectOccupancy } from '@thanamol/shared'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { PageHeader } from '@/components/PageHeader'
import { useProjects } from '@/hooks/useProjects'
import { useOccupancyReport } from '@/hooks/useReports'

export const Route = createFileRoute('/_authenticated/projects/customer-overview')({
  component: CustomerOverviewPage,
})

const STATUS_STYLES: Record<string, string> = {
  PLANNING: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  ACTIVE: 'bg-teal-50 text-teal-700 border-teal-200',
  COMPLETED: 'bg-slate-100 text-slate-700 border-slate-200',
  SUSPENDED: 'bg-amber-50 text-amber-700 border-amber-200',
}

function OccupancyBar({ rate }: { rate: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-slate-100 rounded-full h-1.5">
        <div
          className="bg-gradient-to-r from-teal-500 to-teal-600 rounded-full h-1.5"
          style={{ width: `${Math.min(rate, 100)}%` }}
        />
      </div>
      <span className="text-[10px] text-slate-500 w-8 text-right">{rate}%</span>
    </div>
  )
}

function CustomerOverviewPage() {
  const [search, setSearch] = useState('')

  const { data: projectsData, isLoading: loadingProjects } = useProjects({ limit: 100 })
  const { data: occupancyData, isLoading: loadingOccupancy } = useOccupancyReport()

  const isLoading = loadingProjects || loadingOccupancy

  const projects = projectsData?.data ?? []
  const occupancyByProject = occupancyData?.byProject ?? []

  const enrichedProjects = projects
    .map((project) => {
      const occ = occupancyByProject.find((o: ProjectOccupancy) => o.projectId === project.id)
      return { ...project, occupancy: occ }
    })
    .filter((p) => {
      if (!search) return true
      const q = search.toLowerCase()
      return p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q)
    })

  const totalUnits = occupancyData?.summary.totalUnits ?? 0
  const totalOccupied = occupancyData?.summary.totalOccupied ?? 0
  const totalAvailable = occupancyData?.summary.totalAvailable ?? 0
  const overallRate = occupancyData?.summary.overallOccupancyRate ?? 0

  return (
    <div className="space-y-3">
      <PageHeader title="Customer Overview" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Projects', value: String(projects.length), color: 'text-indigo-600' },
          { label: 'Total Units', value: String(totalUnits), color: 'text-slate-700' },
          { label: 'Occupied', value: String(totalOccupied), color: 'text-teal-600' },
          { label: 'Available', value: String(totalAvailable), color: 'text-emerald-600' },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="pt-4 pb-4 text-center">
              <p className="text-[10px] font-extralight text-slate-400 uppercase tracking-widest">
                {stat.label}
              </p>
              {isLoading ? (
                <Skeleton className="h-8 w-12 mx-auto mt-1" />
              ) : (
                <p className={`text-2xl font-light mt-0.5 ${stat.color}`}>{stat.value}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 justify-between">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <Input
                placeholder="Search project..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="text-[10px] text-slate-400 font-extralight">
              Overall occupancy: <span className="font-light text-teal-700">{overallRate}%</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-light text-slate-600 flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            Projects &amp; Unit Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-100">
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                  Project
                </TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                  Status
                </TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase text-right">
                  Sold
                </TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase text-right">
                  Rented
                </TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase text-right">
                  Available
                </TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                  Occupancy
                </TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={7}>
                      <Skeleton className="h-8 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : enrichedProjects.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <div className="flex flex-col items-center">
                      <Users className="w-10 h-10 text-slate-300 mb-3" />
                      <p className="text-slate-500 text-sm">
                        {search ? 'No projects match your search' : 'No projects found'}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                enrichedProjects.map((project) => (
                  <TableRow key={project.id} className="border-slate-100 hover:bg-slate-50/50">
                    <TableCell className="py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-gradient-to-br from-indigo-500 to-teal-600 rounded-md flex items-center justify-center flex-shrink-0">
                          <Building2 className="w-3.5 h-3.5 text-white" />
                        </div>
                        <div>
                          <p className="text-[11px] font-light text-slate-800">{project.name}</p>
                          <p className="text-[9px] text-slate-400">{project.code}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-3">
                      <Badge
                        variant="outline"
                        className={`text-[9px] h-4 px-1.5 font-extralight ${STATUS_STYLES[project.status] ?? ''}`}
                      >
                        {project.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-[11px] text-slate-700 font-light">
                      {project.occupancy?.sold ?? 0}
                    </TableCell>
                    <TableCell className="text-right text-[11px] text-slate-700 font-light">
                      {project.occupancy?.rented ?? 0}
                    </TableCell>
                    <TableCell className="text-right text-[11px] text-teal-700 font-light">
                      {project.occupancy?.available ?? 0}
                    </TableCell>
                    <TableCell className="min-w-32">
                      <OccupancyBar rate={project.occupancy?.occupancyRate ?? 0} />
                    </TableCell>
                    <TableCell>
                      <Link to="/projects/$projectId" params={{ projectId: project.id }}>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                          <Eye className="w-3 h-3" />
                        </Button>
                      </Link>
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
