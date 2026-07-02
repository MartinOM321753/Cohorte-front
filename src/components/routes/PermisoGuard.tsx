import { useAuthStore } from '@/stores/authStore'

interface PermisoGuardProps {
  children: React.ReactNode
  permiso: string
  fallback?: React.ReactNode
}

export function PermisoGuard({ children, permiso, fallback = null }: PermisoGuardProps) {
  const { user, hasPermiso } = useAuthStore()

  if (!user) return <>{fallback}</>
  if (!hasPermiso(permiso)) return <>{fallback}</>

  return <>{children}</>
}
