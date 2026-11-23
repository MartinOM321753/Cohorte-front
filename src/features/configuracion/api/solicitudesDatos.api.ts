import api from '@/lib/axiosInstance'
import type { ApiResponse } from '@/types/api'

export interface SolicitudAccesoDatosResponse {
  id: number
  nombreCompleto: string
  organizacion: string
  email: string
  proposito: string
  propositoOtro: string | null
  proyecto: string
  informacionSolicitada: string
  productos: string[]
  productoOtro: string | null
  estado: 'PENDIENTE' | 'REVISADA' | 'APROBADA' | 'RECHAZADA'
  ipSolicitante: string
  telefono?: string | null
  correoVerificadoEn?: string | null
  ubicacionLatitud?: number | null
  ubicacionLongitud?: number | null
  ubicacionPrecision?: number | null
  ubicacionCapturadaEn?: string | null
  conexionPais?: string | null
  conexionProveedor?: string | null
  conexionRevisadaEn?: string | null
  fechaSolicitud: string
  fechaActualizacion: string
}

const BASE = '/configuracion/solicitudes-datos'

export async function getSolicitudesDatos(): Promise<SolicitudAccesoDatosResponse[]> {
  const { data } = await api.get<ApiResponse<SolicitudAccesoDatosResponse[]>>(BASE)
  return data.data
}

export async function cambiarEstadoSolicitud(id: number, estado: string): Promise<SolicitudAccesoDatosResponse> {
  const { data } = await api.patch<ApiResponse<SolicitudAccesoDatosResponse>>(`${BASE}/${id}/estado?estado=${estado}`)
  return data.data
}
