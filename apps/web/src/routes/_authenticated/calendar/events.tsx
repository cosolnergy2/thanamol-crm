import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { Calendar, ChevronLeft, ChevronRight, Clock } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { PageHeader } from '@/components/PageHeader'
import { useQuery } from '@tanstack/react-query'
import { apiGet } from '@/lib/api-client'
import type { MeetingListResponse } from '@thanamol/shared'

export const Route = createFileRoute('/_authenticated/calendar/events')({
  component: CalendarEventsPage,
})

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function CalendarEventsPage() {
  const today = new Date()
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())

  const { data: meetingsData, isLoading } = useQuery({
    queryKey: ['meetings', { limit: 200 }],
    queryFn: () => apiGet<MeetingListResponse>('/meetings?limit=200'),
  })

  const meetings = meetingsData?.data ?? []

  const meetingsByDate = meetings.reduce<Record<string, typeof meetings>>(
    (acc, meeting) => {
      const dateKey = meeting.meeting_date.slice(0, 10)
      if (!acc[dateKey]) acc[dateKey] = []
      acc[dateKey].push(meeting)
      return acc
    },
    {},
  )

  function navigateMonth(direction: 1 | -1) {
    const next = new Date(viewYear, viewMonth + direction, 1)
    setViewYear(next.getFullYear())
    setViewMonth(next.getMonth())
  }

  const firstDay = new Date(viewYear, viewMonth, 1).getDay()
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()

  const calendarCells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]

  const currentMonthMeetings = meetings.filter((m) => {
    const d = new Date(m.meeting_date)
    return d.getFullYear() === viewYear && d.getMonth() === viewMonth
  })

  return (
    <div className="space-y-3">
      <PageHeader title="Calendar" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-light tracking-wider text-slate-700">
                  {MONTHS[viewMonth]} {viewYear}
                </CardTitle>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => navigateMonth(-1)}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => navigateMonth(1)}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-1">
                {WEEKDAYS.map((day) => (
                  <div
                    key={day}
                    className="text-center text-[9px] font-extralight text-slate-400 uppercase tracking-widest py-1"
                  >
                    {day}
                  </div>
                ))}
                {isLoading
                  ? Array.from({ length: 35 }).map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))
                  : calendarCells.map((day, i) => {
                      if (!day) {
                        return <div key={`empty-${i}`} />
                      }
                      const dateKey = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                      const dayMeetings = meetingsByDate[dateKey] ?? []
                      const isToday =
                        day === today.getDate() &&
                        viewMonth === today.getMonth() &&
                        viewYear === today.getFullYear()

                      return (
                        <div
                          key={day}
                          className={`min-h-[48px] rounded-lg p-1 border ${
                            isToday
                              ? 'border-indigo-400 bg-indigo-50'
                              : 'border-transparent hover:bg-slate-50'
                          }`}
                        >
                          <p
                            className={`text-[10px] font-light text-right ${
                              isToday ? 'text-indigo-700 font-normal' : 'text-slate-600'
                            }`}
                          >
                            {day}
                          </p>
                          {dayMeetings.slice(0, 2).map((m) => (
                            <div
                              key={m.id}
                              className="mt-0.5 text-[8px] font-extralight bg-teal-100 text-teal-700 rounded px-1 truncate"
                            >
                              {m.title}
                            </div>
                          ))}
                          {dayMeetings.length > 2 && (
                            <div className="text-[8px] text-slate-400 font-extralight pl-1">
                              +{dayMeetings.length - 2} more
                            </div>
                          )}
                        </div>
                      )
                    })}
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center text-sm font-light tracking-wider text-slate-700">
                <Calendar className="w-4 h-4 mr-2 text-teal-600" />
                Events This Month
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-14 w-full" />
                  ))}
                </div>
              ) : currentMonthMeetings.length === 0 ? (
                <p className="text-[11px] text-slate-400 font-extralight text-center py-4">
                  No events this month
                </p>
              ) : (
                <div className="space-y-2">
                  {currentMonthMeetings.map((m) => (
                    <div
                      key={m.id}
                      className="p-2 rounded-lg border border-slate-100 hover:bg-slate-50"
                    >
                      <p className="text-[11px] font-light text-slate-800 truncate">
                        {m.title}
                      </p>
                      <div className="flex items-center text-[9px] text-slate-400 font-extralight mt-0.5">
                        <Clock className="w-3 h-3 mr-1" />
                        {new Date(m.meeting_date).toLocaleDateString()}
                      </div>
                    </div>
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
