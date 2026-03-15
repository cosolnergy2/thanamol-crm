import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { BarChart3, Zap, Droplets, Flame, TrendingUp } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { PageHeader } from '@/components/PageHeader'
import { useMeterRecords } from '@/hooks/useMeterRecords'
import type { MeterType, MeterRecord } from '@thanamol/shared'

export const Route = createFileRoute('/_authenticated/utilities/report')({
  component: UtilityReportPage,
})

const METER_TYPE_LABELS: Record<MeterType, string> = {
  ELECTRICITY: 'Electricity',
  WATER: 'Water',
  GAS: 'Gas',
}

const METER_TYPE_COLORS: Record<MeterType, string> = {
  ELECTRICITY: 'bg-amber-100 text-amber-700 border-amber-200',
  WATER: 'bg-sky-100 text-sky-700 border-sky-200',
  GAS: 'bg-orange-100 text-orange-700 border-orange-200',
}

type UnitSummary = {
  unitId: string
  totalUsage: number
  totalAmount: number
  recordCount: number
  byType: Partial<Record<MeterType, { usage: number; amount: number }>>
}

function buildUnitSummaries(records: MeterRecord[]): UnitSummary[] {
  const summaryMap = new Map<string, UnitSummary>()

  for (const record of records) {
    const existing = summaryMap.get(record.unit_id)
    if (!existing) {
      summaryMap.set(record.unit_id, {
        unitId: record.unit_id,
        totalUsage: record.usage,
        totalAmount: record.amount,
        recordCount: 1,
        byType: {
          [record.meter_type]: { usage: record.usage, amount: record.amount },
        },
      })
    } else {
      existing.totalUsage += record.usage
      existing.totalAmount += record.amount
      existing.recordCount += 1
      const typeEntry = existing.byType[record.meter_type]
      if (typeEntry) {
        typeEntry.usage += record.usage
        typeEntry.amount += record.amount
      } else {
        existing.byType[record.meter_type] = { usage: record.usage, amount: record.amount }
      }
    }
  }

  return Array.from(summaryMap.values()).sort((a, b) => b.totalAmount - a.totalAmount)
}

function MeterTypeIcon({ type, className }: { type: MeterType; className?: string }) {
  if (type === 'ELECTRICITY') return <Zap className={className} />
  if (type === 'WATER') return <Droplets className={className} />
  return <Flame className={className} />
}

const METER_TYPES: MeterType[] = ['ELECTRICITY', 'WATER', 'GAS']

