import type { SpringPage } from '@/types/api'

// ── Catálogo ─────────────────────────────────────────────────────────────────

export interface PermisoDTO {
  id: number
  codigo: string
  modulo: string
  descripcion: string
  activo: boolean
}

// ── Roles con permisos plantilla ─────────────────────────────────────────────

export interface RolConPermisosDTO {
  id: number
  uuid: string
  nombre: string
  permisos: PermisoDTO[]
}

// ── Permisos del usuario ─────────────────────────────────────────────────────

export interface RolAsignadoDTO {
  idUsuarioRol: number
  idRol: number
  uuid: string
  nombre: string
  fechaAsignacion: string
}

export interface PermisoEfectivoDTO {
  codigo: string
  modulo: string
  descripcion: string
  origen: 'ROL_HEREDADO' | 'CONCESION_INDIVIDUAL' | 'TEMPORAL' | 'RESTRICCION'
  detalleOrigen: string | null
}

export interface PermisoIndividualDTO {
  id: number
  codigoPermiso: string
  modulo: string
  descripcion: string
  tipo: 'CONCESION' | 'RESTRICCION'
  motivo: string | null
  fechaInicio: string | null
  fechaFin: string | null
  otorgadoPorUuid: string | null
  otorgadoPorUsername: string | null
  fechaCreacion: string
  activo: boolean
}

export interface UsuarioPermisosResumenDTO {
  uuid: string
  username: string
  nombreCompleto: string
  roles: RolAsignadoDTO[]
  permisosEfectivos: PermisoEfectivoDTO[]
  permisosIndividuales: PermisoIndividualDTO[]
}

// ── Bitácora ─────────────────────────────────────────────────────────────────

export interface BitacoraPermisoDTO {
  id: number
  usuarioAfectadoUuid: string | null
  accion: string
  detalle: string
  realizadoPorUuid: string
  timestamp: string
}

export type BitacoraPermisosPage = SpringPage<BitacoraPermisoDTO>

// ── Requests ─────────────────────────────────────────────────────────────────

export interface AsignarRolRequest {
  idRol: number
}

export interface PermisoIndividualRequest {
  codigoPermiso: string
  motivo?: string
  fechaFin?: string | null
}

export interface ActualizarPermisosRolRequest {
  codigosPermisos: string[]
}
