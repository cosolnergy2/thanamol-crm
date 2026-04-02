import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { ArrowLeft, Save, Plus, Trash2 } from 'lucide-react'
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
import { useCreateVendor } from '@/hooks/useVendors'
import { useCompanies } from '@/hooks/useCompanies'
import {
  VENDOR_TYPES,
  VENDOR_SERVICE_TAGS,
  VENDOR_SUPPLIER_TYPES,
  VENDOR_RATING_LEVELS,
  VENDOR_PAYMENT_TERMS,
} from '@thanamol/shared'
import type {
  VendorAdditionalContact,
  VendorDefaultConditions,
} from '@thanamol/shared'

export const Route = createFileRoute('/_authenticated/facility-management/vendors/create')({
  component: VendorCreatePage,
})

type PaymentInstallment = {
  _key: string
  label: string
  amount: number
  due_date: string
}

function buildEmptyContact(): VendorAdditionalContact & { _key: string } {
  return { _key: crypto.randomUUID(), name: '', phone: '', email: '', position: '' }
}

function buildEmptyInstallment(): PaymentInstallment {
  return { _key: crypto.randomUUID(), label: '', amount: 0, due_date: '' }
}

const EMPTY_CONDITIONS: Omit<VendorDefaultConditions, 'payment_installments'> = {
  wht_enabled: false,
  wht_rate: 3,
  vat_enabled: true,
  retention_enabled: false,
  retention_rate: 5,
  warranty: '',
  credit_terms: '',
  standard_lead_time: '',
  late_penalty: '',
  insurance: '',
}

