import api from '@/lib/axiosInstance'
import {
  ApiResponse,
  ConfiguracionHorarioResponse,
  ConfiguracionHorarioRequest,
} from '@/types/api'

const BASE = '/citas/configuracion-horario'

export async function getConfiguracionesHorario(): Promise<ConfiguracionHorarioResponse[]> {
  const { data } = await api.get<ApiResponse<ConfiguracionHorarioResponse[]>>(BASE)
  return data.data
}

export async function getConfiguracionHorarioActiva(): Promise<ConfiguracionHorarioResponse | null> {
  const { data } = await api.get<ApiResponse<ConfiguracionHorarioResponse | null>>(`${BASE}/activa`)
  return data.data
}

export async function createConfiguracionHorario(dto: ConfiguracionHorarioRequest): Promise<ConfiguracionHorarioResponse> {
  const { data } = await api.post<ApiResponse<ConfiguracionHorarioResponse>>(BASE, dto)
  return data.data
}

export async function updateConfiguracionHorario(id: number, dto: ConfiguracionHorarioRequest): Promise<ConfiguracionHorarioResponse> {
  const { data } = await api.put<ApiResponse<ConfiguracionHorarioResponse>>(`${BASE}/${id}`, dto)
  return data.data
}

export async function activarConfiguracionHorario(id: number): Promise<void> {
  await api.patch(`${BASE}/${id}/activar`)
}

export async function deleteConfiguracionHorario(id: number): Promise<void> {
  await api.delete(`${BASE}/${id}`)
}
