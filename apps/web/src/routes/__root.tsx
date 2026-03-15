import { createRootRouteWithContext, Outlet } from '@tanstack/react-router'
import type { QueryClient } from '@tanstack/react-query'
import { AuthProvider } from '@/providers/AuthProvider'
import { Toaster } from '@/components/ui/sonner'

interface RouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
})

function RootLayout() {
  return (
    <AuthProvider>
      <Outlet />
      <Toaster />
    </AuthProvider>
  )
}
