import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { ArrowLeft, CheckCircle, Send, Trash2, FileText, Clock } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  useVendorInvoice,
  useMarkVendorInvoicePaid,
  useDeleteVendorInvoice,
  useSubmitVendorInvoice,
} from '@/hooks/useVendorInvoices'

export const Route = createFileRoute(
  '/_authenticated/facility-management/vendors/invoices/$invoiceId'
)({
  component: VendorInvoiceDetailPage,
})

type SubmissionEvent = {
  submittedAt: string
  notes?: string | null
}

function parseSubmissionHistory(raw: unknown): SubmissionEvent[] {
  if (!Array.isArray(raw)) return []
  return raw.filter(
    (item): item is SubmissionEvent =>
      typeof item === 'object' && item !== null && 'submittedAt' in item
  )
}

function VendorInvoiceDetailPage() {
  const { invoiceId } = Route.useParams()
  const navigate = useNavigate()
  const { data, isLoading } = useVendorInvoice(invoiceId)
  const markPaid = useMarkVendorInvoicePaid(invoiceId)
  const deleteInvoice = useDeleteVendorInvoice()
  const submitInvoice = useSubmitVendorInvoice(invoiceId)

  const [submitNotes, setSubmitNotes] = useState('')
  const [showSubmitInput, setShowSubmitInput] = useState(false)

  if (isLoading) {
    return <div className="text-center py-16 text-slate-400 font-extralight">Loading...</div>
  }

  if (!data?.invoice) {
    return (
      <div className="text-center py-16 text-slate-400 font-extralight">Invoice not found</div>
    )
  }

  const invoice = data.invoice
  const submissionHistory = parseSubmissionHistory(invoice.submission_history)

  function handleDelete() {
    if (!confirm(`Delete invoice "${invoice.invoice_number}"?`)) return
    deleteInvoice.mutate(invoiceId, {
      onSuccess: () => {
        navigate({ to: '/facility-management/vendors/invoices' })
      },
    })
  }

  function handleSubmit() {
    submitInvoice.mutate(submitNotes || undefined, {
      onSuccess: () => {
        setSubmitNotes('')
        setShowSubmitInput(false)
      },
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
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
              {invoice.invoice_number}
            </h1>
            <p className="text-sm text-slate-500 mt-1 font-extralight">
              Vendor Invoice Detail
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {invoice.payment_status === 'PENDING' && (
            <Button
              variant="outline"
              className="gap-2 text-emerald-600 border-emerald-200 hover:bg-emerald-50"
              onClick={() => markPaid.mutate(undefined)}
              disabled={markPaid.isPending}
            >
              <CheckCircle className="w-4 h-4" />
              Mark as Paid
            </Button>
          )}
          <Button
            variant="outline"
            className="gap-2 text-red-500 border-red-200 hover:bg-red-50"
            onClick={handleDelete}
            disabled={deleteInvoice.isPending}
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-light">Invoice Information</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-slate-500">Vendor</p>
                <Link
                  to="/facility-management/vendors/$vendorId"
                  params={{ vendorId: invoice.vendor.id }}
                  className="text-indigo-600 hover:underline font-medium"
                >
                  {invoice.vendor.name}
                </Link>
              </div>
              <div>
                <p className="text-slate-500">Vendor Code</p>
                <p className="font-mono">{invoice.vendor.vendor_code}</p>
              </div>
              <div>
                <p className="text-slate-500">Invoice Date</p>
                <p>{new Date(invoice.invoice_date).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-slate-500">Due Date</p>
                <p>
                  {invoice.due_date
                    ? new Date(invoice.due_date).toLocaleDateString()
                    : '—'}
                </p>
              </div>
              {invoice.po_id && (
                <div>
                  <p className="text-slate-500">PO Reference</p>
                  <p className="font-mono text-xs">{invoice.po_id}</p>
                </div>
              )}
              <div>
                <p className="text-slate-500">Payment Status</p>
                <Badge
                  className={`text-xs font-normal ${
                    invoice.payment_status === 'PAID'
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  {invoice.payment_status}
                </Badge>
              </div>
              {invoice.payment_date && (
                <div>
                  <p className="text-slate-500">Payment Date</p>
                  <p>{new Date(invoice.payment_date).toLocaleDateString()}</p>
                </div>
              )}
              {invoice.pdf_url && (
                <div className="col-span-2">
                  <p className="text-slate-500">PDF Document</p>
                  <a
                    href={invoice.pdf_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-600 hover:underline flex items-center gap-1 text-sm"
                  >
                    <FileText className="w-4 h-4" />
                    View PDF
                  </a>
                </div>
              )}
              {invoice.notes && (
                <div className="col-span-2">
                  <p className="text-slate-500">Notes</p>
                  <p className="text-slate-700">{invoice.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base font-light">Line Items</CardTitle>
            </CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-slate-500">
                    <th className="text-left pb-2 font-normal">Description</th>
                    <th className="text-right pb-2 font-normal w-20">Qty</th>
                    <th className="text-right pb-2 font-normal w-28">Unit Price</th>
                    <th className="text-right pb-2 font-normal w-28">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.items.map((item, idx) => (
                    <tr key={idx} className="border-b last:border-0">
                      <td className="py-2">{item.description}</td>
                      <td className="py-2 text-right">{item.quantity}</td>
                      <td className="py-2 text-right">{item.unit_price.toLocaleString()}</td>
                      <td className="py-2 text-right">{item.total.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-4 space-y-1 text-sm max-w-xs ml-auto">
                <div className="flex justify-between text-slate-500">
                  <span>Subtotal</span>
                  <span>{invoice.subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Tax</span>
                  <span>{invoice.tax.toLocaleString()}</span>
                </div>
                <div className="flex justify-between font-semibold border-t pt-1">
                  <span>Total</span>
                  <span>{invoice.total.toLocaleString()} THB</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-light flex items-center gap-2">
                  <Clock className="w-4 h-4 text-slate-400" />
                  Submission History
                </CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1 text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                  onClick={() => setShowSubmitInput((v) => !v)}
                >
                  <Send className="w-3 h-3" />
                  Submit
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {showSubmitInput && (
                <div className="space-y-2 border rounded-lg p-3 bg-indigo-50">
                  <div>
                    <Label className="text-xs">Notes (optional)</Label>
                    <Input
                      value={submitNotes}
                      onChange={(e) => setSubmitNotes(e.target.value)}
                      placeholder="Submission notes..."
                      className="h-8 text-sm mt-1"
                    />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setShowSubmitInput(false)
                        setSubmitNotes('')
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      className="bg-indigo-600 hover:bg-indigo-700"
                      onClick={handleSubmit}
                      disabled={submitInvoice.isPending}
                    >
                      Confirm
                    </Button>
                  </div>
                </div>
              )}

              {submissionHistory.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-4">
                  No submission history yet
                </p>
              ) : (
                <div className="space-y-3">
                  {submissionHistory
                    .slice()
                    .reverse()
                    .map((event, idx) => (
                      <div key={idx} className="border-l-2 border-indigo-200 pl-3">
                        <p className="text-xs text-slate-500">
                          {new Date(event.submittedAt).toLocaleString()}
                        </p>
                        {event.notes && (
                          <p className="text-sm text-slate-700 mt-0.5">{event.notes}</p>
                        )}
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
