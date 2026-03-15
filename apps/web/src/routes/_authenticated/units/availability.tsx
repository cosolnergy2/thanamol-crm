import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { Search, Package, Download, CheckCircle2, MapPin, DollarSign } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useUnits } from '@/hooks/useUnits'

export const Route = createFileRoute('/_authenticated/units/availability')({
  component: UnitAvailabilityPage,
})

const TYPE_CLASSES: Record<string, string> = {
  Warehouse: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  Commercial: 'bg-purple-100 text-purple-700 border-purple-200',
  Office: 'bg-pink-100 text-pink-700 border-pink-200',
  Other: 'bg-slate-100 text-slate-700 border-slate-200',
}

type SizeRange = 'all' | 'small' | 'medium' | 'large' | 'xlarge'

function matchesSizeFilter(areaSqm: number | null, sizeFilter: SizeRange): boolean {
  if (sizeFilter === 'all' || areaSqm === null) return true
  switch (sizeFilter) {
    case 'small':
      return areaSqm < 50
    case 'medium':
      return areaSqm >= 50 && areaSqm < 150
    case 'large':
      return areaSqm >= 150 && areaSqm < 300
    case 'xlarge':
      return areaSqm >= 300
  }
}

function UnitAvailabilityPage() {
  const [search, setSearch] = useState('')
  const [buildingFilter, setBuildingFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [sizeFilter, setSizeFilter] = useState<SizeRange>('all')

  const { data, isLoading, isError } = useUnits({ status: 'AVAILABLE', limit: 500 })

  const availableUnits = data?.data ?? []

  const buildings = [...new Set(availableUnits.map((u) => u.building).filter(Boolean))].sort() as string[]

  const filteredUnits = availableUnits.filter((unit) => {
    const matchesSearch =
      !search ||
      unit.unit_number.toLowerCase().includes(search.toLowerCase()) ||
      (unit.building?.toLowerCase().includes(search.toLowerCase()) ?? false)

    const matchesBuilding = buildingFilter === 'all' || unit.building === buildingFilter
    const matchesType = typeFilter === 'all' || unit.type === typeFilter
    const matchesSize = matchesSizeFilter(unit.area_sqm, sizeFilter)

    return matchesSearch && matchesBuilding && matchesType && matchesSize
  })

  function exportToCsv() {
    const headers = ['Unit Number', 'Project', 'Type', 'Building', 'Floor', 'Area (sqm)', 'Price/mo']
    const rows = filteredUnits.map((unit) => [
      unit.unit_number,
      `${unit.project.code} - ${unit.project.name}`,
      unit.type,
      unit.building ?? '-',
      unit.floor !== null ? String(unit.floor) : '-',
      unit.area_sqm !== null ? String(unit.area_sqm) : '-',
      unit.price !== null ? String(unit.price) : '-',
    ])

    const csvContent = [headers, ...rows].map((row) => row.join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `available-units-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(link.href)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-extralight tracking-[0.3em] text-slate-600 uppercase">
            Unit Availability
          </h1>
          <div className="h-px w-20 bg-gradient-to-r from-slate-300 to-transparent mt-2" />
        </div>
        <Button onClick={exportToCsv} variant="outline">
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200">
          <CardContent className="pt-5 pb-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-emerald-700 font-extralight tracking-widest uppercase">
                  Available Units
                </p>
                <p className="text-3xl font-extralight text-emerald-900 mt-1.5">
                  {availableUnits.length}
                </p>
              </div>
              <CheckCircle2 className="w-9 h-9 text-emerald-600 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card className="border border-slate-100 bg-white/90">
          <CardContent className="pt-5 pb-5 text-center">
            <p className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
              Warehouse
            </p>
            <p className="text-3xl font-extralight text-slate-700 mt-1.5">
              {availableUnits.filter((u) => u.type === 'Warehouse').length}
            </p>
          </CardContent>
        </Card>
        <Card className="border border-slate-100 bg-white/90">
          <CardContent className="pt-5 pb-5 text-center">
            <p className="text-[10px] font-extralight text-slate-400 tracking-widests uppercase">
              Commercial
            </p>
            <p className="text-3xl font-extralight text-slate-700 mt-1.5">
              {availableUnits.filter((u) => u.type === 'Commercial').length}
            </p>
          </CardContent>
        </Card>
        <Card className="border border-slate-100 bg-white/90">
          <CardContent className="pt-5 pb-5 text-center">
            <p className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
              Office
            </p>
            <p className="text-3xl font-extralight text-slate-700 mt-1.5">
              {availableUnits.filter((u) => u.type === 'Office').length}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="md:col-span-2 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search unit number, building..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={buildingFilter} onValueChange={setBuildingFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All buildings" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Buildings</SelectItem>
                {buildings.map((b) => (
                  <SelectItem key={b} value={b}>
                    {b}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
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
            <Select value={sizeFilter} onValueChange={(v) => setSizeFilter(v as SizeRange)}>
              <SelectTrigger>
                <SelectValue placeholder="All sizes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sizes</SelectItem>
                <SelectItem value="small">&lt; 50 sqm</SelectItem>
                <SelectItem value="medium">50–150 sqm</SelectItem>
                <SelectItem value="large">150–300 sqm</SelectItem>
                <SelectItem value="xlarge">&gt; 300 sqm</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {isError && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          Failed to load availability data. Please refresh the page or try again.
        </div>
      )}

      <Card>
        <CardContent className="pt-4 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-100">
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                  Unit
                </TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                  Project
                </TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                  Type
                </TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                  Location
                </TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                  Area
                </TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                  Price / mo
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Skeleton className="h-4 w-20" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-28" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-16" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-12" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-20" />
                    </TableCell>
                  </TableRow>
                ))
              ) : filteredUnits.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12">
                    <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-600 font-extralight">No available units found</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredUnits.map((unit) => (
                  <TableRow key={unit.id} className="hover:bg-slate-50/50 border-slate-100">
                    <TableCell className="py-3">
                      <p className="font-light text-slate-800 text-[11px]">{unit.unit_number}</p>
                    </TableCell>
                    <TableCell className="py-3">
                      <p className="text-[10px] text-slate-600 font-extralight">
                        {unit.project.code}
                      </p>
                      <p className="text-[9px] text-slate-400 font-extralight mt-0.5">
                        {unit.project.name}
                      </p>
                    </TableCell>
                    <TableCell className="py-3">
                      <Badge
                        variant="outline"
                        className={`${TYPE_CLASSES[unit.type] ?? TYPE_CLASSES.Other} text-[9px] h-4 px-1.5 font-extralight`}
                      >
                        {unit.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-3">
                      <div className="space-y-0.5">
                        {unit.building && (
                          <div className="flex items-center text-[10px] text-slate-700 font-extralight">
                            <MapPin className="w-3 h-3 mr-1 text-slate-400" />
                            {unit.building}
                          </div>
                        )}
                        {unit.floor !== null && (
                          <p className="text-[9px] text-slate-400 font-extralight">
                            Floor {unit.floor}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="py-3">
                      {unit.area_sqm !== null ? (
                        <p className="text-[10px] text-slate-700 font-extralight">
                          {unit.area_sqm} sqm
                        </p>
                      ) : (
                        <span className="text-slate-400 text-[10px]">—</span>
                      )}
                    </TableCell>
                    <TableCell className="py-3">
                      {unit.price !== null ? (
                        <div className="flex items-center text-[10px] font-light text-emerald-700">
                          <DollarSign className="w-3 h-3 mr-1" />
                          ฿{unit.price.toLocaleString()}
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[10px]">—</span>
                      )}
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
