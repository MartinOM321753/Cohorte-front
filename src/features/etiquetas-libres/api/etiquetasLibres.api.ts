import api from '@/lib/axiosInstance'
import type { ApiResponse } from '@/types/api'

const BASE = '/impresion/etiquetas-libres'

/**
 * Un archivo tabular leído para imprimirse como etiquetas.
 *
 * Llega tal como se ve en la hoja de cálculo: las fechas con su formato y los
 * porcentajes como porcentajes. El servidor no interpreta las columnas, solo las
 * entrega; qué significa cada una lo decide quien arma la etiqueta.
 */
export interface TablaEtiquetas {
  encabezados: string[]
  filas: string[][]
  /** Número de fila real dentro del archivo, para poder señalar problemas. */
  numerosDeFila: number[]
  /** Cosas que conviene saber antes de imprimir. Ninguna lo impide. */
  avisos: string[]
}

/** Sube el archivo y devuelve su contenido. No guarda nada del otro lado. */
export async function leerArchivoEtiquetas(archivo: File): Promise<TablaEtiquetas> {
  const cuerpo = new FormData()
  cuerpo.append('archivo', archivo)

  const { data } = await api.post<ApiResponse<TablaEtiquetas>>(`${BASE}/leer`, cuerpo, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data.data
}
