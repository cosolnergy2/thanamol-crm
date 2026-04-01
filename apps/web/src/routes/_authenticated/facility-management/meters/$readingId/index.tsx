import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { ArrowLeft, Gauge } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useFmsMeterReading } from '@/hooks/useMeters'
import type { FmsMeterType } from '@thanamol/shared'

export const Route = createFileRoute(
  '/_authenticated/facility-management/meters/$readingId/',
)({
  component: MeterReadingDetailPage,
})

const METER_TYPE_LABELS: Record<FmsMeterType, string> = {
  ELECTRICITY: 'Electricity',
  WATER: 'Water',
  GAS: 'Gas',
}

const METER_TYPE_COLORS: Record<FmsMeterType, string> = {
  ELECTRICITY: 'bg-amber-50 text-amber-700 border-amber-200',
  WATER: 'bg-teal-50 text-teal-700 border-teal-200',
  GAS: 'bg-indigo-50 text-indigo-700 border-indigo-200',
}

function MeterReadingDetailPage() {
  const { readingId } = Route.useParams()
  const navigate = useNavigate()
  const { data, isLoading, isError } = useFmsMeterReading(readingId)
  const reading = data?.meterReading

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-2xl">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (isError || !reading) {
    return (
      <div className="p-8 text-center">
        <Gauge className="w-10 h-10 text-slate-300 mx-auto mb-2" />
        <p className="text-slate-500">Meter reading not found.</p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => navigate({ to: '/facility-management/meters' })}
        >
          Back to List
        </Button>
      </div>
    )
  }

  const consumption =
    reading.previous_value != null
      ? Math.max(0, reading.value - reading.previous_value)
      : reading.value

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate({ to: '/facility-management/meters' })}
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-xl font-semibold">Meter Reading Detail</h1>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Reading Information</CardTitle>
            <Badge
              className={`text-xs ${METER_TYPE_COLORS[reading.meter_type]}`}
              variant="outline"
            >
              {METER_TYPE_LABELS[reading.meter_type]}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
            <div>
              <dt className="text-slate-500">Project</dt>
              <dd className="font-medium mt-0.5">{reading.project?.name ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Location</dt>
              <dd className="font-medium mt-0.5">{reading.location || '—'}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Reading Date</dt>
              <dd className="font-medium mt-0.5">
                {new Date(reading.reading_date).toLocaleDateString()}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Unit</dt>
              <dd className="font-medium mt-0.5">{reading.unit}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Current Value</dt>
              <dd className="font-medium font-mono mt-0.5">{reading.value.toLocaleString()}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Previous Value</dt>
              <dd className="font-medium font-mono mt-0.5">
                {reading.previous_value != null ? reading.previous_value.toLocaleString() : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Consumption</dt>
              <dd className="font-medium font-mono mt-0.5 text-indigo-700">
                {consumption.toLocaleString()} {reading.unit}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Recorded</dt>
              <dd className="font-medium mt-0.5">
                {new Date(reading.created_at).toLocaleString()}
              </dd>
            </div>
            {reading.notes && (
              <div className="col-span-2">
                <dt className="text-slate-500">Notes</dt>
                <dd className="mt-0.5">{reading.notes}</dd>
              </div>
            )}
          </dl>
        </CardContent>
      </Card>
    </div>
  )
}
