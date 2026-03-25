import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { Plus, ClipboardList, Search, Eye, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { PageHeader } from '@/components/PageHeader'
import { usePreventiveMaintenances, useDeletePM } from '@/hooks/usePreventiveMaintenance'
import { useProjects } from '@/hooks/useProjects'
import type { PMWithRelations, PMFrequency } from '@thanamol/shared'

export const Route = createFileRoute('/_authenticated/facility-management/preventive-maintenance/')({
  component: PMListPage,
})

const PM_FREQUENCY_LABELS: Record<PMFrequency, string> = {
  DAILY: 'Daily',
  WEEKLY: 'Weekly',
  MONTHLY: 'Monthly',
  QUARTERLY: 'Quarterly',
  SEMI_ANNUAL: 'Semi-Annual',
  ANNUAL: 'Annual',
  CUSTOM: 'Custom',
}

function PMListPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [projectId, setProjectId] = useState('')
  const [isActive, setIsActive] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null)

  const { data: projectsData } = useProjects({ limit: 100 })
  const projects = projectsData?.data ?? []

  const { data: pmData, isLoading, isError } = usePreventiveMaintenances({
    projectId: projectId || undefined,
    isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
    search: search || undefined,
  })

  const deletePM = useDeletePM()

  async function confirmDelete() {
    if (!deleteTarget) return
    try {
      await deletePM.mutateAsync(deleteTarget.id)
      toast.success('PM schedule deleted')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete PM schedule')
    } finally {
      setDeleteTarget(null)
    }
  }

  const pms: PMWithRelations[] = pmData?.data ?? []
  const total = pmData?.pagination.total ?? 0

  return (
    <div className="space-y-3">
      <PageHeader
        title="PM Schedules"
        actions={
          <Link to="/facility-management/preventive-maintenance/create">
            <Button className="bg-indigo-600 hover:bg-indigo-700">
              <Plus className="w-4 h-4 mr-2" />
              Create PM Schedule
            </Button>
          </Link>
        }
      />

      <Card>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search PM schedules..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={projectId || '__all__'} onValueChange={(v) => setProjectId(v === '__all__' ? '' : v)}>
              <SelectTrigger>
                <SelectValue placeholder="All projects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All projects</SelectItem>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={isActive || '__all__'} onValueChange={(v) => setIsActive(v === '__all__' ? '' : v)}>
              <SelectTrigger>
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All</SelectItem>
                <SelectItem value="true">Active</SelectItem>
                <SelectItem value="false">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4 overflow-x-auto">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-slate-400 font-extralight">
              {total} schedule{total !== 1 ? 's' : ''}
            </p>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="border-slate-100">
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                  PM #
                </TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                  Title
                </TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                  Frequency
                </TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                  Asset
                </TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                  Next Due
                </TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                  Status
                </TableHead>
                <TableHead className="text-center text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={7}>
                      <Skeleton className="h-8 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : isError ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <p className="text-slate-600">Failed to load PM schedules.</p>
                  </TableCell>
                </TableRow>
              ) : pms.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12">
                    <ClipboardList className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-600">No PM schedules found</p>
                  </TableCell>
                </TableRow>
              ) : (
                pms.map((pm) => (
                  <TableRow key={pm.id} className="hover:bg-slate-50/50 border-slate-100">
                    <TableCell className="font-mono text-xs text-slate-600">
                      {pm.pm_number}
                    </TableCell>
                    <TableCell className="text-sm text-slate-700 font-light max-w-[180px] truncate">
                      {pm.title}
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">
                      {PM_FREQUENCY_LABELS[pm.frequency as PMFrequency] ?? pm.frequency}
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">
                      {pm.asset?.name ?? '—'}
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">
                      {pm.next_due_date
                        ? new Date(pm.next_due_date).toLocaleDateString()
                        : '—'}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${
                          pm.is_active
                            ? 'bg-teal-50 text-teal-700 border-teal-200'
                            : 'bg-slate-50 text-slate-500 border-slate-200'
                        }`}
                      >
                        {pm.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-slate-400 hover:text-indigo-600"
                          onClick={() =>
                            navigate({
                              to: `/facility-management/preventive-maintenance/${pm.id}`,
                            })
                          }
                          aria-label="View PM schedule"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-slate-400 hover:text-rose-600"
                          onClick={() => setDeleteTarget({ id: pm.id, title: pm.title })}
                          aria-label="Delete PM schedule"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete PM Schedule</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{deleteTarget?.title}</strong>?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deletePM.isPending}
            >
              {deletePM.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
