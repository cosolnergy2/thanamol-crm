import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import {
  Users,
  Search,
  UserPlus,
  Shield,
  CheckCircle,
  AlertCircle,
  KeyRound,
  Pencil,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { PageHeader } from '@/components/PageHeader'
import { apiGet, apiPost, apiPut } from '@/lib/api-client'
import { useAuth } from '@/providers/AuthProvider'
import { DEPARTMENTS } from '@thanamol/shared'

export const Route = createFileRoute('/_authenticated/settings/users')({
  component: SettingsUsersPage,
})

type UserEntry = {
  id: string
  email: string
  first_name: string
  last_name: string
  phone: string | null
  department: string | null
  position: string | null
  is_active: boolean
  roles: Array<{ id: string; name: string }>
  created_at: string
}

type Role = {
  id: string
  name: string
  description: string | null
}

const EMPTY_CREATE_FORM = {
  email: '',
  firstName: '',
  lastName: '',
  password: '',
  phone: '',
  department: '',
  position: '',
  roleId: '',
}

const EMPTY_EDIT_FORM = {
  firstName: '',
  lastName: '',
  phone: '',
  department: '',
  position: '',
  roleId: '',
  isActive: true,
}

function SettingsUsersPage() {
  const { currentUser } = useAuth()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [departmentFilter, setDepartmentFilter] = useState('all')

  const [createOpen, setCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState(EMPTY_CREATE_FORM)
  const [createError, setCreateError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  const [editUser, setEditUser] = useState<UserEntry | null>(null)
  const [editForm, setEditForm] = useState(EMPTY_EDIT_FORM)
  const [editError, setEditError] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)

  const [resetUser, setResetUser] = useState<UserEntry | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [resetError, setResetError] = useState<string | null>(null)
  const [resetting, setResetting] = useState(false)

  const {
    data: usersData,
    isLoading: loadingUsers,
    refetch: refetchUsers,
  } = useQuery({
    queryKey: ['settings-users'],
    queryFn: () => apiGet<{ users: UserEntry[] }>('/auth/users'),
  })

  const { data: rolesData } = useQuery({
    queryKey: ['roles'],
    queryFn: () => apiGet<{ roles: Role[] }>('/roles'),
  })

  const users = usersData?.users ?? []
  const roles = rolesData?.roles ?? []

  const filtered = users.filter((u) => {
    const q = search.toLowerCase()
    const matchesSearch =
      !search ||
      u.first_name.toLowerCase().includes(q) ||
      u.last_name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q)
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && u.is_active) ||
      (statusFilter === 'inactive' && !u.is_active)
    const matchesDepartment =
      departmentFilter === 'all' || u.department === departmentFilter
    return matchesSearch && matchesStatus && matchesDepartment
  })

  const activeUsers = filtered.filter((u) => u.is_active)
  const inactiveUsers = filtered.filter((u) => !u.is_active)

  function openEditDialog(user: UserEntry) {
    setEditUser(user)
    setEditForm({
      firstName: user.first_name,
      lastName: user.last_name,
      phone: user.phone ?? '',
      department: user.department ?? '',
      position: user.position ?? '',
      roleId: user.roles[0]?.id ?? '',
      isActive: user.is_active,
    })
    setEditError(null)
  }

  function openResetDialog(user: UserEntry) {
    setResetUser(user)
    setNewPassword('')
    setResetError(null)
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setCreateError(null)

    if (
      !createForm.email ||
      !createForm.firstName ||
      !createForm.lastName ||
      !createForm.password
    ) {
      setCreateError('Email, name, and password are required')
      return
    }

    setCreating(true)
    try {
      await apiPost('/auth/register', {
        email: createForm.email,
        firstName: createForm.firstName,
        lastName: createForm.lastName,
        password: createForm.password,
        phone: createForm.phone || undefined,
        department: createForm.department || undefined,
        position: createForm.position || undefined,
        roleId: createForm.roleId || undefined,
      })

      toast.success('User created successfully')
      setCreateOpen(false)
      setCreateForm(EMPTY_CREATE_FORM)
      refetchUsers()
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create user')
    } finally {
      setCreating(false)
    }
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editUser) return
    setEditError(null)
    setEditing(true)
    try {
      await apiPut(`/auth/users/${editUser.id}`, {
        firstName: editForm.firstName || undefined,
        lastName: editForm.lastName || undefined,
        phone: editForm.phone || null,
        department: editForm.department || null,
        position: editForm.position || null,
        roleId: editForm.roleId || null,
        isActive: editForm.isActive,
      })

      toast.success('User updated successfully')
      setEditUser(null)
      refetchUsers()
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Failed to update user')
    } finally {
      setEditing(false)
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault()
    if (!resetUser) return
    setResetError(null)

    if (!newPassword || newPassword.length < 6) {
      setResetError('Password must be at least 6 characters')
      return
    }

    setResetting(true)
    try {
      await apiPost(`/auth/users/${resetUser.id}/reset-password`, {
        newPassword,
      })
      toast.success('Password reset successfully')
      setResetUser(null)
    } catch (err) {
      setResetError(err instanceof Error ? err.message : 'Failed to reset password')
    } finally {
      setResetting(false)
    }
  }

  async function toggleUserStatus(user: UserEntry) {
    try {
      await apiPut(`/auth/users/${user.id}`, { isActive: !user.is_active })
      toast.success(`User ${user.is_active ? 'deactivated' : 'activated'}`)
      refetchUsers()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update user')
    }
  }

  return (
    <div className="space-y-3">
      <PageHeader
        title="Users"
        actions={
          <Button
            className="bg-indigo-600 hover:bg-indigo-700"
            size="sm"
            onClick={() => {
              setCreateOpen(true)
              setCreateError(null)
            }}
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Add User
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search by name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {DEPARTMENTS.map((dept) => (
                  <SelectItem key={dept} value={dept}>
                    {dept}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loadingUsers ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : (
            <div className="space-y-6">
              {activeUsers.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-100">
                    <CheckCircle className="w-4 h-4 text-teal-600" />
                    <h3 className="text-xs font-light text-slate-600">
                      Active ({activeUsers.length})
                    </h3>
                  </div>
                  <div className="space-y-2">
                    {activeUsers.map((user) => (
                      <UserRow
                        key={user.id}
                        user={user}
                        isSelf={currentUser?.id === user.id}
                        onToggleStatus={() => toggleUserStatus(user)}
                        onEdit={() => openEditDialog(user)}
                        onResetPassword={() => openResetDialog(user)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {inactiveUsers.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-100">
                    <AlertCircle className="w-4 h-4 text-slate-400" />
                    <h3 className="text-xs font-light text-slate-500">
                      Inactive ({inactiveUsers.length})
                    </h3>
                  </div>
                  <div className="space-y-2 opacity-60">
                    {inactiveUsers.map((user) => (
                      <UserRow
                        key={user.id}
                        user={user}
                        isSelf={false}
                        onToggleStatus={() => toggleUserStatus(user)}
                        onEdit={() => openEditDialog(user)}
                        onResetPassword={() => openResetDialog(user)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {filtered.length === 0 && (
                <div className="text-center py-10">
                  <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                  <p className="text-sm text-slate-500">No users found</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create User Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
            <DialogDescription>Create a new user account for the system.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate}>
            <div className="space-y-3 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">First Name *</Label>
                  <Input
                    value={createForm.firstName}
                    onChange={(e) => setCreateForm({ ...createForm, firstName: e.target.value })}
                    placeholder="John"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Last Name *</Label>
                  <Input
                    value={createForm.lastName}
                    onChange={(e) => setCreateForm({ ...createForm, lastName: e.target.value })}
                    placeholder="Doe"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Email *</Label>
                <Input
                  type="email"
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  placeholder="john@company.com"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Password *</Label>
                <Input
                  type="password"
                  value={createForm.password}
                  onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                  placeholder="Minimum 6 characters"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Phone</Label>
                <Input
                  value={createForm.phone}
                  onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                  placeholder="+66 8x-xxxx-xxxx"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Department</Label>
                  <Select
                    value={createForm.department}
                    onValueChange={(v) => setCreateForm({ ...createForm, department: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      {DEPARTMENTS.map((dept) => (
                        <SelectItem key={dept} value={dept}>
                          {dept}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Position</Label>
                  <Input
                    value={createForm.position}
                    onChange={(e) => setCreateForm({ ...createForm, position: e.target.value })}
                    placeholder="e.g. Manager"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Role</Label>
                <Select
                  value={createForm.roleId}
                  onValueChange={(v) => setCreateForm({ ...createForm, roleId: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select role..." />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((role) => (
                      <SelectItem key={role.id} value={role.id}>
                        {role.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {createError && (
                <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded px-3 py-2">
                  {createError}
                </p>
              )}
            </div>
            <DialogFooter className="mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setCreateOpen(false)
                  setCreateError(null)
                }}
              >
                Cancel
              </Button>
              <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700" disabled={creating}>
                {creating ? 'Creating...' : 'Create User'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={!!editUser} onOpenChange={(open) => !open && setEditUser(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>Update user profile and role assignment.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEdit}>
            <div className="space-y-3 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">First Name</Label>
                  <Input
                    value={editForm.firstName}
                    onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Last Name</Label>
                  <Input
                    value={editForm.lastName}
                    onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Phone</Label>
                <Input
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  placeholder="+66 8x-xxxx-xxxx"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Department</Label>
                  <Select
                    value={editForm.department}
                    onValueChange={(v) => setEditForm({ ...editForm, department: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      {DEPARTMENTS.map((dept) => (
                        <SelectItem key={dept} value={dept}>
                          {dept}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Position</Label>
                  <Input
                    value={editForm.position}
                    onChange={(e) => setEditForm({ ...editForm, position: e.target.value })}
                    placeholder="e.g. Manager"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Role</Label>
                <Select
                  value={editForm.roleId}
                  onValueChange={(v) => setEditForm({ ...editForm, roleId: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="No role assigned" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No role</SelectItem>
                    {roles.map((role) => (
                      <SelectItem key={role.id} value={role.id}>
                        {role.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Status</Label>
                <Select
                  value={editForm.isActive ? 'active' : 'inactive'}
                  onValueChange={(v) => setEditForm({ ...editForm, isActive: v === 'active' })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {editError && (
                <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded px-3 py-2">
                  {editError}
                </p>
              )}
            </div>
            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={() => setEditUser(null)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700" disabled={editing}>
                {editing ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={!!resetUser} onOpenChange={(open) => !open && setResetUser(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Set a new password for{' '}
              {resetUser ? `${resetUser.first_name} ${resetUser.last_name}` : 'this user'}.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleResetPassword}>
            <div className="space-y-3 py-2">
              <div className="space-y-1">
                <Label className="text-xs">New Password *</Label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                />
              </div>
              {resetError && (
                <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded px-3 py-2">
                  {resetError}
                </p>
              )}
            </div>
            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={() => setResetUser(null)}>
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-700"
                disabled={resetting}
              >
                {resetting ? 'Resetting...' : 'Reset Password'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function UserRow({
  user,
  isSelf,
  onToggleStatus,
  onEdit,
  onResetPassword,
}: {
  user: UserEntry
  isSelf: boolean
  onToggleStatus: () => void
  onEdit: () => void
  onResetPassword: () => void
}) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:bg-slate-50/50">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-teal-600 rounded-full flex items-center justify-center flex-shrink-0">
          <span className="text-white text-xs font-light">
            {user.first_name.charAt(0).toUpperCase()}
          </span>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <p className="text-[11px] font-light text-slate-800">
              {user.first_name} {user.last_name}
            </p>
            {isSelf && (
              <Badge
                variant="outline"
                className="text-[8px] h-3.5 px-1 bg-indigo-50 text-indigo-600 border-indigo-200 font-extralight"
              >
                You
              </Badge>
            )}
          </div>
          <p className="text-[9px] text-slate-400">{user.email}</p>
          <div className="flex gap-1 mt-0.5 flex-wrap">
            {user.department && (
              <Badge
                variant="outline"
                className="text-[8px] h-3.5 px-1 bg-teal-50 text-teal-700 border-teal-200 font-extralight"
              >
                {user.department}
              </Badge>
            )}
            {user.position && (
              <span className="text-[8px] text-slate-400">{user.position}</span>
            )}
            {user.roles.slice(0, 2).map((role) => (
              <Badge
                key={role.id}
                variant="outline"
                className="text-[8px] h-3.5 px-1 bg-slate-50 text-slate-600 border-slate-200 font-extralight"
              >
                <Shield className="w-2 h-2 mr-0.5" />
                {role.name}
              </Badge>
            ))}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          className="h-6 text-[10px] text-slate-500 hover:text-indigo-600"
          onClick={onEdit}
        >
          <Pencil className="w-3 h-3" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 text-[10px] text-slate-500 hover:text-amber-600"
          onClick={onResetPassword}
        >
          <KeyRound className="w-3 h-3" />
        </Button>
        {!isSelf && (
          <Button
            variant="ghost"
            size="sm"
            className={`h-6 text-[10px] ${
              user.is_active
                ? 'text-slate-500 hover:text-rose-600'
                : 'text-slate-400 hover:text-teal-600'
            }`}
            onClick={onToggleStatus}
          >
            {user.is_active ? 'Deactivate' : 'Activate'}
          </Button>
        )}
      </div>
    </div>
  )
}
