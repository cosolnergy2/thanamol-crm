import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { ArrowLeft, Save } from 'lucide-react'
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
import { useVendor, useUpdateVendor } from '@/hooks/useVendors'
import { VENDOR_CATEGORIES } from '@thanamol/shared'

export const Route = createFileRoute('/_authenticated/facility-management/vendors/$vendorId/edit')({
  component: VendorEditPage,
})

function VendorEditPage() {
  const { vendorId } = Route.useParams()
  const navigate = useNavigate()
  const { data: vendorData, isLoading } = useVendor(vendorId)
  const updateVendor = useUpdateVendor(vendorId)

  const [name, setName] = useState('')
  const [taxId, setTaxId] = useState('')
  const [address, setAddress] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [website, setWebsite] = useState('')
  const [contactPerson, setContactPerson] = useState('')
  const [category, setCategory] = useState('')
  const [rating, setRating] = useState('')
  const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE' | 'PENDING_APPROVAL' | 'BLACKLISTED'>('ACTIVE')
  const [notes, setNotes] = useState('')
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    if (vendorData?.vendor && !initialized) {
      const v = vendorData.vendor
      setName(v.name)
      setTaxId(v.tax_id ?? '')
      setAddress(v.address ?? '')
      setPhone(v.phone ?? '')
      setEmail(v.email ?? '')
      setWebsite(v.website ?? '')
      setContactPerson(v.contact_person ?? '')
      setCategory(v.category ?? '')
      setRating(v.rating ? String(v.rating) : '')
      setStatus(v.status as typeof status)
      setNotes(v.notes ?? '')
      setInitialized(true)
    }
  }, [vendorData, initialized])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    updateVendor.mutate(
      {
        name,
        taxId: taxId || null,
        address: address || null,
        phone: phone || null,
        email: email || null,
        website: website || null,
        contactPerson: contactPerson || null,
        category: category || null,
        rating: rating ? Number(rating) : null,
        status,
        notes: notes || null,
      },
      {
        onSuccess: () => {
          navigate({ to: '/facility-management/vendors/$vendorId', params: { vendorId } })
        },
      }
    )
  }

  if (isLoading) {
    return <div className="text-center py-16 text-slate-400">Loading...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="icon"
          onClick={() =>
            navigate({ to: '/facility-management/vendors/$vendorId', params: { vendorId } })
          }
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-extralight tracking-[0.3em] text-slate-600 uppercase">
            Edit Vendor
          </h1>
          <p className="text-sm text-slate-500 mt-1 font-extralight">{name}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-light">Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label>Vendor Name *</Label>
              <Input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <Label>Tax ID</Label>
              <Input value={taxId} onChange={(e) => setTaxId(e.target.value)} />
            </div>
            <div>
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {VENDOR_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2">
              <Label>Address</Label>
              <Textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                rows={2}
              />
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <Label>Website</Label>
              <Input value={website} onChange={(e) => setWebsite(e.target.value)} />
            </div>
            <div>
              <Label>Contact Person</Label>
              <Input
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-light">Status & Rating</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
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
            <div>
              <Label>Rating (1–5)</Label>
              <Select value={rating} onValueChange={setRating}>
                <SelectTrigger>
                  <SelectValue placeholder="No rating" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 — Poor</SelectItem>
                  <SelectItem value="2">2 — Fair</SelectItem>
                  <SelectItem value="3">3 — Good</SelectItem>
                  <SelectItem value="4">4 — Very Good</SelectItem>
                  <SelectItem value="5">5 — Excellent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-light">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              navigate({ to: '/facility-management/vendors/$vendorId', params: { vendorId } })
            }
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={updateVendor.isPending}
            className="bg-indigo-600 hover:bg-indigo-700 gap-2"
          >
            <Save className="w-4 h-4" />
            Save Changes
          </Button>
        </div>
      </form>
    </div>
  )
}
