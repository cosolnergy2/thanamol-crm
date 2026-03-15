import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { Building2, Search, Phone, Mail, Globe, Pencil } from 'lucide-react'
import { toast } from 'sonner'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { PageHeader } from '@/components/PageHeader'
import { useCompanies, useUpdateCompany } from '@/hooks/useCompanies'
import type { Company } from '@thanamol/shared'

export const Route = createFileRoute('/_authenticated/finance/companies')({
  component: FinanceCompaniesPage,
})

const FINANCE_INDUSTRY = 'Finance'

const editCompanySchema = z.object({
  name: z.string().min(1, 'Company name is required'),
  taxId: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  website: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
})

type EditCompanyFormData = z.infer<typeof editCompanySchema>

function FinanceCompaniesPage() {
  const [search, setSearch] = useState('')
  const [editTarget, setEditTarget] = useState<Company | null>(null)
  const [page, setPage] = useState(1)

  const { data, isLoading, isError } = useCompanies({
    page,
    limit: 20,
    industry: FINANCE_INDUSTRY,
    search: search || undefined,
  })

  const updateCompany = useUpdateCompany()

  const form = useForm<EditCompanyFormData>({
    resolver: zodResolver(editCompanySchema),
  })

  function openEdit(company: Company) {
    setEditTarget(company)
    form.reset({
      name: company.name,
      taxId: company.tax_id ?? '',
      phone: company.phone ?? '',
      email: company.email ?? '',
      website: company.website ?? '',
      address: company.address ?? '',
      notes: company.notes ?? '',
    })
  }

  async function onEditSubmit(values: EditCompanyFormData) {
    if (!editTarget) return
    try {
      await updateCompany.mutateAsync({
        id: editTarget.id,
        data: {
          name: values.name,
          taxId: values.taxId || undefined,
          phone: values.phone || undefined,
          email: values.email || undefined,
          website: values.website || undefined,
          address: values.address || undefined,
          notes: values.notes || undefined,
        },
      })
      toast.success('Company updated')
      setEditTarget(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update company')
    }
  }

  const companies = data?.data ?? []
  const totalPages = data?.pagination.totalPages ?? 1

  return (
    <div className="space-y-3">
      <PageHeader title="Finance Companies" />

      <Card>
        <CardContent className="pt-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search company name, tax ID, contact..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4">
          <p className="text-[11px] text-slate-400 font-extralight mb-4">
            Showing {companies.length} finance company {companies.length === 1 ? 'record' : 'records'}
          </p>
          <Table>
            <TableHeader>
              <TableRow className="border-slate-100">
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                  Company
                </TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                  Contact
                </TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                  Tax ID
                </TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                  Status
                </TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={5}>
                      <Skeleton className="h-10 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : isError ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <p className="text-slate-600">Failed to load companies. Please refresh.</p>
                  </TableCell>
                </TableRow>
              ) : companies.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-600">
                      {search ? 'No companies match your search' : 'No finance companies found'}
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                companies.map((company) => (
                  <TableRow key={company.id} className="hover:bg-slate-50/50 border-slate-100">
                    <TableCell className="py-3">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-indigo-500 to-teal-500 rounded-lg flex items-center justify-center mr-3">
                          <Building2 className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <p className="font-light text-slate-800 text-[11px]">{company.name}</p>
                          {company.address && (
                            <p className="text-[10px] text-slate-400 font-extralight truncate max-w-48">
                              {company.address}
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-3">
                      <div className="space-y-1">
                        {company.phone && (
                          <div className="flex items-center text-[10px] text-slate-600 font-extralight">
                            <Phone className="w-3 h-3 mr-1 text-slate-400" />
                            {company.phone}
                          </div>
                        )}
                        {company.email && (
                          <div className="flex items-center text-[10px] text-slate-600 font-extralight">
                            <Mail className="w-3 h-3 mr-1 text-slate-400" />
                            {company.email}
                          </div>
                        )}
                        {company.website && (
                          <div className="flex items-center text-[10px] text-slate-600 font-extralight">
                            <Globe className="w-3 h-3 mr-1 text-slate-400" />
                            <a
                              href={company.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="hover:underline"
                            >
                              {company.website}
                            </a>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-[11px] font-extralight text-slate-500 py-3">
                      {company.tax_id ?? '—'}
                    </TableCell>
                    <TableCell className="py-3">
                      <span
                        className={`text-[10px] font-extralight px-2 py-0.5 rounded-full border ${
                          company.status === 'ACTIVE'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                      >
                        {company.status}
                      </span>
                    </TableCell>
                    <TableCell className="py-3">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0"
                        onClick={() => openEdit(company)}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
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

      {/* Edit Dialog */}
      <Dialog open={!!editTarget} onOpenChange={() => setEditTarget(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Company</DialogTitle>
            <DialogDescription>Update company details.</DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onEditSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-2">
                <Label htmlFor="name">Company Name *</Label>
                <Input id="name" {...form.register('name')} />
                {form.formState.errors.name && (
                  <p className="text-xs text-rose-600">{form.formState.errors.name.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="taxId">Tax ID</Label>
                <Input id="taxId" {...form.register('taxId')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" {...form.register('phone')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" {...form.register('email')} />
                {form.formState.errors.email && (
                  <p className="text-xs text-rose-600">{form.formState.errors.email.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input id="website" {...form.register('website')} />
              </div>
              <div className="col-span-2 space-y-2">
                <Label htmlFor="address">Address</Label>
                <Textarea id="address" {...form.register('address')} rows={2} />
              </div>
              <div className="col-span-2 space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea id="notes" {...form.register('notes')} rows={2} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditTarget(null)}>
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-700"
                disabled={updateCompany.isPending}
              >
                {updateCompany.isPending ? 'Saving...' : 'Save'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