function UtilityReportPage() {
  const currentMonth = new Date().toISOString().slice(0, 7)
  const [billingPeriod, setBillingPeriod] = useState(currentMonth)
  const [typeFilter, setTypeFilter] = useState<MeterType | 'all'>('all')

  const { data, isLoading, isError } = useMeterRecords({
    billingPeriod,
    meterType: typeFilter !== 'all' ? typeFilter : undefined,
    limit: 200,
  })

  const records = data?.data ?? []
  const summaries = buildUnitSummaries(records)

  const totalUsage = records.reduce((sum, r) => sum + r.usage, 0)
  const totalAmount = records.reduce((sum: number, r: MeterRecord) => sum + r.amount, 0)
  const usageByType = METER_TYPES.reduce(
    (acc, type) => {
      const typeRecords = records.filter((r: MeterRecord) => r.meter_type === type)
      acc[type] = {
        usage: typeRecords.reduce((s: number, r: MeterRecord) => s + r.usage, 0),
        amount: typeRecords.reduce((s: number, r: MeterRecord) => s + r.amount, 0),
        count: typeRecords.length,
      }
      return acc
    },
    {} as Record<MeterType, { usage: number; amount: number; count: number }>,
  )

  return (
    <div className="space-y-3">
      <PageHeader title="Utility Report" />

      <div className="flex flex-col md:flex-row gap-3">
        <div>
          <input
            type="month"
            value={billingPeriod}
            onChange={(e) => setBillingPeriod(e.target.value)}
            className="h-9 rounded-md border border-slate-200 px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
        </div>
        <Select
          value={typeFilter}
          onValueChange={(v) => setTypeFilter(v as MeterType | 'all')}
        >
          <SelectTrigger className="w-full md:w-48">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="ELECTRICITY">Electricity</SelectItem>
            <SelectItem value="WATER">Water</SelectItem>
            <SelectItem value="GAS">Gas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Card className="border border-slate-100 bg-white/90">
          <CardContent className="pt-5 pb-5">
            <div className="text-center">
              <p className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                Total Units
              </p>
              <p className="text-3xl font-extralight mt-1.5 text-slate-900">{summaries.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border border-slate-100 bg-white/90">
          <CardContent className="pt-5 pb-5">
            <div className="text-center">
              <p className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                Total Usage
              </p>
              <p className="text-3xl font-extralight mt-1.5 text-teal-700">
                {totalUsage.toLocaleString()}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="border border-slate-100 bg-white/90">
          <CardContent className="pt-5 pb-5">
            <div className="text-center">
              <p className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                Total Amount
              </p>
              <p className="text-3xl font-extralight mt-1.5 text-indigo-700">
                ฿{totalAmount.toLocaleString()}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="border border-slate-100 bg-white/90">
          <CardContent className="pt-5 pb-5">
            <div className="text-center">
              <p className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                Readings
              </p>
              <p className="text-3xl font-extralight mt-1.5 text-slate-900">{records.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {METER_TYPES.map((type) => {
          const stats = usageByType[type]
          return (
            <Card key={type} className="border border-slate-100">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-light tracking-wider text-slate-700 flex items-center gap-2">
                  <MeterTypeIcon type={type} className="w-4 h-4" />
                  {METER_TYPE_LABELS[type]}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-500 font-extralight">Usage</span>
                  <span className="font-mono text-teal-700">
                    {stats.usage.toLocaleString()} units
                  </span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-500 font-extralight">Amount</span>
                  <span className="font-light text-indigo-700">
                    ฿{stats.amount.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-500 font-extralight">Records</span>
                  <span className="text-slate-700">{stats.count}</span>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-light tracking-wider text-slate-700 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Usage by Unit
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : isError ? (
            <div className="py-8 text-center">
              <p className="text-slate-600">Failed to load report data. Please refresh.</p>
            </div>
          ) : summaries.length === 0 ? (
            <div className="py-12 text-center">
              <BarChart3 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-600">No data for the selected period</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-slate-100">
                  <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                    Unit
                  </TableHead>
                  {METER_TYPES.map((type) => (
                    <TableHead
                      key={type}
                      className="text-right text-[10px] font-extralight text-slate-400 tracking-widest uppercase"
                    >
                      {METER_TYPE_LABELS[type]}
                    </TableHead>
                  ))}
                  <TableHead className="text-right text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                    Total Usage
                  </TableHead>
                  <TableHead className="text-right text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                    Total Amount
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summaries.map((summary) => (
                  <TableRow key={summary.unitId} className="hover:bg-slate-50/50 border-slate-100">
                    <TableCell className="py-3">
                      <span className="text-[11px] font-light text-slate-800">
                        {summary.unitId}
                      </span>
                    </TableCell>
                    {METER_TYPES.map((type) => {
                      const entry = summary.byType[type]
                      return (
                        <TableCell key={type} className="py-3 text-right">
                          {entry ? (
                            <div className="space-y-0.5">
                              <div className="font-mono text-[10px] text-teal-700">
                                {entry.usage.toLocaleString()}
                              </div>
                              <div className="text-[10px] text-slate-500">
                                ฿{entry.amount.toLocaleString()}
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-300 text-[10px]">—</span>
                          )}
                        </TableCell>
                      )
                    })}
                    <TableCell className="py-3 text-right">
                      <Badge
                        variant="outline"
                        className="font-mono text-[10px] text-teal-700 border-teal-200 bg-teal-50"
                      >
                        {summary.totalUsage.toLocaleString()}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-3 text-right">
                      <span className="text-[11px] font-light text-indigo-700">
                        ฿{summary.totalAmount.toLocaleString()}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
