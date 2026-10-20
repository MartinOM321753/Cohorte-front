import axiosInstance from '@/lib/axiosInstance'
import type { ApiResponse } from '@/types/api'
import type {
  OperadorDependencia, PresentacionSeccion, TipoVariable,
} from './cuestionarios.types'

/**
 * Lo que usa el participante desde su cuenta.
 *
 * Ninguna ruta lleva su folio ni su uuid: el expediente se resuelve en el servidor a
 * partir de la sesión, así que no hay forma de pedir el cuestionario de otra persona.
 *
 * Las formas son más estrechas que las del personal a propósito. Al participante no le
 * llega la celda del volcado, el valor crudo ni la marca de ausencia del escáner: no
 * significan nada para él y revelan el funcionamiento interno del instrumento.
 */

export interface MiCuestionario {
  id: number
  nombre: string
  descripcion: string | null
  estado: 'BORRADOR' | 'COMPLETO' | 'VALIDADO' | 'ANULADO'
  fechaRegistro: string
  fechaActualizacion: string | null
  /** Falso para los que se capturaron de una hoja escaneada: esos no se contestan en línea. */
  contestableEnLinea: boolean
}

export interface AvanceBloque {
  idBloque: number
  nombre: string
  descripcion: string | null
  orden: number
  /** Cuántas preguntas le aplican, ya descontadas las que su pregunta llave dejó fuera. */
  aplicables: number
  respondidas: number
}

export interface PreguntaParticipante {
  id: number
  codigo: string
  pregunta: string | null
  tipo: TipoVariable
  obligatoria: boolean
  valorMin: number | null
  valorMax: number | null
  longitudMax: number | null
  unidad: string | null
  opciones: Array<{ codigo: string; etiqueta: string }>
  /** Celda que ocupa si el bloque es una rejilla; nulo si se pinta suelta. */
  filaMatriz: string | null
  columnaMatriz: string | null
  /** Lo que el papel imprime junto a la pregunta. Sin esto cambia lo que significa. */
  instruccion: string | null
  /** La figura sin la cual la pregunta no se puede contestar. */
  figura: string | null
  /**
   * La condición del papel: «si contestó no, pase a la 25».
   *
   * Viajan los tres campos, y no solo `preguntasHabilitadas`, porque la pantalla
   * tiene que poder resolverla con lo que el participante acaba de marcar. Ver
   * `dominio/habilitacion.ts`.
   */
  dependeDe: string | null
  valorHabilitante: string | null
  operadorDependencia: OperadorDependencia | null
}

export interface RespuestaParticipante {
  idVariable: number
  /** Siempre texto: es como lo pinta el formulario y como lo interpreta el servidor. */
  valor: string
  secuencia: number | null
  actualizadoEn: string | null
}

export interface BloqueParticipante {
  idBloque: number
  nombre: string
  titulo: string | null
  descripcion: string | null
  presentacion: PresentacionSeccion | null
  preguntas: PreguntaParticipante[]
  respuestas: RespuestaParticipante[]
  preguntasHabilitadas: number[]
}

export interface ResultadoAutoguardado {
  /** Por id de pregunta, la secuencia que quedó guardada. */
  aceptados: Record<number, number>
  /** Llegaron atrasados respecto a lo guardado. No son errores: hay que sacarlos de la cola. */
  rechazados: number[]
  /** Sí son errores. El cliente debe dejar de reintentarlos y mostrarlos. */
  invalidos: Record<number, string>
  /**
   * Lo que hay que advertirle de lo que lleva contestado.
   *
   * No impide guardar ni hace falta resolverlo en el momento: se le ensena mientras
   * contesta para que no tenga que volver sobre sus pasos al final.
   */
  avisos: AvisoDeRegla[]
  guardadoEn: string
}

export interface AvisoDeRegla {
  idPregunta: number | null
  codigo: string
  /** Si ademas le va a impedir terminar el cuestionario. */
  impideEnviar: boolean
  mensaje: string
}

/** Un instrumento que el participante puede empezar por su cuenta. */
export interface DisponibleParaIniciar {
  idTipoCuestionario: number
  nombre: string
  descripcion: string | null
  /** Su expediente no permite comprobar del todo si le corresponde. No lo impide. */
  faltanDatos: boolean
}

export async function getDisponibles(): Promise<DisponibleParaIniciar[]> {
  const r = await axiosInstance.get<ApiResponse<DisponibleParaIniciar[]>>(
    '/mis-cuestionarios/disponibles')
  return r.data.data
}

export async function iniciarMiCuestionario(idTipo: number): Promise<MiCuestionario> {
  const r = await axiosInstance.post<ApiResponse<MiCuestionario>>(
    `/mis-cuestionarios/iniciar/${idTipo}`)
  return r.data.data
}

export async function getMisCuestionarios(): Promise<MiCuestionario[]> {
  const r = await axiosInstance.get<ApiResponse<MiCuestionario[]>>('/mis-cuestionarios')
  return r.data.data
}

export async function getAvance(id: number): Promise<AvanceBloque[]> {
  const r = await axiosInstance.get<ApiResponse<AvanceBloque[]>>(`/mis-cuestionarios/${id}/avance`)
  return r.data.data
}

export async function getBloqueParticipante(
  id: number, idBloque: number,
): Promise<BloqueParticipante> {
  const r = await axiosInstance.get<ApiResponse<BloqueParticipante>>(
    `/mis-cuestionarios/${id}/bloques/${idBloque}`)
  return r.data.data
}

/**
 * Guarda los cambios del autoguardado.
 *
 * **Combina, no reemplaza.** Nunca borra una respuesta que no venga en la lista, al
 * contrario que el guardado por bloque del personal. Esa diferencia es lo que hace seguro
 * mandar solo lo que cambió.
 *
 * Sin `timeout` largo a propósito: si la red está mal, es mejor fallar pronto y reintentar
 * que dejar la petición colgada treinta segundos mientras la cola crece.
 */
export async function autoguardarRespuestas(
  id: number,
  cambios: Array<{ idVariable: number; valor: string; secuencia: number }>,
): Promise<ResultadoAutoguardado> {
  const r = await axiosInstance.patch<ApiResponse<ResultadoAutoguardado>>(
    `/mis-cuestionarios/${id}/respuestas`, { cambios }, { timeout: 10_000 })
  return r.data.data
}

export async function getFaltantesParticipante(
  id: number,
): Promise<{ total: number; codigos: string[] }> {
  const r = await axiosInstance.get<ApiResponse<{ total: number; codigos: string[] }>>(
    `/mis-cuestionarios/${id}/faltantes`)
  return r.data.data
}

export async function enviarMiCuestionario(id: number): Promise<MiCuestionario> {
  const r = await axiosInstance.patch<ApiResponse<MiCuestionario>>(
    `/mis-cuestionarios/${id}/enviar`)
  return r.data.data
}
