import axiosInstance from '@/lib/axiosInstance'
import { ApiResponse, Paciente, PacienteRequestDTO, PaginatedResponse } from '@/types/api'

/**
 * Get all pacientes with optional pagination and filtering
 */
export async function getPacientes(params?: {
  page?: number
  size?: number
  buscar?: string
  incluirJerarquia?: boolean
}): Promise<Paciente[] | PaginatedResponse<Paciente>> {
  const response = await axiosInstance.get<ApiResponse<Paciente[]>>('/pacientes', { params })
  return response.data.data
}

/**
 * Get active pacientes only
 */
export async function getPacientesActivos(): Promise<Paciente[]> {
  const response = await axiosInstance.get<ApiResponse<Paciente[]>>('/pacientes/activos')
  return response.data.data
}

/**
 * Get paciente by ID
 */
export async function getPacienteById(id: number): Promise<Paciente> {
  const response = await axiosInstance.get<ApiResponse<Paciente>>(`/pacientes/${id}`)
  return response.data.data
}

/**
 * Get paciente by UUID
 */
export async function getPacienteByUUID(uuid: string): Promise<Paciente> {
  const response = await axiosInstance.get<ApiResponse<Paciente>>(`/pacientes/uuid/${uuid}`)
  return response.data.data
}

/**
 * Get paciente by folio
 */
export async function getPacienteByFolio(folio: string): Promise<Paciente> {
  const response = await axiosInstance.get<ApiResponse<Paciente>>(`/pacientes/folio/${folio}`)
  return response.data.data
}

/**
 * Create a new paciente
 */
export async function createPaciente(data: PacienteRequestDTO): Promise<Paciente> {
  const response = await axiosInstance.post<ApiResponse<Paciente>>('/pacientes', data)
  return response.data.data
}

/**
 * Update an existing paciente
 */
export async function updatePaciente(id: number, data: PacienteRequestDTO): Promise<Paciente> {
  const response = await axiosInstance.put<ApiResponse<Paciente>>(`/pacientes/${id}`, data)
  return response.data.data
}

/**
 * Delete a paciente (soft delete)
 */
export async function deletePaciente(id: number): Promise<void> {
  await axiosInstance.delete(`/pacientes/${id}`)
}

/**
 * Toggle activo / inactivo del paciente identificado por UUID.
 */
export async function toggleActivoPaciente(uuid: string): Promise<Paciente> {
  const response = await axiosInstance.patch<ApiResponse<Paciente>>(
    `/pacientes/uuid/${uuid}/toggle-activo`
  )
  return response.data.data
}

export interface ImportResultDTO {
  totalFilas: number
  exitosos: number
  errores: number
  duplicados: number
  detalleErrores: { fila: number; folio: string; motivo: string }[]
}

export async function importarPacientes(archivo: File): Promise<ImportResultDTO> {
  const formData = new FormData()
  formData.append('archivo', archivo)
  const response = await axiosInstance.post<ApiResponse<ImportResultDTO>>(
    '/pacientes/importar',
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  )
  return response.data.data
}
