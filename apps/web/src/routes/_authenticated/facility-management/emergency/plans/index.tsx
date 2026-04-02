import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { Plus, ShieldAlert, Search } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { PageHeader } from '@/components/PageHeader'
import { useDisasterPlans, useDeleteDisasterPlan, useUpdateDisasterPlan } from '@/hooks/useDisasterPlans'
import { useProjects } from '@/hooks/useProjects'
import type { DisasterPlanType, DisasterPlanStatus, DisasterPlanWithRelations } from '@thanamol/shared'

export const Route = createFileRoute(
  '/_authenticated/facility-management/emergency/plans/'
)({
  component: DisasterPlansListPage,
})

const PLAN_TYPE_LABELS: Record<DisasterPlanType, string> = {
  FIRE: 'Fire',
  EARTHQUAKE: 'Earthquake',
  FLOOD: 'Flood',
  CHEMICAL: 'Chemical',
  OTHER: 'Other',
}

const PLAN_TYPE_COLORS: Record<DisasterPlanType, string> = {
  FIRE: 'bg-rose-50 text-rose-700 border-rose-200',
  EARTHQUAKE: 'bg-orange-50 text-orange-700 border-orange-200',
  FLOOD: 'bg-sky-50 text-sky-700 border-sky-200',
  CHEMICAL: 'bg-purple-50 text-purple-700 border-purple-200',
  OTHER: 'bg-slate-50 text-slate-600 border-slate-200',
}

const STATUS_LABELS: Record<DisasterPlanStatus, string> = {
  DRAFT: 'Draft',
  ACTIVE: 'Active',
  ARCHIVED: 'Archived',
}

const STATUS_COLORS: Record<DisasterPlanStatus, string> = {
  DRAFT: 'bg-amber-50 text-amber-700 border-amber-200',
  ACTIVE: 'bg-teal-50 text-teal-700 border-teal-200',
  ARCHIVED: 'bg-slate-100 text-slate-500 border-slate-200',
}

function PlanActionsMenu({ plan }: { plan: DisasterPlanWithRelations }) {
  const updateMutation = useUpdateDisasterPlan(plan.id)
  const deleteMutation = useDeleteDisasterPlan()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" variant="outline">
          Actions
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <Link to="/facility-management/emergency/plans/$planId" params={{ planId: plan.id }}>
            View Details
          </Link>
        </DropdownMenuItem>
        {plan.status === 'DRAFT' && (
          <DropdownMenuItem
            onClick={async () => {
              await updateMutation.mutateAsync({ status: 'ACTIVE' })
              toast.success('Plan activated')
            }}
          >
            Activate Plan
          </DropdownMenuItem>
        )}
        {plan.status === 'ACTIVE' && (
          <DropdownMenuItem
            onClick={async () => {
              await updateMutation.mutateAsync({ status: 'ARCHIVED' })
              toast.success('Plan archived')
            }}
          >
            Archive Plan
          </DropdownMenuItem>
        )}
        <DropdownMenuItem
          className="text-rose-600"
          onClick={async () => {
            await deleteMutation.mutateAsync(plan.id)
            toast.success('Plan deleted')
          }}
        >
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function DisasterPlansListPage() {
  const [search, setSearch] = useState('')
  const [projectId, setProjectId] = useState('')
  const [planTypeFilter, setPlanTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const { data: projectsData } = useProjects({ limit: 100 })
  const projects = projectsData?.data ?? []

  const { data: plansData, isLoading } = useDisasterPlans({
    projectId: projectId || undefined,
    planType: (planTypeFilter || undefined) as DisasterPlanType | undefined,
    status: (statusFilter || undefined) as DisasterPlanStatus | undefined,
    search: search || undefined,
  })
  const plans = plansData?.data ?? []

  const active = plans.filter((p) => p.status === 'ACTIVE')
  const draft = plans.filter((p) => p.status === 'DRAFT')

  return (
    <div className="space-y-6">
      <PageHeader
        title="Disaster Plans"
        subtitle="แผนรับมือภัยพิบัติและเหตุฉุกเฉิน"
        actions={
          <Link to="/facility-management/emergency/plans/create">
            <Button className="bg-indigo-600 hover:bg-indigo-700 gap-2">
              <Plus className="w-4 h-4" />
              Create Plan
            </Button>
          </Link>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">Active Plans</p>
                <p className="text-2xl font-light text-slate-700 mt-1">{active.length}</p>
              </div>
              <ShieldAlert className="w-8 h-8 text-teal-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">Draft Plans</p>
                <p className="text-2xl font-light text-slate-700 mt-1">{draft.length}</p>
              </div>
              <ShieldAlert className="w-8 h-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">Total Plans</p>
                <p className="text-2xl font-light text-slate-700 mt-1">
                  {plansData?.pagination.total ?? 0}
                </p>
              </div>
              <ShieldAlert className="w-8 h-8 text-slate-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                className="pl-9"
                placeholder="Search plans..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={projectId || '__all__'} onValueChange={(v) => setProjectId(v === '__all__' ? '' : v)}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Projects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Projects</SelectItem>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={planTypeFilter || '__all__'} onValueChange={(v) => setPlanTypeFilter(v === '__all__' ? '' : v)}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Types</SelectItem>
                {Object.entries(PLAN_TYPE_LABELS).map(([val, label]) => (
                  <SelectItem key={val} value={val}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter || '__all__'} onValueChange={(v) => setStatusFilter(v === '__all__' ? '' : v)}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Status</SelectItem>
                {Object.entries(STATUS_LABELS).map(([val, label]) => (
                  <SelectItem key={val} value={val}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Review Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plans.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-slate-500 py-8">
                      No disaster plans found
                    </TableCell>
                  </TableRow>
                ) : (
                  plans.map((plan) => (
                    <TableRow key={plan.id}>
                      <TableCell className="font-medium text-sm max-w-xs truncate">
                        <Link
                          to="/facility-management/emergency/plans/$planId"
                          params={{ planId: plan.id }}
                          className="hover:text-indigo-600 transition-colors"
                        >
                          {plan.title}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={PLAN_TYPE_COLORS[plan.plan_type as DisasterPlanType]}
                        >
                          {PLAN_TYPE_LABELS[plan.plan_type as DisasterPlanType]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{plan.project.name}</TableCell>
                      <TableCell className="text-sm">
                        {plan.review_date
                          ? format(new Date(plan.review_date), 'dd/MM/yyyy')
                          : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={STATUS_COLORS[plan.status as DisasterPlanStatus]}
                        >
                          {STATUS_LABELS[plan.status as DisasterPlanStatus]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <PlanActionsMenu plan={plan} />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
