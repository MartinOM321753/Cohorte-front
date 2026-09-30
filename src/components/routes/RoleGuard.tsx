import { useAuthStore, type UserRole } from '@/stores/authStore'

interface RoleGuardProps {
  children: React.ReactNode
  allowedRoles: UserRole[]
  fallback?: React.ReactNode
}

export function RoleGuard({ children, allowedRoles, fallback = null }: RoleGuardProps) {
  const { user, hasRole } = useAuthStore()

  if (!user) return <>{fallback}</>

  // Use the hasRole function from authStore which handles both roles array and rol object
  const hasAccess = hasRole(allowedRoles)

  if (!hasAccess) return <>{fallback}</>

  return <>{children}</>
}
