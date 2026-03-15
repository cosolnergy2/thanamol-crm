import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { DollarSign, Calendar, FileText } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import { useInvoices } from '@/hooks/useInvoices'
import { useCreatePayment } from '@/hooks/usePayments'
import type { Invoice, InvoiceStatus, PaymentMethod } from '@thanamol/shared'

export const Route = createFileRoute('/_authenticated/finance/payments/receive')({
  component: PaymentReceivePage,
})

const STATUS_COLORS: Record<InvoiceStatus, string> = {
  DRAFT: 'bg-slate-100 text-slate-700 border-slate-200',
  SENT: 'bg-blue-100 text-blue-700 border-blue-200',
  PARTIAL: 'bg-amber-100 text-amber-700 border-amber-200',
  PAID: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  OVERDUE: 'bg-rose-100 text-rose-700 border-rose-200',
  CANCELLED: 'bg-zinc-100 text-zinc-600 border-zinc-200',
}

const STATUS_LABELS: Record<InvoiceStatus, string> = {
  DRAFT: 'Draft',
  SENT: 'Sent',
  PARTIAL: 'Partial',
  PAID: 'Paid',
  OVERDUE: 'Overdue',
  CANCELLED: 'Cancelled',
}

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: 'Cash',
  BANK_TRANSFER: 'Bank Transfer',
  CHEQUE: 'Cheque',
  CREDIT_CARD: 'Credit Card',
  ONLINE: 'Online',
}

const PAYMENT_METHODS: PaymentMethod[] = ['CASH', 'BANK_TRANSFER', 'CHEQUE', 'CREDIT_CARD', 'ONLINE']

type PaymentForm = {
  amount: string
  paymentDate: string
  paymentMethod: PaymentMethod | ''
  referenceNumber: string
  notes: string
}

const EMPTY_PAYMENT_FORM: PaymentForm = {
  amount: '',
  paymentDate: format(new Date(), 'yyyy-MM-dd'),
  paymentMethod: '',
  referenceNumber: '',
  notes: '',
}

