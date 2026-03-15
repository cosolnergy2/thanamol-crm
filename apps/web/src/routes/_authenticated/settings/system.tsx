import { createFileRoute } from '@tanstack/react-router'
import { Settings, Globe, Clock, Bell, Shield } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { PageHeader } from '@/components/PageHeader'
import { toast } from 'sonner'

export const Route = createFileRoute('/_authenticated/settings/system')({
  component: SettingsSystemPage,
})

const TIMEZONES = [
  'Asia/Bangkok',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Europe/London',
  'America/New_York',
  'UTC',
]

const CURRENCY_OPTIONS = [
  { code: 'THB', label: 'Thai Baht (฿)' },
  { code: 'USD', label: 'US Dollar ($)' },
  { code: 'EUR', label: 'Euro (€)' },
]

function SettingsSystemPage() {
  function handleSave() {
    toast.success('Settings saved (demo — no persistence yet)')
  }

  return (
    <div className="space-y-4">
      <PageHeader title="System Settings" />

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-light text-slate-600 flex items-center gap-2">
            <Globe className="w-4 h-4 text-indigo-500" />
            General
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-xs text-slate-500">Application Name</Label>
              <Input defaultValue="PropertyFlow CRM" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-slate-500">Company Name</Label>
              <Input placeholder="Your company name" />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-slate-500">Support Email</Label>
            <Input type="email" placeholder="support@company.com" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-light text-slate-600 flex items-center gap-2">
            <Clock className="w-4 h-4 text-teal-500" />
            Locale &amp; Time
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-xs text-slate-500">Timezone</Label>
              <Select defaultValue="Asia/Bangkok">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map((tz) => (
                    <SelectItem key={tz} value={tz}>
                      {tz}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-slate-500">Currency</Label>
              <Select defaultValue="THB">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCY_OPTIONS.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-slate-500">Date Format</Label>
            <Select defaultValue="DD/MM/YYYY">
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-light text-slate-600 flex items-center gap-2">
            <Bell className="w-4 h-4 text-amber-500" />
            Notifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-slate-400 font-extralight">
            Notification settings are managed per user in the profile section.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-light text-slate-600 flex items-center gap-2">
            <Shield className="w-4 h-4 text-rose-500" />
            Security
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label className="text-xs text-slate-500">Session Timeout (minutes)</Label>
            <Input type="number" defaultValue={60} min={15} max={480} className="w-32" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-slate-500">Min Password Length</Label>
            <Input type="number" defaultValue={8} min={6} max={32} className="w-32" />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={handleSave}>
          <Settings className="w-4 h-4 mr-2" />
          Save Settings
        </Button>
      </div>
    </div>
  )
}
