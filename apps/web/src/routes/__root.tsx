import { createRootRouteWithContext, Outlet, type ErrorComponentProps } from '@tanstack/react-router'
import type { QueryClient } from '@tanstack/react-query'
import { AuthProvider } from '@/providers/AuthProvider'
import { Toaster } from '@/components/ui/sonner'

interface RouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
  errorComponent: RootErrorComponent,
})

function RootErrorComponent({ error }: ErrorComponentProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="max-w-lg w-full bg-white rounded-lg shadow-sm border border-slate-200 p-8">
        <h1 className="text-xl font-semibold text-slate-800 mb-2">Something went wrong</h1>
        <p className="text-sm text-slate-500 mb-4">An unexpected error occurred. Please try refreshing the page.</p>
        <details className="text-xs text-slate-400 bg-slate-50 rounded p-3">
          <summary className="cursor-pointer font-medium text-slate-500">Error details</summary>
          <pre className="mt-2 whitespace-pre-wrap break-words">
            {error instanceof Error ? `${error.message}\n\n${error.stack}` : String(error)}
          </pre>
        </details>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700"
        >
          Refresh Page
        </button>
      </div>
    </div>
  )
}

function RootLayout() {
  return (
    <AuthProvider>
      <Outlet />
      <Toaster />
    </AuthProvider>
  )
}