function PaymentReceivePage() {
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [paymentForm, setPaymentForm] = useState<PaymentForm>(EMPTY_PAYMENT_FORM)

  const { data: sentData, isLoading: sentLoading } = useInvoices({ status: 'SENT', limit: 100 })
  const { data: partialData, isLoading: partialLoading } = useInvoices({ status: 'PARTIAL', limit: 100 })
  const { data: overdueData, isLoading: overdueLoading } = useInvoices({ status: 'OVERDUE', limit: 100 })
  const createPayment = useCreatePayment()

  const isLoading = sentLoading || partialLoading || overdueLoading

  const unpaidInvoices: Invoice[] = [
    ...(sentData?.data ?? []),
    ...(partialData?.data ?? []),
    ...(overdueData?.data ?? []),
  ]

  function openPaymentDialog(invoice: Invoice) {
    setSelectedInvoice(invoice)
    setPaymentForm({
      ...EMPTY_PAYMENT_FORM,
      amount: String(invoice.total),
    })
  }

  function closePaymentDialog() {
    setSelectedInvoice(null)
    setPaymentForm(EMPTY_PAYMENT_FORM)
  }

  async function handleReceivePayment() {
    if (!selectedInvoice) return
    if (!paymentForm.paymentMethod) {
      toast.error('Please select a payment method')
      return
    }
    const amount = Number(paymentForm.amount)
    if (!amount || amount <= 0) {
      toast.error('Please enter a valid amount')
      return
    }

    try {
      await createPayment.mutateAsync({
        invoiceId: selectedInvoice.id,
        amount,
        paymentDate: paymentForm.paymentDate,
        paymentMethod: paymentForm.paymentMethod as PaymentMethod,
        referenceNumber: paymentForm.referenceNumber || undefined,
        notes: paymentForm.notes || undefined,
      })
      toast.success('Payment recorded successfully')
      closePaymentDialog()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to record payment')
    }
  }

  const totalOutstanding = unpaidInvoices.reduce((sum, inv) => sum + inv.total, 0)

  return (
    <div className="space-y-4">
      <PageHeader title="Receive Payment" />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {[
          {
            label: 'Outstanding Invoices',
            value: unpaidInvoices.length,
            color: 'text-slate-900',
          },
          {
            label: 'Total Outstanding',
            value: `฿${totalOutstanding.toLocaleString()}`,
            color: 'text-rose-600',
          },
          {
            label: 'Overdue',
            value: (overdueData?.data ?? []).length,
            color: 'text-rose-600',
          },
        ].map((stat, idx) => (
          <Card key={idx} className="border border-slate-100 bg-white/90">
            <CardContent className="pt-5 pb-5">
              <div className="text-center">
                <p className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                  {stat.label}
                </p>
                <p className={`text-2xl font-extralight mt-1.5 ${stat.color}`}>{stat.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="pt-4">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-100">
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                  Invoice No.
                </TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                  Customer
                </TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                  Due Date
                </TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase text-right">
                  Total
                </TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                  Status
                </TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={6}>
                      <Skeleton className="h-8 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : unpaidInvoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <DollarSign className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-600">No outstanding invoices</p>
                  </TableCell>
                </TableRow>
              ) : (
                unpaidInvoices.map((invoice) => (
                  <TableRow
                    key={invoice.id}
                    className={`hover:bg-slate-50/50 border-slate-100 ${
                      invoice.status === 'OVERDUE' ? 'bg-rose-50/30' : ''
                    }`}
                  >
                    <TableCell className="py-3">
                      <div className="flex items-center">
                        <FileText className="w-3.5 h-3.5 text-slate-400 mr-2" />
                        <span className="font-light text-slate-800 text-[11px]">
                          {invoice.invoice_number}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="py-3">
                      <span className="text-[11px] text-slate-600 font-extralight">
                        {invoice.customer_id}
                      </span>
                    </TableCell>
                    <TableCell className="py-3">
                      {invoice.due_date ? (
                        <div className="flex items-center text-[10px] text-slate-500 font-extralight">
                          <Calendar className="w-3 h-3 mr-1" />
                          {format(new Date(invoice.due_date), 'd MMM yyyy')}
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[11px]">—</span>
                      )}
                    </TableCell>
                    <TableCell className="py-3 text-right">
                      <span className="text-[11px] font-light text-slate-800">
                        ฿{invoice.total.toLocaleString()}
                      </span>
                    </TableCell>
                    <TableCell className="py-3">
                      <Badge
                        variant="outline"
                        className={`${STATUS_COLORS[invoice.status] ?? ''} text-[9px] h-4 px-1.5 font-extralight`}
                      >
                        {STATUS_LABELS[invoice.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-3">
                      <Button
                        size="sm"
                        className="h-7 bg-indigo-600 hover:bg-indigo-700 text-[10px]"
                        onClick={() => openPaymentDialog(invoice)}
                      >
                        <DollarSign className="w-3 h-3 mr-1" />
                        Receive
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!selectedInvoice} onOpenChange={closePaymentDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-light">Record Payment</DialogTitle>
            <DialogDescription className="text-[11px] text-slate-500">
              {selectedInvoice?.invoice_number} — Total ฿{selectedInvoice?.total.toLocaleString()}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-[11px] text-slate-500">Amount (฿) *</Label>
              <Input
                type="number"
                min="0.01"
                step="0.01"
                value={paymentForm.amount}
                onChange={(e) => setPaymentForm((f) => ({ ...f, amount: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] text-slate-500">Payment Method *</Label>
              <Select
                value={paymentForm.paymentMethod}
                onValueChange={(v) =>
                  setPaymentForm((f) => ({ ...f, paymentMethod: v as PaymentMethod }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select method" />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((method) => (
                    <SelectItem key={method} value={method}>
                      {PAYMENT_METHOD_LABELS[method]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] text-slate-500">Payment Date *</Label>
              <Input
                type="date"
                value={paymentForm.paymentDate}
                onChange={(e) => setPaymentForm((f) => ({ ...f, paymentDate: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] text-slate-500">Reference Number</Label>
              <Input
                value={paymentForm.referenceNumber}
                onChange={(e) =>
                  setPaymentForm((f) => ({ ...f, referenceNumber: e.target.value }))
                }
                placeholder="Transaction or cheque number"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] text-slate-500">Notes</Label>
              <Textarea
                value={paymentForm.notes}
                onChange={(e) => setPaymentForm((f) => ({ ...f, notes: e.target.value }))}
                rows={2}
                placeholder="Optional notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closePaymentDialog}>
              Cancel
            </Button>
            <Button
              onClick={handleReceivePayment}
              disabled={createPayment.isPending}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {createPayment.isPending ? 'Recording...' : 'Record Payment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
