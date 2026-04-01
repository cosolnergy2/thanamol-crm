import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { ClipboardCheck, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { PageHeader } from '@/components/PageHeader'
import { usePreventiveMaintenance, useCreatePMInspection } from '@/hooks/usePreventiveMaintenance'

export const Route = createFileRoute(
  '/_authenticated/facility-management/preventive-maintenance/$pmId/inspect'
)({
  component: PMInspectionFormPage,
})

type ChecklistItem = {
  item: string
  passed: boolean
  notes: string
}

function PMInspectionFormPage() {
  const { pmId } = Route.useParams()
  const navigate = useNavigate()
  const { data } = usePreventiveMaintenance(pmId)
  const pm = data?.pm

  const createInspection = useCreatePMInspection(pmId)

  const [inspectionDate, setInspectionDate] = useState(
    new Date().toISOString().split('T')[0]
  )
  const [inspectorName, setInspectorName] = useState('')
  const [passed, setPassed] = useState<boolean | null>(null)
  const [notes, setNotes] = useState('')
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([])

  function addChecklistItem() {
    setChecklistItems((prev) => [...prev, { item: '', passed: true, notes: '' }])
  }

  function removeChecklistItem(index: number) {
    setChecklistItems((prev) => prev.filter((_, i) => i !== index))
  }

  function updateChecklistItem(index: number, field: keyof ChecklistItem, value: string | boolean) {
    setChecklistItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!inspectorName.trim()) {
      toast.error('Inspector name is required')
      return
    }

    if (passed === null) {
      toast.error('Please select pass or fail status')
      return
    }

    try {
      await createInspection.mutateAsync({
        inspectionDate,
        inspectorName: inspectorName.trim(),
        checklistResults: checklistItems.map((ci) => ({
          item: ci.item,
          passed: ci.passed,
          notes: ci.notes || undefined,
        })),
        passed,
        notes: notes.trim() || undefined,
      })
      toast.success('Inspection recorded successfully')
      navigate({
        to: '/facility-management/preventive-maintenance/$pmId',
        params: { pmId },
      })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to record inspection')
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Record Inspection"
        subtitle={pm ? pm.title : 'Loading...'}
        actions={
          <Link
            to="/facility-management/preventive-maintenance/$pmId"
            params={{ pmId }}
          >
            <Button variant="outline" size="sm">
              Back to PM
            </Button>
          </Link>
        }
      />

      <form onSubmit={handleSubmit} className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-light text-slate-600 flex items-center gap-2">
              <ClipboardCheck className="w-4 h-4 text-slate-400" />
              Inspection Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="inspectionDate">Inspection Date</Label>
                <Input
                  id="inspectionDate"
                  type="date"
                  value={inspectionDate}
                  onChange={(e) => setInspectionDate(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="inspectorName">Inspector Name</Label>
                <Input
                  id="inspectorName"
                  placeholder="Enter inspector name"
                  value={inspectorName}
                  onChange={(e) => setInspectorName(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Overall Result</Label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setPassed(true)}
                  className={`flex-1 py-2.5 rounded-md border text-sm font-light transition-colors ${
                    passed === true
                      ? 'bg-teal-50 border-teal-300 text-teal-700'
                      : 'border-slate-200 text-slate-500 hover:border-teal-200'
                  }`}
                >
                  Pass
                </button>
                <button
                  type="button"
                  onClick={() => setPassed(false)}
                  className={`flex-1 py-2.5 rounded-md border text-sm font-light transition-colors ${
                    passed === false
                      ? 'bg-rose-50 border-rose-300 text-rose-700'
                      : 'border-slate-200 text-slate-500 hover:border-rose-200'
                  }`}
                >
                  Fail
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea
                id="notes"
                placeholder="Any observations or remarks..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-light text-slate-600">
                Checklist Results (optional)
              </CardTitle>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addChecklistItem}
                className="h-7 text-xs"
              >
                <Plus className="w-3 h-3 mr-1" />
                Add Item
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {checklistItems.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">
                No checklist items. Click "Add Item" to record individual checklist results.
              </p>
            ) : (
              <div className="space-y-3">
                {checklistItems.map((ci, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr_auto] gap-2 items-start border-b border-slate-50 pb-3 last:border-0"
                  >
                    <Input
                      placeholder="Checklist item"
                      value={ci.item}
                      onChange={(e) => updateChecklistItem(index, 'item', e.target.value)}
                      className="text-xs"
                    />
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => updateChecklistItem(index, 'passed', true)}
                        className={`px-2 py-1 rounded text-xs border transition-colors ${
                          ci.passed
                            ? 'bg-teal-50 border-teal-300 text-teal-700'
                            : 'border-slate-200 text-slate-400'
                        }`}
                      >
                        P
                      </button>
                      <button
                        type="button"
                        onClick={() => updateChecklistItem(index, 'passed', false)}
                        className={`px-2 py-1 rounded text-xs border transition-colors ${
                          !ci.passed
                            ? 'bg-rose-50 border-rose-300 text-rose-700'
                            : 'border-slate-200 text-slate-400'
                        }`}
                      >
                        F
                      </button>
                    </div>
                    <Input
                      placeholder="Notes (optional)"
                      value={ci.notes}
                      onChange={(e) => updateChecklistItem(index, 'notes', e.target.value)}
                      className="text-xs"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeChecklistItem(index)}
                      className="h-8 w-8 p-0 text-slate-400 hover:text-rose-500"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Link
            to="/facility-management/preventive-maintenance/$pmId"
            params={{ pmId }}
          >
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button
            type="submit"
            className="bg-indigo-600 hover:bg-indigo-700"
            disabled={createInspection.isPending}
          >
            {createInspection.isPending ? 'Saving...' : 'Record Inspection'}
          </Button>
        </div>
      </form>
    </div>
  )
}
