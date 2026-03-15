import { createFileRoute, Link } from '@tanstack/react-router'
import { AlertCircle, Bell, Clock, CheckCircle2, ChevronRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { PageHeader } from '@/components/PageHeader'
import { StatusBadge } from '@/components/StatusBadge'
import { useNotifications, useMarkAsRead } from '@/hooks/useNotifications'
import { useQuery } from '@tanstack/react-query'
import { apiGet } from '@/lib/api-client'
import { toast } from 'sonner'
import type { DealListResponse, MeetingListResponse } from '@thanamol/shared'

export const Route = createFileRoute('/_authenticated/my-dashboard')({
  component: MyDashboardPage,
})

function MyDashboardPage() {
  const { data: notificationsData, isLoading: notifLoading } = useNotifications({
    limit: 5,
    isRead: false,
  })

  const { data: dealsData, isLoading: dealsLoading } = useQuery({
    queryKey: ['deals', { limit: 5 }],
    queryFn: () => apiGet<DealListResponse>('/deals?limit=5'),
  })

  const { data: meetingsData, isLoading: meetingsLoading } = useQuery({
    queryKey: ['meetings', { limit: 5 }],
    queryFn: () => apiGet<MeetingListResponse>('/meetings?limit=5'),
  })

  const markAsRead = useMarkAsRead()

  const unreadNotifications = notificationsData?.data ?? []
  const recentDeals = dealsData?.data ?? []
  const upcomingMeetings = meetingsData?.data ?? []

  const today = new Date()
  const upcomingMeetingsDue = upcomingMeetings.filter(
    (m) => new Date(m.meeting_date) >= today,
  )

  async function handleMarkAsRead(id: string) {
    try {
      await markAsRead.mutateAsync(id)
    } catch {
      toast.error('Failed to mark notification as read')
    }
  }

  const isLoading = notifLoading || dealsLoading || meetingsLoading

  return (
    <div className="space-y-4">
      <PageHeader title="My Dashboard" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          icon={<Bell className="w-5 h-5 text-indigo-500" />}
          label="Unread Notifications"
          value={notificationsData?.pagination.total ?? 0}
          loading={notifLoading}
        />
        <StatCard
          icon={<AlertCircle className="w-5 h-5 text-rose-500" />}
          label="Active Deals"
          value={dealsData?.pagination.total ?? 0}
          loading={dealsLoading}
        />
        <StatCard
          icon={<Clock className="w-5 h-5 text-teal-500" />}
          label="Upcoming Meetings"
          value={upcomingMeetingsDue.length}
          loading={meetingsLoading}
        />
        <StatCard
          icon={<CheckCircle2 className="w-5 h-5 text-emerald-500" />}
          label="Total Meetings"
          value={meetingsData?.pagination.total ?? 0}
          loading={meetingsLoading}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center text-sm font-light tracking-wider text-slate-700">
                <Bell className="w-4 h-4 mr-2 text-indigo-600" />
                Recent Notifications
              </CardTitle>
              <Link to="/tasks/notifications">
                <Button variant="ghost" size="sm" className="h-7 text-[10px] text-indigo-600">
                  View all
                  <ChevronRight className="w-3 h-3 ml-1" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : unreadNotifications.length === 0 ? (
              <p className="text-[11px] text-slate-400 font-extralight text-center py-4">
                No unread notifications
              </p>
            ) : (
              <div className="space-y-2">
                {unreadNotifications.map((n) => (
                  <div
                    key={n.id}
                    className="flex items-start justify-between gap-3 p-2 rounded-lg bg-indigo-50/50 border border-indigo-100"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-light text-slate-800 truncate">{n.title}</p>
                      <p className="text-[9px] text-slate-400 font-extralight mt-0.5 line-clamp-1">
                        {n.message}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 text-[9px] text-indigo-600 hover:bg-indigo-100 flex-shrink-0"
                      onClick={() => handleMarkAsRead(n.id)}
                      disabled={markAsRead.isPending}
                    >
                      Read
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center text-sm font-light tracking-wider text-slate-700">
                <Clock className="w-4 h-4 mr-2 text-teal-600" />
                Upcoming Meetings
              </CardTitle>
              <Link to="/meetings">
                <Button variant="ghost" size="sm" className="h-7 text-[10px] text-teal-600">
                  View all
                  <ChevronRight className="w-3 h-3 ml-1" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {meetingsLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : upcomingMeetingsDue.length === 0 ? (
              <p className="text-[11px] text-slate-400 font-extralight text-center py-4">
                No upcoming meetings
              </p>
            ) : (
              <div className="space-y-2">
                {upcomingMeetingsDue.slice(0, 5).map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between p-2 rounded-lg border border-slate-100 hover:bg-slate-50"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-light text-slate-800 truncate">{m.title}</p>
                      <p className="text-[9px] text-slate-400 font-extralight mt-0.5">
                        {new Date(m.meeting_date).toLocaleDateString()}
                      </p>
                    </div>
                    <StatusBadge value={m.status} variant="meetingStatus" />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center text-sm font-light tracking-wider text-slate-700">
                <AlertCircle className="w-4 h-4 mr-2 text-rose-500" />
                Recent Deals
              </CardTitle>
              <Link to="/">
                <Button variant="ghost" size="sm" className="h-7 text-[10px] text-rose-500">
                  View all
                  <ChevronRight className="w-3 h-3 ml-1" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {dealsLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : recentDeals.length === 0 ? (
              <p className="text-[11px] text-slate-400 font-extralight text-center py-4">
                No recent deals
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {recentDeals.map((deal) => (
                  <div
                    key={deal.id}
                    className="flex items-center justify-between p-2 rounded-lg border border-slate-100 hover:bg-slate-50"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-light text-slate-800 truncate">{deal.title}</p>
                      {deal.value != null && (
                        <p className="text-[9px] text-slate-400 font-extralight mt-0.5">
                          ฿{deal.value.toLocaleString()}
                        </p>
                      )}
                    </div>
                    <StatusBadge value={deal.stage} variant="dealStage" />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
  loading,
}: {
  icon: React.ReactNode
  label: string
  value: number
  loading: boolean
}) {
  return (
    <Card>
      <CardContent className="pt-4 pb-3">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 w-9 h-9 bg-slate-50 rounded-lg flex items-center justify-center">
            {icon}
          </div>
          <div>
            {loading ? (
              <Skeleton className="h-6 w-10 mb-1" />
            ) : (
              <p className="text-xl font-light text-slate-800">{value}</p>
            )}
            <p className="text-[9px] text-slate-400 font-extralight uppercase tracking-wider leading-tight">
              {label}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
