import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useCashFlowAnalysis } from '@/hooks/useCFODashboard'

export const Route = createFileRoute('/_authenticated/finance/executive/cash-flow/')({ component: CashFlowPage })

function formatCurrency(val: number) { return new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(val)) }

function CashFlowPage() {
  const year = new Date().getFullYear()
  const [dateFrom, setDateFrom] = useState(`${year}-01-01`)
  const [dateTo, setDateTo] = useState(new Date().toISOString().slice(0, 10))

  const { data, isLoading } = useCashFlowAnalysis(dateFrom, dateTo)

  function FlowCard({ title, thTitle, amount, icon: Icon, color }: { title: string; thTitle: string; amount: number; icon: any; color: string }) {
    const isPositive = amount >= 0
    return (
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-slate-500">{title}</p>
              <p className="text-xs text-slate-400">{thTitle}</p>
              <p className={`text-2xl font-bold mt-2 ${color}`}>
                {isPositive ? '+' : '-'}{formatCurrency(amount)}
              </p>
            </div>
            <div className={`p-2 rounded-lg ${isPositive ? 'bg-green-50' : 'bg-red-50'}`}>
              {isPositive ? <ArrowUpRight className="w-5 h-5 text-green-600" /> : <ArrowDownRight className="w-5 h-5 text-red-600" />}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extralight tracking-[0.3em] text-slate-600 uppercase">Cash Flow Analysis</h1>
        <p className="text-sm text-slate-500 mt-1">วิเคราะห์กระแสเงินสด</p>
      </div>

      <div className="flex gap-4 items-end">
        <div><Label>From</Label><Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-44" /></div>
        <div><Label>To</Label><Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-44" /></div>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-slate-400">Loading...</div>
      ) : data ? (
        <>
          <div className="grid grid-cols-3 gap-4">
            <FlowCard title="Operating Activities" thTitle="กิจกรรมดำเนินงาน" amount={data.operating} icon={ArrowUpRight} color={data.operating >= 0 ? 'text-green-600' : 'text-red-600'} />
            <FlowCard title="Investing Activities" thTitle="กิจกรรมลงทุน" amount={data.investing} icon={ArrowDownRight} color={data.investing >= 0 ? 'text-green-600' : 'text-red-600'} />
            <FlowCard title="Financing Activities" thTitle="กิจกรรมจัดหาเงิน" amount={data.financing} icon={Minus} color={data.financing >= 0 ? 'text-green-600' : 'text-red-600'} />
          </div>

          <Card className="bg-slate-50">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Net Change in Cash</p>
                  <p className="text-xs text-slate-400">การเปลี่ยนแปลงเงินสดสุทธิ</p>
                </div>
                <p className={`text-3xl font-bold ${data.net_change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {data.net_change >= 0 ? '+' : '-'}{formatCurrency(data.net_change)}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm font-medium">Cash Flow Breakdown</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm py-2 border-b">
                <span>Operating Activities</span>
                <span className={`font-mono font-medium ${data.operating >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {data.operating >= 0 ? '+' : '-'}{formatCurrency(data.operating)}
                </span>
              </div>
              <div className="flex justify-between text-sm py-2 border-b">
                <span>Investing Activities</span>
                <span className={`font-mono font-medium ${data.investing >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {data.investing >= 0 ? '+' : '-'}{formatCurrency(data.investing)}
                </span>
              </div>
              <div className="flex justify-between text-sm py-2 border-b">
                <span>Financing Activities</span>
                <span className={`font-mono font-medium ${data.financing >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {data.financing >= 0 ? '+' : '-'}{formatCurrency(data.financing)}
                </span>
              </div>
              <div className="flex justify-between text-sm font-bold py-2">
                <span>Net Change</span>
                <span className={`font-mono ${data.net_change >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                  {data.net_change >= 0 ? '+' : '-'}{formatCurrency(data.net_change)}
                </span>
              </div>
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  )
}
