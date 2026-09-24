import axiosInstance from '@/lib/axiosInstance'
import type {
  ApiResponse, PrevisualizacionCargaMuestras, ResultadoCargaMuestras, TablaCarga,
} from '@/types/api'

const BASE = '/almacenamiento/muestras/carga-masiva'

/**
 * Sube la plantilla llena y devuelve lo que se guardaría.
 *
 * No escribe nada: confirmar es un paso aparte y deliberado. Aquí importa más
 * que en las otras cargas, porque una muestra mal cargada además ocupa un hueco
 * físico de una caja criogénica.
 *
 * @param fechaPorOmision la que se aplica a las filas sin fecha, y la hora que
 *        se pone a las que traen día pero no hora. La calcula la pantalla con el
 *        horario configurado, que es donde vive esa regla.
 */
export async function previsualizarCargaMuestras(
  archivo: File,
  fechaPorOmision?: string,
): Promise<PrevisualizacionCargaMuestras> {
  const form = new FormData()
  form.append('archivo', archivo)
  if (fechaPorOmision) form.append('fechaPorOmision', fechaPorOmision)

  const res = await axiosInstance.post<ApiResponse<PrevisualizacionCargaMuestras>>(
    `${BASE}/previsualizar`,
    form,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  )
  return res.data.data
}

/**
 * Vuelve a validar la tabla después de corregirla en pantalla.
 *
 * La validación la sigue haciendo el servidor a propósito: si el navegador
 * aplicara sus propias reglas acabarían divergiendo de las que de verdad mandan,
 * y la pantalla diría que todo está bien mientras el guardado falla.
 */
export async function revalidarCargaMuestras(
  tabla: TablaCarga,
  fechaPorOmision?: string,
): Promise<PrevisualizacionCargaMuestras> {
  const res = await axiosInstance.post<ApiResponse<PrevisualizacionCargaMuestras>>(
    `${BASE}/revalidar`,
    { tabla, fechaPorOmision },
  )
  return res.data.data
}

/** Guarda la carga. Es la única llamada de este módulo que escribe. */
export async function confirmarCargaMuestras(
  tabla: TablaCarga,
  fechaPorOmision?: string,
): Promise<ResultadoCargaMuestras> {
  const res = await axiosInstance.post<ApiResponse<ResultadoCargaMuestras>>(
    `${BASE}/confirmar`,
    { tabla, fechaPorOmision },
  )
  return res.data.data
}

/**
 * Descarga la plantilla vacía con su hoja de instrucciones.
 *
 * Se ofrece desde la propia pantalla para que el formato no se degrade con el
 * uso: si cada tanda parte del archivo de la anterior, en tres cargas las
 * columnas ya no se llaman igual.
 */
export async function descargarPlantillaMuestras(): Promise<void> {
  const res = await axiosInstance.get(`${BASE}/plantilla`, { responseType: 'blob' })
  const url = URL.createObjectURL(res.data as Blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'plantilla-carga-muestras.xlsx'
  document.body.appendChild(a)
  a.click()
  a.remove()
  // Sin esto el blob se queda en memoria hasta que se recargue la pestaña.
  URL.revokeObjectURL(url)
}
