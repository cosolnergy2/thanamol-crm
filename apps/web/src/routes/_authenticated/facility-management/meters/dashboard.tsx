import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { Zap, Droplets, Flame, BarChart3 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { PageHeader } from '@/components/PageHeader'
import { useEnergyReport } from '@/hooks/useMeters'
import { useProjects } from '@/hooks/useProjects'
import type { FmsMeterType } from '@thanamol/shared'

export const Route = createFileRoute('/_authenticated/facility-management/meters/dashboard')({
  component: EnergyDashboardPage,
})

const METER_TYPE_CONFIG: Record<
  FmsMeterType,
  { label: string; icon: React.ElementType; color: string; bg: string }
> = {
  ELECTRICITY: {
    label: 'Electricity',
    icon: Zap,
    color: 'text-amber-600',
    bg: 'bg-amber-50',
  },
  WATER: {
    label: 'Water',
    icon: Droplets,
    color: 'text-teal-600',
    bg: 'bg-teal-50',
  },
  GAS: {
    label: 'Gas',
    icon: Flame,
    color: 'text-indigo-600',
    bg: 'bg-indigo-50',
  },
}

const METER_TYPES: FmsMeterType[] = ['ELECTRICITY', 'WATER', 'GAS']

function ConsumptionCard({
  meterType,
  consumption,
  unit,
  readingCount,
}: {
  meterType: FmsMeterType
  consumption: number
  unit: string
  readingCount: number
}) {
  const config = METER_TYPE_CONFIG[meterType]
  const Icon = config.icon

  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-slate-500">{config.label}</p>
            <p className="text-2xl font-semibold mt-1">
              {consumption.toLocaleString(undefined, { maximumFractionDigits: 2 })}{' '}
              <span className="text-sm font-normal text-slate-400">{unit}</span>
            </p>
            <p className="text-xs text-slate-400 mt-0.5">{readingCount} readings</p>
          </div>
          <div className={`p-2.5 rounded-lg ${config.bg}`}>
            <Icon className={`w-5 h-5 ${config.color}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function PeriodTable({
  byPeriod,
  periodType,
}: {
  byPeriod: Array<{ period: string; [key: string]: unknown }>
  periodType: 'month' | 'week'
}) {
  if (byPeriod.length === 0) {
    return (
      <div className="p-8 text-center text-slate-500 text-sm">No data for the selected period.</div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">
            <th className="text-left py-2 px-3 font-medium text-slate-600">
              {periodType === 'month' ? 'Month' : 'Week Starting'}
            </th>
            {METER_TYPES.map((t) => (
              <th key={t} className="text-right py-2 px-3 font-medium text-slate-600">
                {METER_TYPE_CONFIG[t].label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {byPeriod.map((row) => (
            <tr key={row.period} className="border-b last:border-0 hover:bg-slate-50">
              <td className="py-2 px-3 font-mono text-slate-700">{row.period}</td>
              {METER_TYPES.map((t) => {
                const data = row[t] as { consumption: number; unit: string } | undefined
                return (
                  <td key={t} className="text-right py-2 px-3 font-mono text-slate-600">
                    {data
                      ? `${data.consumption.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${data.unit}`
                      : '—'}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function EnergyDashboardPage() {
  const [projectId, setProjectId] = useState('')
  const [periodType, setPeriodType] = useState<'month' | 'week'>('month')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const { data: projectsData } = useProjects({ limit: 100 })
  const projects = projectsData?.data ?? []

  const { data, isLoading, isError } = useEnergyReport({
    projectId: projectId || undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    periodType,
  })

  const report = data?.report

  return (
    <div className="space-y-4">
      <PageHeader title="Energy Dashboard" />

      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-3">
            <Select
              value={projectId || 'none'}
              onValueChange={(v) => setProjectId(v === 'none' ? '' : v)}
            >
              <SelectTrigger className="w-52">
                <SelectValue placeholder="Select project" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Select project...</SelectItem>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={periodType}
              onValueChange={(v) => setPeriodType(v as 'month' | 'week')}
            >
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="month">By Month</SelectItem>
                <SelectItem value="week">By Week</SelectItem>
              </SelectContent>
            </Select>

            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="border rounded-md px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="border rounded-md px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </CardContent>
      </Card>

      {!projectId ? (
        <div className="p-8 text-center text-slate-500">
          <BarChart3 className="w-10 h-10 mx-auto mb-2 text-slate-300" />
          <p className="text-sm">Select a project to view energy consumption data.</p>
        </div>
      ) : isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-lg" />
          ))}
        </div>
      ) : isError ? (
        <div className="p-8 text-center text-slate-500">Failed to load energy data.</div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {METER_TYPES.map((meterType) => {
              const summary = report?.consumptionByType[meterType]
              return (
                <ConsumptionCard
                  key={meterType}
                  meterType={meterType}
                  consumption={summary?.totalConsumption ?? 0}
                  unit={summary?.unit ?? '—'}
                  readingCount={summary?.readingCount ?? 0}
                />
              )
            })}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Consumption by Period</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <PeriodTable byPeriod={report?.byPeriod ?? []} periodType={periodType} />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
