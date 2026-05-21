import axiosInstance from '@/lib/axiosInstance'
import {
  ApiResponse,
  Examen,
  ExamenRequestDTO,
  ResultadoExamen,
  ResultadoExamenRequestDTO,
} from '@/types/api'

// ============================================
// CATÁLOGO DE EXÁMENES
// ============================================

export async function getExamenes(): Promise<Examen[]> {
  const response = await axiosInstance.get<ApiResponse<Examen[]>>('/examenes')
  return response.data.data
}

export async function getExamenById(id: number): Promise<Examen> {
  const response = await axiosInstance.get<ApiResponse<Examen>>(`/examenes/${id}`)
  return response.data.data
}

export async function createExamen(data: ExamenRequestDTO): Promise<Examen> {
  const response = await axiosInstance.post<ApiResponse<Examen>>('/examenes', data)
  return response.data.data
}

export async function updateExamen(id: number, data: ExamenRequestDTO): Promise<Examen> {
  const response = await axiosInstance.put<ApiResponse<Examen>>(`/examenes/${id}`, data)
  return response.data.data
}

// ============================================
// RESULTADOS DE EXAMEN
// ============================================

export async function saveResultadoExamen(data: ResultadoExamenRequestDTO): Promise<ResultadoExamen> {
  const response = await axiosInstance.post<ApiResponse<ResultadoExamen>>('/examenes/resultados', data)
  return response.data.data
}

export async function updateResultadoExamen(
  id: number,
  data: ResultadoExamenRequestDTO
): Promise<ResultadoExamen> {
  const response = await axiosInstance.put<ApiResponse<ResultadoExamen>>(
    `/examenes/resultados/${id}`,
    data
  )
  return response.data.data
}

export async function getResultadosByPacienteUUID(uuid: string): Promise<ResultadoExamen[]> {
  const response = await axiosInstance.get<ApiResponse<ResultadoExamen[]>>(
    `/examenes/resultados/paciente/uuid/${uuid}`
  )
  return response.data.data
}

export async function getResultadosByPacienteFolio(folio: string): Promise<ResultadoExamen[]> {
  const response = await axiosInstance.get<ApiResponse<ResultadoExamen[]>>(
    `/examenes/resultados/paciente/folio/${folio}`
  )
  return response.data.data
}
