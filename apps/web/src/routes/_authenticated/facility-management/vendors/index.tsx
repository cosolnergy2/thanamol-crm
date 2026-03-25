import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { z } from 'zod'
import { Plus, Search, Briefcase, Star, Phone, Mail, Pencil, Trash2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useVendors, useDeleteVendor } from '@/hooks/useVendors'
import { VENDOR_CATEGORIES } from '@thanamol/shared'
import type { VendorStatus } from '@thanamol/shared'

const searchSchema = z.object({
  status: z.string().optional(),
  category: z.string().optional(),
  search: z.string().optional(),
})

export const Route = createFileRoute('/_authenticated/facility-management/vendors/')({
  validateSearch: searchSchema,
  component: VendorListPage,
})

const STATUS_COLORS: Record<VendorStatus, string> = {
  ACTIVE: 'bg-emerald-100 text-emerald-700',
  INACTIVE: 'bg-slate-100 text-slate-600',
  BLACKLISTED: 'bg-red-100 text-red-700',
  PENDING_APPROVAL: 'bg-amber-100 text-amber-700',
}

const STATUS_LABELS: Record<VendorStatus, string> = {
  ACTIVE: 'Active',
  INACTIVE: 'Inactive',
  BLACKLISTED: 'Blacklisted',
  PENDING_APPROVAL: 'Pending',
}

function VendorListPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [page, setPage] = useState(1)

  const { data, isLoading } = useVendors({
    page,
    limit: 20,
    status: statusFilter !== 'all' ? (statusFilter as VendorStatus) : 'all',
    category: categoryFilter !== 'all' ? categoryFilter : undefined,
    search: search || undefined,
  })

  const deleteVendor = useDeleteVendor()

  const vendors = data?.data ?? []
  const pagination = data?.pagination

  const handleDelete = (id: string, name: string) => {
    if (!confirm(`Delete vendor "${name}"? This cannot be undone.`)) return
    deleteVendor.mutate(id)
  }

  const activeCount = vendors.filter((v) => v.status === 'ACTIVE').length
  const pendingCount = vendors.filter((v) => v.status === 'PENDING_APPROVAL').length
  const blacklistedCount = vendors.filter((v) => v.status === 'BLACKLISTED').length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extralight tracking-[0.3em] text-slate-600 uppercase">
            Vendor Management
          </h1>
          <p className="text-sm text-slate-500 mt-1 font-extralight">
            Manage suppliers and service vendors
          </p>
        </div>
        <Link to="/facility-management/vendors/create">
          <Button className="bg-indigo-600 hover:bg-indigo-700 gap-2">
            <Plus className="w-4 h-4" />
            Add Vendor
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 font-extralight">Total Vendors</p>
                <p className="text-2xl font-light text-slate-700 mt-1">
                  {pagination?.total ?? 0}
                </p>
              </div>
              <Briefcase className="w-8 h-8 text-indigo-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 font-extralight">Active</p>
                <p className="text-2xl font-light text-emerald-600 mt-1">{activeCount}</p>
              </div>
              <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                <span className="text-xs text-emerald-600 font-medium">A</span>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 font-extralight">Pending Approval</p>
                <p className="text-2xl font-light text-amber-600 mt-1">{pendingCount}</p>
              </div>
              <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
                <span className="text-xs text-amber-600 font-medium">P</span>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 font-extralight">Blacklisted</p>
                <p className="text-2xl font-light text-red-600 mt-1">{blacklistedCount}</p>
              </div>
              <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                <span className="text-xs text-red-600 font-medium">B</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search vendors..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
                className="pl-9"
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={(v) => {
                setStatusFilter(v)
                setPage(1)
              }}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="INACTIVE">Inactive</SelectItem>
                <SelectItem value="PENDING_APPROVAL">Pending</SelectItem>
                <SelectItem value="BLACKLISTED">Blacklisted</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={categoryFilter}
              onValueChange={(v) => {
                setCategoryFilter(v)
                setPage(1)
              }}
            >
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {VENDOR_CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-slate-400 text-sm font-extralight">
              Loading vendors...
            </div>
          ) : vendors.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-sm font-extralight">
              No vendors found
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vendors.map((vendor) => (
                  <TableRow key={vendor.id}>
                    <TableCell className="font-mono text-xs text-slate-500">
                      {vendor.vendor_code}
                    </TableCell>
                    <TableCell>
                      <Link
                        to="/facility-management/vendors/$vendorId"
                        params={{ vendorId: vendor.id }}
                        className="font-medium text-indigo-600 hover:text-indigo-800"
                      >
                        {vendor.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {vendor.category ? (
                        <Badge variant="outline" className="text-xs">
                          {vendor.category}
                        </Badge>
                      ) : (
                        <span className="text-slate-400 text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-0.5">
                        {vendor.phone && (
                          <div className="flex items-center gap-1 text-xs text-slate-500">
                            <Phone className="w-3 h-3" />
                            {vendor.phone}
                          </div>
                        )}
                        {vendor.email && (
                          <div className="flex items-center gap-1 text-xs text-slate-500">
                            <Mail className="w-3 h-3" />
                            {vendor.email}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {vendor.rating ? (
                        <div className="flex items-center gap-1">
                          <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                          <span className="text-sm">{vendor.rating}/5</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={`text-xs font-normal ${STATUS_COLORS[vendor.status as VendorStatus]}`}
                      >
                        {STATUS_LABELS[vendor.status as VendorStatus]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Link
                          to="/facility-management/vendors/$vendorId/edit"
                          params={{ vendorId: vendor.id }}
                        >
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-red-500 hover:text-red-700"
                          onClick={() => handleDelete(vendor.id, vendor.name)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-xs text-slate-500">
                {pagination.total} vendors total
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                >
                  Previous
                </Button>
                <span className="text-xs text-slate-500 self-center">
                  {page} / {pagination.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page >= pagination.totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
