import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { Calculator, BookOpen } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useCalculateDepreciation, usePostDepreciation } from '@/hooks/useFixedAssetAccounting'
import { useToast } from '@/components/ui/use-toast'

export const Route = createFileRoute('/_authenticated/finance/fixed-assets/depreciation/')({ component: DepreciationPage })

function DepreciationPage() {
  const { toast } = useToast()
  const now = new Date()
  const [period, setPeriod] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`)
  const [results, setResults] = useState<any>(null)

  const calculate = useCalculateDepreciation()
  const post = usePostDepreciation()

  async function handleCalculate() {
    try {
      const res = await calculate.mutateAsync(period)
      setResults(res)
      toast({ title: `Calculated ${res.calculated} assets` })
    } catch (err: any) {
      toast({ title: err?.message ?? 'Failed', variant: 'destructive' })
    }
  }

  async function handlePost() {
    if (!confirm(`Post depreciation for ${period}?`)) return
    try {
      const res = await post.mutateAsync(period)
      toast({ title: `Posted ${res.posted} entries` })
    } catch (err: any) {
      toast({ title: err?.message ?? 'Failed', variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extralight tracking-[0.3em] text-slate-600 uppercase">Depreciation Posting</h1>
        <p className="text-sm text-slate-500 mt-1">คำนวณและบันทึกค่าเสื่อมราคา</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm font-medium">Calculate Depreciation</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4 items-end">
            <div>
              <Label>Period</Label>
              <Input type="month" value={period} onChange={(e) => setPeriod(e.target.value)} className="w-44" />
            </div>
            <Button onClick={handleCalculate} disabled={calculate.isPending}>
              <Calculator className="w-4 h-4 mr-1" /> {calculate.isPending ? 'Calculating...' : 'Calculate'}
            </Button>
            <Button variant="outline" onClick={handlePost} disabled={post.isPending}>
              <BookOpen className="w-4 h-4 mr-1" /> {post.isPending ? 'Posting...' : 'Post to Ledger'}
            </Button>
          </div>

          {results && (
            <div className="mt-4">
              <p className="text-sm text-slate-600 mb-2">Calculated {results.calculated} assets:</p>
              <div className="space-y-1 max-h-60 overflow-y-auto">
                {results.results?.map((r: any, i: number) => (
                  <div key={i} className="flex justify-between text-sm py-1 px-2 bg-slate-50 rounded">
                    <span className="font-mono text-xs">{r.assetNumber}</span>
                    <span className="font-mono">
                      {new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2 }).format(r.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
