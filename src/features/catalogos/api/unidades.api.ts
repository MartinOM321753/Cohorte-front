import api from '@/lib/axiosInstance'
import { ApiResponse, UnidadMedida, UnidadMedidaRequestDTO } from '@/types/api'

export async function getUnidadesActivas(): Promise<UnidadMedida[]> {
  const response = await api.get<ApiResponse<UnidadMedida[]>>('/catalogos/unidades')
  return response.data.data
}

export async function getAllUnidades(): Promise<UnidadMedida[]> {
  const response = await api.get<ApiResponse<UnidadMedida[]>>('/catalogos/unidades/todas')
  return response.data.data
}

export async function createUnidad(data: UnidadMedidaRequestDTO): Promise<UnidadMedida> {
  const response = await api.post<ApiResponse<UnidadMedida>>('/catalogos/unidades', data)
  return response.data.data
}

export async function updateUnidad(id: number, data: UnidadMedidaRequestDTO): Promise<UnidadMedida> {
  const response = await api.put<ApiResponse<UnidadMedida>>(`/catalogos/unidades/${id}`, data)
  return response.data.data
}

export async function toggleUnidad(id: number): Promise<UnidadMedida> {
  const response = await api.patch<ApiResponse<UnidadMedida>>(`/catalogos/unidades/${id}/toggle`)
  return response.data.data
}
