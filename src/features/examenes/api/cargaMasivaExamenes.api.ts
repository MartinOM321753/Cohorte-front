import axiosInstance from '@/lib/axiosInstance'
import {
  ApiResponse, PoliticaDuplicados, PrevisualizacionCargaExamenes, ResultadoCarga, TablaCarga,
} from '@/types/api'

/**
 * Sube el archivo del laboratorio y devuelve lo que se guardaría.
 *
 * A diferencia de los estudios no hay tipo que elegir: un archivo de laboratorio
 * trae varios exámenes a la vez y cada columna se resuelve por su alias.
 */
export async function previsualizarCargaExamenes(
  archivo: File,
): Promise<PrevisualizacionCargaExamenes> {
  const form = new FormData()
  form.append('archivo', archivo)
  const res = await axiosInstance.post<ApiResponse<PrevisualizacionCargaExamenes>>(
    '/examenes/carga-masiva/previsualizar',
    form,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  )
  return res.data.data
}

/** Vuelve a validar la tabla ya corregida, sin volver a subir el archivo. */
export async function revalidarCargaExamenes(
  tabla: TablaCarga,
): Promise<PrevisualizacionCargaExamenes> {
  const res = await axiosInstance.post<ApiResponse<PrevisualizacionCargaExamenes>>(
    '/examenes/carga-masiva/revalidar',
    { tabla },
  )
  return res.data.data
}

/** Guarda los resultados. Única llamada de este módulo que escribe. */
export async function confirmarCargaExamenes(
  tabla: TablaCarga,
  politicaDuplicados: PoliticaDuplicados,
): Promise<ResultadoCarga> {
  const res = await axiosInstance.post<ApiResponse<ResultadoCarga>>(
    '/examenes/carga-masiva/confirmar',
    { tabla, politicaDuplicados },
  )
  return res.data.data
}

/**
 * Cuántas versiones de plantilla hay: una por cada juego de alias. Con una sola,
 * la pantalla no ofrece elegir.
 */
export async function getVersionesPlantillaExamenes(): Promise<number> {
  const res = await axiosInstance.get<ApiResponse<{ versiones: number }>>(
    '/examenes/carga-masiva/plantilla/versiones',
  )
  return res.data.data.versiones
}

/**
 * Descarga la plantilla vacía de exámenes (folio, fecha y una columna por examen
 * en uso de la institución).
 *
 * @param version qué juego de alias usar en los encabezados (base 1)
 */
export async function descargarPlantillaExamenes(version = 1): Promise<void> {
  const res = await axiosInstance.get('/examenes/carga-masiva/plantilla', {
    params: { version },
    responseType: 'blob',
  })
  const cd = (res.headers as Record<string, string> | undefined)?.['content-disposition']
  const nombre = cd ? /filename="?([^";]+)"?/i.exec(cd)?.[1] : undefined
  const url = URL.createObjectURL(res.data as Blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nombre ?? 'plantilla-examenes.xlsx'
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
