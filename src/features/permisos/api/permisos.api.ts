import api from '@/lib/axiosInstance'
import type {
  PermisoDTO,
  RolConPermisosDTO,
  UsuarioPermisosResumenDTO,
  RolAsignadoDTO,
  PermisoIndividualDTO,
  BitacoraPermisosPage,
  ActualizarPermisosRolRequest,
  AsignarRolRequest,
  PermisoIndividualRequest,
} from '../types/permiso.types'

interface ApiResp<T> { data: T; message: string; error: boolean }

// ── Catálogo ─────────────────────────────────────────────────────────────────

export async function getCatalogo(): Promise<Record<string, PermisoDTO[]>> {
  const res = await api.get<ApiResp<Record<string, PermisoDTO[]>>>('/permisos')
  return res.data.data
}

// ── Roles ────────────────────────────────────────────────────────────────────

export async function getRolesConPermisos(): Promise<RolConPermisosDTO[]> {
  const res = await api.get<ApiResp<RolConPermisosDTO[]>>('/permisos/roles')
  return res.data.data
}

export async function actualizarPermisosRol(idRol: number, body: ActualizarPermisosRolRequest): Promise<RolConPermisosDTO> {
  const res = await api.put<ApiResp<RolConPermisosDTO>>(`/permisos/roles/${idRol}`, body)
  return res.data.data
}

// ── Permisos de usuario ──────────────────────────────────────────────────────

export async function getPermisosUsuario(uuid: string): Promise<UsuarioPermisosResumenDTO> {
  const res = await api.get<ApiResp<UsuarioPermisosResumenDTO>>(`/permisos/usuarios/${uuid}`)
  return res.data.data
}

export async function getRolesUsuario(uuid: string): Promise<RolAsignadoDTO[]> {
  const res = await api.get<ApiResp<RolAsignadoDTO[]>>(`/permisos/usuarios/${uuid}/roles`)
  return res.data.data
}

export async function asignarRol(uuid: string, body: AsignarRolRequest): Promise<RolAsignadoDTO> {
  const res = await api.post<ApiResp<RolAsignadoDTO>>(`/permisos/usuarios/${uuid}/roles`, body)
  return res.data.data
}

export async function quitarRol(uuid: string, idRol: number): Promise<void> {
  await api.delete(`/permisos/usuarios/${uuid}/roles/${idRol}`)
}

export async function concederPermiso(uuid: string, body: PermisoIndividualRequest): Promise<PermisoIndividualDTO> {
  const res = await api.post<ApiResp<PermisoIndividualDTO>>(`/permisos/usuarios/${uuid}/concesiones`, body)
  return res.data.data
}

export async function restringirPermiso(uuid: string, body: PermisoIndividualRequest): Promise<PermisoIndividualDTO> {
  const res = await api.post<ApiResp<PermisoIndividualDTO>>(`/permisos/usuarios/${uuid}/restricciones`, body)
  return res.data.data
}

export async function quitarPermisoIndividual(uuid: string, id: number): Promise<void> {
  await api.delete(`/permisos/usuarios/${uuid}/individuales/${id}`)
}

// ── Bitácora ─────────────────────────────────────────────────────────────────

export async function getBitacoraPermisos(params: { uuid?: string; page: number; size: number }): Promise<BitacoraPermisosPage> {
  const qs = new URLSearchParams()
  if (params.uuid) qs.set('uuid', params.uuid)
  qs.set('page', String(params.page))
  qs.set('size', String(params.size))
  const res = await api.get<ApiResp<BitacoraPermisosPage>>(`/permisos/bitacora?${qs}`)
  return res.data.data
}
