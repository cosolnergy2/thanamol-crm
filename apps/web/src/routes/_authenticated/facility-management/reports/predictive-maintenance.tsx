import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { Activity, AlertTriangle, ShieldAlert, TrendingUp, CheckCircle, Plus } from 'lucide-react'
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
import { usePredictiveMaintenanceReport } from '@/hooks/useFMSReports'
import type { PredictiveMaintenanceRiskLevel } from '@thanamol/shared'

export const Route = createFileRoute(
  '/_authenticated/facility-management/reports/predictive-maintenance'
)({
  component: PredictiveMaintenancePage,
})

const RISK_BADGE_STYLES: Record<PredictiveMaintenanceRiskLevel, string> = {
  HIGH: 'bg-rose-50 text-rose-700 border-rose-200',
  MEDIUM: 'bg-amber-50 text-amber-700 border-amber-200',
  LOW: 'bg-teal-50 text-teal-700 border-teal-200',
}

const RISK_ICON: Record<PredictiveMaintenanceRiskLevel, typeof ShieldAlert> = {
  HIGH: ShieldAlert,
  MEDIUM: AlertTriangle,
  LOW: TrendingUp,
}

function PredictiveMaintenancePage() {
  const { data: projectsData } = useProjects({ limit: 50 })
  const projects = projectsData?.data ?? []
  const [projectId, setProjectId] = useState('')

  const activeProjectId = projectId || projects[0]?.id || ''

  const { data, isLoading, isError } = usePredictiveMaintenanceReport(activeProjectId)
  const report = data?.report

  const summaryCards = [
    {
      icon: Activity,
      label: 'Total Recommendations',
      value: report?.summary.total ?? 0,
      accent: 'bg-indigo-500',
      alert: false,
    },
    {
      icon: ShieldAlert,
      label: 'High Risk',
      value: report?.summary.high ?? 0,
      accent: (report?.summary.high ?? 0) > 0 ? 'bg-rose-500' : 'bg-teal-500',
      alert: (report?.summary.high ?? 0) > 0,
    },
    {
      icon: AlertTriangle,
      label: 'Medium Risk',
      value: report?.summary.medium ?? 0,
      accent: (report?.summary.medium ?? 0) > 0 ? 'bg-amber-500' : 'bg-teal-500',
      alert: false,
    },
    {
      icon: TrendingUp,
      label: 'Low Risk',
      value: report?.summary.low ?? 0,
      accent: 'bg-teal-500',
      alert: false,
    },
  ]

  return (
    <div className="space-y-3">
      <PageHeader
        title="Predictive Maintenance"
        subtitle="Rule-based asset risk recommendations to prevent failures"
      />

      <Card>
        <CardContent className="pt-4">
          <div className="space-y-1">
            <span className="text-xs text-slate-500">Project</span>
            <Select value={activeProjectId} onValueChange={setProjectId}>
              <SelectTrigger className="w-56 h-8 text-xs">
                <SelectValue placeholder="Select project" />
              </SelectTrigger>
              <SelectContent>
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
          Failed to load predictive maintenance report. Please try again.
        </p>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {summaryCards.map((card) => {
          const Icon = card.icon
          return (
            <Card key={card.label} className={card.alert ? 'ring-1 ring-rose-200' : ''}>
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
                      <Skeleton className="h-7 w-12 mt-1" />
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

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-light text-slate-600 flex items-center gap-2">
            <Activity className="w-4 h-4 text-indigo-500" />
            Asset Risk Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-100">
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                  Asset
                </TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                  Risk
                </TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                  Reason
                </TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                  Recommendation
                </TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase text-right">
                  Action
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={5}>
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : (report?.items.length ?? 0) === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-10 text-xs text-slate-400">
                    <CheckCircle className="w-8 h-8 text-teal-400 mx-auto mb-2" />
                    No risk recommendations — all assets are within acceptable thresholds
                  </TableCell>
                </TableRow>
              ) : (
                report?.items.map((item) => {
                  const RiskIcon = RISK_ICON[item.riskLevel]
                  return (
                    <TableRow key={item.assetId} className="border-slate-100">
                      <TableCell className="text-[11px] text-slate-700 font-light">
                        {item.assetName}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`text-[9px] font-light flex items-center gap-1 w-fit ${RISK_BADGE_STYLES[item.riskLevel]}`}
                        >
                          <RiskIcon className="w-2.5 h-2.5" />
                          {item.riskLevel}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-[11px] text-slate-600 font-light max-w-xs">
                        {item.reason}
                      </TableCell>
                      <TableCell className="text-[11px] text-slate-600 font-light max-w-xs">
                        {item.recommendation}
                      </TableCell>
                      <TableCell className="text-right">
                        <Link
                          to="/facility-management/work-orders"
                          search={{ assetId: item.assetId }}
                          className="inline-flex items-center gap-1 text-[10px] text-indigo-600 hover:underline font-light"
                        >
                          <Plus className="w-3 h-3" />
                          Create WO
                        </Link>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
