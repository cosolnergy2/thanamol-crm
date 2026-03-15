import { Bell, LogOut, Menu, Search, User, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { useLanguage } from '@/providers/LanguageProvider'
import { useAuth } from '@/providers/AuthProvider'

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
  const { currentUser, logout } = useAuth()

  const userInitial =
    currentUser?.firstName?.charAt(0) ?? currentUser?.email?.charAt(0)?.toUpperCase() ?? '?'
  const userDisplayName = currentUser
    ? `${currentUser.firstName} ${currentUser.lastName}`.trim()
    : ''

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

        {/* Right side: language switcher + notifications + user menu */}
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

          {/* User avatar dropdown */}
          {currentUser && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-50 transition-all duration-200"
                  aria-label="User menu"
                >
                  <div className="w-7 h-7 bg-indigo-50 border border-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-indigo-600 text-xs font-light">{userInitial}</span>
                  </div>
                  <span className="hidden md:block text-sm font-light text-slate-700 max-w-[120px] truncate">
                    {userDisplayName || currentUser.email}
                  </span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <p className="text-sm font-light text-slate-700 truncate">
                    {userDisplayName || currentUser.email}
                  </p>
                  <p className="text-xs text-slate-400 font-extralight truncate">
                    {currentUser.email}
                  </p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <a href="/settings/profile" className="flex items-center cursor-pointer">
                    <User className="w-4 h-4 mr-2" />
                    {t.profile ?? 'Profile'}
                  </a>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={logout}
                  className="text-rose-600 focus:text-rose-700 focus:bg-rose-50 cursor-pointer"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  {t.logout}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  )
}
