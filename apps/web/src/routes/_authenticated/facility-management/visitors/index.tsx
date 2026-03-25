import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { Plus, Users, LogIn, LogOut } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { PageHeader } from '@/components/PageHeader'
import { useVisitors, useCheckInVisitor, useCheckOutVisitor } from '@/hooks/useVisitors'
import { useProjects } from '@/hooks/useProjects'
import type { VisitorStatus } from '@thanamol/shared'

export const Route = createFileRoute('/_authenticated/facility-management/visitors/')({
  component: VisitorListPage,
})

const STATUS_COLORS: Record<VisitorStatus, string> = {
  EXPECTED: 'bg-slate-100 text-slate-700',
  CHECKED_IN: 'bg-blue-100 text-blue-700',
  CHECKED_OUT: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
}

function VisitorListPage() {
  const [selectedProjectId, setSelectedProjectId] = useState('')

  const { data: projectsData } = useProjects({ limit: 100 })
  const projects = projectsData?.data ?? []

  const { data: visitorsData, isLoading } = useVisitors({ projectId: selectedProjectId })
  const visitors = visitorsData?.data ?? []

  const checkIn = useCheckInVisitor()
  const checkOut = useCheckOutVisitor()

  const activeCount = visitors.filter((v) => v.status === 'CHECKED_IN').length

  async function handleCheckIn(id: string) {
    try {
      await checkIn.mutateAsync(id)
      toast.success('Visitor checked in')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to check in')
    }
  }

  async function handleCheckOut(id: string) {
    try {
      await checkOut.mutateAsync(id)
      toast.success('Visitor checked out')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to check out')
    }
  }

  return (
    <div className="space-y-3">
      <PageHeader
        title="Visitor Management"
        actions={
          <Link to="/facility-management/visitors/create">
            <Button className="bg-indigo-600 hover:bg-indigo-700">
              <Plus className="w-4 h-4 mr-2" />
              Register Visitor
            </Button>
          </Link>
        }
      />

      <div className="flex flex-col md:flex-row gap-3">
        <Card className="flex-1">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-widest font-extralight">
                  Currently On-Site
                </p>
                <p className="text-2xl font-light text-slate-700 mt-1">{activeCount}</p>
              </div>
              <Users className="w-8 h-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="flex-1 md:max-w-xs">
          <CardContent className="pt-4">
            <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a project" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-4 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-100">
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">Name</TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">Company</TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">Purpose</TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">Check In</TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">Check Out</TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">Status</TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!selectedProjectId ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12">
                    <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500 font-light">Select a project to view visitors</p>
                  </TableCell>
                </TableRow>
              ) : isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <p className="text-slate-400 font-light">Loading...</p>
                  </TableCell>
                </TableRow>
              ) : visitors.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12">
                    <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500 font-light">No visitors found</p>
                  </TableCell>
                </TableRow>
              ) : (
                visitors.map((visitor) => (
                  <TableRow key={visitor.id} className="hover:bg-slate-50/50 border-slate-100">
                    <TableCell className="text-sm font-medium text-slate-700">
                      {visitor.visitor_name}
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">{visitor.company ?? '—'}</TableCell>
                    <TableCell className="text-xs text-slate-500">{visitor.purpose ?? '—'}</TableCell>
                    <TableCell className="text-xs text-slate-500">
                      {visitor.check_in_time
                        ? format(new Date(visitor.check_in_time), 'dd/MM HH:mm')
                        : '—'}
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">
                      {visitor.check_out_time
                        ? format(new Date(visitor.check_out_time), 'HH:mm')
                        : '—'}
                    </TableCell>
                    <TableCell>
                      <Badge className={STATUS_COLORS[visitor.status as VisitorStatus]}>
                        {visitor.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-1">
                        {visitor.status === 'EXPECTED' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-blue-500 hover:text-blue-700"
                            onClick={() => handleCheckIn(visitor.id)}
                            title="Check In"
                          >
                            <LogIn className="w-3.5 h-3.5" />
                          </Button>
                        )}
                        {visitor.status === 'CHECKED_IN' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-green-500 hover:text-green-700"
                            onClick={() => handleCheckOut(visitor.id)}
                            title="Check Out"
                          >
                            <LogOut className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
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
