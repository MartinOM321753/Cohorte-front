import axiosInstance from '@/lib/axiosInstance'
import {
  ApiResponse, PoliticaDuplicados, PrevisualizacionCarga, ResultadoCarga, TablaCarga,
} from '@/types/api'

/**
 * Sube el archivo del instrumento y devuelve lo que se guardaría.
 *
 * No escribe nada: confirmar es un paso aparte y deliberado.
 */
export async function previsualizarCarga(
  archivo: File,
  idTipoEstudio: number,
): Promise<PrevisualizacionCarga> {
  const form = new FormData()
  form.append('archivo', archivo)
  form.append('idTipoEstudio', String(idTipoEstudio))

  const res = await axiosInstance.post<ApiResponse<PrevisualizacionCarga>>(
    '/estudios/carga-masiva/previsualizar',
    form,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  )
  return res.data.data
}

/**
 * Vuelve a validar la tabla después de corregirla en pantalla.
 *
 * La validación la sigue haciendo el servidor a propósito: si el navegador
 * aplicara sus propias reglas, acabarían divergiendo de las que de verdad
 * mandan y la pantalla diría que todo está bien mientras el guardado falla.
 */
export async function revalidarCarga(
  tabla: TablaCarga,
  idTipoEstudio: number,
): Promise<PrevisualizacionCarga> {
  const res = await axiosInstance.post<ApiResponse<PrevisualizacionCarga>>(
    '/estudios/carga-masiva/revalidar',
    { idTipoEstudio, tabla },
  )
  return res.data.data
}

/**
 * Guarda la carga. Es la única llamada de este módulo que escribe.
 *
 * El servidor vuelve a validar la tabla entera antes de escribir, así que no
 * basta con que la pantalla crea que todo está bien.
 */
export async function confirmarCarga(
  tabla: TablaCarga,
  idTipoEstudio: number,
  politicaDuplicados: PoliticaDuplicados,
): Promise<ResultadoCarga> {
  const res = await axiosInstance.post<ApiResponse<ResultadoCarga>>(
    '/estudios/carga-masiva/confirmar',
    { idTipoEstudio, tabla, politicaDuplicados },
  )
  return res.data.data
}

/**
 * Cuántas versiones de plantilla hay para un tipo de estudio.
 *
 * Una por cada juego de alias: si algún parámetro tiene el instrumento titulando
 * su columna de dos formas, hay dos versiones. Con una sola, la pantalla no
 * ofrece elegir.
 */
export async function getVersionesPlantillaEstudios(idTipoEstudio: number): Promise<number> {
  const res = await axiosInstance.get<ApiResponse<{ versiones: number }>>(
    '/estudios/carga-masiva/plantilla/versiones',
    { params: { idTipoEstudio } },
  )
  return res.data.data.versiones
}

/**
 * Descarga la plantilla vacía de un tipo de estudio.
 *
 * Se arma en el servidor con las columnas del tipo (folio, fecha y un parámetro
 * por columna) para que el formato no se degrade con el uso: si cada tanda parte
 * del archivo de la anterior, en tres cargas las columnas ya no se llaman igual.
 *
 * @param version qué juego de alias usar en los encabezados (base 1)
 */
export async function descargarPlantillaEstudios(
  idTipoEstudio: number,
  version = 1,
): Promise<void> {
  const res = await axiosInstance.get('/estudios/carga-masiva/plantilla', {
    params: { idTipoEstudio, version },
    responseType: 'blob',
  })
  descargarBlob(res.data as Blob, nombreDeContentDisposition(res.headers), 'plantilla-estudio.xlsx')
}

/** Saca el nombre sugerido de la cabecera Content-Disposition, si viene. */
function nombreDeContentDisposition(headers: unknown): string | undefined {
  const cd = (headers as Record<string, string> | undefined)?.['content-disposition']
  if (!cd) return undefined
  // filename*=UTF-8''… tiene prioridad sobre filename="…" y conserva acentos.
  const estrella = /filename\*=UTF-8''([^;]+)/i.exec(cd)
  if (estrella) return decodeURIComponent(estrella[1])
  const simple = /filename="?([^";]+)"?/i.exec(cd)
  return simple ? simple[1] : undefined
}

/** Dispara la descarga de un blob en el navegador y libera la URL. */
function descargarBlob(blob: Blob, nombre: string | undefined, porOmision: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nombre ?? porOmision
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
