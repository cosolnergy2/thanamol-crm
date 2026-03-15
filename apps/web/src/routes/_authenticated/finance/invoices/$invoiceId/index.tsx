import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { Calendar, ChevronLeft, Edit, FileText } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { PageHeader } from '@/components/PageHeader'
import { useInvoiceById, useUpdateInvoice } from '@/hooks/useInvoices'
import { usePayments } from '@/hooks/usePayments'
import type { InvoiceStatus, PaymentMethod } from '@thanamol/shared'

export const Route = createFileRoute('/_authenticated/finance/invoices/$invoiceId/')({
  component: InvoiceDetailPage,
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

function InvoiceDetailPage() {
  const { invoiceId } = Route.useParams()
  const navigate = useNavigate()
  const { data, isLoading, isError } = useInvoiceById(invoiceId)
  const { data: paymentsData } = usePayments({ invoiceId })
  const updateInvoice = useUpdateInvoice()

  async function handleMarkAsSent() {
    try {
      await updateInvoice.mutateAsync({ id: invoiceId, data: { status: 'SENT' } })
      toast.success('Invoice marked as sent')
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

  if (isError || !data?.invoice) {
    return (
      <div className="text-center py-16">
        <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <p className="text-slate-600">Invoice not found.</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate({ to: '/finance/invoices' })}>
          Back to Invoices
        </Button>
      </div>
    )
  }

  const invoice = data.invoice
  const payments = paymentsData?.data ?? []

  return (
    <div className="space-y-4">
      <PageHeader
        title={invoice.invoice_number}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate({ to: '/finance/invoices' })}>
              <ChevronLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
            {invoice.status === 'DRAFT' && (
              <>
                <Button
                  variant="outline"
                  onClick={handleMarkAsSent}
                  disabled={updateInvoice.isPending}
                >
                  Mark as Sent
                </Button>
                <Link to="/finance/invoices/$invoiceId/edit" params={{ invoiceId }}>
                  <Button className="bg-indigo-600 hover:bg-indigo-700">
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                </Link>
              </>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-light text-slate-700">Invoice Info</CardTitle>
                <Badge
                  variant="outline"
                  className={`${STATUS_COLORS[invoice.status]} text-[9px] h-4 px-1.5 font-extralight`}
                >
                  {STATUS_LABELS[invoice.status]}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-3 text-[11px]">
                <div>
                  <dt className="text-slate-400 font-extralight">Customer</dt>
                  <dd className="text-slate-700 mt-0.5">
                    {invoice.customer?.name ?? invoice.customer_id}
                  </dd>
                </div>
                {invoice.contract && (
                  <div>
                    <dt className="text-slate-400 font-extralight">Contract</dt>
                    <dd className="text-slate-700 mt-0.5">{invoice.contract.contract_number}</dd>
                  </div>
                )}
                {invoice.due_date && (
                  <div>
                    <dt className="text-slate-400 font-extralight">Due Date</dt>
                    <dd className="text-slate-700 mt-0.5 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {format(new Date(invoice.due_date), 'd MMM yyyy')}
                    </dd>
                  </div>
                )}
                <div>
                  <dt className="text-slate-400 font-extralight">Created</dt>
                  <dd className="text-slate-700 mt-0.5">
                    {format(new Date(invoice.created_at), 'd MMM yyyy')}
                  </dd>
                </div>
                {invoice.notes && (
                  <div className="col-span-2">
                    <dt className="text-slate-400 font-extralight">Notes</dt>
                    <dd className="text-slate-700 mt-0.5">{invoice.notes}</dd>
                  </div>
                )}
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-light text-slate-700">Line Items</CardTitle>
            </CardHeader>
            <CardContent>
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
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(invoice.items as Array<{ description: string; quantity: number; unit_price: number; amount: number }>).map((item, idx) => (
                    <TableRow key={idx} className="border-slate-100">
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
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="mt-4 border-t border-slate-100 pt-3 space-y-1.5 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-500">Subtotal</span>
                  <span className="text-slate-700">฿{invoice.subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">VAT (7%)</span>
                  <span className="text-slate-700">฿{invoice.tax.toLocaleString()}</span>
                </div>
                <div className="flex justify-between pt-1.5 border-t border-slate-100">
                  <span className="font-light text-slate-700">Total</span>
                  <span className="font-light text-indigo-700 text-[13px]">
                    ฿{invoice.total.toLocaleString()}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-light text-slate-700">Payment History</CardTitle>
            </CardHeader>
            <CardContent>
              {payments.length === 0 ? (
                <p className="text-[11px] text-slate-400 text-center py-4">No payments recorded</p>
              ) : (
                <div className="space-y-2">
                  {payments.map((payment) => (
                    <div
                      key={payment.id}
                      className="flex justify-between items-start text-[11px] border-b border-slate-50 pb-2 last:border-0"
                    >
                      <div>
                        <p className="text-slate-700">
                          {PAYMENT_METHOD_LABELS[payment.payment_method]}
                        </p>
                        <p className="text-slate-400">
                          {format(new Date(payment.payment_date), 'd MMM yyyy')}
                        </p>
                        {payment.reference_number && (
                          <p className="text-slate-400">Ref: {payment.reference_number}</p>
                        )}
                      </div>
                      <span className="font-light text-emerald-700">
                        ฿{payment.amount.toLocaleString()}
                      </span>
                    </div>
                  ))}
                  <div className="flex justify-between text-[11px] pt-1 font-light">
                    <span className="text-slate-500">Total Paid</span>
                    <span className="text-emerald-700">
                      ฿{payments.reduce((s, p) => s + p.amount, 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
