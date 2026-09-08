import axiosInstance from '@/lib/axiosInstance'
import type { ApiResponse } from '@/types/api'
import type {
  FormulaReporte, FormulaReporteRequest, PruebaFormula, RevisionFormula, VariableDisponible,
} from '../formulas.types'

const BASE = '/reportes/formulas'

export async function listarFormulas(): Promise<FormulaReporte[]> {
  const { data } = await axiosInstance.get<ApiResponse<FormulaReporte[]>>(BASE)
  return data.data
}

/** Las que se ofrecen al diseñar un reporte. */
export async function listarFormulasActivas(): Promise<FormulaReporte[]> {
  const { data } = await axiosInstance.get<ApiResponse<FormulaReporte[]>>(`${BASE}/activas`)
  return data.data
}

export async function obtenerFormula(id: number): Promise<FormulaReporte> {
  const { data } = await axiosInstance.get<ApiResponse<FormulaReporte>>(`${BASE}/${id}`)
  return data.data
}

/** Lo que decía la fórmula en cada versión anterior. */
export async function historialFormula(id: number): Promise<FormulaReporte[]> {
  const { data } = await axiosInstance.get<ApiResponse<FormulaReporte[]>>(`${BASE}/${id}/historial`)
  return data.data
}

/**
 * Con qué se puede calcular.
 *
 * Solo parámetros numéricos y con unidad declarada: un texto o un booleano no
 * aparece, así que no hay forma de meterlo en una fórmula por descuido.
 */
export async function listarVariablesDisponibles(): Promise<VariableDisponible[]> {
  const { data } = await axiosInstance.get<ApiResponse<VariableDisponible[]>>(`${BASE}/variables`)
  return data.data
}

/**
 * Revisa sin guardar.
 *
 * Es el mismo validador que corre en el servidor al guardar; preguntarle mientras se
 * escribe es lo que evita que la pantalla acepte algo que después se rechaza.
 */
export async function revisarFormula(body: FormulaReporteRequest): Promise<RevisionFormula> {
  const { data } = await axiosInstance.post<ApiResponse<RevisionFormula>>(`${BASE}/revisar`, body)
  return data.data
}

/** Calcula la fórmula con un participante real, sin guardarla. */
export async function probarFormula(
  uuidParticipante: string, body: FormulaReporteRequest,
): Promise<PruebaFormula> {
  const { data } = await axiosInstance.post<ApiResponse<PruebaFormula>>(
    `${BASE}/probar/${uuidParticipante}`, body)
  return data.data
}

export async function crearFormula(body: FormulaReporteRequest): Promise<FormulaReporte> {
  const { data } = await axiosInstance.post<ApiResponse<FormulaReporte>>(BASE, body)
  return data.data
}

export async function actualizarFormula(
  id: number, body: FormulaReporteRequest,
): Promise<FormulaReporte> {
  const { data } = await axiosInstance.put<ApiResponse<FormulaReporte>>(`${BASE}/${id}`, body)
  return data.data
}

/** Retirarla de uso deja de ofrecerla al diseñar, sin perder los reportes que la usaron. */
export async function toggleFormula(id: number): Promise<boolean> {
  const { data } = await axiosInstance.put<ApiResponse<{ activo: boolean }>>(`${BASE}/${id}/toggle`)
  return data.data.activo
}

export async function eliminarFormula(id: number): Promise<void> {
  await axiosInstance.delete(`${BASE}/${id}`)
}
