import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowLeft, Package } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useStockIssue } from '@/hooks/useStockIssues'
import type { StockIssueItem } from '@thanamol/shared'

export const Route = createFileRoute(
  '/_authenticated/facility-management/inventory/stock-issues/$issueId/'
)({
  component: StockIssueDetailPage,
})

function StockIssueDetailPage() {
  const { issueId } = Route.useParams()
  const { data, isLoading, isError } = useStockIssue(issueId)
  const issue = data?.issue

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-slate-400">
        Loading...
      </div>
    )
  }

  if (isError || !issue) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <Package className="w-12 h-12 text-slate-300" />
        <p className="text-slate-500">Stock issue not found.</p>
        <Link
          to="/facility-management/inventory/stock-issues"
          className="text-indigo-600 hover:underline text-sm"
        >
          Back to stock issues
        </Link>
      </div>
    )
  }

  const items = issue.items as StockIssueItem[]
  const totalValue = items.reduce((sum, i) => sum + (i.quantity ?? 0), 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/facility-management/inventory/stock-issues">
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-md border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
        </Link>
        <div>
          <h1 className="text-2xl font-extralight tracking-[0.3em] text-slate-600 uppercase">
            {issue.issue_number}
          </h1>
          <p className="text-sm text-slate-500 mt-1 font-extralight">Stock Issue Detail</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium">Issue Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <DetailRow label="Issue Number" value={issue.issue_number} />
            <DetailRow
              label="Issue Date"
              value={new Date(issue.issue_date).toLocaleDateString()}
            />
            <DetailRow label="Site / Project" value={issue.project?.name ?? '—'} />
            <DetailRow
              label="Purpose"
              value={issue.purpose ?? '—'}
            />
            <DetailRow
              label="Issued To"
              value={
                issue.issued_to_user
                  ? `${issue.issued_to_user.first_name} ${issue.issued_to_user.last_name}`
                  : '—'
              }
            />
            <DetailRow
              label="Issued By"
              value={
                issue.issuer
                  ? `${issue.issuer.first_name} ${issue.issuer.last_name}`
                  : '—'
              }
            />
            <DetailRow label="Notes" value={issue.notes ?? '—'} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium">Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <DetailRow label="Total Items" value={String(items.length)} />
            <DetailRow label="Total Quantity" value={String(totalValue)} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium">Items Issued</CardTitle>
        </CardHeader>
        <CardContent className="pt-2">
          {items.length === 0 ? (
            <p className="text-slate-400 text-sm py-6 text-center">No items recorded.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item Code</TableHead>
                  <TableHead>Item Name</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead>Unit of Measure</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-mono text-sm">{item.item_code || '—'}</TableCell>
                    <TableCell className="text-sm">{item.item_name}</TableCell>
                    <TableCell className="text-right text-sm">
                      <Badge variant="outline">{item.quantity}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-slate-500">
                      {item.unit_of_measure ?? '—'}
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

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-slate-500 shrink-0">{label}</span>
      <span className="text-slate-800 text-right">{value}</span>
    </div>
  )
}
