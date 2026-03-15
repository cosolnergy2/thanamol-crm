import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { Users, Search, UserPlus, Shield, CheckCircle, AlertCircle } from 'lucide-react'
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

export const Route = createFileRoute('/_authenticated/settings/users')({
  component: SettingsUsersPage,
})

type UserEntry = {
  id: string
  email: string
  first_name: string
  last_name: string
  is_active: boolean
  roles: Array<{ id: string; name: string }>
  created_at: string
}

type Role = {
  id: string
  name: string
  description: string | null
}

function SettingsUsersPage() {
  const { currentUser } = useAuth()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteForm, setInviteForm] = useState({
    email: '',
    firstName: '',
    lastName: '',
    password: '',
    roleId: '',
  })
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [inviting, setInviting] = useState(false)

  const { data: usersData, isLoading: loadingUsers, refetch: refetchUsers } = useQuery({
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
    return matchesSearch && matchesStatus
  })

  const activeUsers = filtered.filter((u) => u.is_active)
  const inactiveUsers = filtered.filter((u) => !u.is_active)

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    setInviteError(null)

    if (!inviteForm.email || !inviteForm.firstName || !inviteForm.lastName || !inviteForm.password) {
      setInviteError('All fields are required')
      return
    }

    setInviting(true)
    try {
      await apiPost('/auth/register', {
        email: inviteForm.email,
        firstName: inviteForm.firstName,
        lastName: inviteForm.lastName,
        password: inviteForm.password,
      })

      toast.success('User created successfully')
      setInviteOpen(false)
      setInviteForm({ email: '', firstName: '', lastName: '', password: '', roleId: '' })
      refetchUsers()
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : 'Failed to create user')
    } finally {
      setInviting(false)
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
            onClick={() => setInviteOpen(true)}
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
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
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

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
            <DialogDescription>
              Create a new user account for the system.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleInvite}>
            <div className="space-y-3 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">First Name *</Label>
                  <Input
                    value={inviteForm.firstName}
                    onChange={(e) => setInviteForm({ ...inviteForm, firstName: e.target.value })}
                    placeholder="John"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Last Name *</Label>
                  <Input
                    value={inviteForm.lastName}
                    onChange={(e) => setInviteForm({ ...inviteForm, lastName: e.target.value })}
                    placeholder="Doe"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Email *</Label>
                <Input
                  type="email"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                  placeholder="john@company.com"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Password *</Label>
                <Input
                  type="password"
                  value={inviteForm.password}
                  onChange={(e) => setInviteForm({ ...inviteForm, password: e.target.value })}
                  placeholder="Minimum 8 characters"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Role (assign after creation)</Label>
                <Select
                  value={inviteForm.roleId}
                  onValueChange={(v) => setInviteForm({ ...inviteForm, roleId: v })}
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
              {inviteError && (
                <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded px-3 py-2">
                  {inviteError}
                </p>
              )}
            </div>
            <DialogFooter className="mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setInviteOpen(false)
                  setInviteError(null)
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-700"
                disabled={inviting}
              >
                {inviting ? 'Creating...' : 'Create User'}
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
}: {
  user: UserEntry
  isSelf: boolean
  onToggleStatus: () => void
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
          {user.roles.length > 0 && (
            <div className="flex gap-1 mt-0.5">
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
          )}
        </div>
      </div>
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
  )
}
