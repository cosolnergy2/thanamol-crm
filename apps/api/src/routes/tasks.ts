import { Elysia, t } from 'elysia'
import { prisma } from '../lib/prisma'
import { authPlugin, type AuthenticatedUser } from '../middleware/auth'
import { logActivity, getIpAddress } from '../lib/activity-logger'

const TASK_STATUSES = ['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE', 'CANCELLED'] as const
const TASK_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const

type TaskStatusValue = (typeof TASK_STATUSES)[number]
type TaskPriorityValue = (typeof TASK_PRIORITIES)[number]

const taskStatusUnion = t.Union([
  t.Literal('TODO'),
  t.Literal('IN_PROGRESS'),
  t.Literal('REVIEW'),
  t.Literal('DONE'),
  t.Literal('CANCELLED'),
])

const taskPriorityUnion = t.Union([
  t.Literal('LOW'),
  t.Literal('MEDIUM'),
  t.Literal('HIGH'),
  t.Literal('URGENT'),
])

const createTaskSchema = t.Object({
  title: t.String({ minLength: 1 }),
  description: t.Optional(t.String()),
  projectId: t.Optional(t.String()),
  assignedTo: t.Optional(t.String()),
  priority: t.Optional(taskPriorityUnion),
  status: t.Optional(taskStatusUnion),
  dueDate: t.Optional(t.String()),
  parentTaskId: t.Optional(t.String()),
  estimatedHours: t.Optional(t.Number()),
  actualHours: t.Optional(t.Number()),
  tags: t.Optional(t.Array(t.String())),
  isRecurring: t.Optional(t.Boolean()),
  recurrencePattern: t.Optional(t.String()),
})

const updateTaskSchema = t.Object({
  title: t.Optional(t.String({ minLength: 1 })),
  description: t.Optional(t.String()),
  projectId: t.Optional(t.String()),
  assignedTo: t.Optional(t.String()),
  priority: t.Optional(taskPriorityUnion),
  status: t.Optional(taskStatusUnion),
  dueDate: t.Optional(t.String()),
  parentTaskId: t.Optional(t.String()),
  estimatedHours: t.Optional(t.Number()),
  actualHours: t.Optional(t.Number()),
  tags: t.Optional(t.Array(t.String())),
  isRecurring: t.Optional(t.Boolean()),
  recurrencePattern: t.Optional(t.String()),
})

const createCommentSchema = t.Object({
  content: t.String({ minLength: 1 }),
})

function buildPagination(page: number, limit: number, total: number) {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  }
}

const taskIncludes = {
  project: { select: { id: true, name: true, code: true } },
  assignee: { select: { id: true, first_name: true, last_name: true } },
  creator: { select: { id: true, first_name: true, last_name: true } },
  comments: {
    include: {
      user: { select: { id: true, first_name: true, last_name: true } },
    },
    orderBy: { created_at: 'asc' as const },
  },
  parent_task: { select: { id: true, title: true, status: true } },
  subtasks: { select: { id: true, title: true, status: true, priority: true } },
}

