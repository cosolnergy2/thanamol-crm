import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { Download, FileText, Database } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { PageHeader } from '@/components/PageHeader'
import { apiGet } from '@/lib/api-client'

export const Route = createFileRoute('/_authenticated/settings/export')({
  component: SettingsExportPage,
})

const EXPORT_ENTITIES = [
  { value: 'customers', label: 'Customers', description: 'All customer records' },
  { value: 'companies', label: 'Companies', description: 'All company records' },
  { value: 'contacts', label: 'Contacts', description: 'All contact records' },
  { value: 'projects', label: 'Projects', description: 'All project records' },
  { value: 'units', label: 'Units', description: 'All property unit records' },
  { value: 'leads', label: 'Leads', description: 'All lead records' },
  { value: 'deals', label: 'Deals', description: 'All deal records' },
  { value: 'quotations', label: 'Quotations', description: 'All quotation records' },
] as const

type ExportFormat = 'json' | 'csv'

function SettingsExportPage() {
  const [format, setFormat] = useState<ExportFormat>('json')
  const [exporting, setExporting] = useState<string | null>(null)

  async function handleExport(entity: string) {
    setExporting(entity)
    try {
      const data = await apiGet<unknown[]>(`/${entity}?limit=10000`)

      const filename = `${entity}-export-${new Date().toISOString().slice(0, 10)}`

      if (format === 'json') {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
        downloadBlob(blob, `${filename}.json`)
      } else {
        const csv = convertToCSV(data as Record<string, unknown>[])
        const blob = new Blob([csv], { type: 'text/csv' })
        downloadBlob(blob, `${filename}.csv`)
      }

      toast.success(`${entity} exported successfully`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : `Failed to export ${entity}`)
    } finally {
      setExporting(null)
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Data Export" />

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-light text-slate-600 flex items-center gap-2">
            <Database className="w-4 h-4 text-indigo-500" />
            Export Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            <Label className="text-xs text-slate-500">Export Format</Label>
            <Select
              value={format}
              onValueChange={(v) => setFormat(v as ExportFormat)}
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="json">JSON</SelectItem>
                <SelectItem value="csv">CSV</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-light text-slate-600 flex items-center gap-2">
            <FileText className="w-4 h-4 text-teal-500" />
            Available Exports
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {EXPORT_ENTITIES.map((entity) => (
              <div
                key={entity.value}
                className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:bg-slate-50/50"
              >
                <div>
                  <p className="text-[11px] font-light text-slate-800">{entity.label}</p>
                  <p className="text-[9px] text-slate-400">{entity.description}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-[10px] gap-1.5"
                  disabled={exporting === entity.value}
                  onClick={() => handleExport(entity.value)}
                >
                  <Download className="w-3 h-3" />
                  {exporting === entity.value ? 'Exporting...' : format.toUpperCase()}
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

function convertToCSV(records: Record<string, unknown>[]): string {
  if (records.length === 0) return ''
  const topLevel = (records as Array<{ data?: unknown[] }>)[0]
  const rows: Record<string, unknown>[] = Array.isArray(topLevel?.data)
    ? (topLevel.data as Record<string, unknown>[])
    : records

  if (rows.length === 0) return ''
  const headers = Object.keys(rows[0])
  const lines = [
    headers.join(','),
    ...rows.map((row) =>
      headers
        .map((h) => {
          const val = row[h]
          const str = val === null || val === undefined ? '' : String(val)
          return str.includes(',') || str.includes('"') || str.includes('\n')
            ? `"${str.replace(/"/g, '""')}"`
            : str
        })
        .join(',')
    ),
  ]
  return lines.join('\n')
}