function VendorCreatePage() {
  const navigate = useNavigate()
  const createVendor = useCreateVendor()
  const { data: companiesData } = useCompanies({ limit: 100 })
  const companies = companiesData?.data ?? []

  // Basic info
  const [vendorType, setVendorType] = useState('')
  const [registerAllCompanies, setRegisterAllCompanies] = useState(true)
  const [companyId, setCompanyId] = useState('')
  const [legalName, setLegalName] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [taxId, setTaxId] = useState('')
  const [address, setAddress] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')

  // Primary contact
  const [contactPerson, setContactPerson] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [contactEmail, setContactEmail] = useState('')

  // Additional contacts
  const [additionalContacts, setAdditionalContacts] = useState<
    (VendorAdditionalContact & { _key: string })[]
  >([])

  // Service tags
  const [serviceTags, setServiceTags] = useState<string[]>([])

  // Supplier classification
  const [supplierType, setSupplierType] = useState('')
  const [ratingLevel, setRatingLevel] = useState('')
  const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE' | 'PENDING_APPROVAL' | 'BLACKLISTED'>('ACTIVE')

  // Payment terms
  const [paymentTerms, setPaymentTerms] = useState('')
  const [creditDays, setCreditDays] = useState('')
  const [creditLimit, setCreditLimit] = useState('')

  // Default conditions
  const [conditions, setConditions] = useState<typeof EMPTY_CONDITIONS>({ ...EMPTY_CONDITIONS })
  const [installments, setInstallments] = useState<PaymentInstallment[]>([])

  // Notes
  const [notes, setNotes] = useState('')

  function toggleServiceTag(tag: string) {
    setServiceTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    )
  }

  function addContact() {
    setAdditionalContacts((prev) => [...prev, buildEmptyContact()])
  }

  function removeContact(key: string) {
    setAdditionalContacts((prev) => prev.filter((c) => c._key !== key))
  }

  function updateContact(key: string, field: keyof VendorAdditionalContact, value: string) {
    setAdditionalContacts((prev) =>
      prev.map((c) => (c._key === key ? { ...c, [field]: value } : c))
    )
  }

  function addInstallment() {
    setInstallments((prev) => [...prev, buildEmptyInstallment()])
  }

  function removeInstallment(key: string) {
    setInstallments((prev) => prev.filter((i) => i._key !== key))
  }

  function updateInstallment(key: string, field: keyof Omit<PaymentInstallment, '_key'>, value: string | number) {
    setInstallments((prev) =>
      prev.map((i) => (i._key === key ? { ...i, [field]: value } : i))
    )
  }

  function updateCondition<K extends keyof typeof conditions>(key: K, value: (typeof conditions)[K]) {
    setConditions((prev) => ({ ...prev, [key]: value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const builtConditions: VendorDefaultConditions = {
      ...conditions,
      payment_installments: installments.map(({ _key: _, ...inst }) => inst),
    }

    createVendor.mutate(
      {
        name: legalName || displayName,
        legalName: legalName || undefined,
        displayName: displayName || undefined,
        vendorType: vendorType || undefined,
        taxId: taxId || undefined,
        address: address || undefined,
        phone: phone || undefined,
        email: email || undefined,
        contactPerson: contactPerson || undefined,
        contactPhone: contactPhone || undefined,
        contactEmail: contactEmail || undefined,
        additionalContacts: additionalContacts.length > 0
          ? additionalContacts.map(({ _key: _, ...c }) => c)
          : undefined,
        serviceTags: serviceTags.length > 0 ? serviceTags : undefined,
        supplierType: supplierType || undefined,
        ratingLevel: ratingLevel || undefined,
        status,
        paymentTerms: paymentTerms || undefined,
        creditDays: creditDays ? Number(creditDays) : undefined,
        creditLimit: creditLimit ? Number(creditLimit) : undefined,
        defaultConditions: builtConditions,
        notes: notes || undefined,
        registerAllCompanies,
        companyId: !registerAllCompanies && companyId ? companyId : undefined,
      },
      {
        onSuccess: () => {
          navigate({ to: '/facility-management/vendors' })
        },
      }
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="icon"
          onClick={() => navigate({ to: '/facility-management/vendors' })}
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-extralight tracking-[0.3em] text-slate-600 uppercase">
            เพิ่ม Vendor
          </h1>
          <p className="text-sm text-slate-500 mt-1 font-extralight">ลงทะเบียน Vendor ใหม่</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-light">ข้อมูลพื้นฐาน</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Vendor Code</Label>
              <Input value="(auto)" disabled className="bg-slate-50 text-slate-400" />
            </div>

            <div>
              <Label>ประเภท Vendor</Label>
              <Select value={vendorType} onValueChange={setVendorType}>
                <SelectTrigger>
                  <SelectValue placeholder="เลือกประเภท" />
                </SelectTrigger>
                <SelectContent>
                  {VENDOR_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-3">
                <input
                  type="checkbox"
                  id="register_all"
                  checked={registerAllCompanies}
                  onChange={(e) => setRegisterAllCompanies(e.target.checked)}
                  className="w-4 h-4 accent-indigo-600"
                />
                <Label htmlFor="register_all" className="cursor-pointer">
                  ลงทะเบียนสำหรับทุกบริษัท
                </Label>
              </div>
              {!registerAllCompanies && (
                <div>
                  <Label>บริษัท (Register)</Label>
                  <Select value={companyId} onValueChange={setCompanyId}>
                    <SelectTrigger>
                      <SelectValue placeholder="เลือกบริษัท" />
                    </SelectTrigger>
                    <SelectContent>
                      {companies.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div>
              <Label>ชื่อตามกฎหมาย (Legal Name) *</Label>
              <Input
                required
                value={legalName}
                onChange={(e) => setLegalName(e.target.value)}
                placeholder="ชื่อบริษัทตามทะเบียน"
              />
            </div>

            <div>
              <Label>ชื่อแสดง (Display Name)</Label>
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="ชื่อที่ใช้แสดงในระบบ"
              />
            </div>

            <div>
              <Label>เลขประจำตัวผู้เสียภาษี (Tax ID)</Label>
              <Input
                value={taxId}
                onChange={(e) => setTaxId(e.target.value)}
                placeholder="0000000000000 (13 หลัก)"
                maxLength={13}
              />
            </div>

            <div>
              <Label>เบอร์โทรศัพท์</Label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="02-xxx-xxxx"
              />
            </div>

            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@vendor.com"
              />
            </div>

            <div className="md:col-span-2">
              <Label>ที่อยู่</Label>
              <Textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                rows={2}
                placeholder="ที่อยู่บริษัท"
              />
            </div>
          </CardContent>
        </Card>

        {/* Primary Contact */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-light">ชื่อผู้ติดต่อหลัก</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>ชื่อ</Label>
              <Input
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                placeholder="ชื่อ-นามสกุล"
              />
            </div>
            <div>
              <Label>เบอร์โทรศัพท์</Label>
              <Input
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="08x-xxx-xxxx"
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="contact@vendor.com"
              />
            </div>
          </CardContent>
        </Card>

        {/* Additional Contacts */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-light">ผู้ติดต่อสำรอง (Additional Contacts)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {additionalContacts.length > 0 && (
              <div className="grid grid-cols-12 gap-2 text-xs text-slate-500 font-medium px-1">
                <span className="col-span-3">ชื่อ</span>
                <span className="col-span-3">เบอร์โทรศัพท์</span>
                <span className="col-span-3">Email</span>
                <span className="col-span-2">ตำแหน่ง</span>
                <span className="col-span-1" />
              </div>
            )}
            {additionalContacts.map((contact) => (
              <div key={contact._key} className="grid grid-cols-12 gap-2 items-center">
                <div className="col-span-3">
                  <Input
                    className="h-8 text-sm"
                    placeholder="ชื่อ"
                    value={contact.name}
                    onChange={(e) => updateContact(contact._key, 'name', e.target.value)}
                  />
                </div>
                <div className="col-span-3">
                  <Input
                    className="h-8 text-sm"
                    placeholder="เบอร์โทร"
                    value={contact.phone ?? ''}
                    onChange={(e) => updateContact(contact._key, 'phone', e.target.value)}
                  />
                </div>
                <div className="col-span-3">
                  <Input
                    className="h-8 text-sm"
                    type="email"
                    placeholder="Email"
                    value={contact.email ?? ''}
                    onChange={(e) => updateContact(contact._key, 'email', e.target.value)}
                  />
                </div>
                <div className="col-span-2">
                  <Input
                    className="h-8 text-sm"
                    placeholder="ตำแหน่ง"
                    value={contact.position ?? ''}
                    onChange={(e) => updateContact(contact._key, 'position', e.target.value)}
                  />
                </div>
                <div className="col-span-1 flex justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-red-500"
                    onClick={() => removeContact(contact._key)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1 text-indigo-600 border-indigo-200 hover:bg-indigo-50"
              onClick={addContact}
            >
              <Plus className="w-3 h-3" />
              เพิ่ม
            </Button>
          </CardContent>
        </Card>

        {/* Service Tags */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-light">Tags และหมวดหมู่</CardTitle>
          </CardHeader>
          <CardContent>
            <Label className="mb-3 block">Service Tags</Label>
            <div className="flex flex-wrap gap-3">
              {VENDOR_SERVICE_TAGS.map((tag) => (
                <label key={tag} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={serviceTags.includes(tag)}
                    onChange={() => toggleServiceTag(tag)}
                    className="w-4 h-4 accent-indigo-600"
                  />
                  <span className="text-sm text-slate-700">{tag}</span>
                </label>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Supplier Classification */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-light">การจัดหมู่ Supplier</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Supplier Type</Label>
              <Select value={supplierType} onValueChange={setSupplierType}>
                <SelectTrigger>
                  <SelectValue placeholder="เลือกประเภท" />
                </SelectTrigger>
                <SelectContent>
                  {VENDOR_SUPPLIER_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Rating Level</Label>
              <Select value={ratingLevel} onValueChange={setRatingLevel}>
                <SelectTrigger>
                  <SelectValue placeholder="เลือก Rating" />
                </SelectTrigger>
                <SelectContent>
                  {VENDOR_RATING_LEVELS.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Approval Status</Label>
              <Select
                value={status}
                onValueChange={(v) => setStatus(v as typeof status)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="INACTIVE">Inactive</SelectItem>
                  <SelectItem value="PENDING_APPROVAL">Pending Approval</SelectItem>
                  <SelectItem value="BLACKLISTED">Blacklisted</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Payment Terms */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-light">เงื่อนไขการชำระเงิน</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Payment Terms</Label>
              <Select value={paymentTerms} onValueChange={setPaymentTerms}>
                <SelectTrigger>
                  <SelectValue placeholder="เลือกเงื่อนไข" />
                </SelectTrigger>
                <SelectContent>
                  {VENDOR_PAYMENT_TERMS.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Credit (วัน)</Label>
              <Input
                type="number"
                min="0"
                value={creditDays}
                onChange={(e) => setCreditDays(e.target.value)}
                placeholder="30"
              />
            </div>

            <div>
              <Label>Credit Limit (บาท)</Label>
              <Input
                type="number"
                min="0"
                value={creditLimit}
                onChange={(e) => setCreditLimit(e.target.value)}
                placeholder="500000"
              />
            </div>
          </CardContent>
        </Card>

        {/* Default Conditions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-light">เงื่อนไขมาตรฐานของ Vendor (Default Conditions)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Payment Installments */}
            <div>
              <Label className="mb-2 block">การชำระเงินเป็นงวด</Label>
              {installments.length > 0 && (
                <div className="grid grid-cols-12 gap-2 text-xs text-slate-500 font-medium px-1 mb-1">
                  <span className="col-span-4">รายละเอียดงวด</span>
                  <span className="col-span-4">จำนวนเงิน (บาท)</span>
                  <span className="col-span-3">วันที่ครบกำหนด</span>
                  <span className="col-span-1" />
                </div>
              )}
              {installments.map((inst) => (
                <div key={inst._key} className="grid grid-cols-12 gap-2 items-center mb-2">
                  <div className="col-span-4">
                    <Input
                      className="h-8 text-sm"
                      placeholder="เช่น งวดที่ 1"
                      value={inst.label}
                      onChange={(e) => updateInstallment(inst._key, 'label', e.target.value)}
                    />
                  </div>
                  <div className="col-span-4">
                    <Input
                      className="h-8 text-sm"
                      type="number"
                      min="0"
                      placeholder="0"
                      value={inst.amount}
                      onChange={(e) => updateInstallment(inst._key, 'amount', Number(e.target.value))}
                    />
                  </div>
                  <div className="col-span-3">
                    <Input
                      className="h-8 text-sm"
                      type="date"
                      value={inst.due_date}
                      onChange={(e) => updateInstallment(inst._key, 'due_date', e.target.value)}
                    />
                  </div>
                  <div className="col-span-1 flex justify-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-500"
                      onClick={() => removeInstallment(inst._key)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1 text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                onClick={addInstallment}
              >
                <Plus className="w-3 h-3" />
                เพิ่มงวดชำระ
              </Button>
            </div>

            {/* Toggles: VAT, WHT, Retention */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="cond_vat"
                  checked={conditions.vat_enabled ?? true}
                  onChange={(e) => updateCondition('vat_enabled', e.target.checked)}
                  className="w-4 h-4 accent-indigo-600"
                />
                <Label htmlFor="cond_vat" className="cursor-pointer">VAT 7%</Label>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="cond_wht"
                  checked={conditions.wht_enabled ?? false}
                  onChange={(e) => updateCondition('wht_enabled', e.target.checked)}
                  className="w-4 h-4 accent-indigo-600"
                />
                <Label htmlFor="cond_wht" className="cursor-pointer">WHT (Withholding Tax)</Label>
                {conditions.wht_enabled && (
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    className="w-20 h-8 text-sm"
                    value={conditions.wht_rate ?? 3}
                    onChange={(e) => updateCondition('wht_rate', Number(e.target.value))}
                  />
                )}
                {conditions.wht_enabled && <span className="text-sm text-slate-500">%</span>}
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="cond_retention"
                  checked={conditions.retention_enabled ?? false}
                  onChange={(e) => updateCondition('retention_enabled', e.target.checked)}
                  className="w-4 h-4 accent-indigo-600"
                />
                <Label htmlFor="cond_retention" className="cursor-pointer">Retention</Label>
                {conditions.retention_enabled && (
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    className="w-20 h-8 text-sm"
                    value={conditions.retention_rate ?? 5}
                    onChange={(e) => updateCondition('retention_rate', Number(e.target.value))}
                  />
                )}
                {conditions.retention_enabled && <span className="text-sm text-slate-500">%</span>}
              </div>
            </div>

            {/* Text fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Warranty</Label>
                <Input
                  value={conditions.warranty ?? ''}
                  onChange={(e) => updateCondition('warranty', e.target.value)}
                  placeholder="เช่น 1 ปี"
                />
              </div>
              <div>
                <Label>Credit Terms</Label>
                <Input
                  value={conditions.credit_terms ?? ''}
                  onChange={(e) => updateCondition('credit_terms', e.target.value)}
                  placeholder="เช่น 30 วัน"
                />
              </div>
              <div>
                <Label>Standard Lead Time</Label>
                <Input
                  value={conditions.standard_lead_time ?? ''}
                  onChange={(e) => updateCondition('standard_lead_time', e.target.value)}
                  placeholder="เช่น 14 วันทำการ"
                />
              </div>
              <div>
                <Label>Late Penalty</Label>
                <Input
                  value={conditions.late_penalty ?? ''}
                  onChange={(e) => updateCondition('late_penalty', e.target.value)}
                  placeholder="เช่น 0.1% ต่อวัน"
                />
              </div>
              <div className="md:col-span-2">
                <Label>Insurance</Label>
                <Input
                  value={conditions.insurance ?? ''}
                  onChange={(e) => updateCondition('insurance', e.target.value)}
                  placeholder="ข้อกำหนดประกันภัย"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notes */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-light">หมายเหตุ</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="หมายเหตุเพิ่มเติม..."
            />
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate({ to: '/facility-management/vendors' })}
          >
            ยกเลิก
          </Button>
          <Button
            type="submit"
            disabled={createVendor.isPending}
            className="bg-indigo-600 hover:bg-indigo-700 gap-2"
          >
            <Save className="w-4 h-4" />
            บันทึก Vendor
          </Button>
        </div>
      </form>
    </div>
  )
}
