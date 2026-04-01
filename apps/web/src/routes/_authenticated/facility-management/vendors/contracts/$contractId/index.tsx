import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { ArrowLeft, Pencil, CheckCircle, XCircle, ExternalLink } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  useVendorContract,
  useActivateVendorContract,
  useTerminateVendorContract,
} from '@/hooks/useVendorContracts'
import type { VendorContractStatus } from '@thanamol/shared'

export const Route = createFileRoute(
  '/_authenticated/facility-management/vendors/contracts/$contractId/'
)({
  component: VendorContractDetailPage,
})

const STATUS_COLORS: Record<VendorContractStatus, string> = {
  DRAFT: 'bg-slate-100 text-slate-600',
  ACTIVE: 'bg-emerald-100 text-emerald-700',
  EXPIRED: 'bg-orange-100 text-orange-700',
  TERMINATED: 'bg-red-100 text-red-700',
}

type SlaEntry = {
  serviceType?: string
  responseTimeHours?: number | null
  resolutionTimeHours?: number | null
  penaltyPerDay?: number | null
}

type RateCardEntry = {
  service?: string
  unit?: string
  rate?: number | null
}

function VendorContractDetailPage() {
  const { contractId } = Route.useParams()
  const navigate = useNavigate()
  const { data, isLoading } = useVendorContract(contractId)
  const activate = useActivateVendorContract(contractId)
  const terminate = useTerminateVendorContract(contractId)

  if (isLoading) {
    return <div className="text-center py-16 text-slate-400 font-extralight">Loading...</div>
  }

  if (!data?.contract) {
    return <div className="text-center py-16 text-slate-400 font-extralight">Contract not found</div>
  }

  const c = data.contract
  const slaRows = Array.isArray(c.sla) ? (c.sla as SlaEntry[]) : []
  const rateCardRows = Array.isArray(c.rate_card) ? (c.rate_card as RateCardEntry[]) : []
  const status = c.status as VendorContractStatus

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate({ to: '/facility-management/vendors/contracts' })}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-extralight tracking-[0.3em] text-slate-600 uppercase">
              {c.contract_number}
            </h1>
            <p className="text-sm text-slate-500 mt-0.5 font-extralight">{c.title}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {status === 'DRAFT' && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-emerald-600 border-emerald-200"
              onClick={() => activate.mutate()}
              disabled={activate.isPending}
            >
              <CheckCircle className="w-3.5 h-3.5" />
              Activate
            </Button>
          )}
          {status === 'ACTIVE' && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-red-500 border-red-200"
              onClick={() => terminate.mutate()}
              disabled={terminate.isPending}
            >
              <XCircle className="w-3.5 h-3.5" />
              Terminate
            </Button>
          )}
          <Link
            to="/facility-management/vendors/contracts/$contractId/edit"
            params={{ contractId }}
          >
            <Button variant="outline" size="sm" className="gap-1.5">
              <Pencil className="w-3.5 h-3.5" />
              Edit
            </Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-slate-600">ข้อมูลพื้นฐาน</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4 text-sm">
            <InfoField label="Contract Number" value={c.contract_number} mono />
            <InfoField
              label="Status"
              value={
                <Badge className={`text-xs font-normal ${STATUS_COLORS[status]}`}>
                  {status}
                </Badge>
              }
            />
            <InfoField
              label="Vendor"
              value={
                <Link
                  to="/facility-management/vendors/$vendorId"
                  params={{ vendorId: c.vendor.id }}
                  className="text-indigo-600 hover:underline"
                >
                  {c.vendor.name}
                </Link>
              }
            />
            <InfoField label="Contract Type" value={c.contract_type ?? '—'} />
            <InfoField label="Service Category" value={c.service_category ?? '—'} />
            <InfoField label="Site / Project" value={c.project?.name ?? '—'} />
            <InfoField
              label="Period"
              value={`${new Date(c.start_date).toLocaleDateString()} — ${new Date(c.end_date).toLocaleDateString()}`}
            />
            <InfoField
              label="Contract Value"
              value={c.value != null ? `฿${c.value.toLocaleString()}` : '—'}
            />
            <InfoField label="Payment Terms" value={c.payment_terms ?? '—'} />
            <InfoField
              label="Alert Before Expiry"
              value={c.alert_days_before_expiry != null ? `${c.alert_days_before_expiry} days` : '—'}
            />
            <InfoField label="Auto-renew" value={c.auto_renew ? 'Yes' : 'No'} />
            {c.document_url && (
              <div>
                <dt className="text-xs text-slate-500 mb-1">Document</dt>
                <dd>
                  <a
                    href={c.document_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-600 hover:underline inline-flex items-center gap-1 text-sm"
                  >
                    Open <ExternalLink className="w-3 h-3" />
                  </a>
                </dd>
              </div>
            )}
          </dl>
          {c.scope && (
            <div className="mt-4 pt-4 border-t">
              <p className="text-xs text-slate-500 mb-1">Notes / Scope</p>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{c.scope}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {slaRows.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-slate-600">เงื่อนไข SLA</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Service Type</TableHead>
                  <TableHead>Response Time</TableHead>
                  <TableHead>Resolution Time</TableHead>
                  <TableHead>Penalty</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {slaRows.map((row, i) => (
                  <TableRow key={i}>
                    <TableCell>{row.serviceType ?? '—'}</TableCell>
                    <TableCell>{row.responseTimeHours != null ? `${row.responseTimeHours} hrs` : '—'}</TableCell>
                    <TableCell>{row.resolutionTimeHours != null ? `${row.resolutionTimeHours} hrs` : '—'}</TableCell>
                    <TableCell>{row.penaltyPerDay != null ? `฿${row.penaltyPerDay}/day` : '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {rateCardRows.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-slate-600">อัตราค่าบริการ</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Service</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rateCardRows.map((row, i) => (
                  <TableRow key={i}>
                    <TableCell>{row.service ?? '—'}</TableCell>
                    <TableCell>{row.unit ?? '—'}</TableCell>
                    <TableCell>{row.rate != null ? `฿${row.rate.toLocaleString()}` : '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function InfoField({
  label,
  value,
  mono = false,
}: {
  label: string
  value: React.ReactNode
  mono?: boolean
}) {
  return (
    <div>
      <dt className="text-xs text-slate-500 mb-1">{label}</dt>
      <dd className={`text-sm text-slate-800 ${mono ? 'font-mono' : ''}`}>{value}</dd>
    </div>
  )
}
