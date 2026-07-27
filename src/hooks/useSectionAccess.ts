import { useAuthStore } from '@/stores/authStore'
import { EXPEDIENTE_SECTION_PERMISOS, type SectionKey } from '@/config/expedienteSections'

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
  const hasPermiso = useAuthStore((s) => s.hasPermiso)
  const requiredPermiso = EXPEDIENTE_SECTION_PERMISOS[section]
  if (!requiredPermiso) return false
  return hasPermiso(requiredPermiso)
}
