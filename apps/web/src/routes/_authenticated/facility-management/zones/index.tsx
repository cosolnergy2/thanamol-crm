import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { Plus, MapPin, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
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
import { useZones, useDeleteZone } from '@/hooks/useZones'
import { useProjects } from '@/hooks/useProjects'
import type { ZoneWithCount } from '@thanamol/shared'

export const Route = createFileRoute('/_authenticated/facility-management/zones/')({
  component: ZoneListPage,
})

function ZoneListPage() {
  const navigate = useNavigate()
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null)

  const { data: projectsData, isLoading: loadingProjects } = useProjects({ limit: 100 })
  const projects = projectsData?.data ?? []

  const { data: zonesData, isLoading: loadingZones, isError } = useZones({
    projectId: selectedProjectId,
  })

  const deleteZone = useDeleteZone()

  async function confirmDelete() {
    if (!deleteTarget) return
    try {
      await deleteZone.mutateAsync(deleteTarget.id)
      toast.success('Zone deleted')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete zone')
    } finally {
      setDeleteTarget(null)
    }
  }

  const zones: ZoneWithCount[] = zonesData?.data ?? []
  const totalPages = zonesData?.pagination.totalPages ?? 1

  return (
    <div className="space-y-3">
      <PageHeader
        title="Zones"
        actions={
          <Link to="/facility-management/zones/create">
            <Button className="bg-indigo-600 hover:bg-indigo-700">
              <Plus className="w-4 h-4 mr-2" />
              Add Zone
            </Button>
          </Link>
        }
      />

      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="w-full md:w-72">
              {loadingProjects ? (
                <Skeleton className="h-10 w-full" />
              ) : (
                <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a project to view zones" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-100">
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                  Code
                </TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                  Name
                </TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                  Floor
                </TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                  Building
                </TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                  Parent Zone
                </TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase text-right">
                  Units
                </TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase text-right">
                  Sub-zones
                </TableHead>
                <TableHead className="text-center text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!selectedProjectId ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12">
                    <MapPin className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500 font-light">Select a project to view its zones</p>
                  </TableCell>
                </TableRow>
              ) : loadingZones ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={8}>
                      <Skeleton className="h-8 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : isError ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <p className="text-slate-600">Failed to load zones. Please refresh and try again.</p>
                  </TableCell>
                </TableRow>
              ) : zones.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12">
                    <MapPin className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-600">No zones found for this project</p>
                    <p className="text-sm text-slate-400 mt-1">
                      Create the first zone to get started
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                zones.map((zone) => (
                  <TableRow key={zone.id} className="hover:bg-slate-50/50 border-slate-100">
                    <TableCell className="font-mono text-xs text-slate-600">{zone.code}</TableCell>
                    <TableCell className="text-sm text-slate-700 font-light">{zone.name}</TableCell>
                    <TableCell className="text-xs text-slate-500">{zone.floor ?? '—'}</TableCell>
                    <TableCell className="text-xs text-slate-500">{zone.building ?? '—'}</TableCell>
                    <TableCell className="text-xs text-slate-500">
                      {zone.parent_zone_id ? (
                        <span className="text-indigo-600">Has parent</span>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-slate-500 text-right">
                      {zone._count.units}
                    </TableCell>
                    <TableCell className="text-xs text-slate-500 text-right">
                      {zone._count.children}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-slate-400 hover:text-indigo-600"
                          onClick={() =>
                            navigate({ to: `/facility-management/zones/${zone.id}/edit` })
                          }
                          aria-label="Edit zone"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-slate-400 hover:text-rose-600"
                          onClick={() => setDeleteTarget({ id: zone.id, name: zone.name })}
                          aria-label="Delete zone"
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

          {totalPages > 1 && (
            <div className="flex items-center justify-end gap-2 mt-4">
              <p className="text-xs text-slate-400">
                Page {zonesData?.pagination.page} of {totalPages}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Zone</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{deleteTarget?.name}</strong>? This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleteZone.isPending}
            >
              {deleteZone.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
