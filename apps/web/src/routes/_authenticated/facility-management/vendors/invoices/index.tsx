import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { z } from 'zod'
import { Plus, Search, Trash2, CheckCircle } from 'lucide-react'
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  useVendorInvoices,
  useDeleteVendorInvoice,
  useMarkVendorInvoicePaid,
} from '@/hooks/useVendorInvoices'
import { useVendors } from '@/hooks/useVendors'

const searchSchema = z.object({
  vendorId: z.string().optional(),
  paymentStatus: z.string().optional(),
})

export const Route = createFileRoute(
  '/_authenticated/facility-management/vendors/invoices/'
)({
  validateSearch: searchSchema,
  component: VendorInvoicesListPage,
})

function VendorInvoicesListPage() {
  const { vendorId: initialVendorId, paymentStatus: initialStatus } = Route.useSearch()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [vendorId, setVendorId] = useState(initialVendorId ?? 'all')
  const [paymentStatusFilter, setPaymentStatusFilter] = useState(initialStatus ?? 'all')
  const [page, setPage] = useState(1)

  const { data, isLoading } = useVendorInvoices({
    page,
    limit: 20,
    vendorId: vendorId !== 'all' ? vendorId : undefined,
    paymentStatus: paymentStatusFilter !== 'all' ? paymentStatusFilter : undefined,
    search: search || undefined,
  })

  const { data: vendorsData } = useVendors({ limit: 100 })
  const deleteInvoice = useDeleteVendorInvoice()

  const invoices = data?.data ?? []
  const pagination = data?.pagination

  const handleDelete = (id: string, number: string) => {
    if (!confirm(`Delete invoice "${number}"?`)) return
    deleteInvoice.mutate(id)
  }

  const totalPending = invoices
    .filter((i) => i.payment_status === 'PENDING')
    .reduce((sum, i) => sum + i.total, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extralight tracking-[0.3em] text-slate-600 uppercase">
            Vendor Invoices
          </h1>
          <p className="text-sm text-slate-500 mt-1 font-extralight">
            Manage invoices from vendors
          </p>
        </div>
        <Button
          onClick={() => navigate({ to: '/facility-management/vendors/invoices/create' })}
          className="bg-indigo-600 hover:bg-indigo-700 gap-2"
        >
          <Plus className="w-4 h-4" />
          New Invoice
        </Button>
      </div>

      {totalPending > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <p className="text-sm text-amber-700">
            Pending payment total:{' '}
            <span className="font-semibold">{totalPending.toLocaleString()} THB</span>
          </p>
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search by invoice number..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
                className="pl-9"
              />
            </div>
            <Select
              value={vendorId}
              onValueChange={(v) => {
                setVendorId(v)
                setPage(1)
              }}
            >
              <SelectTrigger className="w-52">
                <SelectValue placeholder="All Vendors" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Vendors</SelectItem>
                {(vendorsData?.data ?? []).map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={paymentStatusFilter}
              onValueChange={(v) => {
                setPaymentStatusFilter(v)
                setPage(1)
              }}
            >
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="PAID">Paid</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-slate-400 text-sm">Loading...</div>
          ) : invoices.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-sm">No invoices found</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Invoice Date</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((inv) => (
                  <InvoiceRow key={inv.id} invoice={inv} onDelete={handleDelete} />
                ))}
              </TableBody>
            </Table>
          )}

          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-xs text-slate-500">{pagination.total} invoices</p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                >
                  Previous
                </Button>
                <span className="text-xs self-center text-slate-500">
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

function InvoiceRow({
  invoice,
  onDelete,
}: {
  invoice: {
    id: string
    invoice_number: string
    payment_status: string
    invoice_date: string
    due_date?: string | null
    total: number
    vendor: { id: string; name: string }
  }
  onDelete: (id: string, number: string) => void
}) {
  const markPaid = useMarkVendorInvoicePaid(invoice.id)

  return (
    <TableRow>
      <TableCell className="font-mono text-xs">
        <Link
          to="/facility-management/vendors/invoices/$invoiceId"
          params={{ invoiceId: invoice.id }}
          className="text-indigo-600 hover:underline"
        >
          {invoice.invoice_number}
        </Link>
      </TableCell>
      <TableCell>
        <Link
          to="/facility-management/vendors/$vendorId"
          params={{ vendorId: invoice.vendor.id }}
          className="text-indigo-600 hover:underline text-sm"
        >
          {invoice.vendor.name}
        </Link>
      </TableCell>
      <TableCell className="text-sm text-slate-600">
        {new Date(invoice.invoice_date).toLocaleDateString()}
      </TableCell>
      <TableCell className="text-sm text-slate-600">
        {invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : '—'}
      </TableCell>
      <TableCell className="font-medium">{invoice.total.toLocaleString()}</TableCell>
      <TableCell>
        <Badge
          className={`text-xs font-normal ${
            invoice.payment_status === 'PAID'
              ? 'bg-emerald-100 text-emerald-700'
              : 'bg-amber-100 text-amber-700'
          }`}
        >
          {invoice.payment_status}
        </Badge>
      </TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-1">
          {invoice.payment_status === 'PENDING' && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-emerald-600"
              onClick={() => markPaid.mutate(undefined)}
              title="Mark as Paid"
            >
              <CheckCircle className="w-3.5 h-3.5" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-red-500 hover:text-red-700"
            onClick={() => onDelete(invoice.id, invoice.invoice_number)}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  )
}
