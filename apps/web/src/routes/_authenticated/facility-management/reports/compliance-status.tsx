import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { ShieldCheck, AlertTriangle, Flame, FileCheck, FileWarning } from 'lucide-react'
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
import { useFMSComplianceStatusReport } from '@/hooks/useFMSReports'

export const Route = createFileRoute(
  '/_authenticated/facility-management/reports/compliance-status'
)({
  component: ComplianceStatusReportPage,
})

const SEVERITY_STYLES: Record<string, string> = {
  MINOR: 'bg-slate-50 text-slate-700 border-slate-200',
  MODERATE: 'bg-amber-50 text-amber-700 border-amber-200',
  MAJOR: 'bg-orange-50 text-orange-700 border-orange-200',
  CRITICAL: 'bg-rose-50 text-rose-700 border-rose-200',
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function ComplianceStatusReportPage() {
  const { data: projectsData } = useProjects({ limit: 50 })
  const projects = projectsData?.data ?? []
  const [projectId, setProjectId] = useState('')

  const activeProjectId = projectId || projects[0]?.id || ''

  const { data, isLoading, isError } = useFMSComplianceStatusReport(activeProjectId)
  const report = data?.report

  const summaryCards = [
    {
      icon: Flame,
      label: 'Fire Equipment Overdue',
      value: report?.fireEquipmentOverdue ?? 0,
      accent: report?.fireEquipmentOverdue ? 'bg-rose-500' : 'bg-teal-500',
      alert: (report?.fireEquipmentOverdue ?? 0) > 0,
    },
    {
      icon: FileCheck,
      label: 'Active Permits to Work',
      value: report?.activePermitsToWork ?? 0,
      accent: 'bg-indigo-500',
      alert: false,
    },
    {
      icon: AlertTriangle,
      label: 'Open Incidents',
      value: report?.openIncidentsBySeverity.reduce((sum, s) => sum + s.count, 0) ?? 0,
      accent:
        (report?.openIncidentsBySeverity.reduce((sum, s) => sum + s.count, 0) ?? 0) > 0
          ? 'bg-amber-500'
          : 'bg-teal-500',
      alert: (report?.openIncidentsBySeverity.reduce((sum, s) => sum + s.count, 0) ?? 0) > 0,
    },
    {
      icon: FileWarning,
      label: 'Insurance Expiring (30d)',
      value: report?.expiringInsurance.length ?? 0,
      accent: (report?.expiringInsurance.length ?? 0) > 0 ? 'bg-orange-500' : 'bg-teal-500',
      alert: (report?.expiringInsurance.length ?? 0) > 0,
    },
  ]

  return (
    <div className="space-y-3">
      <PageHeader
        title="Compliance Status"
        subtitle="Safety, equipment and regulatory compliance overview"
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
          Failed to load compliance report. Please try again.
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-light text-slate-600 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Open Incidents by Severity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            ) : (report?.openIncidentsBySeverity.length ?? 0) === 0 ? (
              <div className="py-6 text-center">
                <ShieldCheck className="w-8 h-8 text-teal-400 mx-auto mb-2" />
                <p className="text-xs text-slate-400 font-light">No open incidents</p>
              </div>
            ) : (
              <div className="space-y-2">
                {report?.openIncidentsBySeverity.map((item) => (
                  <div key={item.severity} className="flex items-center justify-between">
                    <Badge
                      variant="outline"
                      className={`text-[10px] font-light ${SEVERITY_STYLES[item.severity] ?? ''}`}
                    >
                      {item.severity}
                    </Badge>
                    <span className="text-sm font-light text-slate-700">{item.count}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-light text-slate-600 flex items-center gap-2">
              <FileWarning className="w-4 h-4 text-orange-500" />
              Expiring Insurance Policies (30 Days)
            </CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-100">
                  <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                    Policy
                  </TableHead>
                  <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                    Provider
                  </TableHead>
                  <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase text-right">
                    Expires
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 2 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={3}>
                        <Skeleton className="h-5 w-full" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : (report?.expiringInsurance.length ?? 0) === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-6 text-xs text-slate-400">
                      No expiring policies in the next 30 days
                    </TableCell>
                  </TableRow>
                ) : (
                  report?.expiringInsurance.map((policy) => (
                    <TableRow key={policy.id} className="border-slate-100">
                      <TableCell className="text-[11px] text-slate-700 font-light">
                        {policy.policy_number}
                      </TableCell>
                      <TableCell className="text-[11px] text-slate-700 font-light">
                        {policy.provider}
                      </TableCell>
                      <TableCell className="text-right text-[11px] text-orange-600 font-light">
                        {formatDate(policy.end_date)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
