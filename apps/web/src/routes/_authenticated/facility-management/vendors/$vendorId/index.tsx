import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import {
  ArrowLeft,
  Pencil,
  Briefcase,
  Phone,
  Mail,
  Globe,
  User,
  Star,
  FileText,
  DollarSign,
  Receipt,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useVendor } from '@/hooks/useVendors'
import { useVendorContracts } from '@/hooks/useVendorContracts'
import { useVendorInvoices } from '@/hooks/useVendorInvoices'
import type { VendorStatus, VendorContractStatus, VendorContractWithRelations, VendorInvoiceWithRelations } from '@thanamol/shared'

export const Route = createFileRoute('/_authenticated/facility-management/vendors/$vendorId/')({
  component: VendorDetailPage,
})

const VENDOR_STATUS_COLORS: Record<VendorStatus, string> = {
  ACTIVE: 'bg-emerald-100 text-emerald-700',
  INACTIVE: 'bg-slate-100 text-slate-600',
  BLACKLISTED: 'bg-red-100 text-red-700',
  PENDING_APPROVAL: 'bg-amber-100 text-amber-700',
}

const CONTRACT_STATUS_COLORS: Record<VendorContractStatus, string> = {
  DRAFT: 'bg-slate-100 text-slate-600',
  ACTIVE: 'bg-emerald-100 text-emerald-700',
  EXPIRED: 'bg-orange-100 text-orange-700',
  TERMINATED: 'bg-red-100 text-red-700',
}

type TabKey = 'contracts' | 'prices' | 'invoices'

