import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, Save, Building2, Phone, Briefcase, FileText } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useCreateCustomer } from '@/hooks/useCustomers'
import { useProjects } from '@/hooks/useProjects'
import type { CreateCustomerRequest, CustomerType, CustomerStatus } from '@thanamol/shared'
import {
  LEAD_SOURCES,
  INDUSTRIES,
  COMPANY_SIZES,
  BUDGET_RANGES,
} from '@thanamol/shared'

export const Route = createFileRoute('/_authenticated/customers/create')({
  component: CustomerCreatePage,
})

const customerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Enter a valid email').optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  taxId: z.string().optional(),
  type: z.enum(['INDIVIDUAL', 'COMPANY']),
  status: z.enum(['ACTIVE', 'INACTIVE', 'PROSPECT']),
  notes: z.string().optional(),
  lineId: z.string().optional(),
  province: z.string().optional(),
  leadSource: z.string().optional(),
  industry: z.string().optional(),
  companySize: z.string().optional(),
  budgetRange: z.string().optional(),
  depositConditions: z.string().optional(),
  profileUrl: z.string().optional(),
  pdpaConsent: z.boolean().optional(),
  interestedProjectId: z.string().optional(),
})

type CustomerFormValues = z.infer<typeof customerSchema>

function CustomerCreatePage() {
  const navigate = useNavigate()
  const createCustomer = useCreateCustomer()
  const { data: projectsData } = useProjects({ limit: 100 })
  const projects = projectsData?.data ?? []

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      type: 'INDIVIDUAL',
      status: 'PROSPECT',
      pdpaConsent: false,
    },
  })

  const typeValue = watch('type')
  const statusValue = watch('status')
  const leadSourceValue = watch('leadSource')
  const industryValue = watch('industry')
  const companySizeValue = watch('companySize')
  const budgetRangeValue = watch('budgetRange')
  const interestedProjectIdValue = watch('interestedProjectId')
  const pdpaConsentValue = watch('pdpaConsent')

  async function onSubmit(values: CustomerFormValues) {
    const payload: CreateCustomerRequest = {
      name: values.name,
      type: values.type as CustomerType,
      status: values.status as CustomerStatus,
      email: values.email || undefined,
      phone: values.phone || undefined,
      address: values.address || undefined,
      taxId: values.taxId || undefined,
      notes: values.notes || undefined,
      lineId: values.lineId || undefined,
      province: values.province || undefined,
      leadSource: values.leadSource || undefined,
      industry: values.industry || undefined,
      companySize: values.companySize || undefined,
      budgetRange: values.budgetRange || undefined,
      depositConditions: values.depositConditions || undefined,
      profileUrl: values.profileUrl || undefined,
      pdpaConsent: values.pdpaConsent ?? false,
      interestedProjectId: values.interestedProjectId || undefined,
    }

    try {
      await createCustomer.mutateAsync(payload)
      toast.success('Customer created successfully')
      navigate({ to: '/customers' })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create customer')
    }
  }

  return (
    <div className="space-y-3 max-w-4xl">
      <div className="flex items-center space-x-3 mb-4">
        <Link to="/customers">
          <Button variant="outline" size="icon" className="h-8 w-8">
            <ArrowLeft className="w-3.5 h-3.5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-extralight tracking-[0.3em] text-slate-600 uppercase">
            Add New Customer
          </h1>
          <div className="h-px w-20 bg-gradient-to-r from-slate-300 to-transparent mt-2" />
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <Card className="mb-3">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center text-sm font-light tracking-wider text-slate-700">
              <Building2 className="w-4 h-4 mr-2 text-indigo-600" />
              Basic Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-0">
            <div className="space-y-2">
              <Label htmlFor="name">
                Name <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="name"
                {...register('name')}
                placeholder="Full name or company name"
              />
              {errors.name && (
                <p className="text-xs text-rose-600">{errors.name.message}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="type">
                  Type <span className="text-rose-500">*</span>
                </Label>
                <Select
                  value={typeValue}
                  onValueChange={(v) => setValue('type', v as CustomerFormValues['type'])}
                >
                  <SelectTrigger id="type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INDIVIDUAL">Individual</SelectItem>
                    <SelectItem value="COMPANY">Company</SelectItem>
                  </SelectContent>
                </Select>
                {errors.type && (
                  <p className="text-xs text-rose-600">{errors.type.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">
                  Status <span className="text-rose-500">*</span>
                </Label>
                <Select
                  value={statusValue}
                  onValueChange={(v) =>
                    setValue('status', v as CustomerFormValues['status'])
                  }
                >
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PROSPECT">Prospect</SelectItem>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="INACTIVE">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="taxId">Tax ID</Label>
              <Input
                id="taxId"
                {...register('taxId')}
                placeholder="Tax identification number"
                maxLength={13}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="mb-3">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center text-sm font-light tracking-wider text-slate-700">
              <Phone className="w-4 h-4 mr-2 text-indigo-600" />
              Contact Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  {...register('phone')}
                  placeholder="081-234-5678"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  {...register('email')}
                  placeholder="contact@example.com"
                />
                {errors.email && (
                  <p className="text-xs text-rose-600">{errors.email.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="lineId">LINE ID</Label>
                <Input
                  id="lineId"
                  {...register('lineId')}
                  placeholder="@lineid"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="province">Province</Label>
                <Input
                  id="province"
                  {...register('province')}
                  placeholder="Bangkok"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Textarea
                id="address"
                {...register('address')}
                placeholder="Full address"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="mb-3">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center text-sm font-light tracking-wider text-slate-700">
              <Briefcase className="w-4 h-4 mr-2 text-indigo-600" />
              Business Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-0">
            <div className="space-y-2">
              <Label htmlFor="interestedProjectId">Project of Interest</Label>
              <Select
                value={interestedProjectIdValue ?? ''}
                onValueChange={(v) =>
                  setValue('interestedProjectId', v === 'none' ? undefined : v)
                }
              >
                <SelectTrigger id="interestedProjectId">
                  <SelectValue placeholder="Select a project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="leadSource">Lead Source</Label>
                <Select
                  value={leadSourceValue ?? ''}
                  onValueChange={(v) =>
                    setValue('leadSource', v === 'none' ? undefined : v)
                  }
                >
                  <SelectTrigger id="leadSource">
                    <SelectValue placeholder="Select source" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {LEAD_SOURCES.map((source) => (
                      <SelectItem key={source} value={source}>
                        {source}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="industry">Industry</Label>
                <Select
                  value={industryValue ?? ''}
                  onValueChange={(v) =>
                    setValue('industry', v === 'none' ? undefined : v)
                  }
                >
                  <SelectTrigger id="industry">
                    <SelectValue placeholder="Select industry" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {INDUSTRIES.map((ind) => (
                      <SelectItem key={ind} value={ind}>
                        {ind}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="companySize">Company Size</Label>
                <Select
                  value={companySizeValue ?? ''}
                  onValueChange={(v) =>
                    setValue('companySize', v === 'none' ? undefined : v)
                  }
                >
                  <SelectTrigger id="companySize">
                    <SelectValue placeholder="Select size" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {COMPANY_SIZES.map((size) => (
                      <SelectItem key={size} value={size}>
                        {size}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="budgetRange">Budget Range</Label>
                <Select
                  value={budgetRangeValue ?? ''}
                  onValueChange={(v) =>
                    setValue('budgetRange', v === 'none' ? undefined : v)
                  }
                >
                  <SelectTrigger id="budgetRange">
                    <SelectValue placeholder="Select budget" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {BUDGET_RANGES.map((range) => (
                      <SelectItem key={range} value={range}>
                        {range}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-3">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center text-sm font-light tracking-wider text-slate-700">
              <FileText className="w-4 h-4 mr-2 text-indigo-600" />
              Additional Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-0">
            <div className="space-y-2">
              <Label htmlFor="depositConditions">Deposit Conditions</Label>
              <Textarea
                id="depositConditions"
                {...register('depositConditions')}
                placeholder="Deposit terms and conditions..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="profileUrl">Profile URL / Business Card</Label>
              <Input
                id="profileUrl"
                {...register('profileUrl')}
                placeholder="https://..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                {...register('notes')}
                placeholder="Any additional notes..."
                rows={4}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="pdpaConsent"
                checked={pdpaConsentValue ?? false}
                onCheckedChange={(checked) =>
                  setValue('pdpaConsent', checked === true)
                }
              />
              <Label htmlFor="pdpaConsent" className="font-normal cursor-pointer">
                PDPA Consent — Customer has given consent to collect and use personal data
              </Label>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-end space-x-3 pb-8">
          <Link to="/customers">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button
            type="submit"
            className="bg-indigo-600 hover:bg-indigo-700"
            disabled={createCustomer.isPending}
          >
            <Save className="w-4 h-4 mr-2" />
            {createCustomer.isPending ? 'Saving...' : 'Save Customer'}
          </Button>
        </div>
      </form>
    </div>
  )
}
