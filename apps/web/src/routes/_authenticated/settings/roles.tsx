import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { Shield, Plus, Pencil, Trash2, Lock, Users, ChevronDown } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { PageHeader } from '@/components/PageHeader'
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api-client'
import {
  PERMISSION_MODULES,
  PERMISSION_ACTIONS,
  ROLE_TEMPLATES,
  type GranularPermissions,
  type PermissionModule,
  type PermissionAction,
  type RoleTemplate,
} from '@thanamol/shared'

export const Route = createFileRoute('/_authenticated/settings/roles')({
  component: SettingsRolesPage,
})

type Role = {
  id: string
  name: string
  code: string | null
  description: string | null
  permissions: Record<string, unknown>
  is_system_role: boolean
  user_count: number
  created_at: string
}

type RoleForm = {
  name: string
  code: string
  description: string
  permissions: GranularPermissions
}

const EMPTY_PERMISSIONS: GranularPermissions = Object.fromEntries(
  PERMISSION_MODULES.map((m) => [
    m,
    Object.fromEntries(PERMISSION_ACTIONS.map((a) => [a, false])),
  ])
) as GranularPermissions

const EMPTY_FORM: RoleForm = {
  name: '',
  code: '',
  description: '',
  permissions: EMPTY_PERMISSIONS,
}

