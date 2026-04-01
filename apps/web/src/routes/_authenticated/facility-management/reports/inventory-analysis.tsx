import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import {
  Package,
  AlertTriangle,
  TrendingUp,
  RefreshCw,
  BarChart3,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
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
import { PageHeader } from '@/components/PageHeader'
import { useProjects } from '@/hooks/useProjects'
import { useInventoryAnalysisReport } from '@/hooks/useFMSReports'
import type { ABCCategory } from '@thanamol/shared'

export const Route = createFileRoute(
  '/_authenticated/facility-management/reports/inventory-analysis'
)({
  component: InventoryAnalysisReportPage,
})

const ABC_BADGE_STYLES: Record<ABCCategory, string> = {
  A: 'bg-rose-50 text-rose-700 border-rose-200',
  B: 'bg-amber-50 text-amber-700 border-amber-200',
  C: 'bg-slate-50 text-slate-600 border-slate-200',
}

const TABS = ['ABC Analysis', 'Dead Stock', 'Consumption Trends', 'Reorder Suggestions'] as const
type Tab = (typeof TABS)[number]

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'THB',
    maximumFractionDigits: 0,
  }).format(value)
}

function formatDate(iso: string | null): string {
  if (!iso) return 'Never'
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function SkeletonRows({ cols, rows = 4 }: { cols: number; rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <TableRow key={i}>
          <TableCell colSpan={cols}>
            <Skeleton className="h-5 w-full" />
          </TableCell>
        </TableRow>
      ))}
    </>
  )
}

function EmptyRow({ cols, message }: { cols: number; message: string }) {
  return (
    <TableRow>
      <TableCell colSpan={cols} className="text-center py-8 text-slate-400 text-xs">
        {message}
      </TableCell>
    </TableRow>
  )
}

