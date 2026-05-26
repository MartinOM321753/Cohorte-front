import api from '@/lib/axiosInstance'
import type {
  BitacoraAccesoItem,
  BitacoraAccionItem,
  FiltrosAcceso,
  FiltrosAcciones,
  PageResponse,
} from '../types/bitacora.types'
import type { APIResponse } from '@/types/api'

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

  const res = await api.get<APIResponse>(`/bitacora/accesos?${params}`)
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

  const res = await api.get<APIResponse>(`/bitacora/acciones?${params}`)
  return res.data.data as PageResponse<BitacoraAccionItem>
}
