import { useState } from 'react'
import { CornerUpLeft } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { useIssueKey, useReturnKey } from '@/hooks/useKeyRecords'

export function IssueKeyButton({ keyId }: { keyId: string }) {
  const [open, setOpen] = useState(false)
  const [assignedTo, setAssignedTo] = useState('')
  const issueKey = useIssueKey(keyId)

  async function handleIssue() {
    if (!assignedTo) {
      toast.error('Assigned to is required')
      return
    }
    try {
      await issueKey.mutateAsync(assignedTo)
      toast.success('Key issued')
      setOpen(false)
      setAssignedTo('')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to issue key')
    }
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="h-7 text-xs"
        onClick={() => setOpen(true)}
      >
        Issue
      </Button>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setAssignedTo('') }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Issue Key</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label>Assign To *</Label>
              <Input
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                placeholder="Person name"
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setOpen(false); setAssignedTo('') }}>
              Cancel
            </Button>
            <Button
              className="bg-indigo-600 hover:bg-indigo-700"
              onClick={handleIssue}
              disabled={issueKey.isPending}
            >
              {issueKey.isPending ? 'Issuing...' : 'Issue Key'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export function ReturnKeyButton({ keyId }: { keyId: string }) {
  const returnKey = useReturnKey(keyId)

  async function handleReturn() {
    try {
      await returnKey.mutateAsync()
      toast.success('Key returned')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to return key')
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className="h-7 text-xs"
      onClick={handleReturn}
      disabled={returnKey.isPending}
    >
      <CornerUpLeft className="w-3 h-3 mr-1" />
      Return
    </Button>
  )
}
