import axiosInstance from '@/lib/axiosInstance'
import { ApiResponse, PrevisualizacionCarga, TablaCarga } from '@/types/api'

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
