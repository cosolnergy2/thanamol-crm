import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { Search, Package } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useFixedAssetRegister } from '@/hooks/useFixedAssetAccounting'

export const Route = createFileRoute('/_authenticated/finance/fixed-assets/register/')({ component: FixedAssetRegisterPage })

function formatCurrency(val: number) { return new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val) }

function FixedAssetRegisterPage() {
  const [search, setSearch] = useState('')
  const { data, isLoading } = useFixedAssetRegister({ search: search || undefined, limit: 50 })
  const assets = data?.data ?? []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extralight tracking-[0.3em] text-slate-600 uppercase">Fixed Asset Register</h1>
        <p className="text-sm text-slate-500 mt-1">ทะเบียนทรัพย์สินถาวร</p>
      </div>
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input placeholder="Search asset..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Asset No.</TableHead><TableHead>Name</TableHead><TableHead>Project</TableHead>
                <TableHead>Category</TableHead><TableHead className="text-right">Cost</TableHead><TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? <TableRow><TableCell colSpan={6} className="text-center py-8 text-slate-400">Loading...</TableCell></TableRow>
              : assets.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center py-8 text-slate-400"><Package className="w-8 h-8 mx-auto mb-2 opacity-50" />No assets</TableCell></TableRow>
              : assets.map((a: any) => (
                <TableRow key={a.id}>
                  <TableCell className="font-mono text-sm">{a.asset_number}</TableCell>
                  <TableCell>{a.name}</TableCell>
                  <TableCell className="text-sm">{a.project?.name ?? '-'}</TableCell>
                  <TableCell className="text-sm">{a.category?.name ?? '-'}</TableCell>
                  <TableCell className="text-right font-mono">{a.purchase_cost ? formatCurrency(a.purchase_cost) : '-'}</TableCell>
                  <TableCell><Badge variant="outline" className="text-xs">{a.status}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
