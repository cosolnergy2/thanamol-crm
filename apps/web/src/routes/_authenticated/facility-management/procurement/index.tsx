import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import {
  FileText,
  Plus,
  Clock,
  CheckCircle2,
  XCircle,
  Search,
  Trash2,
  Eye,
  Send,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  usePurchaseRequests,
  useDeletePurchaseRequest,
  useSubmitPurchaseRequest,
} from '@/hooks/usePurchaseRequests'
import type { PRStatus } from '@thanamol/shared'

export const Route = createFileRoute(
  '/_authenticated/facility-management/procurement/'
)({
  component: ProcurementIndexPage,
})

const STATUS_TABS: Array<{ label: string; value: PRStatus | 'all' }> = [
  { label: 'All', value: 'all' },
  { label: 'Draft', value: 'DRAFT' },
  { label: 'Submitted', value: 'SUBMITTED' },
  { label: 'Approved', value: 'APPROVED' },
  { label: 'Rejected', value: 'REJECTED' },
  { label: 'Converted', value: 'CONVERTED' },
]

const STATUS_BADGE: Record<PRStatus, string> = {
  DRAFT: 'bg-slate-100 text-slate-700',
  SUBMITTED: 'bg-yellow-100 text-yellow-700',
  APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
  CANCELLED: 'bg-slate-100 text-slate-500',
  CONVERTED: 'bg-indigo-100 text-indigo-700',
}

function ProcurementIndexPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState<PRStatus | 'all'>('all')

  const { data, isLoading } = usePurchaseRequests({
    search: search || undefined,
    status: activeTab === 'all' ? undefined : activeTab,
    limit: 50,
  })

  const deletePR = useDeletePurchaseRequest()
  const submitPR = useSubmitPurchaseRequest()

  const prs = data?.data ?? []
  const total = data?.pagination.total ?? 0

  const draftCount = prs.filter((p) => p.status === 'DRAFT').length
  const submittedCount = prs.filter((p) => p.status === 'SUBMITTED').length
  const approvedCount = prs.filter((p) => p.status === 'APPROVED').length

  function handleDelete(id: string, prNumber: string) {
    if (!confirm(`Delete PR ${prNumber}?`)) return
    deletePR.mutate(id)
  }

  function handleSubmit(id: string) {
    if (!confirm('Submit this PR for approval?')) return
    submitPR.mutate(id)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extralight tracking-[0.3em] text-slate-600 uppercase">
            Purchase Requests
          </h1>
          <p className="text-sm text-slate-500 mt-1">คำขอซื้อ — {total} total</p>
        </div>
        <Link to="/facility-management/procurement/requests/create">
          <Button className="bg-indigo-600 hover:bg-indigo-700 gap-2">
            <Plus className="w-4 h-4" />
            New PR
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">Draft</p>
                <p className="text-2xl font-light text-slate-700 mt-1">{draftCount}</p>
              </div>
              <FileText className="w-8 h-8 text-slate-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">Pending Approval</p>
                <p className="text-2xl font-light text-slate-700 mt-1">{submittedCount}</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">Approved</p>
                <p className="text-2xl font-light text-slate-700 mt-1">{approvedCount}</p>
              </div>
              <CheckCircle2 className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex gap-2 items-center">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search PR number or title..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <div className="flex gap-1 border-b">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.value
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {isLoading ? (
            <div className="py-12 text-center text-slate-400">Loading...</div>
          ) : prs.length === 0 ? (
            <div className="py-12 text-center text-slate-400">No purchase requests found</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>PR Number</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Requester</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead className="text-right">Est. Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {prs.map((pr) => (
                  <TableRow key={pr.id}>
                    <TableCell className="font-mono text-sm">{pr.pr_number}</TableCell>
                    <TableCell>{pr.title}</TableCell>
                    <TableCell>
                      {pr.requester.first_name} {pr.requester.last_name}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {pr.priority}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      ฿{(pr.estimated_total ?? 0).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge className={STATUS_BADGE[pr.status]}>{pr.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() =>
                            navigate({
                              to: '/facility-management/procurement/requests/$prId',
                              params: { prId: pr.id },
                            })
                          }
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        {pr.status === 'DRAFT' && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleSubmit(pr.id)}
                              disabled={submitPR.isPending}
                              title="Submit for approval"
                            >
                              <Send className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-500 hover:text-red-700"
                              onClick={() => handleDelete(pr.id, pr.pr_number)}
                              disabled={deletePR.isPending}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                        {pr.status === 'APPROVED' && (
                          <Link
                            to="/facility-management/procurement/orders/create"
                            search={{ prId: pr.id }}
                          >
                            <Button variant="outline" size="sm" className="text-xs">
                              Create PO
                            </Button>
                          </Link>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
