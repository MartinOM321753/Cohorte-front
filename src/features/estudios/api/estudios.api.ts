import axiosInstance from '@/lib/axiosInstance'
import {
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
  const response = await axiosInstance.get('/estudios')
  return response as any as EstudioMedico[]
}

/**
 * Get estudio médico by ID
 */
export async function getEstudioById(id: number): Promise<EstudioMedico> {
  const response = await axiosInstance.get(`/estudios/${id}`)
  return response as any as EstudioMedico
}

/**
 * Create a new estudio médico
 */
export async function createEstudio(
  data: EstudioMedicoRequestDTO
): Promise<EstudioMedico> {
  const response = await axiosInstance.post('/estudios', data)
  return response as any as EstudioMedico
}

/**
 * Update an existing estudio
 */
export async function updateEstudio(
  id: number,
  data: EstudioMedicoRequestDTO
): Promise<EstudioMedico> {
  const response = await axiosInstance.put(`/estudios/${id}`, data)
  return response as any as EstudioMedico
}

// ============================================
// TIPOS DE ESTUDIO
// ============================================

/**
 * Get all tipos de estudio (active only)
 */
export async function getTiposEstudio(): Promise<TipoEstudio[]> {
  const response = await axiosInstance.get('/estudios/tipos')
  return response as any as TipoEstudio[]
}

/**
 * Create a new tipo de estudio
 */
export async function createTipoEstudio(
  data: TipoEstudioRequestDTO
): Promise<TipoEstudio> {
  const response = await axiosInstance.post('/estudios/tipos', data)
  return response as any as TipoEstudio
}

/**
 * Update a tipo de estudio
 */
export async function updateTipoEstudio(
  id: number,
  data: TipoEstudioRequestDTO
): Promise<TipoEstudio> {
  const response = await axiosInstance.put(`/estudios/tipos/${id}`, data)
  return response as any as TipoEstudio
}

/**
 * Toggle tipo de estudio active status
 */
export async function toggleTipoEstudio(id: number): Promise<TipoEstudio> {
  const response = await axiosInstance.put(`/estudios/tipos/${id}/toggle`)
  return response as any as TipoEstudio
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
  const response = await axiosInstance.post('/estudios/parametros', data)
  return response as any as ParametroEstudio
}

/**
 * Update a parámetro de estudio
 */
export async function updateParametroEstudio(
  id: number,
  data: ParametroEstudioRequestDTO
): Promise<ParametroEstudio> {
  const response = await axiosInstance.put(`/estudios/parametros/${id}`, data)
  return response as any as ParametroEstudio
}

/**
 * Delete a parámetro de estudio
 */
export async function deleteParametroEstudio(id: number): Promise<void> {
  await axiosInstance.delete(`/estudios/parametros/${id}`)
}
