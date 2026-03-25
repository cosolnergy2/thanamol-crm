import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { z } from 'zod'
import { Plus, Search, Receipt, Trash2, CheckCircle } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  useVendorInvoices,
  useCreateVendorInvoice,
  useDeleteVendorInvoice,
  useMarkVendorInvoicePaid,
} from '@/hooks/useVendorInvoices'
import { useVendors } from '@/hooks/useVendors'
import type { CreateVendorInvoiceRequest, VendorInvoiceItem } from '@thanamol/shared'

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
  const [search, setSearch] = useState('')
  const [vendorId, setVendorId] = useState(initialVendorId ?? 'all')
  const [paymentStatusFilter, setPaymentStatusFilter] = useState(initialStatus ?? 'all')
  const [page, setPage] = useState(1)
  const [showCreateDialog, setShowCreateDialog] = useState(false)

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
          onClick={() => setShowCreateDialog(true)}
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

      <CreateInvoiceDialog
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        vendors={vendorsData?.data ?? []}
      />
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
      <TableCell className="font-mono text-xs">{invoice.invoice_number}</TableCell>
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

type FormItem = VendorInvoiceItem & { _key: string }

function CreateInvoiceDialog({
  open,
  onClose,
  vendors,
}: {
  open: boolean
  onClose: () => void
  vendors: { id: string; name: string }[]
}) {
  const createInvoice = useCreateVendorInvoice()

  const [vendorId, setVendorId] = useState('')
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [invoiceDate, setInvoiceDate] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [items, setItems] = useState<FormItem[]>([
    { _key: crypto.randomUUID(), description: '', quantity: 1, unit_price: 0, total: 0 },
  ])

  const subtotal = items.reduce((sum, i) => sum + i.total, 0)
  const tax = Math.round(subtotal * 0.07 * 100) / 100
  const total = subtotal + tax

  const updateItem = (key: string, field: keyof FormItem, value: string | number) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item._key !== key) return item
        const updated = { ...item, [field]: value }
        if (field === 'quantity' || field === 'unit_price') {
          updated.total = Number(updated.quantity) * Number(updated.unit_price)
        }
        return updated
      })
    )
  }

  const addItem = () =>
    setItems((prev) => [
      ...prev,
      { _key: crypto.randomUUID(), description: '', quantity: 1, unit_price: 0, total: 0 },
    ])

  const removeItem = (key: string) =>
    setItems((prev) => prev.filter((i) => i._key !== key))

  const resetForm = () => {
    setVendorId('')
    setInvoiceNumber('')
    setInvoiceDate('')
    setDueDate('')
    setItems([{ _key: crypto.randomUUID(), description: '', quantity: 1, unit_price: 0, total: 0 }])
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const payload: CreateVendorInvoiceRequest = {
      invoiceNumber,
      vendorId,
      items: items.map(({ _key: _k, ...rest }) => rest),
      subtotal,
      tax,
      total,
      invoiceDate,
      dueDate: dueDate || undefined,
    }
    createInvoice.mutate(payload, {
      onSuccess: () => {
        resetForm()
        onClose()
      },
    })
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-light">New Vendor Invoice</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Vendor *</Label>
              <Select value={vendorId} onValueChange={setVendorId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select vendor" />
                </SelectTrigger>
                <SelectContent>
                  {vendors.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Invoice Number *</Label>
              <Input
                required
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder="INV-2024-001"
              />
            </div>
            <div>
              <Label>Invoice Date *</Label>
              <Input
                required
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
              />
            </div>
            <div>
              <Label>Due Date</Label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label>Items</Label>
            <div className="space-y-2 mt-1">
              {items.map((item) => (
                <div key={item._key} className="flex gap-2 items-center">
                  <Input
                    className="flex-1"
                    placeholder="Description"
                    value={item.description}
                    onChange={(e) => updateItem(item._key, 'description', e.target.value)}
                  />
                  <Input
                    className="w-20"
                    type="number"
                    placeholder="Qty"
                    value={item.quantity}
                    min={0}
                    step="0.001"
                    onChange={(e) => updateItem(item._key, 'quantity', Number(e.target.value))}
                  />
                  <Input
                    className="w-28"
                    type="number"
                    placeholder="Unit Price"
                    value={item.unit_price}
                    min={0}
                    step="0.01"
                    onChange={(e) => updateItem(item._key, 'unit_price', Number(e.target.value))}
                  />
                  <span className="w-24 text-right text-sm">{item.total.toLocaleString()}</span>
                  {items.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-red-400"
                      onClick={() => removeItem(item._key)}
                    >
                      ×
                    </Button>
                  )}
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={addItem}>
                + Add Item
              </Button>
            </div>
          </div>

          <div className="bg-slate-50 rounded p-3 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Subtotal</span>
              <span>{subtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Tax (7%)</span>
              <span>{tax.toLocaleString()}</span>
            </div>
            <div className="flex justify-between font-medium border-t pt-1">
              <span>Total</span>
              <span>{total.toLocaleString()} THB</span>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createInvoice.isPending || !vendorId || !invoiceNumber}
              className="bg-indigo-600 hover:bg-indigo-700 gap-2"
            >
              <Receipt className="w-4 h-4" />
              Create Invoice
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
