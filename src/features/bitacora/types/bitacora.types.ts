// ── Enums ─────────────────────────────────────────────────────────────────────

export type TipoEventoAcceso = 'LOGIN' | 'LOGOUT' | 'LOGIN_FALLIDO'
export type TipoAccion       = 'CREAR' | 'ACTUALIZAR' | 'ELIMINAR'

// ── Bitácora de Acceso ────────────────────────────────────────────────────────

export interface BitacoraAccesoItem {
  id:                  number
  usuarioUuid:         string | null
  username:            string | null
  nombreCompleto:      string | null
  rol:                 string | null
  ip:                  string | null
  latitud:             number | null
  longitud:            number | null
  /** Margen de error de la lectura GPS en metros */
  precisionM:          number | null
  tipoEvento:          TipoEventoAcceso
  timestamp:           string           // ISO-8601
  userAgent:           string | null
  duracionSesionSeg:   number | null
  identificadorIntento: string | null
}

// ── Bitácora de Acciones ─────────────────────────────────────────────────────

export interface BitacoraAccionItem {
  id:                number
  usuarioUuid:       string | null
  username:          string | null
  nombreCompleto:    string | null
  rol:               string | null
  ip:                string | null
  endpoint:          string | null
  metodoHttp:        string | null
  tipoAccion:        TipoAccion
  entidadAfectada:   string | null
  valoresAnteriores: string | null   // JSON string
  valoresNuevos:     string | null   // JSON string
  sentenciaSql:      string | null
  duracionMs:        number | null
  timestamp:         string          // ISO-8601
  exitoso:           boolean
  mensajeError:      string | null
}

// ── Paginación (Spring Page) ──────────────────────────────────────────────────

export interface PageResponse<T> {
  content:          T[]
  totalElements:    number
  totalPages:       number
  number:           number   // página actual (0-indexed)
  size:             number
  first:            boolean
  last:             boolean
}

// ── Filtros ───────────────────────────────────────────────────────────────────

export interface FiltrosAcceso {
  desde:       string | null
  hasta:       string | null
  usuarioUuid: string | null
  tipoEvento:  TipoEventoAcceso | ''
  page:        number
  size:        number
}

export interface FiltrosAcciones {
  desde:       string | null
  hasta:       string | null
  usuarioUuid: string | null
  tipoAccion:  TipoAccion | ''
  entidad:     string | null
  page:        number
  size:        number
}

// ── Labels ────────────────────────────────────────────────────────────────────

export const TIPO_EVENTO_LABELS: Record<TipoEventoAcceso, string> = {
  LOGIN:         'Inicio de sesión',
  LOGOUT:        'Cierre de sesión',
  LOGIN_FALLIDO: 'Intento fallido',
}

export const TIPO_ACCION_LABELS: Record<TipoAccion, string> = {
  CREAR:      'Creación',
  ACTUALIZAR: 'Actualización',
  ELIMINAR:   'Eliminación',
}

export const TIPO_EVENTO_BADGE: Record<TipoEventoAcceso, string> = {
  LOGIN:         'bg-green-100 text-green-700',
  LOGOUT:        'bg-blue-100 text-blue-700',
  LOGIN_FALLIDO: 'bg-red-100 text-red-700',
}

export const TIPO_ACCION_BADGE: Record<TipoAccion, string> = {
  CREAR:      'bg-green-100 text-green-700',
  ACTUALIZAR: 'bg-yellow-100 text-yellow-700',
  ELIMINAR:   'bg-red-100 text-red-700',
}
