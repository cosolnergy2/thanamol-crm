import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useEffect } from 'react'
import { ArrowLeft, Save, MapPin } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useZone, useUpdateZone, useZones } from '@/hooks/useZones'
import type { UpdateZoneRequest } from '@thanamol/shared'

export const Route = createFileRoute('/_authenticated/facility-management/zones/$zoneId/edit')({
  component: ZoneEditPage,
})

const zoneSchema = z.object({
  code: z.string().min(1, 'Zone code is required'),
  name: z.string().min(1, 'Zone name is required'),
  description: z.string().optional(),
  floor: z.string().optional(),
  building: z.string().optional(),
  parentZoneId: z.string().optional(),
})

type ZoneFormValues = z.infer<typeof zoneSchema>

function ZoneEditPage() {
  const { zoneId } = Route.useParams()
  const navigate = useNavigate()
  const { data, isLoading, isError } = useZone(zoneId)
  const updateZone = useUpdateZone(zoneId)

  const zone = data?.zone
  const projectId = zone?.project_id ?? ''

  const { data: siblingsData } = useZones({ projectId })
  const siblingZones = (siblingsData?.data ?? []).filter((z) => z.id !== zoneId)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<ZoneFormValues>({
    resolver: zodResolver(zoneSchema),
  })

  const parentZoneIdValue = watch('parentZoneId')

  useEffect(() => {
    if (zone) {
      reset({
        code: zone.code,
        name: zone.name,
        description: zone.description ?? '',
        floor: zone.floor ?? '',
        building: zone.building ?? '',
        parentZoneId: zone.parent_zone_id ?? '',
      })
    }
  }, [zone, reset])

  async function onSubmit(values: ZoneFormValues) {
    const payload: UpdateZoneRequest = {
      code: values.code,
      name: values.name,
      description: values.description || undefined,
      floor: values.floor || undefined,
      building: values.building || undefined,
      parentZoneId: values.parentZoneId || undefined,
    }

    try {
      await updateZone.mutateAsync(payload)
      toast.success('Zone updated successfully')
      navigate({ to: '/facility-management/zones' })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update zone')
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-3 max-w-2xl">
        <Skeleton className="h-10 w-48" />
        <Card>
          <CardContent className="pt-4 space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    )
  }

  if (isError || !zone) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-600">Zone not found.</p>
        <Link to="/facility-management/zones">
          <Button variant="outline" className="mt-4">
            Back to Zones
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-3 max-w-2xl">
      <div className="flex items-center space-x-3 mb-4">
        <Link to="/facility-management/zones">
          <Button variant="outline" size="icon" className="h-8 w-8">
            <ArrowLeft className="w-3.5 h-3.5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-extralight tracking-[0.3em] text-slate-600 uppercase">
            Edit Zone
          </h1>
          <div className="h-px w-20 bg-gradient-to-r from-slate-300 to-transparent mt-2" />
          <p className="text-xs text-slate-400 font-extralight mt-1">{zone.code} — {zone.name}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <Card className="mb-3">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center text-sm font-light tracking-wider text-slate-700">
              <MapPin className="w-4 h-4 mr-2 text-indigo-600" />
              Zone Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="code">
                  Zone Code <span className="text-rose-500">*</span>
                </Label>
                <Input id="code" {...register('code')} placeholder="e.g. Z-01" />
                {errors.code && (
                  <p className="text-xs text-rose-600">{errors.code.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">
                  Zone Name <span className="text-rose-500">*</span>
                </Label>
                <Input id="name" {...register('name')} placeholder="e.g. Ground Floor West Wing" />
                {errors.name && (
                  <p className="text-xs text-rose-600">{errors.name.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="floor">Floor</Label>
                <Input id="floor" {...register('floor')} placeholder="e.g. G, 1, 2" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="building">Building</Label>
                <Input id="building" {...register('building')} placeholder="e.g. Building A" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="parentZoneId">Parent Zone</Label>
              <Select
                value={parentZoneIdValue || 'none'}
                onValueChange={(v) => setValue('parentZoneId', v === 'none' ? '' : v)}
              >
                <SelectTrigger id="parentZoneId">
                  <SelectValue placeholder="Select parent zone (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (top-level zone)</SelectItem>
                  {siblingZones.map((z) => (
                    <SelectItem key={z.id} value={z.id}>
                      {z.code} — {z.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                {...register('description')}
                placeholder="Optional description of this zone..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-end space-x-3 pb-8">
          <Link to="/facility-management/zones">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button
            type="submit"
            className="bg-indigo-600 hover:bg-indigo-700"
            disabled={updateZone.isPending}
          >
            <Save className="w-4 h-4 mr-2" />
            {updateZone.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </div>
  )
}
