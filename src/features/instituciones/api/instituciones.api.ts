import api from '@/lib/axiosInstance'
import {
  ApiResponse,
  Institucion,
  InstitucionRequestDTO,
  InstitucionPaginadoResponse,
  InstitucionModuloPermiso,
  ModuloSistema,
  PermisoAccesoPacientes,
  PermisoRegistroParticipantes,
  TipoInstitucionCatalogo,
  TipoInstitucionRequestDTO,
} from '@/types/api'

const BASE = '/instituciones'
const TIPOS_BASE = '/catalogos/tipos-institucion'

// ============================================
// CATÁLOGO DE TIPOS DE INSTITUCIÓN (para el select del formulario y su administración)
// ============================================

export async function getTiposInstitucionActivas() {
  const response = await api.get<ApiResponse<TipoInstitucionCatalogo[]>>(TIPOS_BASE)
  return response.data.data
}

/** Lista completa de tipos (activos e inactivos) — sólo para la pantalla de administración. */
export async function getTiposInstitucionTodas() {
  const response = await api.get<ApiResponse<TipoInstitucionCatalogo[]>>(`${TIPOS_BASE}/todas`)
  return response.data.data
}

export async function createTipoInstitucion(data: TipoInstitucionRequestDTO) {
  const response = await api.post<ApiResponse<TipoInstitucionCatalogo>>(TIPOS_BASE, data)
  return response.data.data
}

export async function updateTipoInstitucion(id: number, data: TipoInstitucionRequestDTO) {
  const response = await api.put<ApiResponse<TipoInstitucionCatalogo>>(`${TIPOS_BASE}/${id}`, data)
  return response.data.data
}

export async function toggleTipoInstitucion(id: number) {
  const response = await api.patch<ApiResponse<TipoInstitucionCatalogo>>(`${TIPOS_BASE}/${id}/toggle`)
  return response.data.data
}

// ============================================
// CATÁLOGO DE INSTITUCIONES
// ============================================

export async function getInstitucionesGestionables(): Promise<number[]> {
  const response = await api.get<ApiResponse<number[]>>(`${BASE}/gestionables`)
  return response.data.data
}

export async function getInstitucionesGestionablesEstado(): Promise<number[]> {
  const response = await api.get<ApiResponse<number[]>>(`${BASE}/gestionables-estado`)
  return response.data.data
}

export async function getInstitucionesPaginado(page = 0, size = 10) {
  const response = await api.get<ApiResponse<InstitucionPaginadoResponse>>(`${BASE}/paginado`, {
    params: { page, size },
  })
  return response.data.data
}

export async function searchInstituciones(q: string, soloActivas = true, page = 0, size = 10) {
  const response = await api.get<ApiResponse<InstitucionPaginadoResponse>>(`${BASE}/buscar`, {
    params: { q, soloActivas, page, size },
  })
  return response.data.data
}

/** Instituciones visibles para el usuario actual según jerarquía (propia + descendientes + ancestras con permiso). */
export async function getInstitucionesVisibles() {
  const response = await api.get<ApiResponse<Institucion[]>>(`${BASE}/visibles`)
  return response.data.data
}

export async function getInstitucionesActivas() {
  const response = await api.get<ApiResponse<Institucion[]>>(`${BASE}/activas`)
  return response.data.data
}

export async function getInstitucionesRaices() {
  const response = await api.get<ApiResponse<Institucion[]>>(`${BASE}/raices`)
  return response.data.data
}

export async function getInstitucionesHijas(id: number) {
  const response = await api.get<ApiResponse<Institucion[]>>(`${BASE}/${id}/hijas`)
  return response.data.data
}

export async function getInstitucionById(id: number) {
  const response = await api.get<ApiResponse<Institucion>>(`${BASE}/${id}`)
  return response.data.data
}

export async function getInstitucionByUuid(uuid: string) {
  const response = await api.get<ApiResponse<Institucion>>(`${BASE}/uuid/${uuid}`)
  return response.data.data
}

export async function createInstitucion(data: InstitucionRequestDTO) {
  const response = await api.post<ApiResponse<Institucion>>(BASE, data)
  return response.data.data
}

export async function updateInstitucion(id: number, data: InstitucionRequestDTO) {
  const response = await api.put<ApiResponse<Institucion>>(`${BASE}/${id}`, data)
  return response.data.data
}

export async function toggleInstitucion(id: number) {
  const response = await api.patch<ApiResponse<Institucion>>(`${BASE}/${id}/toggle`)
  return response.data.data
}

