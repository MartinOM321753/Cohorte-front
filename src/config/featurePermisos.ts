/**
 * Matriz centralizada feature → permiso requerido.
 * Fuente de verdad para Router (control de acceso a rutas) y
 * Sidebar (visibilidad de los ítems de navegación).
 */
export const FEATURE_PERMISOS = {
  dashboard: 'DASHBOARD_VER',
  pacientes: 'PACIENTES_VER',
  estudios: 'ESTUDIOS_VER',
  examenes: 'EXAMENES_VER',
  citas: 'CITAS_VER',
  cobertura: 'COBERTURA_VER',
  biobanco: 'BIOBANCO_VER',
  usuarios: 'USUARIOS_VER',
  instituciones: 'INSTITUCIONES_VER',
  catalogos: 'CATALOGOS_VER',
  bitacoraAccesos: 'BITACORA_ACCESOS_VER',
  bitacoraAcciones: 'BITACORA_ACCIONES_VER',
  configuracion: 'CONFIGURACION_VER',
  permisos: 'PERMISOS_VER',
  misMuestras: 'TRASLADOS_VER',
} as const

export type FeatureKey = keyof typeof FEATURE_PERMISOS

export function permisoFor(feature: FeatureKey): string {
  return FEATURE_PERMISOS[feature]
}
