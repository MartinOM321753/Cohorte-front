import type { UserRole } from '@/stores/authStore'

/**
 * Matriz centralizada feature → roles permitidos.
 * Única fuente de verdad consumida por Router (control de acceso a rutas) y
 * Sidebar (visibilidad de los ítems de navegación), evitando que ambos se
 * desincronicen al agregar o modificar un módulo.
 */
export const FEATURE_ROLES = {
  dashboard: ['ADMINISTRADOR', 'MEDICO', 'RECEPCIONISTA', 'LABORATORISTA', 'PACIENTE'],
  pacientes: ['ADMINISTRADOR', 'RECEPCIONISTA'],
  estudios: ['ADMINISTRADOR', 'RECEPCIONISTA'],
  examenes: ['ADMINISTRADOR', 'MEDICO', 'LABORATORISTA'],
  citas: ['ADMINISTRADOR', 'MEDICO', 'RECEPCIONISTA'],
  cobertura: ['ADMINISTRADOR', 'MEDICO'],
  biobanco: ['ADMINISTRADOR', 'MEDICO'],
  usuarios: ['ADMINISTRADOR'],
  instituciones: ['ADMINISTRADOR'],
  catalogos: ['ADMINISTRADOR'],
  bitacoraAccesos: ['ADMINISTRADOR'],
  bitacoraAcciones: ['ADMINISTRADOR'],
  configuracion: ['ADMINISTRADOR'],
  misMuestras: ['ENCARGADO'],
} as const satisfies Record<string, UserRole[]>

export type FeatureKey = keyof typeof FEATURE_ROLES

/** Roles del área clínica/administrativa principal (ENCARGADO queda fuera). */
export const CLINICAL_ROLES: UserRole[] = FEATURE_ROLES.dashboard

/** Devuelve la lista de roles permitidos para una feature como arreglo mutable de UserRole. */
export function rolesFor(feature: FeatureKey): UserRole[] {
  return [...FEATURE_ROLES[feature]]
}
