import axiosInstance from '@/lib/axiosInstance'
import {
  ApiResponse,
  EstudioMedico,
  EstudioMedicoRequestDTO,
  TipoEstudio,
  TipoEstudioRequestDTO,
  ParametroEstudio,
  ParametroEstudioRequestDTO,
} from '@/types/api'

// ============================================
// ESTUDIOS MÉDICOS
// ============================================

/**
 * Get all estudios médicos
 */
export async function getEstudios(): Promise<EstudioMedico[]> {
  const response = await axiosInstance.get<ApiResponse<EstudioMedico[]>>('/estudios')
  return response.data.data
}

/**
 * Get estudio médico by ID
 */
export async function getEstudioById(id: number): Promise<EstudioMedico> {
  const response = await axiosInstance.get<ApiResponse<EstudioMedico>>(`/estudios/${id}`)
  return response.data.data
}

/**
 * Create a new estudio médico
 */
export async function createEstudio(
  data: EstudioMedicoRequestDTO
): Promise<EstudioMedico> {
  const response = await axiosInstance.post<ApiResponse<EstudioMedico>>('/estudios', data)
  return response.data.data
}

/**
 * Update an existing estudio
 */
export async function updateEstudio(
  id: number,
  data: EstudioMedicoRequestDTO
): Promise<EstudioMedico> {
  const response = await axiosInstance.put<ApiResponse<EstudioMedico>>(`/estudios/${id}`, data)
  return response.data.data
}

// ============================================
// TIPOS DE ESTUDIO
// ============================================

/**
 * Get all tipos de estudio (active only)
 */
export async function getTiposEstudio(): Promise<TipoEstudio[]> {
  const response = await axiosInstance.get<ApiResponse<TipoEstudio[]>>('/estudios/tipos')
  return response.data.data
}

/**
 * Create a new tipo de estudio
 */
export async function createTipoEstudio(
  data: TipoEstudioRequestDTO
): Promise<TipoEstudio> {
  const response = await axiosInstance.post<ApiResponse<TipoEstudio>>('/estudios/tipos', data)
  return response.data.data
}

/**
 * Update a tipo de estudio
 */
export async function updateTipoEstudio(
  id: number,
  data: TipoEstudioRequestDTO
): Promise<TipoEstudio> {
  const response = await axiosInstance.put<ApiResponse<TipoEstudio>>(`/estudios/tipos/${id}`, data)
  return response.data.data
}

/**
 * Toggle tipo de estudio active status
 */
export async function toggleTipoEstudio(id: number): Promise<TipoEstudio> {
  const response = await axiosInstance.put<ApiResponse<TipoEstudio>>(`/estudios/tipos/${id}/toggle`)
  return response.data.data
}

// ============================================
// PARÁMETROS DE ESTUDIO
// ============================================

/**
 * Create a new parámetro de estudio
 */
export async function createParametroEstudio(
  data: ParametroEstudioRequestDTO
): Promise<ParametroEstudio> {
  const response = await axiosInstance.post<ApiResponse<ParametroEstudio>>('/estudios/parametros', data)
  return response.data.data
}

/**
 * Update a parámetro de estudio
 */
export async function updateParametroEstudio(
  id: number,
  data: ParametroEstudioRequestDTO
): Promise<ParametroEstudio> {
  const response = await axiosInstance.put<ApiResponse<ParametroEstudio>>(`/estudios/parametros/${id}`, data)
  return response.data.data
}

/**
 * Delete a parámetro de estudio
 */
export async function deleteParametroEstudio(id: number): Promise<void> {
  await axiosInstance.delete(`/estudios/parametros/${id}`)
}
