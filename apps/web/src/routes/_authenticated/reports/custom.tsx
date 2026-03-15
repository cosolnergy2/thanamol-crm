import { createFileRoute } from '@tanstack/react-router'
import { Settings2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { PageHeader } from '@/components/PageHeader'

export const Route = createFileRoute('/_authenticated/reports/custom')({
  component: CustomReportsPage,
})

function CustomReportsPage() {
  return (
    <div className="space-y-3">
      <PageHeader title="Custom Reports" />
      <Card>
        <CardContent className="py-16 text-center">
          <Settings2 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-sm text-slate-500 font-light">
            Custom report builder — coming soon
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Configure custom filters, groupings, and export formats
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
