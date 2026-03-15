import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { toast } from 'sonner'
import {
  useProject,
  useProjectUnits,
  useUpdateProject,
} from '@/hooks/useProjects'
import type { UpdateProjectRequest, ProjectStatus, UnitStatus } from '@thanamol/shared'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ArrowLeft,
  Building2,
  MapPin,
  Pencil,
  Package,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'

export const Route = createFileRoute('/_authenticated/projects/$projectId')({
  component: ProjectDetailPage,
})

const PROJECT_STATUSES = ['PLANNING', 'ACTIVE', 'COMPLETED', 'SUSPENDED'] as const
const PROJECT_TYPES = ['Warehouse', 'Commercial', 'Mixed Use', 'Industrial', 'Office'] as const

const STATUS_LABELS: Record<string, string> = {
  PLANNING: 'Planning',
  ACTIVE: 'Active',
  COMPLETED: 'Completed',
  SUSPENDED: 'Suspended',
}

const STATUS_STYLES: Record<string, string> = {
  PLANNING: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  ACTIVE: 'bg-teal-50 text-teal-700 border-teal-200',
  COMPLETED: 'bg-slate-100 text-slate-700 border-slate-200',
  SUSPENDED: 'bg-amber-50 text-amber-700 border-amber-200',
}

const UNIT_STATUS_LABELS: Record<UnitStatus, string> = {
  AVAILABLE: 'Available',
  RESERVED: 'Reserved',
  SOLD: 'Sold',
  RENTED: 'Rented',
  UNDER_MAINTENANCE: 'Under Maintenance',
}

const UNIT_STATUS_STYLES: Record<UnitStatus, string> = {
  AVAILABLE: 'bg-teal-50 text-teal-700 border-teal-200',
  RESERVED: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  SOLD: 'bg-slate-100 text-slate-700 border-slate-200',
  RENTED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  UNDER_MAINTENANCE: 'bg-amber-50 text-amber-700 border-amber-200',
}

