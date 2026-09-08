import axiosInstance from '@/lib/axiosInstance'
import type { ApiResponse } from '@/types/api'
import type { TipoReporte, PlantillaReporte, PlantillaReporteRequest, CampoReporte } from '../types.api'

const BASE = '/reportes/plantillas'

export async function listarPlantillas(): Promise<PlantillaReporte[]> {
  const { data } = await axiosInstance.get<ApiResponse<PlantillaReporte[]>>(BASE)
  return data.data
}

export async function listarPlantillasPorTipo(tipo: TipoReporte): Promise<PlantillaReporte[]> {
  const { data } = await axiosInstance.get<ApiResponse<PlantillaReporte[]>>(`${BASE}/tipo/${tipo}`)
  return data.data
}

/** Con el diseño completo: es la que abre el editor. */
export async function obtenerPlantilla(id: number): Promise<PlantillaReporte> {
  const { data } = await axiosInstance.get<ApiResponse<PlantillaReporte>>(`${BASE}/${id}`)
  return data.data
}

export async function crearPlantilla(body: PlantillaReporteRequest): Promise<PlantillaReporte> {
  const { data } = await axiosInstance.post<ApiResponse<PlantillaReporte>>(BASE, body)
  return data.data
}

export async function actualizarPlantilla(id: number, body: PlantillaReporteRequest): Promise<PlantillaReporte> {
  const { data } = await axiosInstance.put<ApiResponse<PlantillaReporte>>(`${BASE}/${id}`, body)
  return data.data
}

/**
 * Cambia solo el nombre y la descripción.
 *
 * Va por su propio endpoint y no por el actualizar general: aquel exige mandar el
 * diseño completo, y renombrar desde el listado obligaría a traérselo y devolverlo,
 * con el riesgo de pisar el guardado bueno con una copia vieja.
 */
export async function renombrarPlantilla(
  id: number, body: { nombre: string; descripcion?: string },
): Promise<PlantillaReporte> {
  const { data } = await axiosInstance.put<ApiResponse<PlantillaReporte>>(`${BASE}/${id}/nombre`, body)
  return data.data
}

/** Copia el diseño. Sin nombre, el servidor propone uno libre. */
export async function duplicarPlantilla(id: number, nombre?: string): Promise<PlantillaReporte> {
  const { data } = await axiosInstance.post<ApiResponse<PlantillaReporte>>(
    `${BASE}/${id}/duplicar`, { nombre })
  return data.data
}

export async function togglePlantilla(id: number): Promise<boolean> {
  const { data } = await axiosInstance.put<ApiResponse<boolean>>(`${BASE}/${id}/toggle`)
  return data.data
}

export async function establecerPredeterminada(id: number): Promise<void> {
  await axiosInstance.put(`${BASE}/${id}/predeterminada`)
}

export async function eliminarPlantilla(id: number): Promise<void> {
  await axiosInstance.delete(`${BASE}/${id}`)
}

/**
 * El PDF de un estudio. Llega como binario, así que se pide con responseType
 * 'blob': sin eso axios intentaría interpretarlo como texto y lo corrompería.
 */
export async function emitirReporteEstudio(idEstudio: number): Promise<Blob> {
  const { data } = await axiosInstance.get(`/reportes/estudio/${idEstudio}`, {
    responseType: 'blob',
  })
  return data
}

/**
 * Qué se puede insertar. Se arma en el servidor desde el catálogo real de la
 * institución, así que incluye cada tipo de estudio con sus parámetros.
 */
export async function listarCampos(): Promise<CampoReporte[]> {
  const { data } = await axiosInstance.get<ApiResponse<CampoReporte[]>>('/reportes/campos')
  return data.data
}

/** El PDF del reporte de un participante, con la plantilla elegida. */
export async function emitirReporteParticipante(uuid: string, idPlantilla: number): Promise<Blob> {
  const { data } = await axiosInstance.get(`/reportes/participante/${uuid}`, {
    params: { plantilla: idPlantilla },
    responseType: 'blob',
  })
  return data
}
