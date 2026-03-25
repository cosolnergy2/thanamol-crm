import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { Plus, DollarSign, TrendingUp, TrendingDown, Search } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import { usePettyCashFunds, usePettyCashTransactions } from '@/hooks/usePettyCash'
import { useProjects } from '@/hooks/useProjects'
import { format } from 'date-fns'
import type { PettyCashStatus } from '@thanamol/shared'

export const Route = createFileRoute('/_authenticated/facility-management/petty-cash/')({
  component: PettyCashPage,
})

type ActiveTab = 'funds' | 'transactions'

const STATUS_CLASSES: Record<PettyCashStatus, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  APPROVED: 'bg-blue-100 text-blue-700',
  REJECTED: 'bg-red-100 text-red-700',
  SETTLED: 'bg-green-100 text-green-700',
}

function PettyCashPage() {
  const [tab, setTab] = useState<ActiveTab>('funds')
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [selectedFundId, setSelectedFundId] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [search, setSearch] = useState('')

  const { data: projectsData } = useProjects({ limit: 100 })
  const projects = projectsData?.data ?? []

  const { data: fundsData, isLoading: loadingFunds } = usePettyCashFunds({
    projectId: selectedProjectId || undefined,
  })
  const funds = fundsData?.data ?? []

  const { data: txData, isLoading: loadingTx } = usePettyCashTransactions({
    projectId: selectedProjectId || undefined,
    fundId: selectedFundId || undefined,
    status: filterStatus !== 'all' ? filterStatus : undefined,
  })
  const transactions = txData?.data ?? []

  const filteredFunds = search
    ? funds.filter((f) => f.fund_name.toLowerCase().includes(search.toLowerCase()))
    : funds

  const filteredTransactions = search
    ? transactions.filter(
        (tx) =>
          tx.transaction_number.toLowerCase().includes(search.toLowerCase()) ||
          tx.description.toLowerCase().includes(search.toLowerCase())
      )
    : transactions

  const totalBalance = funds.reduce((sum, f) => sum + f.current_balance, 0)
  const totalFunded = funds.reduce((sum, f) => sum + f.total_amount, 0)
  const pendingCount = transactions.filter((tx) => tx.status === 'PENDING').length

  return (
    <div className="space-y-4">
      <PageHeader
        title="Petty Cash"
        actions={
          <div className="flex gap-2">
            <Link to="/facility-management/petty-cash/funds/create">
              <Button variant="outline" size="sm">
                <Plus className="w-4 h-4 mr-1" />
                New Fund
              </Button>
            </Link>
            <Link to="/facility-management/petty-cash/transactions/create">
              <Button className="bg-indigo-600 hover:bg-indigo-700" size="sm">
                <Plus className="w-4 h-4 mr-1" />
                New Transaction
              </Button>
            </Link>
          </div>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-widest">
                  Total Balance
                </p>
                <p className="text-xl font-light text-slate-700 mt-0.5">
                  ฿{totalBalance.toLocaleString()}
                </p>
              </div>
              <DollarSign className="w-6 h-6 text-indigo-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-widest">
                  Total Funded
                </p>
                <p className="text-xl font-light text-slate-700 mt-0.5">
                  ฿{totalFunded.toLocaleString()}
                </p>
              </div>
              <TrendingUp className="w-6 h-6 text-teal-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-widest">
                  Pending Requests
                </p>
                <p className="text-xl font-light text-yellow-600 mt-0.5">{pendingCount}</p>
              </div>
              <TrendingDown className="w-6 h-6 text-yellow-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col md:flex-row gap-3">
            <Select value={selectedProjectId || '__all__'} onValueChange={(v) => setSelectedProjectId(v === '__all__' ? '' : v)}>
              <SelectTrigger className="w-full md:w-64">
                <SelectValue placeholder="All projects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All projects</SelectItem>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {tab === 'transactions' && (
              <>
                <Select value={selectedFundId || '__all__'} onValueChange={(v) => setSelectedFundId(v === '__all__' ? '' : v)}>
                  <SelectTrigger className="w-full md:w-52">
                    <SelectValue placeholder="All funds" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All funds</SelectItem>
                    {funds.map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.fund_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={filterStatus || '__all__'} onValueChange={(v) => setFilterStatus(v === '__all__' ? '' : v)}>
                  <SelectTrigger className="w-full md:w-44">
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="PENDING">Pending</SelectItem>
                    <SelectItem value="APPROVED">Approved</SelectItem>
                    <SelectItem value="REJECTED">Rejected</SelectItem>
                    <SelectItem value="SETTLED">Settled</SelectItem>
                  </SelectContent>
                </Select>
              </>
            )}

            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-1 border-b border-slate-100">
        {(['funds', 'transactions'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-xs font-light capitalize transition-colors ${
              tab === t
                ? 'border-b-2 border-indigo-500 text-indigo-600'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'funds' && (
        <Card>
          <CardContent className="pt-4 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-100">
                  <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                    Fund Name
                  </TableHead>
                  <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase text-right">
                    Total Amount
                  </TableHead>
                  <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase text-right">
                    Balance
                  </TableHead>
                  <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase text-right">
                    Transactions
                  </TableHead>
                  <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                    Created
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingFunds ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={5}>
                        <Skeleton className="h-8 w-full" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : filteredFunds.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12">
                      <DollarSign className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                      <p className="text-slate-500 font-light">No funds found</p>
                      <Link to="/facility-management/petty-cash/funds/create">
                        <Button
                          variant="link"
                          className="text-indigo-600 text-sm mt-1 font-light"
                        >
                          Create your first fund
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredFunds.map((fund) => (
                    <TableRow key={fund.id} className="hover:bg-slate-50/50 border-slate-100">
                      <TableCell className="text-sm text-slate-700 font-light">
                        {fund.fund_name}
                      </TableCell>
                      <TableCell className="text-sm text-slate-600 text-right font-mono">
                        ฿{fund.total_amount.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-sm text-right font-mono">
                        <span
                          className={
                            fund.current_balance < fund.total_amount * 0.2
                              ? 'text-red-600'
                              : 'text-teal-600'
                          }
                        >
                          ฿{fund.current_balance.toLocaleString()}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-slate-500 text-right">
                        {'_count' in fund
                          ? (fund as unknown as { _count: { transactions: number } })._count
                              .transactions
                          : '—'}
                      </TableCell>
                      <TableCell className="text-xs text-slate-500">
                        {format(new Date(fund.created_at), 'dd/MM/yyyy')}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {tab === 'transactions' && (
        <Card>
          <CardContent className="pt-4 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-100">
                  <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                    Ref #
                  </TableHead>
                  <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                    Date
                  </TableHead>
                  <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                    Description
                  </TableHead>
                  <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                    Category
                  </TableHead>
                  <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase text-right">
                    Amount
                  </TableHead>
                  <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                    Status
                  </TableHead>
                  <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                    Requested By
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingTx ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={7}>
                        <Skeleton className="h-8 w-full" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : filteredTransactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12">
                      <DollarSign className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                      <p className="text-slate-500 font-light">No transactions found</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTransactions.map((tx) => (
                    <TableRow key={tx.id} className="hover:bg-slate-50/50 border-slate-100">
                      <TableCell className="font-mono text-xs text-slate-600">
                        {tx.transaction_number}
                      </TableCell>
                      <TableCell className="text-xs text-slate-500">
                        {format(new Date(tx.transaction_date), 'dd/MM/yyyy')}
                      </TableCell>
                      <TableCell className="text-sm text-slate-700 font-light max-w-xs truncate">
                        {tx.description}
                      </TableCell>
                      <TableCell>
                        {tx.category ? (
                          <Badge variant="outline" className="text-[10px] font-light">
                            {tx.category}
                          </Badge>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-right font-mono font-semibold text-slate-700">
                        ฿{tx.amount.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge className={STATUS_CLASSES[tx.status] ?? ''}>
                          {tx.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-slate-500">
                        {'requester' in tx && tx.requester
                          ? `${(tx.requester as { first_name: string; last_name: string }).first_name} ${(tx.requester as { first_name: string; last_name: string }).last_name}`
                          : '—'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