function ProjectDetailPage() {
  const { projectId } = Route.useParams()
  const [editOpen, setEditOpen] = useState(false)
  const [editData, setEditData] = useState<UpdateProjectRequest>({})
  const [unitsPage, setUnitsPage] = useState(1)

  const { data: projectData, isLoading, isError } = useProject(projectId)
  const { data: unitsData, isLoading: unitsLoading } = useProjectUnits(projectId, {
    page: unitsPage,
    limit: 20,
  })
  const updateMutation = useUpdateProject(projectId)

  const project = projectData?.project
  const units = unitsData?.data ?? []
  const unitsPagination = unitsData?.pagination

  function handleEditOpen() {
    if (!project) return
    setEditData({
      name: project.name,
      code: project.code,
      type: project.type,
      status: project.status,
      address: project.address ?? '',
      description: project.description ?? '',
      totalUnits: project.total_units,
    })
    setEditOpen(true)
  }

  function handleEditSave() {
    updateMutation.mutate(editData, {
      onSuccess: () => {
        toast.success('Project updated')
        setEditOpen(false)
      },
      onError: (err) => {
        toast.error(err.message)
      },
    })
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    )
  }

  if (isError || !project) {
    return (
      <div className="text-center py-16">
        <AlertCircle className="w-16 h-16 text-slate-300 mx-auto mb-4" />
        <p className="text-slate-700 font-medium">Project not found</p>
        <Link to="/projects">
          <Button variant="outline" className="mt-4">
            Back to Projects
          </Button>
        </Link>
      </div>
    )
  }

  const unitCounts = project.unitStatusCounts
  const available = unitCounts?.available ?? 0
  const reserved = unitCounts?.reserved ?? 0
  const sold = unitCounts?.sold ?? 0
  const rented = unitCounts?.rented ?? 0
  const totalUnits = project._count?.units ?? project.total_units

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/projects">
            <Button variant="outline" size="icon" aria-label="Back to projects">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold text-slate-900">{project.name}</h1>
              <Badge
                variant="outline"
                className={STATUS_STYLES[project.status] ?? 'bg-slate-100 text-slate-700'}
              >
                {STATUS_LABELS[project.status] ?? project.status}
              </Badge>
            </div>
            <p className="text-sm text-slate-500 mt-0.5">{project.code}</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={handleEditOpen}>
          <Pencil className="w-4 h-4 mr-2" />
          Edit Project
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-5 pb-5 text-center">
            <Building2 className="w-6 h-6 text-indigo-600 mx-auto mb-2" />
            <p className="text-xs text-slate-500 uppercase tracking-wide">Total Units</p>
            <p className="text-3xl font-bold text-indigo-600 mt-1">{totalUnits}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-5 text-center">
            <Package className="w-6 h-6 text-teal-600 mx-auto mb-2" />
            <p className="text-xs text-slate-500 uppercase tracking-wide">Available</p>
            <p className="text-3xl font-bold text-teal-600 mt-1">{available}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-5 text-center">
            <Package className="w-6 h-6 text-indigo-500 mx-auto mb-2" />
            <p className="text-xs text-slate-500 uppercase tracking-wide">Reserved</p>
            <p className="text-3xl font-bold text-indigo-500 mt-1">{reserved}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-5 text-center">
            <Package className="w-6 h-6 text-emerald-600 mx-auto mb-2" />
            <p className="text-xs text-slate-500 uppercase tracking-wide">Sold / Rented</p>
            <p className="text-3xl font-bold text-emerald-600 mt-1">{sold + rented}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="units">Units</TabsTrigger>
          <TabsTrigger value="contracts">Contracts</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle>Project Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide">Project Type</p>
                  <p className="font-medium text-slate-900 mt-1">{project.type || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide">Status</p>
                  <p className="font-medium text-slate-900 mt-1">
                    {STATUS_LABELS[project.status] ?? project.status}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide">Total Units (target)</p>
                  <p className="font-medium text-slate-900 mt-1">{project.total_units}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide">Created</p>
                  <p className="font-medium text-slate-900 mt-1">
                    {new Date(project.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              {project.address && (
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide">Address</p>
                  <div className="flex items-start gap-2 mt-1">
                    <MapPin className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                    <p className="text-slate-900">{project.address}</p>
                  </div>
                </div>
              )}
              {project.description && (
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide">Description</p>
                  <p className="text-slate-700 mt-1">{project.description}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="units" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Units</CardTitle>
            </CardHeader>
            <CardContent>
              {unitsLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-12" />
                  ))}
                </div>
              ) : units.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-600">No units in this project</p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-200">
                          <th className="text-left py-2 px-3 text-slate-500 font-medium">Unit</th>
                          <th className="text-left py-2 px-3 text-slate-500 font-medium">Floor</th>
                          <th className="text-left py-2 px-3 text-slate-500 font-medium">Building</th>
                          <th className="text-left py-2 px-3 text-slate-500 font-medium">Type</th>
                          <th className="text-right py-2 px-3 text-slate-500 font-medium">Area (sqm)</th>
                          <th className="text-right py-2 px-3 text-slate-500 font-medium">Price</th>
                          <th className="text-left py-2 px-3 text-slate-500 font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {units.map((unit) => (
                          <tr key={unit.id} className="border-b border-slate-100 hover:bg-slate-50">
                            <td className="py-2.5 px-3 font-medium text-slate-900">
                              {unit.unit_number}
                            </td>
                            <td className="py-2.5 px-3 text-slate-600">{unit.floor ?? '-'}</td>
                            <td className="py-2.5 px-3 text-slate-600">{unit.building ?? '-'}</td>
                            <td className="py-2.5 px-3 text-slate-600">{unit.type}</td>
                            <td className="py-2.5 px-3 text-right text-slate-600">
                              {unit.area_sqm?.toLocaleString() ?? '-'}
                            </td>
                            <td className="py-2.5 px-3 text-right text-slate-600">
                              {unit.price != null
                                ? `฿${unit.price.toLocaleString()}`
                                : '-'}
                            </td>
                            <td className="py-2.5 px-3">
                              <Badge
                                variant="outline"
                                className={
                                  UNIT_STATUS_STYLES[unit.status] ??
                                  'bg-slate-100 text-slate-700'
                                }
                              >
                                {UNIT_STATUS_LABELS[unit.status] ?? unit.status}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {unitsPagination && unitsPagination.totalPages > 1 && (
                    <div className="flex items-center justify-center gap-3 mt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={unitsPage <= 1}
                        onClick={() => setUnitsPage((p) => p - 1)}
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                      <span className="text-sm text-slate-600">
                        Page {unitsPagination.page} of {unitsPagination.totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={unitsPage >= unitsPagination.totalPages}
                        onClick={() => setUnitsPage((p) => p + 1)}
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contracts" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-600">
                  Contract management is available in the Contracts section
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-code">Project Code</Label>
                <Input
                  id="edit-code"
                  value={editData.code ?? ''}
                  onChange={(e) => setEditData({ ...editData, code: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-name">Project Name</Label>
                <Input
                  id="edit-name"
                  value={editData.name ?? ''}
                  onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Project Type</Label>
                <Select
                  value={editData.type ?? ''}
                  onValueChange={(value) => setEditData({ ...editData, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PROJECT_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={editData.status ?? ''}
                  onValueChange={(value) =>
                    setEditData({ ...editData, status: value as ProjectStatus })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PROJECT_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {STATUS_LABELS[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-address">Address</Label>
              <Input
                id="edit-address"
                value={editData.address ?? ''}
                onChange={(e) => setEditData({ ...editData, address: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-total-units">Total Units</Label>
              <Input
                id="edit-total-units"
                type="number"
                min={0}
                value={editData.totalUnits ?? 0}
                onChange={(e) =>
                  setEditData({ ...editData, totalUnits: parseInt(e.target.value) || 0 })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={editData.description ?? ''}
                onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleEditSave}
              disabled={updateMutation.isPending}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
