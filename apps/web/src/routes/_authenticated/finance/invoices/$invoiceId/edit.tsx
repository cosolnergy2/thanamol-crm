import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { Plus, Trash2, ChevronLeft, Wand2 } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'
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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { PageHeader } from '@/components/PageHeader'
import { useInvoiceById, useUpdateInvoice } from '@/hooks/useInvoices'
import { useContracts } from '@/hooks/useContracts'
import { useCustomers } from '@/hooks/useCustomers'
import type { InvoiceItem, InvoiceItemType } from '@thanamol/shared'

export const Route = createFileRoute('/_authenticated/finance/invoices/$invoiceId/edit')({
  component: InvoiceEditPage,
})

const VAT_RATE = 0.07

const ITEM_TYPE_OPTIONS: { value: InvoiceItemType; label: string }[] = [
  { value: 'Rent', label: 'Rent (ค่าเช่า)' },
  { value: 'Common Fee', label: 'Common Fee (ค่าสวนกลาง)' },
  { value: 'Water', label: 'Water (ค่าน้ำ)' },
  { value: 'Electricity', label: 'Electricity (ค่าไฟ)' },
  { value: 'Parking', label: 'Parking (ค่าจอดรถ)' },
  { value: 'Other', label: 'Other (อื่นๆ)' },
]

type LineItemDraft = InvoiceItem & { _id: number }

const EMPTY_LINE_ITEM: Omit<LineItemDraft, '_id'> = {
  description: '',
  quantity: 1,
  unit_price: 0,
  amount: 0,
  item_type: undefined,
}

let nextLineItemId = 1000

function computeLineItemAmount(quantity: number, unitPrice: number): number {
  return Math.round(quantity * unitPrice * 100) / 100
}

