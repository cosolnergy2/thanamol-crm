import { createFileRoute, Link } from '@tanstack/react-router'
import { Calendar, AlertCircle, Phone, Mail, FileSignature } from 'lucide-react'
import { format } from 'date-fns'
import { Card, CardContent } from '@/components/ui/card'
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
import { Skeleton } from '@/components/ui/skeleton'
import { PageHeader } from '@/components/PageHeader'
import { useExpiringContracts } from '@/hooks/useContracts'

export const Route = createFileRoute('/_authenticated/contracts/expiring')({
  component: ContractExpiringPage,
})

const EXPIRY_DAYS_THRESHOLD = 30

function getDaysRemainingColor(days: number): string {
  if (days < 7) return 'bg-rose-100 text-rose-700 border-rose-200'
  if (days < 30) return 'bg-amber-100 text-amber-700 border-amber-200'
  return 'bg-blue-100 text-blue-700 border-blue-200'
}

function ContractExpiringPage() {
  const { data, isLoading, isError } = useExpiringContracts(EXPIRY_DAYS_THRESHOLD)

  const expiringContracts = data?.data ?? []

  const criticalCount = expiringContracts.filter((c) => (c.daysUntilExpiry ?? Infinity) < 7).length
  const warningCount = expiringContracts.filter(
    (c) => (c.daysUntilExpiry ?? Infinity) >= 7 && (c.daysUntilExpiry ?? Infinity) < 30,
  ).length
  const normalCount = expiringContracts.filter((c) => (c.daysUntilExpiry ?? Infinity) >= 30).length

  const urgencyStats = [
    { label: 'Critical (< 7 days)', value: criticalCount, color: 'text-rose-600' },
    { label: 'Warning (7–29 days)', value: warningCount, color: 'text-amber-600' },
    { label: 'Notice (≥ 30 days)', value: normalCount, color: 'text-blue-600' },
    { label: 'Total Expiring', value: expiringContracts.length, color: 'text-slate-900' },
  ]

  return (
    <div className="space-y-3">
      <PageHeader title="Expiring Contracts" />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {urgencyStats.map((stat, index) => (
          <Card key={index} className="border border-slate-100 bg-white/90">
            <CardContent className="pt-5 pb-5">
              <div className="text-center">
                <p className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                  {stat.label}
                </p>
                <p className={`text-3xl font-extralight mt-1.5 ${stat.color}`}>
                  {isLoading ? '—' : stat.value}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="pt-4">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-100">
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                  Contract
                </TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                  Customer
                </TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                  Contact
                </TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                  End Date
                </TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                  Days Remaining
                </TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={6}>
                      <Skeleton className="h-8 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : isError ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <p className="text-slate-600">Failed to load expiring contracts.</p>
                  </TableCell>
                </TableRow>
              ) : expiringContracts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-600">No contracts expiring soon</p>
                  </TableCell>
                </TableRow>
              ) : (
                expiringContracts.map((contract) => (
                  <TableRow key={contract.id} className="hover:bg-slate-50/50 border-slate-100">
                    <TableCell className="py-3">
                      <div className="flex items-center">
                        <FileSignature className="w-3.5 h-3.5 text-slate-400 mr-2" />
                        <span className="font-light text-slate-800 text-[11px]">
                          {contract.contract_number}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="py-3">
                      <span className="text-[11px] text-slate-700 font-light">
                        {contract.customer?.name ?? '—'}
                      </span>
                    </TableCell>
                    <TableCell className="py-3">
                      <div className="space-y-0.5">
                        {contract.customer?.phone && (
                          <div className="flex items-center text-[10px] text-slate-500">
                            <Phone className="w-3 h-3 mr-1" />
                            {contract.customer.phone}
                          </div>
                        )}
                        {contract.customer?.email && (
                          <div className="flex items-center text-[10px] text-slate-500">
                            <Mail className="w-3 h-3 mr-1" />
                            {contract.customer.email}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="py-3">
                      {contract.end_date ? (
                        <div className="flex items-center text-[10px] text-slate-500 font-extralight">
                          <Calendar className="w-3 h-3 mr-1" />
                          {format(new Date(contract.end_date), 'd MMM yyyy')}
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[11px]">—</span>
                      )}
                    </TableCell>
                    <TableCell className="py-3">
                      <Badge
                        variant="outline"
                        className={`${getDaysRemainingColor(contract.daysUntilExpiry ?? 0)} text-[9px] h-4 px-1.5 font-extralight`}
                      >
                        {contract.daysUntilExpiry ?? '?'} days
                      </Badge>
                    </TableCell>
                    <TableCell className="py-3">
                      <Link
                        to="/contracts/$contractId"
                        params={{ contractId: contract.id }}
                      >
                        <Button size="sm" variant="outline" className="h-7 text-[10px]">
                          View
                        </Button>
                      </Link>
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
