import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { toast } from 'sonner'
import { useTasks, useUpdateTask } from '@/hooks/useTasks'
import type { TaskQueryParams, TaskStatus, TaskPriority } from '@thanamol/shared'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Plus,
  Search,
  Eye,
  CheckCircle2,
  Clock,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ListTodo,
} from 'lucide-react'
import { format } from 'date-fns'

export const Route = createFileRoute('/_authenticated/tasks/')({
  component: TaskListPage,
})

const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  TODO: 'To Do',
  IN_PROGRESS: 'In Progress',
  REVIEW: 'Review',
  DONE: 'Done',
  CANCELLED: 'Cancelled',
}

const TASK_STATUS_STYLES: Record<TaskStatus, string> = {
  TODO: 'bg-slate-100 text-slate-700 border-slate-200',
  IN_PROGRESS: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  REVIEW: 'bg-amber-50 text-amber-700 border-amber-200',
  DONE: 'bg-teal-50 text-teal-700 border-teal-200',
  CANCELLED: 'bg-rose-50 text-rose-700 border-rose-200',
}

const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  URGENT: 'Urgent',
}

const TASK_PRIORITY_STYLES: Record<TaskPriority, string> = {
  LOW: 'bg-slate-100 text-slate-600 border-slate-200',
  MEDIUM: 'bg-blue-50 text-blue-700 border-blue-200',
  HIGH: 'bg-amber-50 text-amber-700 border-amber-200',
  URGENT: 'bg-rose-50 text-rose-700 border-rose-200',
}

const TASK_STATUSES: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE', 'CANCELLED']
const TASK_PRIORITIES: TaskPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT']

