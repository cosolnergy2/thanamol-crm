import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { Save, Plus, Trash2, FileText, CalendarIcon } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { CommercialProposalFormData, LesseeResponsibility } from '@thanamol/shared'

export const Route = createFileRoute('/_authenticated/forms/sale-commercial-proposal')({
  component: FormSaleCommercialProposalPage,
})

const DEFAULT_COMPANY_NAME = 'Thanamol Group Development Co.,Ltd'

const LESSEE_RESPONSIBILITY_KEYS = [
  'property_insurance',
  'duty_stamp',
  'property_tax',
  'land_tax',
  'goods_insurance',
] as const

type LesseeResponsibilityKey = typeof LESSEE_RESPONSIBILITY_KEYS[number]

function buildEmptyForm(): CommercialProposalFormData {
  const responsibilities: Record<string, LesseeResponsibility> = {}
  for (const key of LESSEE_RESPONSIBILITY_KEYS) {
    responsibilities[key] = { checked: false, note: '' }
  }

  return {
    quotation_number: '',
    proposal_date: new Date(),
    customer_info: {
      company_address: '',
      contact_name: '',
      telephone: '',
      mobile: '',
      email: '',
    },
    warehouse_location: {
      house_no: '',
      moo: '',
      sub_district: '',
      district: '',
      province: '',
    },
    rental_details: [{ building: '', area: 0, rental_rate: 0, monthly_rental: 0 }],
    terms_conditions: {
      deposit_months: 2,
      advance_rental_months: 1,
      water_charge: 0,
      electricity_charge: 'Actual cost by customer',
      contract_duration: 3,
      lessee_responsibilities: responsibilities,
    },
    valid_until: null,
    footer_info: {
      company_name: DEFAULT_COMPANY_NAME,
      company_address: '',
      contact_person_name: '',
      contact_mobile: '',
      contact_email: '',
    },
    status: 'Draft',
  }
}

function calculateTotalMonthlyRental(
  details: CommercialProposalFormData['rental_details']
): number {
  return details.reduce((sum, row) => sum + (row.monthly_rental || 0), 0)
}

