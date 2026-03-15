import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { ShieldCheck, Search } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import { useAuditLogs } from '@/hooks/useActivityLogs'

export const Route = createFileRoute('/_authenticated/settings/audit')({
  component: AuditLogPage,
})

const PAGE_SIZE = 20

function AuditLogPage() {
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 400)
    return () => clearTimeout(timer)
  }, [search])

  const { data, isLoading, isError } = useAuditLogs({
    page,
    limit: PAGE_SIZE,
    action: debouncedSearch || undefined,
  })

  const logs = data?.data ?? []
  const totalPages = data?.pagination.totalPages ?? 1

  return (
    <div className="space-y-3">
      <PageHeader title="Audit Log" />

      <Card>
        <CardContent className="pt-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search by action..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-100">
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                  User
                </TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                  Action
                </TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                  Details
                </TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                  IP Address
                </TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                  Date
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={5}>
                      <Skeleton className="h-8 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : isError ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <p className="text-slate-600">Failed to load audit logs. Please refresh.</p>
                  </TableCell>
                </TableRow>
              ) : logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <div className="flex flex-col items-center">
                      <ShieldCheck className="w-12 h-12 text-slate-300 mb-3" />
                      <p className="text-slate-600">No audit logs found</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow key={log.id} className="hover:bg-slate-50/50 border-slate-100">
                    <TableCell className="py-3">
                      {log.user ? (
                        <div>
                          <p className="text-[11px] font-light text-slate-800">
                            {log.user.first_name} {log.user.last_name}
                          </p>
                          <p className="text-[9px] text-slate-400 font-extralight mt-0.5">
                            {log.user.email}
                          </p>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-extralight">System</span>
                      )}
                    </TableCell>
                    <TableCell className="py-3">
                      <span className="text-[10px] font-light text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                        {log.action}
                      </span>
                    </TableCell>
                    <TableCell className="py-3 max-w-xs">
                      {log.details ? (
                        <span className="text-[9px] text-slate-400 font-extralight truncate block">
                          {JSON.stringify(log.details).slice(0, 80)}
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-300 font-extralight">—</span>
                      )}
                    </TableCell>
                    <TableCell className="py-3">
                      <span className="text-[10px] text-slate-400 font-extralight">
                        {log.ip_address ?? '-'}
                      </span>
                    </TableCell>
                    <TableCell className="py-3">
                      <span className="text-[10px] text-slate-400 font-extralight">
                        {new Date(log.created_at).toLocaleString()}
                      </span>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {!isLoading && totalPages > 1 && (
        <div className="flex items-center justify-between px-2">
          <p className="text-[11px] text-slate-400 font-extralight">
            Page {page} of {totalPages} — {data?.pagination.total ?? 0} total
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
