import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { Shield, Plus, Pencil, Trash2 } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { PageHeader } from '@/components/PageHeader'
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api-client'

export const Route = createFileRoute('/_authenticated/settings/roles')({
  component: SettingsRolesPage,
})

type Role = {
  id: string
  name: string
  description: string | null
  permissions: Record<string, boolean>
  created_at: string
}

const PERMISSION_GROUPS: Array<{ group: string; items: Array<{ key: string; label: string }> }> = [
  {
    group: 'CRM',
    items: [
      { key: 'view_customers', label: 'View Customers' },
      { key: 'manage_customers', label: 'Manage Customers' },
      { key: 'view_leads', label: 'View Leads' },
      { key: 'manage_leads', label: 'Manage Leads' },
    ],
  },
  {
    group: 'Sales',
    items: [
      { key: 'view_deals', label: 'View Deals' },
      { key: 'manage_deals', label: 'Manage Deals' },
      { key: 'manage_contracts', label: 'Manage Contracts' },
    ],
  },
  {
    group: 'Finance',
    items: [
      { key: 'view_invoices', label: 'View Invoices' },
      { key: 'manage_invoices', label: 'Manage Invoices' },
    ],
  },
  {
    group: 'System',
    items: [
      { key: 'manage_roles', label: 'Manage Roles' },
      { key: 'manage_users', label: 'Manage Users' },
      { key: 'view_reports', label: 'View Reports' },
    ],
  },
]

type RoleForm = {
  name: string
  description: string
  permissions: Record<string, boolean>
}

const EMPTY_FORM: RoleForm = { name: '', description: '', permissions: {} }

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
      toast.success('Role updated')
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
      description: role.description ?? '',
      permissions: role.permissions ?? {},
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

  function togglePermission(key: string) {
    setForm((prev) => ({
      ...prev,
      permissions: { ...prev.permissions, [key]: !prev.permissions[key] },
    }))
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
                const permCount = Object.values(role.permissions).filter(Boolean).length
                return (
                  <div
                    key={role.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:bg-slate-50/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-teal-600 rounded-md flex items-center justify-center">
                        <Shield className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <p className="text-[11px] font-light text-slate-800">{role.name}</p>
                        {role.description && (
                          <p className="text-[9px] text-slate-400">{role.description}</p>
                        )}
                        <Badge
                          variant="outline"
                          className="text-[8px] h-3.5 px-1 bg-slate-50 text-slate-500 border-slate-200 mt-0.5 font-extralight"
                        >
                          {permCount} permission{permCount !== 1 ? 's' : ''}
                        </Badge>
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingRole ? 'Edit Role' : 'Create Role'}</DialogTitle>
            <DialogDescription>
              {editingRole ? 'Update role name and permissions' : 'Define a new role with permissions'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs">Role Name *</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. Sales Manager"
                  />
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
              </div>

              <div>
                <Label className="text-xs text-slate-500 mb-3 block">Permissions</Label>
                <div className="space-y-4">
                  {PERMISSION_GROUPS.map((group) => (
                    <div key={group.group}>
                      <p className="text-[10px] font-extralight text-slate-400 uppercase tracking-widest mb-2">
                        {group.group}
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {group.items.map((perm) => (
                          <div
                            key={perm.key}
                            className="flex items-center justify-between p-2 rounded-lg border border-slate-100 bg-slate-50/50"
                          >
                            <span className="text-[11px] text-slate-700 font-light">
                              {perm.label}
                            </span>
                            <Switch
                              checked={!!form.permissions[perm.key]}
                              onCheckedChange={() => togglePermission(perm.key)}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
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
