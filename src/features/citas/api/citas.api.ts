import api from '@/lib/axiosInstance'
import { ApiResponse, Cita, CitaRequestDTO, CitaResumen, CitaUpdateRequestDTO } from '@/types/api'

export async function getCitas(params?: {
  pacienteUUID?: string
  buscar?: string
  /** Rango visible del calendario (ISO-8601 UTC). Sin ellos, el backend trae todo. */
  start?: string
  end?: string
}) {
  const response = await api.get<ApiResponse<Cita[]>>('/citas', { params })
  return response.data.data
}

export async function getCitasResumenByPaciente(pacienteUuid: string): Promise<CitaResumen[]> {
  const response = await api.get<ApiResponse<CitaResumen[]>>(`/citas/paciente/${pacienteUuid}/resumen`)
  return response.data.data
}

/** Cita completa por UUID (para editarla desde el expediente sin ir al calendario). */
export async function getCita(uuid: string): Promise<Cita> {
  const response = await api.get<ApiResponse<Cita>>(`/citas/${uuid}`)
  return response.data.data
}

export async function createCita(data: CitaRequestDTO) {
  const response = await api.post<ApiResponse<Cita>>('/citas', data)
  return response.data.data
}

export async function updateCita(uuid: string, data: CitaUpdateRequestDTO) {
  const response = await api.patch<ApiResponse<Cita>>(`/citas/${uuid}`, data)
  return response.data.data
}
