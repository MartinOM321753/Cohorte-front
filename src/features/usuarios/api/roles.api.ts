import axiosInstance from '@/lib/axiosInstance'
import type { RolOption } from '../types/usuario.types'

interface ApiResponse<T> {
  data: T
  message: string
  error: boolean
}

export const getRoles = async (): Promise<RolOption[]> => {
  const res = await axiosInstance.get<ApiResponse<RolOption[]>>('/roles')
  return res.data.data
}
