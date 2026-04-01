import { createFileRoute, useNavigate, Link } from '@tanstack/react-router'
import { ArrowLeft, ShieldAlert, Calendar, Users, FileText, ClipboardList } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useDisasterPlan, useUpdateDisasterPlan, useDeleteDisasterPlan } from '@/hooks/useDisasterPlans'
import { useEmergencyDrills } from '@/hooks/useEmergencyDrills'
import type { DisasterPlanType, DisasterPlanStatus } from '@thanamol/shared'

export const Route = createFileRoute(
  '/_authenticated/facility-management/emergency/plans/$planId/'
)({
  component: DisasterPlanDetailPage,
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

type ProcedureStep = { order: number; description: string }
type ResponsiblePerson = { name: string; role: string; contact: string }

function DisasterPlanDetailPage() {
  const { planId } = Route.useParams()
  const navigate = useNavigate()

  const { data, isLoading } = useDisasterPlan(planId)
  const plan = data?.plan

  const { data: drillsData } = useEmergencyDrills({ planId })
  const drills = drillsData?.data ?? []

  const updateMutation = useUpdateDisasterPlan(planId)
  const deleteMutation = useDeleteDisasterPlan()

  async function handleActivate() {
    await updateMutation.mutateAsync({ status: 'ACTIVE' })
    toast.success('Plan activated')
  }

  async function handleArchive() {
    await updateMutation.mutateAsync({ status: 'ARCHIVED' })
    toast.success('Plan archived')
  }

  async function handleDelete() {
    await deleteMutation.mutateAsync(planId)
    toast.success('Plan deleted')
    navigate({ to: '/facility-management/emergency/plans' })
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  if (!plan) {
    return (
      <div className="text-center py-12 text-slate-500">
        <ShieldAlert className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p>Disaster plan not found</p>
      </div>
    )
  }

  const procedures = (plan.procedures as ProcedureStep[]) ?? []
  const responsiblePersons = (plan.responsible_persons as ResponsiblePerson[]) ?? []

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate({ to: '/facility-management/emergency/plans' })}
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-extralight tracking-[0.3em] text-slate-600 uppercase truncate">
              {plan.title}
            </h1>
            <Badge variant="outline" className={PLAN_TYPE_COLORS[plan.plan_type as DisasterPlanType]}>
              {PLAN_TYPE_LABELS[plan.plan_type as DisasterPlanType]}
            </Badge>
            <Badge variant="outline" className={STATUS_COLORS[plan.status as DisasterPlanStatus]}>
              {STATUS_LABELS[plan.status as DisasterPlanStatus]}
            </Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1">{plan.project.name}</p>
        </div>

        <div className="flex gap-2">
          {plan.status === 'DRAFT' && (
            <Button
              variant="outline"
              className="border-teal-300 text-teal-700 hover:bg-teal-50"
              onClick={handleActivate}
              disabled={updateMutation.isPending}
            >
              Activate
            </Button>
          )}
          {plan.status === 'ACTIVE' && (
            <Button
              variant="outline"
              className="border-slate-300 text-slate-600"
              onClick={handleArchive}
              disabled={updateMutation.isPending}
            >
              Archive
            </Button>
          )}
          <Button
            variant="outline"
            className="border-rose-300 text-rose-600 hover:bg-rose-50"
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
          >
            Delete
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-slate-600">
                <ClipboardList className="w-4 h-4" />
                Procedures
              </CardTitle>
            </CardHeader>
            <CardContent>
              {procedures.length === 0 ? (
                <p className="text-sm text-slate-400">No procedures defined</p>
              ) : (
                <ol className="space-y-3">
                  {procedures.map((step, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-medium">
                        {step.order ?? index + 1}
                      </span>
                      <p className="text-sm text-slate-700 leading-relaxed">{step.description}</p>
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-slate-600">
                <Users className="w-4 h-4" />
                Responsible Persons
              </CardTitle>
            </CardHeader>
            <CardContent>
              {responsiblePersons.length === 0 ? (
                <p className="text-sm text-slate-400">No responsible persons assigned</p>
              ) : (
                <div className="space-y-3">
                  {responsiblePersons.map((person, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-4 p-3 rounded-lg border border-slate-100 bg-slate-50"
                    >
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-700">{person.name}</p>
                        <p className="text-xs text-slate-500">{person.role}</p>
                      </div>
                      <p className="text-xs text-slate-500">{person.contact}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-slate-600">
                <FileText className="w-4 h-4" />
                Plan Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="text-xs text-slate-400">Project</p>
                <p className="text-slate-700">{plan.project.name}</p>
              </div>
              {plan.review_date && (
                <div>
                  <p className="text-xs text-slate-400">Review Date</p>
                  <p className="text-slate-700 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    {format(new Date(plan.review_date), 'dd/MM/yyyy')}
                  </p>
                </div>
              )}
              <div>
                <p className="text-xs text-slate-400">Created</p>
                <p className="text-slate-700">{format(new Date(plan.created_at), 'dd/MM/yyyy')}</p>
              </div>
              {plan.notes && (
                <div>
                  <p className="text-xs text-slate-400">Notes</p>
                  <p className="text-slate-700 whitespace-pre-line">{plan.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-slate-600">
                  Related Drills ({drills.length})
                </CardTitle>
                <Link to="/facility-management/emergency/drills/create">
                  <Button size="sm" variant="outline" className="text-xs h-7">
                    Schedule Drill
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {drills.length === 0 ? (
                <p className="text-sm text-slate-400">No drills scheduled</p>
              ) : (
                <div className="space-y-2">
                  {drills.slice(0, 5).map((drill) => (
                    <Link
                      key={drill.id}
                      to="/facility-management/emergency/drills/$drillId"
                      params={{ drillId: drill.id }}
                    >
                      <div className="flex items-center justify-between p-2 rounded border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50 transition-colors cursor-pointer">
                        <div>
                          <p className="text-xs font-medium text-slate-700">{drill.drill_type}</p>
                          <p className="text-[10px] text-slate-500">
                            {format(new Date(drill.scheduled_date), 'dd/MM/yyyy')}
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className={
                            drill.status === 'COMPLETED'
                              ? 'bg-teal-50 text-teal-700 border-teal-200 text-[10px]'
                              : drill.status === 'CANCELLED'
                                ? 'bg-slate-100 text-slate-500 border-slate-200 text-[10px]'
                                : 'bg-amber-50 text-amber-700 border-amber-200 text-[10px]'
                          }
                        >
                          {drill.status}
                        </Badge>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
