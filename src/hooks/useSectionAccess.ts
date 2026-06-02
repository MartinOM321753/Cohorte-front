import { useAuthStore } from '@/stores/authStore'
import { EXPEDIENTE_SECTION_ROLES, type SectionKey } from '@/config/expedienteSections'

/**
 * Devuelve `true` si el usuario autenticado tiene acceso a la sección indicada.
 *
 * Uso en componente:
 *   const canSee = useSectionAccess('somatometria')
 *   if (!canSee) return null
 *
 * Uso en hook con TanStack Query:
 *   const canSee = useSectionAccess('examenes')
 *   const { data } = useQuery({ ..., enabled: canSee && !!patientUuid })
 */
export function useSectionAccess(section: SectionKey): boolean {
  const hasRole = useAuthStore((s) => s.hasRole)
  const allowedRoles = EXPEDIENTE_SECTION_ROLES[section]
  if (!allowedRoles || allowedRoles.length === 0) return false
  return allowedRoles.some((role) => hasRole(role))
}
