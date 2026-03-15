import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { Bell, BellOff, CheckCheck, Search } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { PageHeader } from '@/components/PageHeader'
import { useNotifications, useMarkAsRead, useMarkAllAsRead } from '@/hooks/useNotifications'

export const Route = createFileRoute('/_authenticated/tasks/notifications')({
  component: NotificationsPage,
})

const PAGE_SIZE = 20

function NotificationsPage() {
  const [search, setSearch] = useState('')
  const [readFilter, setReadFilter] = useState<'all' | 'unread' | 'read'>('all')
  const [page, setPage] = useState(1)

  const isReadParam =
    readFilter === 'unread' ? false : readFilter === 'read' ? true : undefined

  const { data, isLoading, isError } = useNotifications({
    page,
    limit: PAGE_SIZE,
    isRead: isReadParam,
  })

  const markAsRead = useMarkAsRead()
  const markAllAsRead = useMarkAllAsRead()

  useEffect(() => {
    setPage(1)
  }, [readFilter])

  async function handleMarkAsRead(id: string) {
    try {
      await markAsRead.mutateAsync(id)
    } catch {
      toast.error('Failed to mark notification as read')
    }
  }

  async function handleMarkAllAsRead() {
    try {
      await markAllAsRead.mutateAsync()
      toast.success('All notifications marked as read')
    } catch {
      toast.error('Failed to mark all notifications as read')
    }
  }

  const notifications = data?.data ?? []
  const totalPages = data?.pagination.totalPages ?? 1

  const filteredNotifications = search
    ? notifications.filter(
        (n) =>
          n.title.toLowerCase().includes(search.toLowerCase()) ||
          n.message.toLowerCase().includes(search.toLowerCase()),
      )
    : notifications

  return (
    <div className="space-y-3">
      <PageHeader
        title="Notifications"
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkAllAsRead}
            disabled={markAllAsRead.isPending}
          >
            <CheckCheck className="w-4 h-4 mr-2" />
            Mark All as Read
          </Button>
        }
      />

      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search notifications..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select
              value={readFilter}
              onValueChange={(v) => setReadFilter(v as typeof readFilter)}
            >
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="unread">Unread</SelectItem>
                <SelectItem value="read">Read</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-4">
                <Skeleton className="h-12 w-full" />
              </CardContent>
            </Card>
          ))
        ) : isError ? (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-slate-600">Failed to load notifications. Please refresh and try again.</p>
            </CardContent>
          </Card>
        ) : filteredNotifications.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Bell className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-600">No notifications found</p>
              <p className="text-sm text-slate-400 mt-1">You're all caught up!</p>
            </CardContent>
          </Card>
        ) : (
          filteredNotifications.map((notification) => (
            <Card
              key={notification.id}
              className={notification.is_read ? 'opacity-60' : 'border-indigo-200 bg-indigo-50/30'}
            >
              <CardContent className="pt-4 pb-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div
                      className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${
                        notification.is_read
                          ? 'bg-slate-100'
                          : 'bg-gradient-to-br from-indigo-500 to-teal-600'
                      }`}
                    >
                      {notification.is_read ? (
                        <BellOff className="w-4 h-4 text-slate-400" />
                      ) : (
                        <Bell className="w-4 h-4 text-white" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-light text-slate-800 truncate">
                        {notification.title}
                      </p>
                      <p className="text-[10px] text-slate-500 font-extralight mt-0.5 line-clamp-2">
                        {notification.message}
                      </p>
                      <p className="text-[9px] text-slate-400 font-extralight mt-1">
                        {new Date(notification.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  {!notification.is_read && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-[10px] text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 flex-shrink-0"
                      onClick={() => handleMarkAsRead(notification.id)}
                      disabled={markAsRead.isPending}
                    >
                      Mark read
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

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
