import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { Plus, Trash2, ChevronLeft } from 'lucide-react'
import { format, addDays } from 'date-fns'
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
import { PageHeader } from '@/components/PageHeader'
import { useCreateInvoice } from '@/hooks/useInvoices'
import { useContracts } from '@/hooks/useContracts'
import { useCustomers } from '@/hooks/useCustomers'
import type { InvoiceItem } from '@thanamol/shared'

export const Route = createFileRoute('/_authenticated/finance/invoices/create')({
  component: InvoiceCreatePage,
})

const VAT_RATE = 0.07
const DEFAULT_PAYMENT_DAYS = 30

type LineItemDraft = InvoiceItem & { _id: number }

const EMPTY_LINE_ITEM: Omit<LineItemDraft, '_id'> = {
  description: '',
  quantity: 1,
  unit_price: 0,
  amount: 0,
}

let nextLineItemId = 1

function computeLineItemAmount(quantity: number, unitPrice: number): number {
  return Math.round(quantity * unitPrice * 100) / 100
}

function InvoiceCreatePage() {
  const navigate = useNavigate()
  const createInvoice = useCreateInvoice()

  const [customerId, setCustomerId] = useState('')
  const [contractId, setContractId] = useState('')
  const [notes, setNotes] = useState('')
  const [dueDate, setDueDate] = useState(format(addDays(new Date(), DEFAULT_PAYMENT_DAYS), 'yyyy-MM-dd'))
  const [lineItems, setLineItems] = useState<LineItemDraft[]>([])

  const [isItemDialogOpen, setIsItemDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<LineItemDraft | null>(null)
  const [itemForm, setItemForm] = useState<Omit<LineItemDraft, '_id'>>(EMPTY_LINE_ITEM)

  const { data: contractsData } = useContracts({ status: 'ACTIVE', limit: 100 })
  const { data: customersData } = useCustomers({ limit: 100 })

  const contracts = contractsData?.data ?? []
  const customers = customersData?.data ?? []

  const subtotal = lineItems.reduce((sum, item) => sum + item.amount, 0)
  const tax = Math.round(subtotal * VAT_RATE * 100) / 100
  const total = subtotal + tax

  function openAddItemDialog() {
    setEditingItem(null)
    setItemForm(EMPTY_LINE_ITEM)
    setIsItemDialogOpen(true)
  }

  function openEditItemDialog(item: LineItemDraft) {
    setEditingItem(item)
    setItemForm({ description: item.description, quantity: item.quantity, unit_price: item.unit_price, amount: item.amount })
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!customerId) {
      toast.error('Please select a customer')
      return
    }

    const items: InvoiceItem[] = lineItems.map(({ _id: _unused, ...item }) => item)

    try {
      const result = await createInvoice.mutateAsync({
        customerId,
        contractId: contractId || undefined,
        items,
        subtotal,
        tax,
        total,
        dueDate: dueDate || undefined,
        notes: notes || undefined,
      })
      toast.success(`Invoice ${result.invoice.invoice_number} created`)
      navigate({ to: '/finance/invoices' })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create invoice')
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="New Invoice"
        actions={
          <Button variant="outline" onClick={() => navigate({ to: '/finance/invoices' })}>
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
                    <Select value={contractId} onValueChange={setContractId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Link to contract" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">None</SelectItem>
                        {contracts.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.contract_number}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[11px] text-slate-500">Due Date</Label>
                    <Input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
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
                <Button type="button" size="sm" variant="outline" onClick={openAddItemDialog}>
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Add Item
                </Button>
              </CardHeader>
              <CardContent>
                {lineItems.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-sm">
                    No items added yet. Click &quot;Add Item&quot; to begin.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="border-slate-100">
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
                <div className="border-t border-slate-100 pt-3 flex justify-between">
                  <span className="text-[12px] font-light text-slate-700">Total</span>
                  <span className="text-[14px] font-light text-indigo-700">
                    ฿{total.toLocaleString()}
                  </span>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-indigo-600 hover:bg-indigo-700 mt-2"
                  disabled={createInvoice.isPending || !customerId}
                >
                  {createInvoice.isPending ? 'Creating...' : 'Create Invoice'}
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
