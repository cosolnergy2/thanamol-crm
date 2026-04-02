import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowLeft, DollarSign, FileCheck, Users, TrendingUp, Building2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useVendorSummaryReport } from '@/hooks/useVendorReports'
import type { VendorSummaryRow } from '@thanamol/shared'

export const Route = createFileRoute(
  '/_authenticated/facility-management/vendors/reports'
)({
  component: VendorReportsPage,
})

const VENDOR_STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-emerald-100 text-emerald-700',
  INACTIVE: 'bg-slate-100 text-slate-600',
  BLACKLISTED: 'bg-red-100 text-red-700',
  PENDING_APPROVAL: 'bg-amber-100 text-amber-700',
}

function SummaryCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string
  value: string | number
  icon: React.ElementType
  color: string
}) {
  return (
    <Card>
      <CardContent className="pt-5 pb-5">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-lg ${color}`}>
            <Icon className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-xs text-slate-500">{label}</p>
            <p className="text-xl font-light text-slate-700">{value}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function InvoiceStatusBreakdown({ summary }: { summary: Record<string, number> }) {
  const entries = Object.entries(summary)
  if (entries.length === 0) return <span className="text-slate-400">—</span>
  return (
    <div className="flex gap-1 flex-wrap">
      {entries.map(([status, count]) => (
        <span
          key={status}
          className="inline-flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded bg-slate-100 text-slate-600"
        >
          {status}: {count}
        </span>
      ))}
    </div>
  )
}

function VendorReportsPage() {
  const { data, isLoading } = useVendorSummaryReport()
  const report = data?.report

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/facility-management/vendors">
          <button
            type="button"
            className="p-2 border rounded-md hover:bg-slate-50 text-slate-500"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
        </Link>
        <div>
          <h1 className="text-2xl font-extralight tracking-[0.3em] text-slate-600 uppercase">
            Vendor Summary Report
          </h1>
          <p className="text-sm text-slate-500 mt-1 font-extralight">
            Spend by vendor, active contracts, invoice status breakdown
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-16 text-slate-400 font-extralight">Loading report...</div>
      ) : !report ? (
        <div className="text-center py-16 text-slate-400 font-extralight">No data available</div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <SummaryCard
              label="Total Vendors"
              value={report.totals.totalVendors}
              icon={Users}
              color="bg-indigo-500"
            />
            <SummaryCard
              label="Active Vendors"
              value={report.totals.activeVendors}
              icon={Building2}
              color="bg-teal-500"
            />
            <SummaryCard
              label="Active Contracts"
              value={report.totals.totalActiveContracts}
              icon={FileCheck}
              color="bg-violet-500"
            />
            <SummaryCard
              label="Total Spend"
              value={`${report.totals.totalSpend.toLocaleString()} THB`}
              icon={DollarSign}
              color="bg-amber-500"
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base font-light flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-slate-400" />
                Vendor Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              {report.rows.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-8">No vendors found</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="font-normal text-slate-500">Vendor</TableHead>
                      <TableHead className="font-normal text-slate-500">Status</TableHead>
                      <TableHead className="font-normal text-slate-500 text-right">
                        Active Contracts
                      </TableHead>
                      <TableHead className="font-normal text-slate-500 text-right">
                        Invoices
                      </TableHead>
                      <TableHead className="font-normal text-slate-500 text-right">
                        Total Spend
                      </TableHead>
                      <TableHead className="font-normal text-slate-500">Invoice Status</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.rows.map((row: VendorSummaryRow) => (
                      <TableRow key={row.vendorId}>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">{row.vendorName}</p>
                            <p className="text-xs text-slate-400 font-mono">{row.vendorCode}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={`text-xs font-normal ${VENDOR_STATUS_COLORS[row.status] ?? 'bg-slate-100 text-slate-600'}`}
                          >
                            {row.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">{row.activeContractsCount}</TableCell>
                        <TableCell className="text-right">{row.totalInvoices}</TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {row.totalSpend.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <InvoiceStatusBreakdown summary={row.invoiceStatusSummary} />
                        </TableCell>
                        <TableCell>
                          <Link
                            to="/facility-management/vendors/$vendorId"
                            params={{ vendorId: row.vendorId }}
                            className="text-xs text-indigo-600 hover:underline"
                          >
                            View
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
