import { Bell, Menu, Search, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { useLanguage } from '@/providers/LanguageProvider'

type Language = 'en' | 'th'

type TopBarProps = {
  isSidebarOpen: boolean
  isSidebarCollapsed: boolean
  onToggleSidebar: () => void
  onToggleMobileSidebar: () => void
  notificationCount?: number
}

export function TopBar({
  isSidebarOpen,
  isSidebarCollapsed,
  onToggleSidebar,
  onToggleMobileSidebar,
  notificationCount = 0,
}: TopBarProps) {
  const { t, language, setLanguage } = useLanguage()

  function handleLanguageToggle() {
    const next: Language = language === 'en' ? 'th' : 'en'
    setLanguage(next)
  }

  return (
    <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-2xl border-b border-slate-100">
      <div className="flex items-center justify-between h-16 px-4 md:px-8">
        {/* Left side: sidebar toggle + search */}
        <div className="flex items-center gap-3">
          {/* Desktop collapse/expand */}
          <Button
            variant="ghost"
            size="icon"
            className="hidden lg:flex"
            onClick={onToggleSidebar}
            aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <Menu className="w-5 h-5" />
          </Button>

          {/* Mobile hamburger */}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={onToggleMobileSidebar}
            aria-label={isSidebarOpen ? 'Close sidebar' : 'Open sidebar'}
          >
            {isSidebarOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </Button>

          {/* Search bar — desktop only */}
          <div className="relative hidden md:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
            <Input
              type="search"
              placeholder={t.searchPlaceholder}
              className="pl-10 w-80 bg-slate-50/50 border border-slate-100 focus:bg-white focus:border-slate-200 rounded-lg h-9 text-sm font-extralight"
            />
          </div>
        </div>

        {/* Right side: language switcher + notifications */}
        <div className="flex items-center gap-2">
          {/* Language switcher */}
          <button
            onClick={handleLanguageToggle}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-light rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition-all duration-200"
            aria-label={`Switch to ${language === 'en' ? 'Thai' : 'English'}`}
          >
            <span className={language === 'en' ? 'font-medium text-indigo-600' : 'text-slate-400'}>
              EN
            </span>
            <span className="text-slate-300">/</span>
            <span className={language === 'th' ? 'font-medium text-indigo-600' : 'text-slate-400'}>
              TH
            </span>
          </button>

          {/* Notification bell */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
                <Bell className="w-5 h-5" />
                {notificationCount > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-4 w-4 flex items-center justify-center p-0 bg-rose-500 text-white text-[10px] rounded-full border-2 border-white">
                    {notificationCount > 9 ? '9+' : notificationCount}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuLabel className="flex items-center justify-between">
                {t.notifications}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className="p-4 text-center text-sm text-slate-500">
                {t.noNewNotifications}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
