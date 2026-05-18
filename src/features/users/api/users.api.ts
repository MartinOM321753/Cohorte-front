import api from '@/lib/axiosInstance'
import type { ApiResponse, Usuario } from '@/types/api'

export async function getUsuarios(params?: { activo?: boolean }) {
  const response = await api.get<ApiResponse<Usuario[]>>('/users', { params })
  return response.data.data
}

