import { createFileRoute } from '@tanstack/react-router'
import { useAuth } from '@/providers/AuthProvider'

export const Route = createFileRoute('/_authenticated/')({
  component: DashboardPage,
})

function DashboardPage() {
  const { currentUser } = useAuth()

  return (
    <div className="min-h-screen bg-background p-8">
      <h1 className="text-2xl font-bold text-foreground">Welcome to PropertyFlow CRM</h1>
      {currentUser && (
        <p className="mt-2 text-muted-foreground">
          Hello, {currentUser.firstName} {currentUser.lastName}
        </p>
      )}
    </div>
  )
}
