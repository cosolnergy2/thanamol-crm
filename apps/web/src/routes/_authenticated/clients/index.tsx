import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Search, UserCircle, Pencil, Trash2, Mail, Shield } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/PageHeader'
import { useClients, useCreateClient, useUpdateClient, useDeleteClient } from '@/hooks/useClients'
import type { ClientUser } from '@thanamol/shared'

export const Route = createFileRoute('/_authenticated/clients/')({
  component: ClientManagementPage,
})

const PAGE_SIZE = 20

const createClientSchema = z.object({
  customerId: z.string().min(1, 'Customer ID is required'),
  email: z.string().email('Valid email required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  isActive: z.boolean().optional(),
})

const editClientSchema = z.object({
  email: z.string().email('Valid email required').optional(),
  password: z.string().min(6, 'Password must be at least 6 characters').optional().or(z.literal('')),
  firstName: z.string().min(1, 'First name is required').optional(),
  lastName: z.string().min(1, 'Last name is required').optional(),
  isActive: z.boolean().optional(),
})

type CreateClientFormValues = z.infer<typeof createClientSchema>
type EditClientFormValues = z.infer<typeof editClientSchema>

function ClientManagementPage() {
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)
  const [createOpen, setCreateOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<ClientUser | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; email: string } | null>(null)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 400)
    return () => clearTimeout(timer)
  }, [search])

  const { data, isLoading, isError } = useClients({
    page,
    limit: PAGE_SIZE,
    search: debouncedSearch || undefined,
  })

  const createClient = useCreateClient()
  const updateClient = useUpdateClient()
  const deleteClient = useDeleteClient()

  const createForm = useForm<CreateClientFormValues>({
    resolver: zodResolver(createClientSchema),
    defaultValues: { isActive: true },
  })

  const editForm = useForm<EditClientFormValues>({
    resolver: zodResolver(editClientSchema),
  })

  function openEdit(client: ClientUser) {
    setEditTarget(client)
    editForm.reset({
      email: client.email,
      firstName: client.first_name,
      lastName: client.last_name,
      isActive: client.is_active,
      password: '',
    })
  }

  async function handleCreate(values: CreateClientFormValues) {
    try {
      await createClient.mutateAsync(values)
      toast.success('Client account created')
      setCreateOpen(false)
      createForm.reset()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create client')
    }
  }

  async function handleEdit(values: EditClientFormValues) {
    if (!editTarget) return
    const payload: Record<string, unknown> = {}
    if (values.email) payload.email = values.email
    if (values.firstName) payload.firstName = values.firstName
    if (values.lastName) payload.lastName = values.lastName
    if (values.isActive !== undefined) payload.isActive = values.isActive
    if (values.password) payload.password = values.password

    try {
      await updateClient.mutateAsync({ id: editTarget.id, data: payload })
      toast.success('Client account updated')
      setEditTarget(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update client')
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    try {
      await deleteClient.mutateAsync(deleteTarget.id)
      toast.success('Client account deleted')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete client')
    } finally {
      setDeleteTarget(null)
    }
  }

  const clients = data?.data ?? []
  const totalPages = data?.pagination.totalPages ?? 1

  return (
    <div className="space-y-3">
      <PageHeader
        title="Client Accounts"
        actions={
          <Button
            className="bg-indigo-600 hover:bg-indigo-700"
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Client
          </Button>
        }
      />

      <Card>
        <CardContent className="pt-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-100">
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                  Client
                </TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                  Email
                </TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                  Customer
                </TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                  Status
                </TableHead>
                <TableHead className="text-center text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={5}>
                      <Skeleton className="h-8 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : isError ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <p className="text-slate-600">Failed to load clients. Please refresh.</p>
                  </TableCell>
                </TableRow>
              ) : clients.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <div className="flex flex-col items-center">
                      <UserCircle className="w-12 h-12 text-slate-300 mb-3" />
                      <p className="text-slate-600">No client accounts found</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                clients.map((client) => (
                  <TableRow key={client.id} className="hover:bg-slate-50/50 border-slate-100">
                    <TableCell className="py-3">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-indigo-500 to-teal-600 rounded-lg flex items-center justify-center">
                          <UserCircle className="w-4 h-4 text-white" />
                        </div>
                        <div className="ml-2.5">
                          <p className="font-light text-slate-800 text-[11px]">
                            {client.first_name} {client.last_name}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-3">
                      <div className="flex items-center text-[10px] text-slate-500 font-extralight">
                        <Mail className="w-3 h-3 mr-1" />
                        {client.email}
                      </div>
                    </TableCell>
                    <TableCell className="py-3">
                      <p className="text-[10px] text-slate-500 font-extralight">
                        {client.customer?.name ?? client.customer_id}
                      </p>
                    </TableCell>
                    <TableCell className="py-3">
                      <Badge
                        variant={client.is_active ? 'default' : 'secondary'}
                        className={
                          client.is_active
                            ? 'bg-teal-50 text-teal-700 border border-teal-200 text-[10px] font-extralight'
                            : 'bg-slate-100 text-slate-500 text-[10px] font-extralight'
                        }
                      >
                        <Shield className="w-2.5 h-2.5 mr-1" />
                        {client.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center py-3">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0"
                          onClick={() => openEdit(client)}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                          onClick={() => setDeleteTarget({ id: client.id, email: client.email })}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

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

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={(open) => { setCreateOpen(open); if (!open) createForm.reset() }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Client Account</DialogTitle>
            <DialogDescription>Create a portal account for a customer.</DialogDescription>
          </DialogHeader>
          <Form {...createForm}>
            <form onSubmit={createForm.handleSubmit(handleCreate)} className="space-y-3">
              <FormField
                control={createForm.control}
                name="customerId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer ID</FormLabel>
                    <FormControl>
                      <Input placeholder="Customer ID" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={createForm.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name</FormLabel>
                      <FormControl>
                        <Input placeholder="First name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createForm.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Last name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={createForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="Email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Min. 6 characters" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => { setCreateOpen(false); createForm.reset() }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-700"
                  disabled={createClient.isPending}
                >
                  {createClient.isPending ? 'Creating...' : 'Create'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editTarget} onOpenChange={(open) => { if (!open) setEditTarget(null) }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Client Account</DialogTitle>
            <DialogDescription>Update client portal account details.</DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(handleEdit)} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={editForm.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name</FormLabel>
                      <FormControl>
                        <Input placeholder="First name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Last name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={editForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="Email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Password (optional)</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Leave blank to keep current" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" onClick={() => setEditTarget(null)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-700"
                  disabled={updateClient.isPending}
                >
                  {updateClient.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Client Account</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the account for{' '}
              <strong>{deleteTarget?.email}</strong>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleteClient.isPending}
            >
              {deleteClient.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
