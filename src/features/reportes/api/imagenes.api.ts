import axiosInstance from '@/lib/axiosInstance'
import type { ApiResponse } from '@/types/api'
import type { ImagenReporte } from '../types.api'

const BASE = '/reportes/imagenes'

export async function listarImagenes(): Promise<ImagenReporte[]> {
  const { data } = await axiosInstance.get<ApiResponse<ImagenReporte[]>>(BASE)
  return data.data
}

export async function subirImagen(archivo: File, nombre?: string): Promise<ImagenReporte> {
  const cuerpo = new FormData()
  cuerpo.append('file', archivo)
  const { data } = await axiosInstance.post<ApiResponse<ImagenReporte>>(BASE, cuerpo, {
    params: nombre ? { nombre } : undefined,
    // Hay que pisar el `application/json` que la instancia pone por defecto. Sin
    // esto el cuerpo viaja multipart pero rotulado como JSON, el servidor no
    // encuentra la parte `file` y la subida falla siempre. Es el mismo apaño que
    // usan las subidas de documentos.
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data.data
}

export async function renombrarImagen(id: number, nombre: string): Promise<ImagenReporte> {
  const { data } = await axiosInstance.put<ApiResponse<ImagenReporte>>(`${BASE}/${id}/nombre`, { nombre })
  return data.data
}

export async function eliminarImagen(id: number): Promise<void> {
  await axiosInstance.delete(`${BASE}/${id}`)
}

/** Qué plantillas la usan. Para avisar antes de que el borrado se rechace. */
export async function usosDeImagen(id: number): Promise<string[]> {
  const { data } = await axiosInstance.get<ApiResponse<string[]>>(`${BASE}/${id}/usos`)
  return data.data
}

/**
 * De dónde se piden los bytes para verla en pantalla.
 *
 * <p>Se construye a partir de la misma base que el resto de llamadas para que apunte
 * al backend correcto en cada entorno. El diseño nunca guarda esto: guarda
 * `imagen:{id}`, y esta función es solo la forma de dibujarlo aquí.</p>
 */
export function urlDeImagen(id: number): string {
  const base = axiosInstance.defaults.baseURL ?? ''
  return `${base.replace(/\/$/, '')}${BASE}/${id}/contenido`
}

/** El id que hay dentro de `imagen:{id}`, o null si eso no es una referencia. */
export function idDeClaveImagen(clave: string | undefined | null): number | null {
  const m = /^imagen:(\d+)$/.exec((clave ?? '').trim())
  return m ? Number(m[1]) : null
}

export function claveDeImagen(id: number): string {
  return `imagen:${id}`
}
