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

export const toggleActivoUsuario = async (id: number): Promise<Usuario> => {
  const res = await axiosInstance.patch<ApiResponse<Usuario>>(`/users/${id}/activo`)
  return res.data.data
}

/** Devuelve todos los usuarios activos (GET /users/activos). */
export const getUsuariosActivos = async (): Promise<Usuario[]> => {
  const res = await axiosInstance.get<ApiResponse<Usuario[]>>('/users/activos')
  return res.data.data
}

/** Devuelve los usuarios ACTIVOS con el rol indicado (usa el endpoint dedicado del backend). */
export const getUsuariosByRolName = async (roleName: string): Promise<Usuario[]> => {
  const res = await axiosInstance.get<ApiResponse<Usuario[]>>(`/users/rol/${roleName}`)
  return res.data.data
}

/**
 * Administradores activos disponibles para ser asignados como encargado.
 * Si se pasa `institucionUuid`, también incluye al admin ya asignado a esa institución
 * (necesario en modo edición para que el encargado actual siga apareciendo).
 */
export const getAdministradoresDisponibles = async (institucionUuid?: string): Promise<Usuario[]> => {
  const params = institucionUuid ? `?institucionUuid=${encodeURIComponent(institucionUuid)}` : ''
  const res = await axiosInstance.get<ApiResponse<Usuario[]>>(`/users/administradores-disponibles${params}`)
  return res.data.data
}
