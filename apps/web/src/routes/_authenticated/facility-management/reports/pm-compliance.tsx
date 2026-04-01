import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { ClipboardList, CheckCircle, XCircle, AlertTriangle, HelpCircle } from 'lucide-react'
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
import { usePMComplianceReport } from '@/hooks/useFMSReports'

export const Route = createFileRoute(
  '/_authenticated/facility-management/reports/pm-compliance'
)({
  component: PMComplianceReportPage,
})

function ComplianceGauge({ percentage }: { percentage: number }) {
  const color =
    percentage >= 90 ? 'text-teal-600' : percentage >= 70 ? 'text-amber-600' : 'text-rose-600'
  const bg =
    percentage >= 90 ? 'bg-teal-500' : percentage >= 70 ? 'bg-amber-500' : 'bg-rose-500'

  return (
    <div className="flex flex-col items-center gap-2">
      <span className={`text-5xl font-light ${color}`}>{percentage}%</span>
      <div className="w-full bg-slate-100 rounded-full h-2">
        <div
          className={`${bg} h-2 rounded-full transition-all`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="text-xs text-slate-400 font-light">Compliance Rate</span>
    </div>
  )
}

function PMComplianceReportPage() {
  const { data: projectsData } = useProjects({ limit: 50 })
  const projects = projectsData?.data ?? []
  const [projectId, setProjectId] = useState('')

  const activeProjectId = projectId || projects[0]?.id || ''

  const { data, isLoading, isError } = usePMComplianceReport(activeProjectId)
  const report = data?.report

  const summaryCards = [
    {
      icon: ClipboardList,
      label: 'Total Active PMs',
      value: report?.total ?? 0,
      accent: 'bg-indigo-500',
      alert: false,
    },
    {
      icon: CheckCircle,
      label: 'On Schedule',
      value: report?.onTimeCount ?? 0,
      accent: 'bg-teal-500',
      alert: false,
    },
    {
      icon: XCircle,
      label: 'Overdue',
      value: report?.overdueCount ?? 0,
      accent: (report?.overdueCount ?? 0) > 0 ? 'bg-rose-500' : 'bg-teal-500',
      alert: (report?.overdueCount ?? 0) > 0,
    },
    {
      icon: HelpCircle,
      label: 'No Due Date',
      value: report?.missedCount ?? 0,
      accent: (report?.missedCount ?? 0) > 0 ? 'bg-amber-500' : 'bg-teal-500',
      alert: false,
    },
  ]

  return (
    <div className="space-y-3">
      <PageHeader
        title="PM Compliance Report"
        subtitle="Preventive maintenance schedule compliance overview"
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
          Failed to load PM compliance report. Please try again.
        </p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-4">
        <Card>
          <CardContent className="pt-6 pb-6 flex items-center justify-center">
            {isLoading ? (
              <Skeleton className="h-20 w-36" />
            ) : (
              <ComplianceGauge percentage={report?.compliancePercentage ?? 100} />
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 gap-3">
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
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-light text-slate-600 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-500" />
            Overdue PM Schedules
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-100">
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                  PM Number
                </TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                  Title
                </TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase text-right">
                  Due Date
                </TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase text-right">
                  Days Overdue
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={4}>
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : (report?.overdueList.length ?? 0) === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-xs text-slate-400">
                    <CheckCircle className="w-8 h-8 text-teal-400 mx-auto mb-2" />
                    No overdue PM schedules
                  </TableCell>
                </TableRow>
              ) : (
                report?.overdueList.map((pm) => (
                  <TableRow key={pm.id} className="border-slate-100">
                    <TableCell className="text-[11px] font-light">
                      <Link
                        to="/facility-management/preventive-maintenance/$pmId"
                        params={{ pmId: pm.id }}
                        className="text-indigo-600 hover:underline font-mono"
                      >
                        {pm.pm_number}
                      </Link>
                    </TableCell>
                    <TableCell className="text-[11px] text-slate-700 font-light">
                      {pm.title}
                    </TableCell>
                    <TableCell className="text-right text-[11px] text-slate-500 font-light">
                      {new Date(pm.next_due_date).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge
                        variant="outline"
                        className={`text-[9px] ${
                          pm.days_overdue > 30
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}
                      >
                        {pm.days_overdue}d
                      </Badge>
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