function VendorDetailPage() {
  const { vendorId } = Route.useParams()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<TabKey>('contracts')

  const { data: vendorData, isLoading } = useVendor(vendorId)
  const { data: contractsData } = useVendorContracts({ vendorId, limit: 100 })
  const { data: invoicesData } = useVendorInvoices({ vendorId, limit: 100 })

  if (isLoading) {
    return (
      <div className="text-center py-16 text-slate-400 font-extralight">Loading...</div>
    )
  }

  if (!vendorData?.vendor) {
    return (
      <div className="text-center py-16 text-slate-400 font-extralight">
        Vendor not found
      </div>
    )
  }

  const vendor = vendorData.vendor
  const contracts = contractsData?.data ?? []
  const invoices = invoicesData?.data ?? []
  const itemPrices = (vendor.item_prices as { id: string; item_name: string; unit_price: number; currency: string; is_active: boolean }[]) ?? []

  const tabs: { key: TabKey; label: string; count: number }[] = [
    { key: 'contracts', label: 'Contracts', count: contracts.length },
    { key: 'prices', label: 'Item Prices', count: itemPrices.length },
    { key: 'invoices', label: 'Invoices', count: invoices.length },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate({ to: '/facility-management/vendors' })}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-extralight tracking-[0.3em] text-slate-600 uppercase">
                {vendor.name}
              </h1>
              <Badge
                className={`text-xs font-normal ${VENDOR_STATUS_COLORS[vendor.status as VendorStatus]}`}
              >
                {vendor.status.replace('_', ' ')}
              </Badge>
            </div>
            <p className="text-sm text-slate-400 font-mono mt-0.5">{vendor.vendor_code}</p>
          </div>
        </div>
        <Link
          to="/facility-management/vendors/$vendorId/edit"
          params={{ vendorId: vendor.id }}
        >
          <Button variant="outline" className="gap-2">
            <Pencil className="w-4 h-4" />
            Edit
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-light flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-indigo-500" />
              Vendor Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {vendor.category && (
              <div className="flex justify-between">
                <span className="text-slate-500">Category</span>
                <Badge variant="outline">{vendor.category}</Badge>
              </div>
            )}
            {vendor.tax_id && (
              <div className="flex justify-between">
                <span className="text-slate-500">Tax ID</span>
                <span className="font-mono">{vendor.tax_id}</span>
              </div>
            )}
            {vendor.rating && (
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Rating</span>
                <div className="flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                  <span>{vendor.rating}/5</span>
                </div>
              </div>
            )}
            {vendor.address && (
              <div className="flex justify-between">
                <span className="text-slate-500">Address</span>
                <span className="text-right max-w-xs text-xs">{vendor.address}</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-light flex items-center gap-2">
              <User className="w-4 h-4 text-teal-500" />
              Contact
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {vendor.contact_person && (
              <div className="flex items-center gap-2">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span>{vendor.contact_person}</span>
              </div>
            )}
            {vendor.phone && (
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                <span>{vendor.phone}</span>
              </div>
            )}
            {vendor.email && (
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <span>{vendor.email}</span>
              </div>
            )}
            {vendor.website && (
              <div className="flex items-center gap-2">
                <Globe className="w-3.5 h-3.5 text-slate-400" />
                <a
                  href={vendor.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-600 hover:underline"
                >
                  {vendor.website}
                </a>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex gap-1 border-b pb-3">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 text-sm rounded-t-md transition-colors ${
                  activeTab === tab.key
                    ? 'bg-indigo-50 text-indigo-700 font-medium border-b-2 border-indigo-600'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span className="ml-1.5 text-xs bg-slate-200 text-slate-600 rounded-full px-1.5 py-0.5">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          {activeTab === 'contracts' && (
            <ContractsTab contracts={contracts as VendorContractWithRelations[]} vendorId={vendor.id} />
          )}
          {activeTab === 'prices' && (
            <ItemPricesTab prices={itemPrices} />
          )}
          {activeTab === 'invoices' && (
            <InvoicesTab invoices={invoices as VendorInvoiceWithRelations[]} vendorId={vendor.id} />
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function ContractsTab({ contracts, vendorId }: { contracts: VendorContractWithRelations[]; vendorId: string }) {
  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Link
          to="/facility-management/vendors/contracts"
          search={{ vendorId }}
        >
          <Button variant="outline" size="sm" className="gap-2">
            <FileText className="w-3.5 h-3.5" />
            Manage Contracts
          </Button>
        </Link>
      </div>
      {contracts.length === 0 ? (
        <p className="text-center text-slate-400 text-sm py-4">No contracts</p>
      ) : (
        <div className="space-y-2">
          {contracts.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between p-3 border rounded-lg bg-slate-50"
            >
              <div>
                <p className="font-medium text-sm">{c.title}</p>
                <p className="text-xs text-slate-500 font-mono">{c.contract_number}</p>
                {c.project && (
                  <p className="text-xs text-slate-400">{c.project.name}</p>
                )}
              </div>
              <div className="text-right">
                <Badge
                  className={`text-xs font-normal ${CONTRACT_STATUS_COLORS[c.status as VendorContractStatus]}`}
                >
                  {c.status}
                </Badge>
                <p className="text-xs text-slate-500 mt-1">
                  {new Date(c.start_date).toLocaleDateString()} —{' '}
                  {new Date(c.end_date).toLocaleDateString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ItemPricesTab({
  prices,
}: {
  prices: { id: string; item_name: string; unit_price: number; currency: string; is_active: boolean }[]
}) {
  return (
    <div className="space-y-3">
      {prices.length === 0 ? (
        <p className="text-center text-slate-400 text-sm py-4">No item prices</p>
      ) : (
        <div className="space-y-2">
          {prices.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between p-3 border rounded-lg bg-slate-50"
            >
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-slate-400" />
                <span className="text-sm">{p.item_name}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium">
                  {p.unit_price.toLocaleString()} {p.currency}
                </span>
                <Badge
                  className={`text-xs font-normal ${p.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}
                >
                  {p.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function InvoicesTab({ invoices, vendorId }: { invoices: VendorInvoiceWithRelations[]; vendorId: string }) {
  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Link
          to="/facility-management/vendors/invoices"
          search={{ vendorId }}
        >
          <Button variant="outline" size="sm" className="gap-2">
            <Receipt className="w-3.5 h-3.5" />
            Manage Invoices
          </Button>
        </Link>
      </div>
      {invoices.length === 0 ? (
        <p className="text-center text-slate-400 text-sm py-4">No invoices</p>
      ) : (
        <div className="space-y-2">
          {invoices.map((inv) => (
            <div
              key={inv.id}
              className="flex items-center justify-between p-3 border rounded-lg bg-slate-50"
            >
              <div>
                <p className="font-medium text-sm font-mono">{inv.invoice_number}</p>
                <p className="text-xs text-slate-500">
                  {new Date(inv.invoice_date).toLocaleDateString()}
                </p>
              </div>
              <div className="text-right">
                <p className="font-medium text-sm">{inv.total.toLocaleString()} THB</p>
                <Badge
                  className={`text-xs font-normal ${
                    inv.payment_status === 'PAID'
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  {inv.payment_status}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
