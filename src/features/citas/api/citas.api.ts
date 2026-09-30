import api from '@/lib/axiosInstance'
import { ApiResponse, Cita, CitaRequestDTO } from '@/types/api'

export async function getCitas(params?: { pacienteUUID?: string; buscar?: string }) {
  const response = await api.get<ApiResponse<Cita[]>>('/citas', { params })
  return response.data.data
}

export async function createCita(data: CitaRequestDTO) {
  const response = await api.post<ApiResponse<Cita>>('/citas', data)
  return response.data.data
}
