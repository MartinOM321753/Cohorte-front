import api from '@/lib/axiosInstance'
import { ApiResponse, Cita, CitaRequestDTO, CitaResumen, CitaUpdateRequestDTO } from '@/types/api'

export async function getCitas(params?: { pacienteUUID?: string; buscar?: string }) {
  const response = await api.get<ApiResponse<Cita[]>>('/citas', { params })
  return response.data.data
}

export async function getCitasResumenByPaciente(pacienteUuid: string): Promise<CitaResumen[]> {
  const response = await api.get<ApiResponse<CitaResumen[]>>(`/citas/paciente/${pacienteUuid}/resumen`)
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
