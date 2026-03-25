import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, Save, MapPin } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useCreateZone, useZones } from '@/hooks/useZones'
import { useProjects } from '@/hooks/useProjects'
import type { CreateZoneRequest } from '@thanamol/shared'

export const Route = createFileRoute('/_authenticated/facility-management/zones/create')({
  component: ZoneCreatePage,
})

const zoneSchema = z.object({
  projectId: z.string().min(1, 'Project is required'),
  code: z.string().min(1, 'Zone code is required'),
  name: z.string().min(1, 'Zone name is required'),
  description: z.string().optional(),
  floor: z.string().optional(),
  building: z.string().optional(),
  parentZoneId: z.string().optional(),
})

type ZoneFormValues = z.infer<typeof zoneSchema>

function ZoneCreatePage() {
  const navigate = useNavigate()
  const createZone = useCreateZone()

  const { data: projectsData } = useProjects({ limit: 100 })
  const projects = projectsData?.data ?? []

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ZoneFormValues>({
    resolver: zodResolver(zoneSchema),
    defaultValues: {
      projectId: '',
      parentZoneId: '',
    },
  })

  const projectIdValue = watch('projectId')
  const parentZoneIdValue = watch('parentZoneId')

  const { data: parentZonesData } = useZones({ projectId: projectIdValue })
  const parentZones = parentZonesData?.data ?? []

  async function onSubmit(values: ZoneFormValues) {
    const payload: CreateZoneRequest = {
      projectId: values.projectId,
      code: values.code,
      name: values.name,
      description: values.description || undefined,
      floor: values.floor || undefined,
      building: values.building || undefined,
      parentZoneId: values.parentZoneId || undefined,
    }

    try {
      await createZone.mutateAsync(payload)
      toast.success('Zone created successfully')
      navigate({ to: '/facility-management/zones' })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create zone')
    }
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
            Add Zone
          </h1>
          <div className="h-px w-20 bg-gradient-to-r from-slate-300 to-transparent mt-2" />
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
            <div className="space-y-2">
              <Label htmlFor="projectId">
                Project <span className="text-rose-500">*</span>
              </Label>
              <Select
                value={projectIdValue}
                onValueChange={(v) => {
                  setValue('projectId', v)
                  setValue('parentZoneId', '')
                }}
              >
                <SelectTrigger id="projectId">
                  <SelectValue placeholder="Select a project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.projectId && (
                <p className="text-xs text-rose-600">{errors.projectId.message}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="code">
                  Zone Code <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="code"
                  {...register('code')}
                  placeholder="e.g. Z-01"
                />
                {errors.code && (
                  <p className="text-xs text-rose-600">{errors.code.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">
                  Zone Name <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="name"
                  {...register('name')}
                  placeholder="e.g. Ground Floor West Wing"
                />
                {errors.name && (
                  <p className="text-xs text-rose-600">{errors.name.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="floor">Floor</Label>
                <Input
                  id="floor"
                  {...register('floor')}
                  placeholder="e.g. G, 1, 2"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="building">Building</Label>
                <Input
                  id="building"
                  {...register('building')}
                  placeholder="e.g. Building A"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="parentZoneId">Parent Zone</Label>
              <Select
                value={parentZoneIdValue ?? ''}
                onValueChange={(v) => setValue('parentZoneId', v === 'none' ? '' : v)}
                disabled={!projectIdValue}
              >
                <SelectTrigger id="parentZoneId">
                  <SelectValue placeholder={projectIdValue ? 'Select parent zone (optional)' : 'Select project first'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (top-level zone)</SelectItem>
                  {parentZones.map((zone) => (
                    <SelectItem key={zone.id} value={zone.id}>
                      {zone.code} — {zone.name}
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
            disabled={createZone.isPending}
          >
            <Save className="w-4 h-4 mr-2" />
            {createZone.isPending ? 'Saving...' : 'Save Zone'}
          </Button>
        </div>
      </form>
    </div>
  )
}
