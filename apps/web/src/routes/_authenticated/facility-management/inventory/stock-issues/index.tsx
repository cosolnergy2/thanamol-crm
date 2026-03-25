import { createFileRoute, Link } from '@tanstack/react-router'
import { Plus, Package } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useStockIssues } from '@/hooks/useStockIssues'

export const Route = createFileRoute(
  '/_authenticated/facility-management/inventory/stock-issues/'
)({
  component: StockIssueListPage,
})

function StockIssueListPage() {
  const { data, isLoading } = useStockIssues()
  const issues = data?.data ?? []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extralight tracking-[0.3em] text-slate-600 uppercase">
            Stock Issues
          </h1>
          <p className="text-sm text-slate-500 mt-1 font-extralight">
            Issue stock to work orders or projects
          </p>
        </div>
        <Link to="/facility-management/inventory/stock-issues/create">
          <Button className="bg-indigo-600 hover:bg-indigo-700 gap-2">
            <Plus className="w-4 h-4" />
            Issue Stock
          </Button>
        </Link>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Issue Number</TableHead>
                <TableHead>Issue Date</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Issued To</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-slate-400 py-8">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : issues.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12">
                    <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500">No stock issues found</p>
                  </TableCell>
                </TableRow>
              ) : (
                issues.map((issue) => {
                  const items = issue.items as Array<{ item_name: string }>
                  return (
                    <TableRow key={issue.id}>
                      <TableCell className="font-mono text-sm font-medium">
                        {issue.issue_number}
                      </TableCell>
                      <TableCell className="text-sm text-slate-600">
                        {new Date(issue.issue_date).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-sm">
                        {issue.project?.name ?? '—'}
                      </TableCell>
                      <TableCell className="text-sm">
                        {issue.issued_to_user
                          ? `${issue.issued_to_user.first_name} ${issue.issued_to_user.last_name}`
                          : '—'}
                      </TableCell>
                      <TableCell className="text-sm text-slate-600">
                        {items.length} item{items.length !== 1 ? 's' : ''}
                      </TableCell>
                      <TableCell className="text-sm text-slate-500">
                        {issue.notes ?? '—'}
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
