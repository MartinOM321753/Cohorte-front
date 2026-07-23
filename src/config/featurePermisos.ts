/**
 * Matriz centralizada feature → permiso requerido.
 * Fuente de verdad para Router (control de acceso a rutas) y
 * Sidebar (visibilidad de los ítems de navegación).
 */
/**
 * Cada feature se resuelve por uno o varios permisos ACCEDER; si el usuario
 * tiene ALGUNO, la ruta/sidebar es visible. Estudios/Exámenes/Biobanco usan
 * OR entre sus sub-tabs porque basta tener uno para justificar la página.
 */
export const FEATURE_PERMISOS: Record<string, string[]> = {
  dashboard:        ['DASHBOARD_VER'],
  pacientes:        ['PACIENTES_ACCEDER'],
  estudios:         ['ESTUDIOS_LLENADO_ACCEDER', 'ESTUDIOS_CATALOGO_ACCEDER'],
  examenes:         ['EXAMENES_LLENADO_ACCEDER', 'EXAMENES_CATALOGO_ACCEDER'],
  citas:            ['CITAS_VER'],
  cobertura:        ['COBERTURA_VER'],
  biobanco:         ['BIOBANCO_VER',
                     'REFRIGERADORES_ACCEDER', 'CAJAS_ACCEDER',
                     'MUESTRAS_VER',
                     'TIPOS_MUESTRA_ACCEDER', 'ESTUDIOS_MUESTRA_ACCEDER',
                     'TRASLADOS_ACCEDER'],
  usuarios:         ['USUARIOS_ACCEDER'],
  instituciones:    ['INSTITUCIONES_ACCEDER'],
  catalogos:        ['CATALOGOS_ACCEDER'],
  bitacoraAccesos:  ['BITACORA_ACCESOS_VER'],
  bitacoraAcciones: ['BITACORA_ACCIONES_VER'],
  configuracion:    ['CONFIGURACION_VER'],
  permisos:         ['PERMISOS_VER'],
}

export type FeatureKey = keyof typeof FEATURE_PERMISOS

/** Devuelve el primer permiso ACCEDER de la feature (para compatibilidad
 *  con llamantes que esperan un único string; para el chequeo real usar
 *  hasAnyPermisoForFeature o permisosFor). */
export function permisoFor(feature: FeatureKey): string {
  return FEATURE_PERMISOS[feature][0]
}

/** Devuelve TODOS los permisos ACCEDER de la feature (OR). Usar para
 *  ProtectedRoute y para gates que aceptan array. */
export function permisosFor(feature: FeatureKey): string[] {
  return FEATURE_PERMISOS[feature]
}

/** True si el usuario tiene ALGUNO de los permisos ACCEDER de la feature. */
export function hasAnyPermisoForFeature(
  feature: FeatureKey,
  hasPermiso: (permiso: string) => boolean,
): boolean {
  return FEATURE_PERMISOS[feature].some(hasPermiso)
}

/**
 * Resuelve la ruta de inicio tras login según los permisos efectivos.
 * Único punto de verdad — evita que cada pantalla reinvente su propio
 * fallback y termine mandando a alguien (p. ej. PACIENTE) a una sección
 * de staff para la que no tiene autorización.
 */
/**
 * Cadena de fallback ordenada: se toma la primera ruta cuyo permiso ACCEDER
 * tiene el usuario. Si el admin quita DASHBOARD_VER a un rol/usuario, la
 * redirección post-login (y el logo/Inicio del sidebar) apuntará
 * automáticamente a la primera pantalla disponible en su lugar en vez de
 * caer en /dashboard y sacar al usuario con 401.
 */
const HOME_FALLBACK_CHAIN: Array<{ ruta: string; feature: FeatureKey }> = [
  { ruta: '/dashboard',           feature: 'dashboard' },
  { ruta: '/pacientes',           feature: 'pacientes' },
  { ruta: '/citas',               feature: 'citas' },
  { ruta: '/estudios',            feature: 'estudios' },
  { ruta: '/examenes',            feature: 'examenes' },
  { ruta: '/biobanco',            feature: 'biobanco' },
  { ruta: '/cobertura',           feature: 'cobertura' },
  { ruta: '/catalogos',           feature: 'catalogos' },
  { ruta: '/usuarios',            feature: 'usuarios' },
  { ruta: '/instituciones',       feature: 'instituciones' },
  { ruta: '/permisos',            feature: 'permisos' },
  { ruta: '/bitacora/accesos',    feature: 'bitacoraAccesos' },
  { ruta: '/bitacora/acciones',   feature: 'bitacoraAcciones' },
  { ruta: '/configuracion',       feature: 'configuracion' },
]

export function resolveHomeRoute(hasPermiso: (permiso: string) => boolean): string {
  for (const { ruta, feature } of HOME_FALLBACK_CHAIN) {
    if (hasAnyPermisoForFeature(feature, hasPermiso)) return ruta
  }
  // PACIENTE: misma página de expediente 360 que usa el staff, en modo lectura
  // (ExpedientePacientePage resuelve su propio UUID cuando no llega por state)
  if (hasPermiso('EXPEDIENTE_VER')) return '/pacientes/expediente'
  // Sin ningún permiso — mostrar la pantalla "sin autorización" en lugar de
  // reventar sacando al usuario por 401 en cascada.
  return '/unauthorized'
}