export const tasksRoutes = new Elysia({ prefix: '/api/tasks' })
  .use(authPlugin)
  .guard(
    {
      beforeHandle({ authUser, set }) {
        if (!authUser) {
          set.status = 401
          return { error: 'Unauthorized' }
        }
      },
    },
    (app) =>
      app
        .get(
          '/',
          async ({ query }) => {
            const page = Math.max(1, Number(query.page ?? 1))
            const limit = Math.min(100, Math.max(1, Number(query.limit ?? 20)))
            const skip = (page - 1) * limit

            const where: Record<string, unknown> = {}

            if (query.status && TASK_STATUSES.includes(query.status as TaskStatusValue)) {
              where.status = query.status
            }

            if (query.priority && TASK_PRIORITIES.includes(query.priority as TaskPriorityValue)) {
              where.priority = query.priority
            }

            if (query.assignedTo) {
              where.assigned_to = query.assignedTo
            }

            if (query.projectId) {
              where.project_id = query.projectId
            }

            if (query.search) {
              where.title = { contains: query.search, mode: 'insensitive' }
            }

            const [total, tasks] = await Promise.all([
              prisma.task.count({ where }),
              prisma.task.findMany({
                where,
                skip,
                take: limit,
                orderBy: { created_at: 'desc' },
              }),
            ])

            return {
              data: tasks,
              pagination: buildPagination(page, limit, total),
            }
          },
          {
            query: t.Object({
              page: t.Optional(t.String()),
              limit: t.Optional(t.String()),
              status: t.Optional(t.String()),
              priority: t.Optional(t.String()),
              assignedTo: t.Optional(t.String()),
              projectId: t.Optional(t.String()),
              search: t.Optional(t.String()),
            }),
          }
        )
        .get('/:id', async ({ params, set }) => {
          const task = await prisma.task.findUnique({
            where: { id: params.id },
            include: taskIncludes,
          })
          if (!task) {
            set.status = 404
            return { error: 'Task not found' }
          }
          return { task }
        })
        .post(
          '/',
          async ({ body, authUser, headers, set }) => {
            const user = authUser as AuthenticatedUser
            const task = await prisma.task.create({
              data: {
                title: body.title,
                description: body.description ?? null,
                project_id: body.projectId ?? null,
                assigned_to: body.assignedTo ?? null,
                priority: body.priority ?? 'MEDIUM',
                status: body.status ?? 'TODO',
                due_date: body.dueDate ? new Date(body.dueDate) : null,
                parent_task_id: body.parentTaskId ?? null,
                estimated_hours: body.estimatedHours ?? null,
                actual_hours: body.actualHours ?? null,
                tags: body.tags ?? [],
                is_recurring: body.isRecurring ?? false,
                recurrence_pattern: body.recurrencePattern ?? null,
                created_by: user.id,
              },
            })
            logActivity({
              userId: user.id,
              action: 'CREATE',
              entityType: 'Task',
              entityId: task.id,
              ipAddress: getIpAddress(headers),
            })
            set.status = 201
            return { task }
          },
          { body: createTaskSchema }
        )
        .put(
          '/:id',
          async ({ params, body, authUser, headers, set }) => {
            const existing = await prisma.task.findUnique({ where: { id: params.id } })
            if (!existing) {
              set.status = 404
              return { error: 'Task not found' }
            }

            const task = await prisma.task.update({
              where: { id: params.id },
              data: {
                title: body.title,
                description: body.description,
                project_id: body.projectId,
                assigned_to: body.assignedTo,
                priority: body.priority,
                status: body.status,
                due_date: body.dueDate !== undefined ? (body.dueDate ? new Date(body.dueDate) : null) : undefined,
                parent_task_id: body.parentTaskId,
                estimated_hours: body.estimatedHours,
                actual_hours: body.actualHours,
                tags: body.tags,
                is_recurring: body.isRecurring,
                recurrence_pattern: body.recurrencePattern,
              },
            })
            logActivity({
              userId: (authUser as AuthenticatedUser).id,
              action: 'UPDATE',
              entityType: 'Task',
              entityId: params.id,
              ipAddress: getIpAddress(headers),
            })
            return { task }
          },
          { body: updateTaskSchema }
        )
        .delete('/:id', async ({ params, authUser, headers, set }) => {
          const existing = await prisma.task.findUnique({ where: { id: params.id } })
          if (!existing) {
            set.status = 404
            return { error: 'Task not found' }
          }
          await prisma.task.delete({ where: { id: params.id } })
          logActivity({
            userId: (authUser as AuthenticatedUser).id,
            action: 'DELETE',
            entityType: 'Task',
            entityId: params.id,
            ipAddress: getIpAddress(headers),
          })
          return { success: true }
        })
        .get('/:id/comments', async ({ params, set }) => {
          const task = await prisma.task.findUnique({ where: { id: params.id } })
          if (!task) {
            set.status = 404
            return { error: 'Task not found' }
          }
          const comments = await prisma.taskComment.findMany({
            where: { task_id: params.id },
            include: {
              user: { select: { id: true, first_name: true, last_name: true } },
            },
            orderBy: { created_at: 'asc' },
          })
          return { data: comments }
        })
        .post(
          '/:id/comments',
          async ({ params, body, authUser, headers, set }) => {
            const task = await prisma.task.findUnique({ where: { id: params.id } })
            if (!task) {
              set.status = 404
              return { error: 'Task not found' }
            }
            const user = authUser as AuthenticatedUser
            const comment = await prisma.taskComment.create({
              data: {
                task_id: params.id,
                user_id: user.id,
                content: body.content,
              },
              include: {
                user: { select: { id: true, first_name: true, last_name: true } },
              },
            })
            logActivity({
              userId: user.id,
              action: 'CREATE',
              entityType: 'TaskComment',
              entityId: comment.id,
              ipAddress: getIpAddress(headers),
            })
            set.status = 201
            return { comment }
          },
          { body: createCommentSchema }
        )
  )
