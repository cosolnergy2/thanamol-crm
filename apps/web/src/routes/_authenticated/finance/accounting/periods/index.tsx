import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { Lock, Unlock, Clock, Plus } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  useAccountingPeriods,
  useInitializeAccountingPeriods,
  useUpdatePeriodStatus,
} from '@/hooks/useAccountingPeriods'
import { PERIOD_STATUS_LABELS, MONTHS_TH } from '@thanamol/shared'
import type { AccountingPeriodStatus } from '@thanamol/shared'
import { useToast } from '@/components/ui/use-toast'

export const Route = createFileRoute('/_authenticated/finance/accounting/periods/')({
  component: AccountingPeriodsPage,
})

const STATUS_ICONS: Record<AccountingPeriodStatus, typeof Unlock> = {
  OPEN: Unlock,
  SOFT_CLOSED: Clock,
  HARD_CLOSED: Lock,
}

function AccountingPeriodsPage() {
  const { toast } = useToast()
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())

  const { data, isLoading } = useAccountingPeriods(year)
  const initPeriods = useInitializeAccountingPeriods()
  const updateStatus = useUpdatePeriodStatus()

  const periods = data?.data ?? []
  const allMonths = Array.from({ length: 12 }, (_, i) => {
    const existing = periods.find((p) => p.month === i + 1)
    return existing ?? { id: '', year, month: i + 1, status: 'OPEN' as const, closed_by: null, closed_at: null, closer: null }
  })

  const openCount = allMonths.filter((m) => m.status === 'OPEN').length
  const softCount = allMonths.filter((m) => m.status === 'SOFT_CLOSED').length
  const hardCount = allMonths.filter((m) => m.status === 'HARD_CLOSED').length

  async function handleInitialize() {
    if (!confirm(`Initialize all 12 periods for ${year}?`)) return
    try {
      await initPeriods.mutateAsync(year)
      toast({ title: `Periods for ${year} initialized` })
    } catch (err: any) {
      toast({ title: err?.message ?? 'Failed to initialize', variant: 'destructive' })
    }
  }

  async function handleStatusChange(id: string, newStatus: AccountingPeriodStatus, month: number) {
    if (!id) {
      toast({ title: 'Please initialize periods first', variant: 'destructive' })
      return
    }
    if (newStatus === 'HARD_CLOSED' && !confirm(`Hard close ${MONTHS_TH[month - 1]} ${year}? This cannot be undone.`)) return

    try {
      await updateStatus.mutateAsync({ id, status: newStatus })
      toast({ title: `${MONTHS_TH[month - 1]} ${year} — ${PERIOD_STATUS_LABELS[newStatus].th}` })
    } catch (err: any) {
      toast({ title: err?.message ?? 'Failed to update', variant: 'destructive' })
    }
  }

  const yearOptions = [today.getFullYear() - 1, today.getFullYear(), today.getFullYear() + 1]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extralight tracking-[0.3em] text-slate-600 uppercase">
            Period Control
          </h1>
          <p className="text-sm text-slate-500 mt-1">ควบคุมงวดบัญชี — เปิด/ปิดงวดเพื่อควบคุมการบันทึกรายการ</p>
        </div>
        <div className="flex gap-2 items-center">
          <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
            <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
            <SelectContent>
              {yearOptions.map((y) => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {periods.length === 0 && (
            <Button size="sm" onClick={handleInitialize} disabled={initPeriods.isPending}>
              <Plus className="w-4 h-4 mr-1" /> Initialize {year}
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card className="border-green-200">
          <CardContent className="pt-4 flex items-center gap-3">
            <Unlock className="w-8 h-8 text-green-500" />
            <div>
              <p className="text-xs text-slate-500">Open</p>
              <p className="text-2xl font-bold text-green-600">{openCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-yellow-200">
          <CardContent className="pt-4 flex items-center gap-3">
            <Clock className="w-8 h-8 text-yellow-500" />
            <div>
              <p className="text-xs text-slate-500">Soft Closed</p>
              <p className="text-2xl font-bold text-yellow-600">{softCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-red-200">
          <CardContent className="pt-4 flex items-center gap-3">
            <Lock className="w-8 h-8 text-red-500" />
            <div>
              <p className="text-xs text-slate-500">Hard Closed</p>
              <p className="text-2xl font-bold text-red-600">{hardCount}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-slate-400">Loading...</div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {allMonths.map((period) => {
            const config = PERIOD_STATUS_LABELS[period.status as AccountingPeriodStatus]
            const Icon = STATUS_ICONS[period.status as AccountingPeriodStatus]
            return (
              <Card key={period.month} className="relative">
                <CardContent className="pt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4" />
                      <span className="font-medium">{MONTHS_TH[period.month - 1]} {year}</span>
                    </div>
                    <Badge className={`text-xs ${config.color}`}>{config.th}</Badge>
                  </div>
                  {period.status !== 'HARD_CLOSED' && (
                    <div className="flex gap-1">
                      {period.status !== 'OPEN' && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs flex-1"
                          onClick={() => handleStatusChange(period.id, 'OPEN', period.month)}
                        >
                          Open
                        </Button>
                      )}
                      {period.status !== 'SOFT_CLOSED' && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs flex-1"
                          onClick={() => handleStatusChange(period.id, 'SOFT_CLOSED', period.month)}
                        >
                          Soft Close
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs flex-1 text-red-600 border-red-200 hover:bg-red-50"
                        onClick={() => handleStatusChange(period.id, 'HARD_CLOSED', period.month)}
                      >
                        Hard Close
                      </Button>
                    </div>
                  )}
                  {period.closer && (
                    <p className="text-xs text-slate-400">
                      Closed by {period.closer.first_name} {period.closer.last_name}
                    </p>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
