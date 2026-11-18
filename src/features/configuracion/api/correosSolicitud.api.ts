import api from '@/lib/axiosInstance'
import type { ApiResponse } from '@/types/api'

export interface CorreoDestinoSolicitud {
  id: number
  email: string
  nombre: string | null
  activo: boolean
  fechaCreacion: string
}

export interface CorreoDestinoRequest {
  email: string
  nombre?: string
}

const BASE = '/configuracion/correos-solicitud'

export async function getCorreosSolicitud(): Promise<CorreoDestinoSolicitud[]> {
  const { data } = await api.get<ApiResponse<CorreoDestinoSolicitud[]>>(BASE)
  return data.data
}

export async function agregarCorreoSolicitud(dto: CorreoDestinoRequest): Promise<CorreoDestinoSolicitud> {
  const { data } = await api.post<ApiResponse<CorreoDestinoSolicitud>>(BASE, dto)
  return data.data
}

export async function toggleCorreoSolicitud(id: number): Promise<CorreoDestinoSolicitud> {
  const { data } = await api.patch<ApiResponse<CorreoDestinoSolicitud>>(`${BASE}/${id}/toggle`)
  return data.data
}

export async function eliminarCorreoSolicitud(id: number): Promise<void> {
  await api.delete(`${BASE}/${id}`)
}