// ============================================
// MÓDULOS HABILITADOS DE LA INSTITUCIÓN ACTUAL
// ============================================

/** Devuelve los nombres de los módulos del sistema habilitados para la institución del usuario autenticado. */
export async function getModulosHabilitadosActual() {
  const response = await api.get<ApiResponse<string[]>>(`${BASE}/actual/modulos`)
  return response.data.data
}

// ============================================
// PERMISOS DE MÓDULO POR INSTITUCIÓN (estilo ERP — gestionados por la institución ancestra)
// ============================================

/** Lista los permisos de módulo (otorgados o revocados, con auditoría) de una institución. */
export async function getModulosDeInstitucion(idInstitucion: number) {
  const response = await api.get<ApiResponse<InstitucionModuloPermiso[]>>(`${BASE}/${idInstitucion}/modulos`)
  return response.data.data
}

/**
 * Otorga o revoca el acceso de una institución a un módulo del sistema.
 * `idOtorgante` debe ser una institución ancestra (padre directo o de nivel superior) de `idInstitucion`
 * — el backend valida la jerarquía y rechaza la operación si no se cumple.
 */
export async function otorgarModuloInstitucion(
  idInstitucion: number,
  data: { modulo: ModuloSistema; habilitado: boolean; idOtorgante: number },
) {
  const response = await api.put<ApiResponse<InstitucionModuloPermiso>>(`${BASE}/${idInstitucion}/modulos`, data)
  return response.data.data
}

// ============================================
// PERMISOS DE ACCESO A PACIENTES (institución padre habilita ver sus pacientes a una hija)
// ============================================

/** Permisos que esta institución ha otorgado a otras (habilitados e históricos). */
export async function getPermisosAccesoPacientesOtorgados(idInstitucion: number) {
  const response = await api.get<ApiResponse<PermisoAccesoPacientes[]>>(
    `${BASE}/${idInstitucion}/permisos-pacientes/otorgados`,
  )
  return response.data.data
}

/** Permisos activos que esta institución ha recibido de otras (ancestras). */
export async function getPermisosAccesoPacientesRecibidos(idInstitucion: number) {
  const response = await api.get<ApiResponse<PermisoAccesoPacientes[]>>(
    `${BASE}/${idInstitucion}/permisos-pacientes/recibidos`,
  )
  return response.data.data
}

/** Otorga (o reactiva) el acceso de `idInstitucionRecibe` a los pacientes de `idInstitucion`. */
export async function otorgarPermisoAccesoPacientes(idInstitucion: number, idInstitucionRecibe: number) {
  const response = await api.post<ApiResponse<PermisoAccesoPacientes>>(
    `${BASE}/${idInstitucion}/permisos-pacientes/otorgar/${idInstitucionRecibe}`,
  )
  return response.data.data
}

/** Revoca el acceso previamente otorgado a `idInstitucionRecibe`. */
export async function revocarPermisoAccesoPacientes(idInstitucion: number, idInstitucionRecibe: number) {
  const response = await api.delete<ApiResponse<PermisoAccesoPacientes>>(
    `${BASE}/${idInstitucion}/permisos-pacientes/revocar/${idInstitucionRecibe}`,
  )
  return response.data.data
}

// ============================================
// PERMISOS DE REGISTRO DE PARTICIPANTES
// (institución padre autoriza a una hija a registrar dentro del grupo)
// ============================================

export async function getPermisosRegistroOtorgados(idInstitucion: number) {
  const response = await api.get<ApiResponse<PermisoRegistroParticipantes[]>>(
    `${BASE}/${idInstitucion}/permisos-registro/otorgados`,
  )
  return response.data.data
}

export async function getPermisosRegistroRecibidos(idInstitucion: number) {
  const response = await api.get<ApiResponse<PermisoRegistroParticipantes[]>>(
    `${BASE}/${idInstitucion}/permisos-registro/recibidos`,
  )
  return response.data.data
}

export async function otorgarPermisoRegistro(idInstitucion: number, idInstitucionRecibe: number) {
  const response = await api.post<ApiResponse<PermisoRegistroParticipantes>>(
    `${BASE}/${idInstitucion}/permisos-registro/otorgar/${idInstitucionRecibe}`,
  )
  return response.data.data
}

export async function revocarPermisoRegistro(idInstitucion: number, idInstitucionRecibe: number) {
  const response = await api.delete<ApiResponse<PermisoRegistroParticipantes>>(
    `${BASE}/${idInstitucion}/permisos-registro/revocar/${idInstitucionRecibe}`,
  )
  return response.data.data
}
