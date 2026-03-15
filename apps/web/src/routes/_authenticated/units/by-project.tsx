import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { Building2, Package, MapPin, DollarSign } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useUnits } from '@/hooks/useUnits'
import { useProjects } from '@/hooks/useProjects'
import type { UnitStatus, UnitWithProject } from '@thanamol/shared'

export const Route = createFileRoute('/_authenticated/units/by-project')({
  component: UnitsByProjectPage,
})

const STATUS_CLASSES: Record<UnitStatus, string> = {
  AVAILABLE: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  RESERVED: 'bg-amber-100 text-amber-700 border-amber-200',
  RENTED: 'bg-blue-100 text-blue-700 border-blue-200',
  SOLD: 'bg-purple-100 text-purple-700 border-purple-200',
  UNDER_MAINTENANCE: 'bg-slate-100 text-slate-700 border-slate-200',
}

const TYPE_CLASSES: Record<string, string> = {
  Warehouse: 'bg-indigo-100 text-indigo-700',
  Commercial: 'bg-purple-100 text-purple-700',
  Office: 'bg-pink-100 text-pink-700',
  Other: 'bg-slate-100 text-slate-700',
}

const STATUS_LABELS: Record<UnitStatus, string> = {
  AVAILABLE: 'Available',
  RESERVED: 'Reserved',
  RENTED: 'Rented',
  SOLD: 'Sold',
  UNDER_MAINTENANCE: 'Maintenance',
}

const STATUS_ICON: Record<UnitStatus, string> = {
  AVAILABLE: '✓',
  RESERVED: '◐',
  RENTED: '●',
  SOLD: '■',
  UNDER_MAINTENANCE: '⚠',
}

type ProjectStats = {
  total: number
  available: number
  rented: number
  reserved: number
}

function computeProjectStats(units: UnitWithProject[]): ProjectStats {
  return {
    total: units.length,
    available: units.filter((u) => u.status === 'AVAILABLE').length,
    rented: units.filter((u) => u.status === 'RENTED').length,
    reserved: units.filter((u) => u.status === 'RESERVED').length,
  }
}

function UnitsByProjectPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')

  const { data: unitsData, isLoading } = useUnits({ limit: 500 })
  const { data: projectsData } = useProjects({ limit: 100 })

  const allUnits = unitsData?.data ?? []
  const allProjects = projectsData?.data ?? []

  const filteredUnits = allUnits.filter((unit) => {
    const matchesSearch =
      !search ||
      unit.unit_number.toLowerCase().includes(search.toLowerCase()) ||
      (unit.building?.toLowerCase().includes(search.toLowerCase()) ?? false)

    const matchesStatus = statusFilter === 'all' || unit.status === statusFilter
    const matchesType = typeFilter === 'all' || unit.type === typeFilter

    return matchesSearch && matchesStatus && matchesType
  })

  const projectGroups = allProjects
    .map((project) => ({
      id: project.id,
      name: project.name,
      code: project.code,
      units: filteredUnits.filter((u) => u.project_id === project.id),
    }))
    .sort((a, b) => a.code.localeCompare(b.code))

  const totalUnits = filteredUnits.length
  const totalAvailable = filteredUnits.filter((u) => u.status === 'AVAILABLE').length
  const totalRented = filteredUnits.filter((u) => u.status === 'RENTED').length

  return (
    <div className="space-y-3">
      <div className="mb-4">
        <h1 className="text-2xl font-extralight tracking-[0.3em] text-slate-600 uppercase">
          Units by Project
        </h1>
        <div className="h-px w-20 bg-gradient-to-r from-slate-300 to-transparent mt-2" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border border-slate-100 bg-white/90">
          <CardContent className="pt-5 pb-5 text-center">
            <p className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
              Projects
            </p>
            <p className="text-3xl font-extralight text-slate-700 mt-1.5">{allProjects.length}</p>
          </CardContent>
        </Card>
        <Card className="border border-slate-100 bg-white/90">
          <CardContent className="pt-5 pb-5 text-center">
            <p className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
              Total Units
            </p>
            <p className="text-3xl font-extralight text-slate-700 mt-1.5">{totalUnits}</p>
          </CardContent>
        </Card>
        <Card className="border border-slate-100 bg-white/90">
          <CardContent className="pt-5 pb-5 text-center">
            <p className="text-[10px] font-extralight text-emerald-600 tracking-widest uppercase">
              Available
            </p>
            <p className="text-3xl font-extralight text-emerald-600 mt-1.5">{totalAvailable}</p>
          </CardContent>
        </Card>
        <Card className="border border-slate-100 bg-white/90">
          <CardContent className="pt-5 pb-5 text-center">
            <p className="text-[10px] font-extralight text-blue-600 tracking-widest uppercase">
              Rented
            </p>
            <p className="text-3xl font-extralight text-blue-600 mt-1.5">{totalRented}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col md:flex-row gap-4">
            <Input
              placeholder="Search unit number, building..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1"
            />
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="Warehouse">Warehouse</SelectItem>
                <SelectItem value="Commercial">Commercial</SelectItem>
                <SelectItem value="Office">Office</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="AVAILABLE">Available</SelectItem>
                <SelectItem value="RESERVED">Reserved</SelectItem>
                <SelectItem value="RENTED">Rented</SelectItem>
                <SelectItem value="SOLD">Sold</SelectItem>
                <SelectItem value="UNDER_MAINTENANCE">Maintenance</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="border border-slate-100">
              <CardContent className="py-4">
                <Skeleton className="h-5 w-48 mb-2" />
                <Skeleton className="h-3 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : allProjects.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Building2 className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-600 font-extralight">No projects found</p>
          </CardContent>
        </Card>
      ) : (
        <Accordion type="multiple" className="space-y-3">
          {projectGroups.map((project) => {
            const stats = computeProjectStats(project.units)
            const occupancyRate =
              stats.total > 0 ? Math.round((stats.rented / stats.total) * 100) : 0

            return (
              <AccordionItem
                key={project.id}
                value={project.id}
                className="border border-slate-100 rounded-lg bg-white/90"
              >
                <AccordionTrigger className="px-4 py-3 hover:no-underline">
                  <div className="flex items-center justify-between w-full pr-3">
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0 w-9 h-9 bg-gradient-to-br from-indigo-500 to-teal-600 rounded-lg flex items-center justify-center">
                        <Building2 className="w-4 h-4 text-white" />
                      </div>
                      <div className="text-left">
                        <h3 className="text-sm font-light text-slate-800 tracking-wider">
                          {project.code} — {project.name}
                        </h3>
                        <p className="text-[10px] text-slate-500 mt-0.5 font-extralight">
                          {stats.total} units &bull; {stats.available} available &bull;{' '}
                          {stats.rented} rented
                        </p>
                      </div>
                    </div>
                    <div className="text-right mr-3">
                      <p className="text-[9px] text-slate-400 font-extralight tracking-wide">
                        Occupancy
                      </p>
                      <p className="text-base font-extralight text-slate-800">{occupancyRate}%</p>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  {project.units.length === 0 ? (
                    <div className="text-center py-8">
                      <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                      <p className="text-slate-600 font-extralight">
                        No units match the current filters
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-3 overflow-x-auto">
                      {project.units.map((unit) => (
                        <Card
                          key={unit.id}
                          className="hover:shadow-sm transition-shadow border border-slate-100 bg-white/90"
                        >
                          <div className="p-3">
                            <div className="flex items-start justify-between mb-1.5">
                              <p className="text-[11px] font-light tracking-wider text-slate-700">
                                {unit.unit_number}
                              </p>
                            </div>
                            <div className="flex items-center space-x-1 mb-2">
                              <Badge
                                variant="outline"
                                className={`${TYPE_CLASSES[unit.type] ?? TYPE_CLASSES.Other} text-[9px] h-4 px-1.5 font-extralight`}
                              >
                                {unit.type}
                              </Badge>
                              <Badge
                                variant="outline"
                                className={`${STATUS_CLASSES[unit.status]} text-[9px] h-4 px-1.5 font-extralight`}
                              >
                                {STATUS_ICON[unit.status]} {STATUS_LABELS[unit.status]}
                              </Badge>
                            </div>
                            <div className="space-y-1">
                              {unit.building && (
                                <div className="flex items-center text-[10px] text-slate-600 font-extralight">
                                  <MapPin className="w-3 h-3 mr-1 text-slate-400" />
                                  {unit.building}
                                  {unit.floor !== null && ` • Floor ${unit.floor}`}
                                </div>
                              )}
                              {unit.area_sqm !== null && (
                                <p className="text-[10px] text-slate-600 font-extralight">
                                  {unit.area_sqm} sqm
                                </p>
                              )}
                              {unit.price !== null && (
                                <div className="flex items-center text-[10px] font-light text-emerald-700">
                                  <DollarSign className="w-3 h-3 mr-1 text-emerald-600" />
                                  ฿{unit.price.toLocaleString()}/mo
                                </div>
                              )}
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>
            )
          })}
        </Accordion>
      )}
    </div>
  )
}
