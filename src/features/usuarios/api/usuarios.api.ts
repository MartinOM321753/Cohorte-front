import axiosInstance from '@/lib/axiosInstance'
import type { Usuario, UsuarioRequestDTO } from '../types/usuario.types'

interface ApiResponse<T> {
  data: T
  message: string
  status: string
  error: boolean
}

export const getUsuarios = async (): Promise<Usuario[]> => {
  const res = await axiosInstance.get<ApiResponse<Usuario[]>>('/users')
  return res.data.data
}

export const getUsuarioById = async (id: number): Promise<Usuario> => {
  const res = await axiosInstance.get<ApiResponse<Usuario>>(`/users/${id}`)
  return res.data.data
}

export const createUsuario = async (data: UsuarioRequestDTO): Promise<Usuario> => {
  const res = await axiosInstance.post<ApiResponse<Usuario>>('/users', data)
  return res.data.data
}

export const updateUsuario = async (id: number, data: UsuarioRequestDTO): Promise<Usuario> => {
  const res = await axiosInstance.put<ApiResponse<Usuario>>(`/users/${id}`, data)
  return res.data.data
}
