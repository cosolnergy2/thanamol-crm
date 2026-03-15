import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowLeft, Pencil, Briefcase, CheckCircle, XCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusBadge } from '@/components/StatusBadge'
import { toast } from 'sonner'
import { useSaleJob, useApproveSaleJob, useRejectSaleJob } from '@/hooks/useSaleJobs'

export const Route = createFileRoute('/_authenticated/forms/sale-job04-f01/$id/')({
  component: SaleJob04F01DetailPage,
})

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="py-2 border-b border-slate-100">
      <p className="text-[9px] text-slate-400 font-extralight uppercase tracking-widest mb-0.5">
        {label}
      </p>
      <p className="text-[11px] font-light text-slate-800">{value ?? '-'}</p>
    </div>
  )
}

function SaleJob04F01DetailPage() {
  const { id } = Route.useParams()
  const { data: job, isLoading, isError } = useSaleJob(id)
  const approveJob = useApproveSaleJob()
  const rejectJob = useRejectSaleJob()

  async function handleApprove() {
    try {
      await approveJob.mutateAsync(id)
      toast.success('Sale job approved')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to approve')
    }
  }

  async function handleReject() {
    try {
      await rejectJob.mutateAsync({ id, reason: 'Rejected by reviewer' })
      toast.success('Sale job rejected')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to reject')
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-3 max-w-4xl">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (isError || !job) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-600">Sale job not found.</p>
        <Link to="/forms/sale-job04-f01">
          <Button variant="outline" className="mt-4">
            Back to List
          </Button>
        </Link>
      </div>
    )
  }

  const formData = job.form_data as Record<string, unknown>

  return (
    <div className="space-y-3 max-w-4xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Link to="/forms/sale-job04-f01">
            <Button variant="outline" size="icon" className="h-8 w-8">
              <ArrowLeft className="w-3.5 h-3.5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-extralight tracking-[0.3em] text-slate-600 uppercase">
              {job.form_number}
            </h1>
            <div className="h-px w-20 bg-gradient-to-r from-slate-300 to-transparent mt-2" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge value={job.status} variant="saleJobStatus" />
          {job.status === 'SUBMITTED' && (
            <>
              <Button
                size="sm"
                className="bg-teal-600 hover:bg-teal-700"
                onClick={handleApprove}
                disabled={approveJob.isPending}
              >
                <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
                Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-rose-600 border-rose-200 hover:bg-rose-50"
                onClick={handleReject}
                disabled={rejectJob.isPending}
              >
                <XCircle className="w-3.5 h-3.5 mr-1.5" />
                Reject
              </Button>
            </>
          )}
          <Link to="/forms/sale-job04-f01/$id/edit" params={{ id }}>
            <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700">
              <Pencil className="w-3.5 h-3.5 mr-2" />
              Edit
            </Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center text-sm font-light tracking-wider text-slate-700">
            <Briefcase className="w-4 h-4 mr-2 text-indigo-600" />
            Job Information
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
            <InfoRow label="Form Number" value={job.form_number} />
            <InfoRow label="Customer" value={job.customer?.name ?? job.customer_id} />
            <InfoRow label="Project" value={job.project?.name ?? '-'} />
            <InfoRow
              label="Unit"
              value={
                job.unit
                  ? `${job.unit.unit_number}${job.unit.building ? ` (${job.unit.building})` : ''}`
                  : '-'
              }
            />
            <InfoRow
              label="Created By"
              value={job.creator ? `${job.creator.first_name} ${job.creator.last_name}` : '-'}
            />
            <InfoRow
              label="Approved By"
              value={job.approver ? `${job.approver.first_name} ${job.approver.last_name}` : '-'}
            />
            <InfoRow label="Created At" value={new Date(job.created_at).toLocaleString()} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-light tracking-wider text-slate-700">
            Invoice Details
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
            <InfoRow
              label="Invoice Date"
              value={
                formData.invoiceDate
                  ? new Date(String(formData.invoiceDate)).toLocaleDateString()
                  : '-'
              }
            />
            <InfoRow
              label="Company Name"
              value={formData.companyName ? String(formData.companyName) : '-'}
            />
          </div>
          {Boolean(formData.notes) && (
            <div className="mt-3 pt-3 border-t border-slate-100">
              <p className="text-[9px] text-slate-400 font-extralight uppercase tracking-widest mb-1">
                Notes
              </p>
              <p className="text-[11px] font-light text-slate-700 whitespace-pre-wrap">
                {String(formData.notes)}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
