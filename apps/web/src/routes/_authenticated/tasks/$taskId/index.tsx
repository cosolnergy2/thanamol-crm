import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { toast } from 'sonner'
import {
  useTaskById,
  useUpdateTask,
  useDeleteTask,
  useTaskComments,
  useCreateTaskComment,
} from '@/hooks/useTasks'
import type { TaskStatus, TaskPriority } from '@thanamol/shared'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  ArrowLeft,
  Edit,
  Trash2,
  Clock,
  Calendar,
  Tag,
  MessageSquare,
  User,
  Layers,
  AlertCircle,
  Send,
} from 'lucide-react'
import { format } from 'date-fns'

export const Route = createFileRoute('/_authenticated/tasks/$taskId/')({
  component: TaskDetailPage,
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

function DetailPageSkeleton() {
  return (
    <div className="space-y-6 max-w-4xl">
      <Skeleton className="h-8 w-64" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
      <Skeleton className="h-48" />
      <Skeleton className="h-64" />
    </div>
  )
}

function TaskDetailPage() {
  const { taskId } = Route.useParams()
  const navigate = useNavigate()
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [commentContent, setCommentContent] = useState('')

  const { data: taskData, isLoading, isError } = useTaskById(taskId)
  const { data: commentsData } = useTaskComments(taskId)
  const updateTask = useUpdateTask(taskId)
  const deleteTask = useDeleteTask()
  const createComment = useCreateTaskComment(taskId)

  const task = taskData?.task
  const comments = commentsData?.comments ?? []

  function handleStatusChange(newStatus: string) {
    updateTask.mutate(
      { status: newStatus as TaskStatus },
      {
        onSuccess: () => toast.success('Status updated'),
        onError: (err) => toast.error(err.message),
      }
    )
  }

  function handleDelete() {
    deleteTask.mutate(taskId, {
      onSuccess: () => {
        toast.success('Task deleted')
        navigate({ to: '/tasks' })
      },
      onError: (err) => toast.error(err.message),
    })
  }

  function handleAddComment(e: React.FormEvent) {
    e.preventDefault()
    if (!commentContent.trim()) return
    createComment.mutate(
      { content: commentContent.trim() },
      {
        onSuccess: () => {
          toast.success('Comment added')
          setCommentContent('')
        },
        onError: (err) => toast.error(err.message),
      }
    )
  }

  if (isLoading) {
    return <DetailPageSkeleton />
  }

  if (isError || !task) {
    return (
      <div className="text-center py-16">
        <AlertCircle className="w-16 h-16 text-slate-300 mx-auto mb-4" />
        <p className="text-slate-700 font-medium">Task not found</p>
        <Link to="/tasks">
          <Button variant="outline" className="mt-4">
            Back to Tasks
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/tasks">
            <Button variant="outline" size="icon" aria-label="Back to tasks">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">{task.title}</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Created {format(new Date(task.created_at), 'dd MMM yyyy')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDeleteDialogOpen(true)}
            className="text-rose-600 border-rose-200 hover:bg-rose-50"
          >
            <Trash2 className="w-4 h-4 mr-1" />
            Delete
          </Button>
          <Link to="/tasks/$taskId/edit" params={{ taskId }}>
            <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700">
              <Edit className="w-4 h-4 mr-1" />
              Edit
            </Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardContent className="pt-5">
          <div className="flex items-center gap-6 flex-wrap">
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide mb-1.5">Status</p>
              <Select value={task.status} onValueChange={handleStatusChange}>
                <SelectTrigger className="w-44">
                  <Badge
                    variant="outline"
                    className={`w-full justify-center ${TASK_STATUS_STYLES[task.status]}`}
                  >
                    {TASK_STATUS_LABELS[task.status]}
                  </Badge>
                </SelectTrigger>
                <SelectContent>
                  {TASK_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {TASK_STATUS_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide mb-1.5">Priority</p>
              <Badge
                variant="outline"
                className={TASK_PRIORITY_STYLES[task.priority]}
              >
                {TASK_PRIORITY_LABELS[task.priority]}
              </Badge>
            </div>
            {task.due_date && (
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide mb-1.5">Due Date</p>
                <div className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  {format(new Date(task.due_date), 'dd MMM yyyy')}
                </div>
              </div>
            )}
            {task.estimated_hours != null && (
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide mb-1.5">Estimated</p>
                <div className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
                  <Clock className="w-4 h-4 text-slate-400" />
                  {task.estimated_hours}h
                </div>
              </div>
            )}
            {task.actual_hours != null && (
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide mb-1.5">Actual</p>
                <div className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
                  <Clock className="w-4 h-4 text-slate-400" />
                  {task.actual_hours}h
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {task.description && (
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Description</p>
              <p className="text-slate-900 whitespace-pre-wrap">{task.description}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {task.assignee && (
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Assigned To</p>
                <div className="flex items-center gap-2 text-slate-900">
                  <User className="w-4 h-4 text-slate-400" />
                  <span>
                    {task.assignee.first_name} {task.assignee.last_name}
                  </span>
                </div>
              </div>
            )}
            {task.creator && (
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Created By</p>
                <div className="flex items-center gap-2 text-slate-900">
                  <User className="w-4 h-4 text-slate-400" />
                  <span>
                    {task.creator.first_name} {task.creator.last_name}
                  </span>
                </div>
              </div>
            )}
            {task.project && (
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Project</p>
                <Link
                  to="/projects/$projectId"
                  params={{ projectId: task.project.id }}
                  className="text-indigo-600 hover:text-indigo-700 font-medium"
                >
                  {task.project.name}
                </Link>
              </div>
            )}
            {task.parent_task && (
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Parent Task</p>
                <Link
                  to="/tasks/$taskId"
                  params={{ taskId: task.parent_task.id }}
                  className="text-indigo-600 hover:text-indigo-700 font-medium"
                >
                  {task.parent_task.title}
                </Link>
              </div>
            )}
          </div>

          {task.tags && task.tags.length > 0 && (
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">Tags</p>
              <div className="flex flex-wrap gap-2">
                {task.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-xs"
                  >
                    <Tag className="w-3 h-3" />
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {task.subtasks && task.subtasks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-600" />
              Subtasks ({task.subtasks.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {task.subtasks.map((sub) => (
                <div
                  key={sub.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:bg-slate-50"
                >
                  <Link
                    to="/tasks/$taskId"
                    params={{ taskId: sub.id }}
                    className="text-sm font-medium text-slate-800 hover:text-indigo-600"
                  >
                    {sub.title}
                  </Link>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={`text-xs ${TASK_PRIORITY_STYLES[sub.priority]}`}
                    >
                      {TASK_PRIORITY_LABELS[sub.priority]}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={`text-xs ${TASK_STATUS_STYLES[sub.status]}`}
                    >
                      {TASK_STATUS_LABELS[sub.status]}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-indigo-600" />
            Comments ({comments.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {comments.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-4">
              No comments yet. Be the first to comment.
            </p>
          ) : (
            <div className="space-y-3">
              {comments.map((comment) => (
                <div key={comment.id} className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-indigo-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-medium text-slate-900">
                        {comment.user
                          ? `${comment.user.first_name} ${comment.user.last_name}`
                          : 'Unknown'}
                      </span>
                      <span className="text-xs text-slate-400">
                        {format(new Date(comment.created_at), 'dd MMM yyyy HH:mm')}
                      </span>
                    </div>
                    <p className="text-sm text-slate-700 whitespace-pre-wrap">
                      {comment.content}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <form onSubmit={handleAddComment} className="flex flex-col gap-2 pt-2 border-t border-slate-100">
            <Label htmlFor="comment">Add a comment</Label>
            <Textarea
              id="comment"
              value={commentContent}
              onChange={(e) => setCommentContent(e.target.value)}
              placeholder="Write your comment..."
              rows={3}
            />
            <div className="flex justify-end">
              <Button
                type="submit"
                size="sm"
                disabled={createComment.isPending || !commentContent.trim()}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                <Send className="w-3.5 h-3.5 mr-1.5" />
                {createComment.isPending ? 'Posting...' : 'Post Comment'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Task</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{task.title}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteTask.isPending}
            >
              {deleteTask.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