function FormSaleCommercialProposalPage() {
  const [formData, setFormData] = useState<CommercialProposalFormData>(buildEmptyForm)
  const [isSaving, setIsSaving] = useState(false)

  function updateCustomerInfo(field: keyof CommercialProposalFormData['customer_info'], value: string) {
    setFormData((prev) => ({
      ...prev,
      customer_info: { ...prev.customer_info, [field]: value },
    }))
  }

  function updateWarehouseLocation(
    field: keyof CommercialProposalFormData['warehouse_location'],
    value: string
  ) {
    setFormData((prev) => ({
      ...prev,
      warehouse_location: { ...prev.warehouse_location, [field]: value },
    }))
  }

  function updateTermsConditions(
    field: keyof Omit<CommercialProposalFormData['terms_conditions'], 'lessee_responsibilities'>,
    value: string | number
  ) {
    setFormData((prev) => ({
      ...prev,
      terms_conditions: { ...prev.terms_conditions, [field]: value },
    }))
  }

  function updateFooterInfo(field: keyof CommercialProposalFormData['footer_info'], value: string) {
    setFormData((prev) => ({
      ...prev,
      footer_info: { ...prev.footer_info, [field]: value },
    }))
  }

  function addRentalRow() {
    setFormData((prev) => ({
      ...prev,
      rental_details: [
        ...prev.rental_details,
        { building: '', area: 0, rental_rate: 0, monthly_rental: 0 },
      ],
    }))
  }

  function removeRentalRow(index: number) {
    setFormData((prev) => ({
      ...prev,
      rental_details: prev.rental_details.filter((_, i) => i !== index),
    }))
  }

  function updateRentalDetail(
    index: number,
    field: 'building' | 'area' | 'rental_rate',
    value: string | number
  ) {
    setFormData((prev) => {
      const updated = prev.rental_details.map((row, i) => {
        if (i !== index) return row
        const next = { ...row, [field]: value }
        if (field === 'area' || field === 'rental_rate') {
          next.monthly_rental = next.area * next.rental_rate
        }
        return next
      })
      return { ...prev, rental_details: updated }
    })
  }

  function updateLesseeResponsibility(
    key: LesseeResponsibilityKey,
    field: keyof LesseeResponsibility,
    value: boolean | string
  ) {
    setFormData((prev) => ({
      ...prev,
      terms_conditions: {
        ...prev.terms_conditions,
        lessee_responsibilities: {
          ...prev.terms_conditions.lessee_responsibilities,
          [key]: {
            ...prev.terms_conditions.lessee_responsibilities[key],
            [field]: value,
          },
        },
      },
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!formData.quotation_number || !formData.proposal_date || !formData.valid_until) {
      toast.error('Please fill in all required fields')
      return
    }

    setIsSaving(true)
    try {
      window.print()
      toast.success('Proposal ready to print')
    } catch {
      toast.error('Failed to prepare proposal')
    } finally {
      setIsSaving(false)
    }
  }

  const totalMonthlyRental = calculateTotalMonthlyRental(formData.rental_details)

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extralight tracking-[0.3em] text-slate-600 uppercase">
            Commercial Proposal Form
          </h1>
          <p className="text-sm text-slate-500 mt-1">SALE-001-F01</p>
          <div className="h-px w-20 bg-gradient-to-r from-slate-300 to-transparent mt-2" />
        </div>
        <Badge variant={formData.status === 'Draft' ? 'secondary' : 'default'}>
          {formData.status}
        </Badge>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader className="bg-indigo-50 border-b">
            <CardTitle className="text-center text-xl text-indigo-900 flex items-center justify-center gap-2">
              <FileText className="w-5 h-5" />
              COMMERCIAL PROPOSAL
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="quotation_number">
                  Quotation Number <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="quotation_number"
                  placeholder="QT-XXXX/2026/XXX"
                  value={formData.quotation_number}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, quotation_number: e.target.value }))
                  }
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>
                  Date <span className="text-rose-500">*</span>
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.proposal_date
                        ? format(formData.proposal_date, 'PPP')
                        : 'Select date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={formData.proposal_date ?? undefined}
                      onSelect={(date) =>
                        setFormData((prev) => ({ ...prev, proposal_date: date ?? null }))
                      }
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="bg-slate-50 border-b">
            <CardTitle className="text-lg">Customer Information</CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="company_address">Company / Address</Label>
              <Textarea
                id="company_address"
                rows={3}
                value={formData.customer_info.company_address}
                onChange={(e) => updateCustomerInfo('company_address', e.target.value)}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="contact_name">Contact Name</Label>
                <Input
                  id="contact_name"
                  value={formData.customer_info.contact_name}
                  onChange={(e) => updateCustomerInfo('contact_name', e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="telephone">Telephone</Label>
                <Input
                  id="telephone"
                  value={formData.customer_info.telephone}
                  onChange={(e) => updateCustomerInfo('telephone', e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="mobile">Mobile</Label>
                <Input
                  id="mobile"
                  placeholder="+66"
                  value={formData.customer_info.mobile}
                  onChange={(e) => updateCustomerInfo('mobile', e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="customer_email">Email</Label>
                <Input
                  id="customer_email"
                  type="email"
                  value={formData.customer_info.email}
                  onChange={(e) => updateCustomerInfo('email', e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="bg-slate-50 border-b">
            <CardTitle className="text-lg">Warehouse Location</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="house_no">House No.</Label>
                <Input
                  id="house_no"
                  value={formData.warehouse_location.house_no}
                  onChange={(e) => updateWarehouseLocation('house_no', e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="moo">Moo</Label>
                <Input
                  id="moo"
                  value={formData.warehouse_location.moo}
                  onChange={(e) => updateWarehouseLocation('moo', e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sub_district">Sub-district (Tambon)</Label>
                <Input
                  id="sub_district"
                  value={formData.warehouse_location.sub_district}
                  onChange={(e) => updateWarehouseLocation('sub_district', e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="district">District (Amphur)</Label>
                <Input
                  id="district"
                  value={formData.warehouse_location.district}
                  onChange={(e) => updateWarehouseLocation('district', e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="province">Province</Label>
                <Input
                  id="province"
                  value={formData.warehouse_location.province}
                  onChange={(e) => updateWarehouseLocation('province', e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="bg-slate-50 border-b">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Rental Details</CardTitle>
              <Button type="button" size="sm" variant="outline" onClick={addRentalRow}>
                <Plus className="w-4 h-4 mr-2" />
                Add Row
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Building</TableHead>
                    <TableHead className="text-right">Area (sqm)</TableHead>
                    <TableHead className="text-right">Rental Rate (฿/sqm)</TableHead>
                    <TableHead className="text-right">Monthly Rental (฿)</TableHead>
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {formData.rental_details.map((row, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Input
                          value={row.building}
                          onChange={(e) => updateRentalDetail(index, 'building', e.target.value)}
                          placeholder="Building name"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={row.area}
                          onChange={(e) =>
                            updateRentalDetail(index, 'area', parseFloat(e.target.value) || 0)
                          }
                          className="text-right"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={row.rental_rate}
                          onChange={(e) =>
                            updateRentalDetail(
                              index,
                              'rental_rate',
                              parseFloat(e.target.value) || 0
                            )
                          }
                          className="text-right"
                        />
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {row.monthly_rental.toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </TableCell>
                      <TableCell>
                        {formData.rental_details.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeRentalRow(index)}
                          >
                            <Trash2 className="w-4 h-4 text-rose-500" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-slate-50 font-bold">
                    <TableCell colSpan={3} className="text-right">
                      Total Monthly Rental:
                    </TableCell>
                    <TableCell className="text-right text-lg text-indigo-600">
                      ฿{' '}
                      {totalMonthlyRental.toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </TableCell>
                    <TableCell />
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="bg-slate-50 border-b">
            <CardTitle className="text-lg">Terms &amp; Conditions</CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            <div>
              <h3 className="font-semibold mb-3 text-indigo-900">Deposit</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="deposit_months">Deposit (Months)</Label>
                  <Input
                    id="deposit_months"
                    type="number"
                    value={formData.terms_conditions.deposit_months}
                    onChange={(e) =>
                      updateTermsConditions('deposit_months', parseInt(e.target.value) || 0)
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="advance_rental_months">Advance Rental (Months)</Label>
                  <Input
                    id="advance_rental_months"
                    type="number"
                    value={formData.terms_conditions.advance_rental_months}
                    onChange={(e) =>
                      updateTermsConditions(
                        'advance_rental_months',
                        parseInt(e.target.value) || 0
                      )
                    }
                  />
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-3 text-indigo-900">Utility Charge</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="water_charge">Water Charge (฿/unit)</Label>
                  <Input
                    id="water_charge"
                    type="number"
                    value={formData.terms_conditions.water_charge}
                    onChange={(e) =>
                      updateTermsConditions('water_charge', parseFloat(e.target.value) || 0)
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="electricity_charge">Electricity Charge</Label>
                  <Input
                    id="electricity_charge"
                    value={formData.terms_conditions.electricity_charge}
                    onChange={(e) =>
                      updateTermsConditions('electricity_charge', e.target.value)
                    }
                  />
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-3 text-indigo-900">Rental Term</h3>
              <div className="max-w-xs space-y-1.5">
                <Label htmlFor="contract_duration">Contract Duration (Years)</Label>
                <Input
                  id="contract_duration"
                  type="number"
                  value={formData.terms_conditions.contract_duration}
                  onChange={(e) =>
                    updateTermsConditions('contract_duration', parseInt(e.target.value) || 0)
                  }
                />
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-3 text-indigo-900">
                Lessee&apos;s Responsibility Expenses
              </h3>
              <div className="space-y-3">
                {LESSEE_RESPONSIBILITY_KEYS.map((key) => {
                  const item = formData.terms_conditions.lessee_responsibilities[key]
                  return (
                    <div key={key} className="border rounded-lg p-4 bg-white">
                      <div className="flex items-start gap-3">
                        <Checkbox
                          id={`resp-${key}`}
                          checked={item?.checked ?? false}
                          onCheckedChange={(checked) =>
                            updateLesseeResponsibility(key, 'checked', Boolean(checked))
                          }
                        />
                        <div className="flex-1">
                          <label
                            htmlFor={`resp-${key}`}
                            className="font-medium text-sm capitalize cursor-pointer"
                          >
                            {key.replace(/_/g, ' ')}
                          </label>
                          {item?.checked && (
                            <Input
                              className="mt-2"
                              placeholder="Add note (optional)"
                              value={item.note}
                              onChange={(e) =>
                                updateLesseeResponsibility(key, 'note', e.target.value)
                              }
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="bg-slate-50 border-b">
            <CardTitle className="text-lg">
              Offer Validity <span className="text-rose-500">*</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="max-w-xs space-y-1.5">
              <Label>Valid Until</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.valid_until ? format(formData.valid_until, 'PPP') : 'Select date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.valid_until ?? undefined}
                    onSelect={(date) =>
                      setFormData((prev) => ({ ...prev, valid_until: date ?? null }))
                    }
                  />
                </PopoverContent>
              </Popover>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="bg-slate-50 border-b">
            <CardTitle className="text-lg">Company Information</CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="company_name">Company Name</Label>
              <Input
                id="company_name"
                value={formData.footer_info.company_name}
                onChange={(e) => updateFooterInfo('company_name', e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="company_address_footer">Company Address</Label>
              <Textarea
                id="company_address_footer"
                rows={3}
                value={formData.footer_info.company_address}
                onChange={(e) => updateFooterInfo('company_address', e.target.value)}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="contact_person_name">Contact Person Name</Label>
                <Input
                  id="contact_person_name"
                  value={formData.footer_info.contact_person_name}
                  onChange={(e) => updateFooterInfo('contact_person_name', e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="contact_mobile_footer">Contact Mobile</Label>
                <Input
                  id="contact_mobile_footer"
                  value={formData.footer_info.contact_mobile}
                  onChange={(e) => updateFooterInfo('contact_mobile', e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="contact_email_footer">Contact Email</Label>
                <Input
                  id="contact_email_footer"
                  type="email"
                  value={formData.footer_info.contact_email}
                  onChange={(e) => updateFooterInfo('contact_email', e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3 pb-8">
          <Button
            type="button"
            variant="outline"
            onClick={() => setFormData(buildEmptyForm())}
          >
            Reset
          </Button>
          <Button
            type="submit"
            className="bg-indigo-600 hover:bg-indigo-700"
            disabled={isSaving}
          >
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? 'Preparing...' : 'Print / Save Proposal'}
          </Button>
        </div>
      </form>
    </div>
  )
}
