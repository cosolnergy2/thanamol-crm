import { createFileRoute, Outlet, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useAuth } from '@/providers/AuthProvider'
import { LanguageProvider } from '@/providers/LanguageProvider'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import { usePermissions } from '@/hooks/usePermissions'

export const Route = createFileRoute('/_authenticated')({
  component: AuthenticatedLayout,
})

function AuthenticatedLayout() {
  const { isAuthenticated, isLoading, currentUser, logout } = useAuth()
  const navigate = useNavigate()
  const { permissions } = usePermissions()

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate({ to: '/login' })
    }
  }, [isAuthenticated, isLoading, navigate])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  const sidebarWidth = isSidebarCollapsed ? 'lg:pl-16' : 'lg:pl-64'

  return (
    <LanguageProvider>
      <div className="min-h-screen bg-slate-50">
        <Sidebar
          user={currentUser}
          userPermissions={permissions}
          isOpen={isMobileSidebarOpen}
          isCollapsed={isSidebarCollapsed}
          onClose={() => setIsMobileSidebarOpen(false)}
          onLogout={logout}
        />

        <div className={`transition-all duration-300 ${sidebarWidth}`}>
          <TopBar
            isSidebarOpen={isMobileSidebarOpen}
            isSidebarCollapsed={isSidebarCollapsed}
            onToggleSidebar={() => setIsSidebarCollapsed((prev) => !prev)}
            onToggleMobileSidebar={() => setIsMobileSidebarOpen((prev) => !prev)}
          />

          <main className="p-6 md:p-8">
            <Outlet />
          </main>
        </div>
      </div>
    </LanguageProvider>
  )
}
