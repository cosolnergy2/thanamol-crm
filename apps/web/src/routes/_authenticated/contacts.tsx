import { createFileRoute } from '@tanstack/react-router'
import { useState, useMemo } from 'react'
import { Plus, Search, Phone, Mail, User, CheckCircle2, Building2 } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { PageHeader } from '@/components/PageHeader'
import { useContacts, useCreateContact } from '@/hooks/useContacts'
import { useCustomers } from '@/hooks/useCustomers'
import type { CreateContactRequest } from '@thanamol/shared'

export const Route = createFileRoute('/_authenticated/contacts')({
  component: ContactListPage,
})

type ContactFormValues = {
  customerId: string
  firstName: string
  lastName: string
  email: string
  phone: string
  position: string
  lineId: string
  isPrimary: boolean
  isDecisionMaker: boolean
}

const EMPTY_FORM: ContactFormValues = {
  customerId: '',
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  position: '',
  lineId: '',
  isPrimary: false,
  isDecisionMaker: false,
}

function ContactListPage() {
  const [search, setSearch] = useState('')
  const [customerFilter, setCustomerFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState<ContactFormValues>(EMPTY_FORM)
  const [formError, setFormError] = useState<string | null>(null)

  const { data: contactsData, isLoading, isError } = useContacts({ page, limit: 50 })
  const { data: customersData } = useCustomers({ limit: 200 })
  const createContact = useCreateContact()

  const customers = customersData?.data ?? []
  const allContacts = contactsData?.data ?? []

  const filteredContacts = useMemo(() => {
    return allContacts.filter((contact) => {
      const fullName = `${contact.first_name} ${contact.last_name}`.toLowerCase()
      const matchesSearch =
        !search ||
        fullName.includes(search.toLowerCase()) ||
        contact.phone?.includes(search) ||
        contact.email?.toLowerCase().includes(search.toLowerCase()) ||
        contact.position?.toLowerCase().includes(search.toLowerCase())

      const matchesCustomer =
        customerFilter === 'all' || contact.customer_id === customerFilter

      return matchesSearch && matchesCustomer
    })
  }, [allContacts, search, customerFilter])

  function getCustomerName(customerId: string): string {
    const c = customers.find((cu) => cu.id === customerId)
    return c?.name ?? 'Unknown'
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)

    if (!form.customerId) {
      setFormError('Please select a customer')
      return
    }
    if (!form.firstName.trim()) {
      setFormError('First name is required')
      return
    }

    const payload: CreateContactRequest = {
      customerId: form.customerId,
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: form.email || undefined,
      phone: form.phone || undefined,
      position: form.position || undefined,
      lineId: form.lineId || undefined,
      isPrimary: form.isPrimary,
      isDecisionMaker: form.isDecisionMaker,
    }

    try {
      await createContact.mutateAsync(payload)
      toast.success('Contact created successfully')
      setDialogOpen(false)
      setForm(EMPTY_FORM)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to create contact')
    }
  }

  const totalPages = contactsData?.pagination.totalPages ?? 1

  return (
    <div className="space-y-3">
      <PageHeader
        title="Contacts"
        actions={
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-indigo-600 hover:bg-indigo-700">
                <Plus className="w-4 h-4 mr-2" />
                Add Contact
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add New Contact</DialogTitle>
                <DialogDescription>
                  Fill in contact details and link to a customer.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit}>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="customerId">
                      Customer <span className="text-rose-500">*</span>
                    </Label>
                    <Select
                      value={form.customerId}
                      onValueChange={(v) => setForm({ ...form, customerId: v })}
                    >
                      <SelectTrigger id="customerId">
                        <SelectValue placeholder="Select customer" />
                      </SelectTrigger>
                      <SelectContent>
                        {customers.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">
                        First Name <span className="text-rose-500">*</span>
                      </Label>
                      <Input
                        id="firstName"
                        value={form.firstName}
                        onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                        placeholder="John"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input
                        id="lastName"
                        value={form.lastName}
                        onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                        placeholder="Smith"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="position">Position</Label>
                    <Input
                      id="position"
                      value={form.position}
                      onChange={(e) => setForm({ ...form, position: e.target.value })}
                      placeholder="Purchasing Manager"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                        placeholder="081-234-5678"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        placeholder="contact@example.com"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="lineId">LINE ID</Label>
                    <Input
                      id="lineId"
                      value={form.lineId}
                      onChange={(e) => setForm({ ...form, lineId: e.target.value })}
                      placeholder="@line-id"
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="isDecisionMaker"
                      checked={form.isDecisionMaker}
                      onChange={(e) => setForm({ ...form, isDecisionMaker: e.target.checked })}
                      className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                    />
                    <Label htmlFor="isDecisionMaker" className="cursor-pointer">
                      Decision Maker
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="isPrimary"
                      checked={form.isPrimary}
                      onChange={(e) => setForm({ ...form, isPrimary: e.target.checked })}
                      className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                    />
                    <Label htmlFor="isPrimary" className="cursor-pointer">
                      Primary contact
                    </Label>
                  </div>

                  {formError && (
                    <p className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded px-3 py-2">
                      {formError}
                    </p>
                  )}
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setDialogOpen(false)
                      setForm(EMPTY_FORM)
                      setFormError(null)
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="bg-indigo-600 hover:bg-indigo-700"
                    disabled={createContact.isPending}
                  >
                    {createContact.isPending ? 'Saving...' : 'Save'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search name, position, phone, email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={customerFilter} onValueChange={setCustomerFilter}>
              <SelectTrigger className="w-full md:w-64">
                <SelectValue placeholder="Filter by customer" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Customers</SelectItem>
                {customers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-100">
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                  Contact
                </TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                  Position
                </TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                  Customer
                </TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                  Contact Info
                </TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                  Flags
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
                    <p className="text-slate-600">
                      Failed to load contacts. Please refresh and try again.
                    </p>
                  </TableCell>
                </TableRow>
              ) : filteredContacts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <div className="flex flex-col items-center">
                      <User className="w-12 h-12 text-slate-300 mb-3" />
                      <p className="text-slate-600">No contacts found</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredContacts.map((contact) => (
                  <TableRow
                    key={contact.id}
                    className="hover:bg-slate-50/50 border-slate-100"
                  >
                    <TableCell className="py-3">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-indigo-500 to-teal-600 rounded-full flex items-center justify-center">
                          <User className="w-4 h-4 text-white" />
                        </div>
                        <div className="ml-2.5">
                          <p className="font-light text-slate-800 text-[11px]">
                            {contact.first_name} {contact.last_name}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-3">
                      <span className="text-[11px] text-slate-700 font-light">
                        {contact.position || '-'}
                      </span>
                    </TableCell>
                    <TableCell className="py-3">
                      <div className="flex items-center text-[11px] text-slate-700 font-light">
                        <Building2 className="w-3.5 h-3.5 mr-1 text-slate-400" />
                        {getCustomerName(contact.customer_id)}
                      </div>
                    </TableCell>
                    <TableCell className="py-3">
                      <div className="space-y-0.5">
                        {contact.phone && (
                          <div className="flex items-center text-[10px] text-slate-500 font-extralight">
                            <Phone className="w-3 h-3 mr-1" />
                            {contact.phone}
                          </div>
                        )}
                        {contact.email && (
                          <div className="flex items-center text-[10px] text-slate-500 font-extralight">
                            <Mail className="w-3 h-3 mr-1" />
                            {contact.email}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="py-3">
                      <div className="flex flex-wrap gap-1">
                        {contact.is_primary && (
                          <Badge
                            variant="outline"
                            className="bg-indigo-50 text-indigo-700 border-indigo-200 text-[9px] h-4 px-1.5 font-extralight"
                          >
                            <CheckCircle2 className="w-3 h-3 mr-0.5" />
                            Primary
                          </Badge>
                        )}
                        {contact.is_decision_maker && (
                          <Badge
                            variant="outline"
                            className="bg-teal-50 text-teal-700 border-teal-200 text-[9px] h-4 px-1.5 font-extralight"
                          >
                            Decision Maker
                          </Badge>
                        )}
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
            Page {page} of {totalPages}
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
