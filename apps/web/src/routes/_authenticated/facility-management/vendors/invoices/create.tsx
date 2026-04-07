import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { ArrowLeft, Receipt, Plus, Trash2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { FileUpload } from '@/components/FileUpload'
import { useCreateVendorInvoice } from '@/hooks/useVendorInvoices'
import { useVendors } from '@/hooks/useVendors'
import { usePurchaseOrders } from '@/hooks/usePurchaseOrders'
import { generateUUID } from '@thanamol/shared'
import type { CreateVendorInvoiceRequest, VendorInvoiceItem } from '@thanamol/shared'

export const Route = createFileRoute(
  '/_authenticated/facility-management/vendors/invoices/create'
)({
  component: VendorInvoiceCreatePage,
})

type FormItem = VendorInvoiceItem & { _key: string }

function buildEmptyItem(): FormItem {
  return { _key: generateUUID(), description: '', quantity: 1, unit_price: 0, total: 0 }
}

function VendorInvoiceCreatePage() {
  const navigate = useNavigate()
  const createInvoice = useCreateVendorInvoice()
  const { data: vendorsData } = useVendors({ limit: 100 })
  const { data: poData } = usePurchaseOrders({ limit: 100 })

  const vendors = vendorsData?.data ?? []
  const purchaseOrders = poData?.data ?? []

  const [vendorId, setVendorId] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [poId, setPoId] = useState('')
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [invoiceDate, setInvoiceDate] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [pdfUrl, setPdfUrl] = useState('')
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState<FormItem[]>([buildEmptyItem()])

  const subtotal = items.reduce((sum, i) => sum + i.total, 0)
  const tax = Math.round(subtotal * 0.07 * 100) / 100
  const total = subtotal + tax

  function handleVendorChange(selectedVendorId: string) {
    setVendorId(selectedVendorId)
    const vendor = vendors.find((v) => v.id === selectedVendorId)
    if (vendor) {
      setContactEmail(vendor.email ?? '')
    }
  }

  function handlePoChange(selectedPoId: string) {
    setPoId(selectedPoId)
    if (selectedPoId === 'none') {
      setPoId('')
      return
    }
    const po = purchaseOrders.find((p) => p.id === selectedPoId)
    if (!po) return

    const matchedVendor = vendors.find(
      (v) => v.name === po.vendor_name || v.legal_name === po.vendor_name
    )
    if (matchedVendor) {
      handleVendorChange(matchedVendor.id)
    }

    if (po.items && po.items.length > 0) {
      setItems(
        po.items.map((item) => ({
          _key: generateUUID(),
          description: item.item_name ?? '',
          quantity: item.quantity,
          unit_price: item.unit_price,
          total: item.total,
        }))
      )
    }
  }

  function updateItem(key: string, field: keyof FormItem, value: string | number) {
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

  function addItem() {
    setItems((prev) => [...prev, buildEmptyItem()])
  }

  function removeItem(key: string) {
    setItems((prev) => prev.filter((i) => i._key !== key))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const payload: CreateVendorInvoiceRequest = {
      invoiceNumber,
      vendorId,
      poId: poId || undefined,
      items: items.map(({ _key: _k, ...rest }) => rest),
      subtotal,
      tax,
      total,
      invoiceDate,
      dueDate: dueDate || undefined,
      notes: notes || undefined,
      pdfUrl: pdfUrl || undefined,
      submissionHistory: [],
    }
    createInvoice.mutate(payload, {
      onSuccess: (data) => {
        navigate({
          to: '/facility-management/vendors/invoices/$invoiceId',
          params: { invoiceId: data.invoice.id },
        })
      },
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="icon"
          onClick={() => navigate({ to: '/facility-management/vendors/invoices' })}
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-extralight tracking-[0.3em] text-slate-600 uppercase">
            New Vendor Invoice
          </h1>
          <p className="text-sm text-slate-500 mt-1 font-extralight">
            Create a new invoice from a vendor
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-light">Invoice Details</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>PO Reference</Label>
              <Select value={poId || 'none'} onValueChange={handlePoChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select PO (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {purchaseOrders.map((po) => (
                    <SelectItem key={po.id} value={po.id}>
                      {po.po_number} — {po.vendor_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Vendor Name / Company *</Label>
              <Select value={vendorId} onValueChange={handleVendorChange} required>
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
              <Label>Contact Email</Label>
              <Input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="vendor@example.com"
              />
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

            <div className="md:col-span-2">
              <FileUpload
                label="Attachment"
                value={pdfUrl || undefined}
                onChange={(url) => setPdfUrl(url ?? '')}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-light">Line Items</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="hidden md:grid grid-cols-12 gap-2 text-xs text-slate-500 font-medium px-1">
              <span className="col-span-5">Description</span>
              <span className="col-span-2 text-right">Qty</span>
              <span className="col-span-2 text-right">Unit Price</span>
              <span className="col-span-2 text-right">Total</span>
              <span className="col-span-1" />
            </div>
            {items.map((item) => (
              <div key={item._key} className="grid grid-cols-12 gap-2 items-center">
                <div className="col-span-12 md:col-span-5">
                  <Input
                    placeholder="Description"
                    value={item.description}
                    onChange={(e) => updateItem(item._key, 'description', e.target.value)}
                  />
                </div>
                <div className="col-span-4 md:col-span-2">
                  <Input
                    type="number"
                    placeholder="Qty"
                    value={item.quantity}
                    min={0}
                    step="0.001"
                    onChange={(e) => updateItem(item._key, 'quantity', Number(e.target.value))}
                  />
                </div>
                <div className="col-span-4 md:col-span-2">
                  <Input
                    type="number"
                    placeholder="Unit Price"
                    value={item.unit_price}
                    min={0}
                    step="0.01"
                    onChange={(e) => updateItem(item._key, 'unit_price', Number(e.target.value))}
                  />
                </div>
                <div className="col-span-3 md:col-span-2 text-right text-sm font-medium">
                  {item.total.toLocaleString()}
                </div>
                <div className="col-span-1 flex justify-end">
                  {items.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-400 hover:text-red-600"
                      onClick={() => removeItem(item._key)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1 text-indigo-600 border-indigo-200 hover:bg-indigo-50"
              onClick={addItem}
            >
              <Plus className="w-3 h-3" />
              Add Item
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-light">Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm max-w-xs ml-auto">
              <div className="flex justify-between text-slate-500">
                <span>Subtotal</span>
                <span>{subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Tax (7%)</span>
                <span>{tax.toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-semibold border-t pt-2">
                <span>Total Amount</span>
                <span>{total.toLocaleString()} THB</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-light">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Additional notes..."
            />
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate({ to: '/facility-management/vendors/invoices' })}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={createInvoice.isPending || !vendorId || !invoiceNumber || !invoiceDate}
            className="bg-indigo-600 hover:bg-indigo-700 gap-2"
          >
            <Receipt className="w-4 h-4" />
            Create Invoice
          </Button>
        </div>
      </form>
    </div>
  )
}
