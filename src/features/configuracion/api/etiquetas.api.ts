import api from '@/lib/axiosInstance'
import {
  ApiResponse,
  ConfiguracionEtiquetaResponse,
  ConfiguracionEtiquetaRequest,
  OpcionesEtiqueta,
} from '@/types/api'

const BASE = '/impresion/configuraciones'

export async function getConfiguracionesEtiqueta(): Promise<ConfiguracionEtiquetaResponse[]> {
  const { data } = await api.get<ApiResponse<ConfiguracionEtiquetaResponse[]>>(BASE)
  return data.data
}

export async function getConfiguracionesActivas(): Promise<ConfiguracionEtiquetaResponse[]> {
  const { data } = await api.get<ApiResponse<ConfiguracionEtiquetaResponse[]>>(`${BASE}/activas`)
  return data.data
}

export async function getConfiguracionEtiqueta(id: number): Promise<ConfiguracionEtiquetaResponse> {
  const { data } = await api.get<ApiResponse<ConfiguracionEtiquetaResponse>>(`${BASE}/${id}`)
  return data.data
}

export async function getConfiguracionPredeterminada(): Promise<ConfiguracionEtiquetaResponse | null> {
  const { data } = await api.get<ApiResponse<ConfiguracionEtiquetaResponse | null>>(`${BASE}/predeterminada`)
  return data.data
}

export async function createConfiguracionEtiqueta(dto: ConfiguracionEtiquetaRequest): Promise<ConfiguracionEtiquetaResponse> {
  const { data } = await api.post<ApiResponse<ConfiguracionEtiquetaResponse>>(BASE, dto)
  return data.data
}

export async function updateConfiguracionEtiqueta(id: number, dto: ConfiguracionEtiquetaRequest): Promise<ConfiguracionEtiquetaResponse> {
  const { data } = await api.put<ApiResponse<ConfiguracionEtiquetaResponse>>(`${BASE}/${id}`, dto)
  return data.data
}

export async function toggleConfiguracionEtiqueta(id: number): Promise<void> {
  await api.patch(`${BASE}/${id}/toggle`)
}

export async function setPredeterminada(id: number): Promise<void> {
  await api.patch(`${BASE}/${id}/predeterminada`)
}

export async function getOpcionesEtiqueta(): Promise<OpcionesEtiqueta> {
  const { data } = await api.get<ApiResponse<OpcionesEtiqueta>>(`${BASE}/opciones`)
  return data.data
}
