import api from '@/lib/axiosInstance'
import type {
  BitacoraAccesoItem,
  BitacoraAccionItem,
  FiltrosAcceso,
  FiltrosAcciones,
  PageResponse,
  UsuarioBitacora,
} from '../types/bitacora.types'
import type { ApiResponse as APIResponse } from '@/types/api'

// ── Usuarios con registros ────────────────────────────────────────────────────

export async function getUsuariosConAccesos(): Promise<UsuarioBitacora[]> {
  const res = await api.get<APIResponse<UsuarioBitacora[]>>('/bitacora/accesos/usuarios')
  return res.data.data as UsuarioBitacora[]
}

export async function getUsuariosConAcciones(): Promise<UsuarioBitacora[]> {
  const res = await api.get<APIResponse<UsuarioBitacora[]>>('/bitacora/acciones/usuarios')
  return res.data.data as UsuarioBitacora[]
}

// ── Accesos ───────────────────────────────────────────────────────────────────

export async function getBitacoraAccesos(
  filtros: FiltrosAcceso,
): Promise<PageResponse<BitacoraAccesoItem>> {
  const params = new URLSearchParams()
  if (filtros.desde)       params.set('desde',       filtros.desde)
  if (filtros.hasta)       params.set('hasta',       filtros.hasta)
  if (filtros.usuarioUuid) params.set('usuarioUuid', filtros.usuarioUuid)
  if (filtros.tipoEvento)  params.set('tipoEvento',  filtros.tipoEvento)
  params.set('page', String(filtros.page))
  params.set('size', String(filtros.size))

  const res = await api.get<APIResponse<PageResponse<BitacoraAccesoItem>>>(`/bitacora/accesos?${params}`)
  return res.data.data as PageResponse<BitacoraAccesoItem>
}

// ── Acciones ──────────────────────────────────────────────────────────────────

export async function getBitacoraAcciones(
  filtros: FiltrosAcciones,
): Promise<PageResponse<BitacoraAccionItem>> {
  const params = new URLSearchParams()
  if (filtros.desde)       params.set('desde',       filtros.desde)
  if (filtros.hasta)       params.set('hasta',       filtros.hasta)
  if (filtros.usuarioUuid) params.set('usuarioUuid', filtros.usuarioUuid)
  if (filtros.tipoAccion)  params.set('tipoAccion',  filtros.tipoAccion)
  if (filtros.entidad)     params.set('entidad',     filtros.entidad)
  params.set('page', String(filtros.page))
  params.set('size', String(filtros.size))

  const res = await api.get<APIResponse<PageResponse<BitacoraAccionItem>>>(`/bitacora/acciones?${params}`)
  return res.data.data as PageResponse<BitacoraAccionItem>
}