function InventoryAnalysisReportPage() {
  const { data: projectsData } = useProjects({ limit: 50 })
  const projects = projectsData?.data ?? []
  const [projectId, setProjectId] = useState('')
  const [activeTab, setActiveTab] = useState<Tab>('ABC Analysis')

  const selectedProjectId = projectId || undefined

  const { data, isLoading, isError } = useInventoryAnalysisReport(selectedProjectId)
  const report = data?.report

  const summaryCards = [
    {
      icon: Package,
      label: 'Total Items',
      value: report?.summary.totalItems ?? 0,
      accent: 'bg-indigo-500',
    },
    {
      icon: BarChart3,
      label: 'A-Class Items',
      value: report?.summary.aItemCount ?? 0,
      accent: 'bg-rose-500',
    },
    {
      icon: AlertTriangle,
      label: 'Dead Stock Items',
      value: report?.summary.totalDeadStockItems ?? 0,
      accent: (report?.summary.totalDeadStockItems ?? 0) > 0 ? 'bg-amber-500' : 'bg-teal-500',
    },
    {
      icon: RefreshCw,
      label: 'Dead Stock Value',
      value: formatCurrency(report?.summary.totalDeadStockValue ?? 0),
      accent: (report?.summary.totalDeadStockValue ?? 0) > 0 ? 'bg-orange-500' : 'bg-teal-500',
      isText: true,
    },
  ]

  return (
    <div className="space-y-3">
      <PageHeader
        title="Inventory Analysis"
        subtitle="ABC classification, dead stock, consumption trends and reorder suggestions"
      />

      <Card>
        <CardContent className="pt-4">
          <div className="space-y-1">
            <span className="text-xs text-slate-500">Project (optional — all projects if blank)</span>
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger className="w-64 h-8 text-xs">
                <SelectValue placeholder="All projects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="" className="text-xs">
                  All projects
                </SelectItem>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id} className="text-xs">
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {isError && (
        <p className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded px-3 py-2">
          Failed to load inventory analysis. Please try again.
        </p>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {summaryCards.map((card) => {
          const Icon = card.icon
          return (
            <Card key={card.label}>
              <CardContent className="pt-5 pb-5">
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${card.accent}`}>
                    <Icon className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-[10px] font-extralight text-slate-400 uppercase tracking-widest leading-tight">
                      {card.label}
                    </p>
                    {isLoading ? (
                      <Skeleton className="h-7 w-16 mt-1" />
                    ) : card.isText ? (
                      <p className="text-sm font-light text-slate-800 mt-0.5">{card.value}</p>
                    ) : (
                      <p className="text-2xl font-light text-slate-800 mt-0.5">{card.value}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="flex gap-1 border-b border-slate-100">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-xs font-light transition-colors ${
              activeTab === tab
                ? 'text-indigo-600 border-b-2 border-indigo-500'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'ABC Analysis' && (
        <ABCAnalysisSection isLoading={isLoading} items={report?.abcAnalysis ?? []} />
      )}
      {activeTab === 'Dead Stock' && (
        <DeadStockSection isLoading={isLoading} items={report?.deadStock ?? []} />
      )}
      {activeTab === 'Consumption Trends' && (
        <ConsumptionTrendsSection isLoading={isLoading} items={report?.consumptionTrends ?? []} />
      )}
      {activeTab === 'Reorder Suggestions' && (
        <ReorderSuggestionsSection
          isLoading={isLoading}
          items={report?.reorderSuggestions ?? []}
        />
      )}
    </div>
  )
}

function ABCAnalysisSection({
  isLoading,
  items,
}: {
  isLoading: boolean
  items: { itemId: string; itemCode: string; itemName: string; category: ABCCategory; annualSpend: number; percentOfTotalSpend: number }[]
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-light text-slate-600 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-indigo-500" />
          ABC Analysis — Annual Spend Classification
        </CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-slate-100">
              <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                Item
              </TableHead>
              <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                Code
              </TableHead>
              <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                Category
              </TableHead>
              <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase text-right">
                Annual Spend
              </TableHead>
              <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase text-right">
                % of Total
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <SkeletonRows cols={5} />
            ) : items.length === 0 ? (
              <EmptyRow cols={5} message="No inventory items found" />
            ) : (
              items.map((item) => (
                <TableRow key={item.itemId} className="border-slate-100">
                  <TableCell className="text-[11px] text-slate-700 font-light">
                    {item.itemName}
                  </TableCell>
                  <TableCell className="text-[11px] text-slate-500 font-light font-mono">
                    {item.itemCode}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={`text-[10px] font-light ${ABC_BADGE_STYLES[item.category]}`}
                    >
                      {item.category}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right text-[11px] text-slate-700 font-light">
                    {formatCurrency(item.annualSpend)}
                  </TableCell>
                  <TableCell className="text-right text-[11px] text-slate-700 font-light">
                    {item.percentOfTotalSpend.toFixed(1)}%
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

function DeadStockSection({
  isLoading,
  items,
}: {
  isLoading: boolean
  items: {
    itemId: string
    itemCode: string
    itemName: string
    lastMovementDate: string | null
    daysSinceMovement: number
    currentStock: number
    stockValue: number
  }[]
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-light text-slate-600 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          Dead Stock — No movement in 90+ days
        </CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-slate-100">
              <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                Item
              </TableHead>
              <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                Code
              </TableHead>
              <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase text-right">
                Last Movement
              </TableHead>
              <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase text-right">
                Days Since
              </TableHead>
              <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase text-right">
                Stock
              </TableHead>
              <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase text-right">
                Value
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <SkeletonRows cols={6} />
            ) : items.length === 0 ? (
              <EmptyRow cols={6} message="No dead stock items found" />
            ) : (
              items.map((item) => (
                <TableRow key={item.itemId} className="border-slate-100">
                  <TableCell className="text-[11px] text-slate-700 font-light">
                    {item.itemName}
                  </TableCell>
                  <TableCell className="text-[11px] text-slate-500 font-light font-mono">
                    {item.itemCode}
                  </TableCell>
                  <TableCell className="text-right text-[11px] text-slate-500 font-light">
                    {formatDate(item.lastMovementDate)}
                  </TableCell>
                  <TableCell className="text-right text-[11px] text-amber-600 font-light">
                    {item.daysSinceMovement > 999 ? '999+' : item.daysSinceMovement}d
                  </TableCell>
                  <TableCell className="text-right text-[11px] text-slate-700 font-light">
                    {item.currentStock.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right text-[11px] text-slate-700 font-light">
                    {formatCurrency(item.stockValue)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

function ConsumptionTrendsSection({
  isLoading,
  items,
}: {
  isLoading: boolean
  items: {
    itemId: string
    itemCode: string
    itemName: string
    totalConsumed: number
    movementCount: number
    avgMonthlyConsumption: number
  }[]
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-light text-slate-600 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-teal-500" />
          Consumption Trends — Last 12 months
        </CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-slate-100">
              <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                Item
              </TableHead>
              <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                Code
              </TableHead>
              <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase text-right">
                Movements
              </TableHead>
              <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase text-right">
                Total Consumed
              </TableHead>
              <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase text-right">
                Avg / Month
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <SkeletonRows cols={5} />
            ) : items.length === 0 ? (
              <EmptyRow cols={5} message="No consumption data in the last 12 months" />
            ) : (
              items.map((item) => (
                <TableRow key={item.itemId} className="border-slate-100">
                  <TableCell className="text-[11px] text-slate-700 font-light">
                    {item.itemName}
                  </TableCell>
                  <TableCell className="text-[11px] text-slate-500 font-light font-mono">
                    {item.itemCode}
                  </TableCell>
                  <TableCell className="text-right text-[11px] text-slate-700 font-light">
                    {item.movementCount}
                  </TableCell>
                  <TableCell className="text-right text-[11px] text-slate-700 font-light">
                    {item.totalConsumed.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right text-[11px] text-teal-700 font-light">
                    {item.avgMonthlyConsumption.toFixed(2)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

function ReorderSuggestionsSection({
  isLoading,
  items,
}: {
  isLoading: boolean
  items: {
    itemId: string
    itemCode: string
    itemName: string
    currentStock: number
    currentReorderPoint: number | null
    suggestedReorderPoint: number
    avgDailyConsumption: number
    leadTimeDays: number
    reason: string
  }[]
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-light text-slate-600 flex items-center gap-2">
          <RefreshCw className="w-4 h-4 text-indigo-500" />
          Reorder Suggestions — Based on avg consumption × lead time
        </CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-slate-100">
              <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                Item
              </TableHead>
              <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase text-right">
                Current Stock
              </TableHead>
              <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase text-right">
                Current ROP
              </TableHead>
              <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase text-right">
                Suggested ROP
              </TableHead>
              <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                Reason
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <SkeletonRows cols={5} />
            ) : items.length === 0 ? (
              <EmptyRow cols={5} message="No reorder suggestions — no consumption data found" />
            ) : (
              items.map((item) => (
                <TableRow key={item.itemId} className="border-slate-100">
                  <TableCell>
                    <div>
                      <p className="text-[11px] text-slate-700 font-light">{item.itemName}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{item.itemCode}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-right text-[11px] text-slate-700 font-light">
                    {item.currentStock.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right text-[11px] text-slate-500 font-light">
                    {item.currentReorderPoint !== null ? item.currentReorderPoint.toFixed(2) : '—'}
                  </TableCell>
                  <TableCell className="text-right text-[11px] text-indigo-600 font-light font-medium">
                    {item.suggestedReorderPoint}
                  </TableCell>
                  <TableCell className="text-[10px] text-slate-500 font-light max-w-xs">
                    {item.reason}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