function InvoiceEditPage() {
  const { invoiceId } = Route.useParams()
  const navigate = useNavigate()
  const { data, isLoading } = useInvoiceById(invoiceId)
  const updateInvoice = useUpdateInvoice()

  const [customerId, setCustomerId] = useState('')
  const [contractId, setContractId] = useState('')
  const [notes, setNotes] = useState('')
  const [invoiceDate, setInvoiceDate] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [billingPeriodStart, setBillingPeriodStart] = useState('')
  const [billingPeriodEnd, setBillingPeriodEnd] = useState('')
  const [discount, setDiscount] = useState(0)
  const [lineItems, setLineItems] = useState<LineItemDraft[]>([])
  const [initialized, setInitialized] = useState(false)

  const [isItemDialogOpen, setIsItemDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<LineItemDraft | null>(null)
  const [itemForm, setItemForm] = useState<Omit<LineItemDraft, '_id'>>(EMPTY_LINE_ITEM)

  const { data: contractsData } = useContracts({ status: 'ACTIVE', limit: 100 })
  const { data: customersData } = useCustomers({ limit: 100 })

  const contracts = contractsData?.data ?? []
  const customers = customersData?.data ?? []

  const selectedContract = contracts.find((c) => c.id === contractId)

  useEffect(() => {
    if (data?.invoice && !initialized) {
      const invoice = data.invoice
      setCustomerId(invoice.customer_id)
      setContractId(invoice.contract_id ?? '')
      setNotes(invoice.notes ?? '')
      setInvoiceDate(
        invoice.invoice_date ? format(new Date(invoice.invoice_date), 'yyyy-MM-dd') : '',
      )
      setDueDate(
        invoice.due_date ? format(new Date(invoice.due_date), 'yyyy-MM-dd') : '',
      )
      setBillingPeriodStart(
        invoice.billing_period_start
          ? format(new Date(invoice.billing_period_start), 'yyyy-MM-dd')
          : '',
      )
      setBillingPeriodEnd(
        invoice.billing_period_end
          ? format(new Date(invoice.billing_period_end), 'yyyy-MM-dd')
          : '',
      )
      setDiscount(invoice.discount ?? 0)
      const rawItems = invoice.items as Array<{
        description: string
        quantity: number
        unit_price: number
        amount: number
        item_type?: InvoiceItemType
      }>
      setLineItems(rawItems.map((item) => ({ ...item, _id: nextLineItemId++ })))
      setInitialized(true)
    }
  }, [data, initialized])

  const subtotal = lineItems.reduce((sum, item) => sum + item.amount, 0)
  const tax = Math.round(subtotal * VAT_RATE * 100) / 100
  const total = subtotal + tax - discount

  function openAddItemDialog() {
    setEditingItem(null)
    setItemForm(EMPTY_LINE_ITEM)
    setIsItemDialogOpen(true)
  }

  function openEditItemDialog(item: LineItemDraft) {
    setEditingItem(item)
    setItemForm({
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
      amount: item.amount,
      item_type: item.item_type,
    })
    setIsItemDialogOpen(true)
  }

  function updateItemFormField<K extends keyof Omit<LineItemDraft, '_id'>>(
    field: K,
    value: Omit<LineItemDraft, '_id'>[K],
  ) {
    setItemForm((prev) => {
      const updated = { ...prev, [field]: value }
      if (field === 'quantity' || field === 'unit_price') {
        updated.amount = computeLineItemAmount(
          field === 'quantity' ? (value as number) : prev.quantity,
          field === 'unit_price' ? (value as number) : prev.unit_price,
        )
      }
      return updated
    })
  }

  function saveLineItem() {
    if (!itemForm.description.trim()) {
      toast.error('Description is required')
      return
    }
    if (editingItem) {
      setLineItems((prev) =>
        prev.map((item) =>
          item._id === editingItem._id ? { ...itemForm, _id: editingItem._id } : item,
        ),
      )
    } else {
      setLineItems((prev) => [...prev, { ...itemForm, _id: nextLineItemId++ }])
    }
    setIsItemDialogOpen(false)
  }

  function removeLineItem(id: number) {
    setLineItems((prev) => prev.filter((item) => item._id !== id))
  }

  function autoFillFromContract() {
    if (!selectedContract || !selectedContract.monthly_rent) return
    setLineItems((prev) => [
      ...prev,
      {
        _id: nextLineItemId++,
        item_type: 'Rent',
        description: 'ค่าเช่า',
        quantity: 1,
        unit_price: selectedContract.monthly_rent!,
        amount: selectedContract.monthly_rent!,
      },
    ])
    toast.success('Rent line item added from contract')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!customerId) {
      toast.error('Please select a customer')
      return
    }

    const items: InvoiceItem[] = lineItems.map(({ _id: _unused, ...item }) => item)

    try {
      await updateInvoice.mutateAsync({
        id: invoiceId,
        data: {
          customerId,
          contractId: contractId || undefined,
          items,
          subtotal,
          tax,
          discount: discount > 0 ? discount : undefined,
          total,
          invoiceDate: invoiceDate || undefined,
          dueDate: dueDate || undefined,
          billingPeriodStart: billingPeriodStart || undefined,
          billingPeriodEnd: billingPeriodEnd || undefined,
          notes: notes || undefined,
        },
      })
      toast.success('Invoice updated')
      navigate({ to: '/finance/invoices/$invoiceId', params: { invoiceId } })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update invoice')
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!data?.invoice) {
    return (
      <div className="text-center py-16">
        <p className="text-slate-600">Invoice not found.</p>
      </div>
    )
  }

  if (data.invoice.status !== 'DRAFT') {
    return (
      <div className="text-center py-16">
        <p className="text-slate-600">Only DRAFT invoices can be edited.</p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => navigate({ to: '/finance/invoices/$invoiceId', params: { invoiceId } })}
        >
          Back to Invoice
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title={`Edit ${data.invoice.invoice_number}`}
        actions={
          <Button
            variant="outline"
            onClick={() =>
              navigate({ to: '/finance/invoices/$invoiceId', params: { invoiceId } })
            }
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
        }
      />

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-light text-slate-700">Invoice Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-[11px] text-slate-500">Customer *</Label>
                    <Select value={customerId} onValueChange={setCustomerId}>
                      <SelectTrigger>
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

                  <div className="space-y-1.5">
                    <Label className="text-[11px] text-slate-500">Contract (optional)</Label>
                    <Select
                      value={contractId || '__none__'}
                      onValueChange={(v) => setContractId(v === '__none__' ? '' : v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Link to contract" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">None</SelectItem>
                        {contracts.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.contract_number}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[11px] text-slate-500">Invoice Date</Label>
                    <Input
                      type="date"
                      value={invoiceDate}
                      onChange={(e) => setInvoiceDate(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[11px] text-slate-500">Due Date</Label>
                    <Input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[11px] text-slate-500">Billing Period From</Label>
                    <Input
                      type="date"
                      value={billingPeriodStart}
                      onChange={(e) => setBillingPeriodStart(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[11px] text-slate-500">Billing Period To</Label>
                    <Input
                      type="date"
                      value={billingPeriodEnd}
                      onChange={(e) => setBillingPeriodEnd(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[11px] text-slate-500">Notes</Label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Additional notes..."
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-light text-slate-700">Line Items</CardTitle>
                <div className="flex gap-2">
                  {selectedContract && selectedContract.monthly_rent && selectedContract.monthly_rent > 0 && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={autoFillFromContract}
                      className="text-teal-700 border-teal-200 hover:bg-teal-50"
                    >
                      <Wand2 className="w-3.5 h-3.5 mr-1" />
                      Auto-fill from contract
                    </Button>
                  )}
                  <Button type="button" size="sm" variant="outline" onClick={openAddItemDialog}>
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    Add Item
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {lineItems.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-sm">
                    No items. Click &quot;Add Item&quot; to begin.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="border-slate-100">
                        <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                          Type
                        </TableHead>
                        <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                          Description
                        </TableHead>
                        <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase text-right">
                          Qty
                        </TableHead>
                        <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase text-right">
                          Unit Price
                        </TableHead>
                        <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase text-right">
                          Amount
                        </TableHead>
                        <TableHead />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lineItems.map((item) => (
                        <TableRow
                          key={item._id}
                          className="border-slate-100 cursor-pointer hover:bg-slate-50/50"
                          onClick={() => openEditItemDialog(item)}
                        >
                          <TableCell className="py-2 text-[10px] text-slate-500">
                            {item.item_type ?? '—'}
                          </TableCell>
                          <TableCell className="py-2 text-[11px] text-slate-700">
                            {item.description}
                          </TableCell>
                          <TableCell className="py-2 text-[11px] text-slate-600 text-right">
                            {item.quantity}
                          </TableCell>
                          <TableCell className="py-2 text-[11px] text-slate-600 text-right">
                            ฿{item.unit_price.toLocaleString()}
                          </TableCell>
                          <TableCell className="py-2 text-[11px] font-light text-slate-800 text-right">
                            ฿{item.amount.toLocaleString()}
                          </TableCell>
                          <TableCell className="py-2">
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0 text-rose-500 hover:text-rose-700"
                              onClick={(e) => {
                                e.stopPropagation()
                                removeLineItem(item._id)
                              }}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-light text-slate-700">Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-500">Subtotal</span>
                  <span className="text-slate-700">฿{subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-500">VAT (7%)</span>
                  <span className="text-slate-700">฿{tax.toLocaleString()}</span>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <Label className="text-slate-500 text-[11px]">Discount (฿)</Label>
                  </div>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={discount}
                    onChange={(e) => setDiscount(Number(e.target.value))}
                    className="h-7 text-[11px]"
                  />
                </div>
                <div className="border-t border-slate-100 pt-3 flex justify-between">
                  <span className="text-[12px] font-light text-slate-700">Total</span>
                  <span className="text-[14px] font-light text-indigo-700">
                    ฿{total.toLocaleString()}
                  </span>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-indigo-600 hover:bg-indigo-700 mt-2"
                  disabled={updateInvoice.isPending || !customerId}
                >
                  {updateInvoice.isPending ? 'Saving...' : 'Save Invoice'}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>

      <Dialog open={isItemDialogOpen} onOpenChange={setIsItemDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-light">
              {editingItem ? 'Edit Item' : 'Add Line Item'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-[11px] text-slate-500">Item Type</Label>
              <Select
                value={itemForm.item_type ?? '__none__'}
                onValueChange={(v) =>
                  updateItemFormField('item_type', v === '__none__' ? undefined : (v as InvoiceItemType))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {ITEM_TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] text-slate-500">Description *</Label>
              <Input
                value={itemForm.description}
                onChange={(e) => updateItemFormField('description', e.target.value)}
                placeholder="Item description"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[11px] text-slate-500">Quantity</Label>
                <Input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={itemForm.quantity}
                  onChange={(e) => updateItemFormField('quantity', Number(e.target.value))}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] text-slate-500">Unit Price (฿)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={itemForm.unit_price}
                  onChange={(e) => updateItemFormField('unit_price', Number(e.target.value))}
                />
              </div>
            </div>
            <div className="flex justify-between text-[11px] text-slate-600 bg-slate-50 p-2 rounded">
              <span>Amount</span>
              <span className="font-light">฿{itemForm.amount.toLocaleString()}</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsItemDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveLineItem} className="bg-indigo-600 hover:bg-indigo-700">
              {editingItem ? 'Save' : 'Add'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
