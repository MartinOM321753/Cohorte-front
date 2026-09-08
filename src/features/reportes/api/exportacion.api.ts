import axiosInstance from '@/lib/axiosInstance'

export interface ExportacionRequest {
  /** Las columnas, por su clave del catálogo. Las mismas que se ponen en una plantilla. */
  claves: string[]
  /** Qué participantes. Vacío significa todos los que el usuario alcanza. */
  uuids?: string[]
  /** Coma para herramientas de análisis, punto y coma para Excel en español. */
  separador?: ',' | ';'
}

/**
 * El archivo con los datos, ya calculado.
 *
 * Llega como binario, así que se pide con `responseType: 'blob'`: sin eso axios lo
 * interpretaría como texto y se perdería la marca de orden de bytes que hace que
 * Excel respete los acentos.
 */
export async function exportarDatos(body: ExportacionRequest): Promise<Blob> {
  const { data } = await axiosInstance.post('/reportes/exportacion', body, {
    responseType: 'blob',
  })
  return data
}

/**
 * Deja el archivo en la carpeta de descargas del navegador.
 *
 * El enlace se crea, se pulsa y se retira en el momento. Hay que liberar la URL
 * temporal después: si no, el navegador mantiene el archivo entero en memoria hasta
 * que se recarga la página, y una descarga de dos mil participantes no es pequeña.
 */
export function guardarArchivo(contenido: Blob, nombre: string) {
  const url = URL.createObjectURL(contenido)
  const enlace = document.createElement('a')
  enlace.href = url
  enlace.download = nombre
  document.body.appendChild(enlace)
  enlace.click()
  document.body.removeChild(enlace)
  URL.revokeObjectURL(url)
}