function toKebabCase(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function normalizePermissions(raw: Record<string, unknown>): GranularPermissions {
  const result: GranularPermissions = {}
  for (const module of PERMISSION_MODULES) {
    const modulePerms: Record<PermissionAction, boolean> = {} as Record<PermissionAction, boolean>
    const rawModule = raw[module]
    for (const action of PERMISSION_ACTIONS) {
      if (rawModule && typeof rawModule === 'object' && !Array.isArray(rawModule)) {
        modulePerms[action] = Boolean((rawModule as Record<string, unknown>)[action])
      } else {
        modulePerms[action] = false
      }
    }
    result[module] = modulePerms
  }
  return result
}

function countGrantedPermissions(permissions: GranularPermissions): number {
  let count = 0
  for (const module of PERMISSION_MODULES) {
    const modulePerms = permissions[module]
    if (!modulePerms) continue
    for (const action of PERMISSION_ACTIONS) {
      if (modulePerms[action]) count++
    }
  }
  return count
}

function applyTemplate(template: RoleTemplate): GranularPermissions {
  return normalizePermissions(template.permissions as Record<string, unknown>)
}

function PermissionMatrix({
  permissions,
  onChange,
  disabled,
}: {
  permissions: GranularPermissions
  onChange: (permissions: GranularPermissions) => void
  disabled?: boolean
}) {
  function toggleCell(module: PermissionModule, action: PermissionAction) {
    if (disabled) return
    const current = permissions[module]?.[action] ?? false
    onChange({
      ...permissions,
      [module]: {
        ...permissions[module],
        [action]: !current,
      },
    })
  }

  function toggleRow(module: PermissionModule) {
    if (disabled) return
    const allOn = PERMISSION_ACTIONS.every((a) => permissions[module]?.[a])
    onChange({
      ...permissions,
      [module]: Object.fromEntries(PERMISSION_ACTIONS.map((a) => [a, !allOn])),
    })
  }

  function toggleColumn(action: PermissionAction) {
    if (disabled) return
    const allOn = PERMISSION_MODULES.every((m) => permissions[m]?.[action])
    const updated = { ...permissions }
    for (const module of PERMISSION_MODULES) {
      updated[module] = { ...updated[module], [action]: !allOn }
    }
    onChange(updated)
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[10px] border-collapse">
        <thead>
          <tr>
            <th className="text-left py-1.5 px-2 text-slate-400 font-normal w-32">Module</th>
            {PERMISSION_ACTIONS.map((action) => (
              <th key={action} className="py-1.5 px-1 text-center">
                <button
                  type="button"
                  onClick={() => toggleColumn(action)}
                  disabled={disabled}
                  className="text-slate-400 capitalize hover:text-indigo-600 disabled:cursor-default transition-colors"
                >
                  {action}
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {PERMISSION_MODULES.map((module, idx) => (
            <tr
              key={module}
              className={idx % 2 === 0 ? 'bg-slate-50/50' : 'bg-white'}
            >
              <td className="py-1.5 px-2">
                <button
                  type="button"
                  onClick={() => toggleRow(module)}
                  disabled={disabled}
                  className="text-slate-700 capitalize hover:text-indigo-600 disabled:cursor-default transition-colors font-light"
                >
                  {module}
                </button>
              </td>
              {PERMISSION_ACTIONS.map((action) => (
                <td key={action} className="py-1.5 px-1 text-center">
                  <Checkbox
                    checked={permissions[module]?.[action] ?? false}
                    onCheckedChange={() => toggleCell(module, action)}
                    disabled={disabled}
                    className="h-3.5 w-3.5"
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function SettingsRolesPage() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingRole, setEditingRole] = useState<Role | null>(null)
  const [form, setForm] = useState<RoleForm>(EMPTY_FORM)
  const [formError, setFormError] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Role | null>(null)

  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['roles'],
    queryFn: () => apiGet<{ roles: Role[] }>('/roles'),
  })

  const roles = data?.roles ?? []

  const createRole = useMutation({
    mutationFn: (payload: RoleForm) => apiPost<{ role: Role }>('/roles', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] })
      toast.success('Role created')
      closeDialog()
    },
    onError: (err) => setFormError(err instanceof Error ? err.message : 'Failed to create role'),
  })

  const updateRole = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<RoleForm> }) =>
      apiPut<{ role: Role }>(`/roles/${id}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] })
      queryClient.invalidateQueries({ queryKey: ['permissions'] })
      toast.success('Role updated — sidebar will refresh')
      closeDialog()
    },
    onError: (err) => setFormError(err instanceof Error ? err.message : 'Failed to update role'),
  })

  const deleteRole = useMutation({
    mutationFn: (id: string) => apiDelete<{ success: boolean }>(`/roles/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] })
      toast.success('Role deleted')
      setDeleteTarget(null)
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : 'Failed to delete role'),
  })

  function openCreateDialog() {
    setEditingRole(null)
    setForm(EMPTY_FORM)
    setFormError(null)
    setDialogOpen(true)
  }

  function openEditDialog(role: Role) {
    setEditingRole(role)
    setForm({
      name: role.name,
      code: role.code ?? '',
      description: role.description ?? '',
      permissions: normalizePermissions(role.permissions),
    })
    setFormError(null)
    setDialogOpen(true)
  }

  function closeDialog() {
    setDialogOpen(false)
    setEditingRole(null)
    setForm(EMPTY_FORM)
    setFormError(null)
  }

  function handleNameChange(name: string) {
    setForm((prev) => ({
      ...prev,
      name,
      code: prev.code === toKebabCase(prev.name) || prev.code === '' ? toKebabCase(name) : prev.code,
    }))
  }

  function applyRoleTemplate(template: RoleTemplate) {
    setForm((prev) => ({
      ...prev,
      permissions: applyTemplate(template),
    }))
    toast.info(`Applied "${template.name}" template`)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)
    if (!form.name.trim()) {
      setFormError('Role name is required')
      return
    }
    if (editingRole) {
      updateRole.mutate({ id: editingRole.id, payload: form })
    } else {
      createRole.mutate(form)
    }
  }

  const isMutating = createRole.isPending || updateRole.isPending
  const isEditingSystemRole = editingRole?.is_system_role === true

  return (
    <div className="space-y-3">
      <PageHeader
        title="Roles"
        actions={
          <Button
            className="bg-indigo-600 hover:bg-indigo-700"
            size="sm"
            onClick={openCreateDialog}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Role
          </Button>
        }
      />

      <Card>
        <CardContent className="pt-4">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : roles.length === 0 ? (
            <div className="text-center py-10">
              <Shield className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm text-slate-500">No roles yet. Create the first one.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {roles.map((role) => {
                const permCount = countGrantedPermissions(
                  normalizePermissions(role.permissions)
                )
                return (
                  <div
                    key={role.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:bg-slate-50/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-teal-600 rounded-md flex items-center justify-center shrink-0">
                        {role.is_system_role ? (
                          <Lock className="w-4 h-4 text-white" />
                        ) : (
                          <Shield className="w-4 h-4 text-white" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="text-[11px] font-light text-slate-800">{role.name}</p>
                          {role.is_system_role && (
                            <Badge
                              variant="outline"
                              className="text-[8px] h-3.5 px-1 bg-amber-50 text-amber-600 border-amber-200 font-extralight"
                            >
                              system
                            </Badge>
                          )}
                        </div>
                        {role.description && (
                          <p className="text-[9px] text-slate-400">{role.description}</p>
                        )}
                        <div className="flex items-center gap-1 mt-0.5">
                          <Badge
                            variant="outline"
                            className="text-[8px] h-3.5 px-1 bg-slate-50 text-slate-500 border-slate-200 font-extralight"
                          >
                            {permCount} permission{permCount !== 1 ? 's' : ''}
                          </Badge>
                          <Badge
                            variant="outline"
                            className="text-[8px] h-3.5 px-1 bg-slate-50 text-slate-500 border-slate-200 font-extralight flex items-center gap-0.5"
                          >
                            <Users className="w-2 h-2" />
                            {role.user_count}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => openEditDialog(role)}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                        onClick={() => setDeleteTarget(role)}
                        disabled={role.is_system_role}
                        title={role.is_system_role ? 'System roles cannot be deleted' : undefined}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingRole ? 'Edit Role' : 'Create Role'}</DialogTitle>
            <DialogDescription>
              {editingRole
                ? isEditingSystemRole
                  ? 'System roles: permissions can be changed, but name and code are locked.'
                  : 'Update role name and permissions'
                : 'Define a new role with permissions'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs">Role Name *</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="e.g. Sales Manager"
                    disabled={isEditingSystemRole}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Code</Label>
                  <Input
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value })}
                    placeholder="e.g. sales-manager"
                    disabled={isEditingSystemRole}
                  />
                  <p className="text-[9px] text-slate-400">Auto-generated from name. Unique identifier.</p>
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Description</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Role description"
                  rows={1}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-xs text-slate-500">Permissions Matrix</Label>
                  {!editingRole && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="h-6 text-[10px] gap-1">
                          Start from template
                          <ChevronDown className="w-3 h-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {ROLE_TEMPLATES.map((template) => (
                          <DropdownMenuItem
                            key={template.name}
                            onSelect={() => applyRoleTemplate(template)}
                            className="text-xs"
                          >
                            <div>
                              <p className="font-medium">{template.name}</p>
                              <p className="text-[9px] text-slate-400">{template.description}</p>
                            </div>
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
                <div className="border border-slate-100 rounded-lg p-2">
                  <PermissionMatrix
                    permissions={form.permissions}
                    onChange={(permissions) => setForm({ ...form, permissions })}
                    disabled={false}
                  />
                </div>
              </div>

              {formError && (
                <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded px-3 py-2">
                  {formError}
                </p>
              )}
            </div>
            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={closeDialog}>
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-700"
                disabled={isMutating}
              >
                {isMutating ? 'Saving...' : 'Save Role'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Role</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{deleteTarget?.name}</strong>? This cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleteRole.isPending}
              onClick={() => deleteTarget && deleteRole.mutate(deleteTarget.id)}
            >
              {deleteRole.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