function TaskRowSkeleton() {
  return (
    <Card>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
          </div>
          <div className="flex gap-2 ml-4">
            <Skeleton className="h-8 w-28" />
            <Skeleton className="h-8 w-16" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function InlineStatusSelect({ taskId, currentStatus }: { taskId: string; currentStatus: TaskStatus }) {
  const update = useUpdateTask(taskId)
  return (
    <Select
      value={currentStatus}
      onValueChange={(val) =>
        update.mutate(
          { status: val as TaskStatus },
          {
            onError: (err) => toast.error(err.message),
          }
        )
      }
    >
      <SelectTrigger className="w-36 h-8 text-xs">
        <Badge
          variant="outline"
          className={`w-full justify-center text-xs ${TASK_STATUS_STYLES[currentStatus]}`}
        >
          {TASK_STATUS_LABELS[currentStatus]}
        </Badge>
      </SelectTrigger>
      <SelectContent>
        {TASK_STATUSES.map((s) => (
          <SelectItem key={s} value={s} className="text-xs">
            {TASK_STATUS_LABELS[s]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function TaskListPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('')
  const [page, setPage] = useState(1)

  const params: TaskQueryParams = {
    page,
    limit: 20,
    search: search || undefined,
    status: (statusFilter as TaskStatus) || undefined,
    priority: (priorityFilter as TaskPriority) || undefined,
  }

  const { data, isLoading, isError } = useTasks(params)

  const tasks = data?.data ?? []
  const pagination = data?.pagination

  const statCounts = {
    todo: tasks.filter((t) => t.status === 'TODO').length,
    inProgress: tasks.filter((t) => t.status === 'IN_PROGRESS').length,
    review: tasks.filter((t) => t.status === 'REVIEW').length,
    done: tasks.filter((t) => t.status === 'DONE').length,
  }

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSearch(e.target.value)
    setPage(1)
  }

  function handleStatusChange(value: string) {
    setStatusFilter(value === 'all' ? '' : value)
    setPage(1)
  }

  function handlePriorityChange(value: string) {
    setPriorityFilter(value === 'all' ? '' : value)
    setPage(1)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Tasks</h1>
          <p className="mt-1 text-sm text-slate-500">
            {pagination ? `${pagination.total} tasks total` : 'Manage and track all tasks'}
          </p>
        </div>
        <Link to="/tasks/create">
          <Button className="bg-indigo-600 hover:bg-indigo-700">
            <Plus className="w-4 h-4 mr-2" />
            New Task
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-5 pb-5 text-center">
            <ListTodo className="w-6 h-6 text-slate-500 mx-auto mb-2" />
            <p className="text-xs text-slate-500 uppercase tracking-wide">To Do</p>
            <p className="text-3xl font-bold text-slate-700 mt-1">{statCounts.todo}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-5 text-center">
            <Clock className="w-6 h-6 text-indigo-600 mx-auto mb-2" />
            <p className="text-xs text-slate-500 uppercase tracking-wide">In Progress</p>
            <p className="text-3xl font-bold text-indigo-600 mt-1">{statCounts.inProgress}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-5 text-center">
            <AlertCircle className="w-6 h-6 text-amber-600 mx-auto mb-2" />
            <p className="text-xs text-slate-500 uppercase tracking-wide">Review</p>
            <p className="text-3xl font-bold text-amber-600 mt-1">{statCounts.review}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-5 text-center">
            <CheckCircle2 className="w-6 h-6 text-teal-600 mx-auto mb-2" />
            <p className="text-xs text-slate-500 uppercase tracking-wide">Done</p>
            <p className="text-3xl font-bold text-teal-600 mt-1">{statCounts.done}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search by title..."
                value={search}
                onChange={handleSearchChange}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter || 'all'} onValueChange={handleStatusChange}>
              <SelectTrigger className="w-full md:w-44">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {TASK_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {TASK_STATUS_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={priorityFilter || 'all'} onValueChange={handlePriorityChange}>
              <SelectTrigger className="w-full md:w-44">
                <SelectValue placeholder="All Priorities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                {TASK_PRIORITIES.map((p) => (
                  <SelectItem key={p} value={p}>
                    {TASK_PRIORITY_LABELS[p]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {isError && (
        <Card>
          <CardContent className="py-12 text-center text-slate-600">
            Failed to load tasks. Please try again.
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <TaskRowSkeleton key={i} />
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <CheckCircle2 className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-600 font-medium">No tasks found</p>
            <p className="text-sm text-slate-400 mt-1">
              {search || statusFilter || priorityFilter
                ? 'Try adjusting your filters'
                : 'Create your first task to get started'}
            </p>
            {!search && !statusFilter && !priorityFilter && (
              <Link to="/tasks/create">
                <Button variant="outline" className="mt-4">
                  Create First Task
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => (
            <Card key={task.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <Link to="/tasks/$taskId" params={{ taskId: task.id }}>
                        <span className="text-base font-medium text-slate-900 hover:text-indigo-600 transition-colors">
                          {task.title}
                        </span>
                      </Link>
                      <Badge
                        variant="outline"
                        className={`text-xs ${TASK_PRIORITY_STYLES[task.priority]}`}
                      >
                        {TASK_PRIORITY_LABELS[task.priority]}
                      </Badge>
                      {task.parent_task_id && (
                        <Badge variant="outline" className="text-xs bg-indigo-50 text-indigo-600 border-indigo-200">
                          Subtask
                        </Badge>
                      )}
                    </div>
                    {task.description && (
                      <p className="text-sm text-slate-500 line-clamp-1">{task.description}</p>
                    )}
                    <div className="flex flex-wrap gap-3 mt-2 text-xs text-slate-500">
                      {task.due_date && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          Due {format(new Date(task.due_date), 'dd MMM yyyy')}
                        </span>
                      )}
                      {task.tags && task.tags.length > 0 && (
                        <span>
                          {task.tags.slice(0, 3).map((tag) => (
                            <span key={tag} className="mr-1 px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                              {tag}
                            </span>
                          ))}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <InlineStatusSelect taskId={task.id} currentStatus={task.status} />
                    <Link to="/tasks/$taskId" params={{ taskId: task.id }}>
                      <Button variant="outline" size="sm">
                        <Eye className="w-4 h-4 mr-1" />
                        View
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm text-slate-600">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= pagination.totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  )
}
