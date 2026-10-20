import axiosInstance from '@/lib/axiosInstance'
import type { ApiResponse } from '@/types/api'
import type {
  BloqueCuestionario, BloqueLleno, BloqueRequest, Cuestionario, DependenciaDeBloqueRequest,
  DiscrepanciaLectura, InformeCargaVolcado,
  OrigenCuestionario, Pagina, PrevisualizacionCatalogo, PrevisualizacionVolcado,
  RespuestaCuestionario, TipoCuestionario, TipoCuestionarioRequest,
  TipoParaParticipante,
  VariableCuestionario, VariableRequest,
} from './cuestionarios.types'

// ── Instrumentos ────────────────────────────────────────────────────────────

export async function getTiposCuestionario(): Promise<TipoCuestionario[]> {
  const r = await axiosInstance.get<ApiResponse<TipoCuestionario[]>>('/cuestionarios/tipos')
  return r.data.data
}

export async function getTodosLosTipos(): Promise<TipoCuestionario[]> {
  const r = await axiosInstance.get<ApiResponse<TipoCuestionario[]>>('/cuestionarios/tipos/todos')
  return r.data.data
}

export async function getTipoCuestionario(id: number): Promise<TipoCuestionario> {
  const r = await axiosInstance.get<ApiResponse<TipoCuestionario>>(`/cuestionarios/tipos/${id}`)
  return r.data.data
}

export async function crearTipoCuestionario(datos: TipoCuestionarioRequest): Promise<TipoCuestionario> {
  const r = await axiosInstance.post<ApiResponse<TipoCuestionario>>('/cuestionarios/tipos', datos)
  return r.data.data
}

export async function actualizarTipoCuestionario(
  id: number, datos: TipoCuestionarioRequest,
): Promise<TipoCuestionario> {
  const r = await axiosInstance.put<ApiResponse<TipoCuestionario>>(`/cuestionarios/tipos/${id}`, datos)
  return r.data.data
}

export async function desactivarTipoCuestionario(id: number): Promise<void> {
  await axiosInstance.patch(`/cuestionarios/tipos/${id}/desactivar`)
}

export async function eliminarTipoCuestionario(id: number): Promise<void> {
  await axiosInstance.delete(`/cuestionarios/tipos/${id}`)
}

// ── Bloques ─────────────────────────────────────────────────────────────────

export async function getBloques(idTipo: number): Promise<BloqueCuestionario[]> {
  const r = await axiosInstance.get<ApiResponse<BloqueCuestionario[]>>(
    `/cuestionarios/tipos/${idTipo}/bloques`)
  return r.data.data
}

export async function crearBloque(idTipo: number, datos: BloqueRequest): Promise<BloqueCuestionario> {
  const r = await axiosInstance.post<ApiResponse<BloqueCuestionario>>(
    `/cuestionarios/tipos/${idTipo}/bloques`, datos)
  return r.data.data
}

export async function actualizarBloque(
  idBloque: number, datos: BloqueRequest,
): Promise<BloqueCuestionario> {
  const r = await axiosInstance.put<ApiResponse<BloqueCuestionario>>(
    `/cuestionarios/tipos/bloques/${idBloque}`, datos)
  return r.data.data
}

export async function reordenarBloques(idTipo: number, ids: number[]): Promise<void> {
  await axiosInstance.patch(`/cuestionarios/tipos/${idTipo}/bloques/orden`, { ids })
}

export async function eliminarBloque(idBloque: number): Promise<void> {
  await axiosInstance.delete(`/cuestionarios/tipos/bloques/${idBloque}`)
}

// ── Preguntas ───────────────────────────────────────────────────────────────

/**
 * Busca preguntas del instrumento.
 *
 * Paginado siempre: el instrumento principal pasa de dos mil preguntas y pedirlas
 * todas sería un documento de megabytes que ninguna pantalla aprovecha.
 */
export async function buscarPreguntas(
  idTipo: number, buscar: string, pagina = 0, tamano = 50,
): Promise<Pagina<VariableCuestionario>> {
  const r = await axiosInstance.get<ApiResponse<Pagina<VariableCuestionario>>>(
    `/cuestionarios/tipos/${idTipo}/preguntas`,
    { params: { buscar: buscar || undefined, pagina, tamano } })
  return r.data.data
}

export async function getPreguntasDeBloque(idBloque: number): Promise<VariableCuestionario[]> {
  const r = await axiosInstance.get<ApiResponse<VariableCuestionario[]>>(
    `/cuestionarios/bloques/${idBloque}/preguntas`)
  return r.data.data
}

/** Las que el volcado produce y ningún catálogo documenta. Es trabajo pendiente. */
export async function getPreguntasSinDocumentar(idTipo: number): Promise<VariableCuestionario[]> {
  const r = await axiosInstance.get<ApiResponse<VariableCuestionario[]>>(
    `/cuestionarios/tipos/${idTipo}/preguntas/sin-documentar`)
  return r.data.data
}

export async function crearPregunta(
  idTipo: number, datos: VariableRequest,
): Promise<VariableCuestionario> {
  const r = await axiosInstance.post<ApiResponse<VariableCuestionario>>(
    `/cuestionarios/tipos/${idTipo}/preguntas`, datos)
  return r.data.data
}

export async function actualizarPregunta(
  id: number, datos: VariableRequest,
): Promise<VariableCuestionario> {
  const r = await axiosInstance.put<ApiResponse<VariableCuestionario>>(
    `/cuestionarios/preguntas/${id}`, datos)
  return r.data.data
}

/**
 * Pone la misma pregunta llave a todas las preguntas de un bloque.
 *
 * Los saltos del papel son por bloque, no por pregunta: el «Ninguna» de la 112 apaga
 * sus 135 celdas. La propia llave se excluye en el servidor. Devuelve cuantas quedaron
 * tocadas.
 */
export async function dependenciaDeBloque(
  idBloque: number, datos: DependenciaDeBloqueRequest,
): Promise<number> {
  const r = await axiosInstance.patch<ApiResponse<number>>(
    `/cuestionarios/bloques/${idBloque}/dependencia`, datos)
  return r.data.data
}

export async function reordenarPreguntas(idBloque: number, ids: number[]): Promise<void> {
  await axiosInstance.patch(`/cuestionarios/bloques/${idBloque}/preguntas/orden`, { ids })
}

export async function eliminarPregunta(id: number): Promise<void> {
  await axiosInstance.delete(`/cuestionarios/preguntas/${id}`)
}

// ── Cuestionarios contestados ───────────────────────────────────────────────

export async function getCuestionarios(
  idTipo: number | null, pagina = 0, tamano = 20,
): Promise<Pagina<Cuestionario>> {
  const r = await axiosInstance.get<ApiResponse<Pagina<Cuestionario>>>('/cuestionarios',
    { params: { idTipo: idTipo ?? undefined, pagina, tamano } })
  return r.data.data
}

export async function getCuestionariosPendientes(
  pagina = 0, tamano = 20,
): Promise<Pagina<Cuestionario>> {
  const r = await axiosInstance.get<ApiResponse<Pagina<Cuestionario>>>('/cuestionarios/pendientes',
    { params: { pagina, tamano } })
  return r.data.data
}

export async function getCuestionariosDeParticipante(uuid: string): Promise<Cuestionario[]> {
  const r = await axiosInstance.get<ApiResponse<Cuestionario[]>>(
    `/cuestionarios/participante/${uuid}`)
  return r.data.data
}

/**
 * Que instrumentos le tocan a un participante.
 *
 * Devuelve todos los activos con su veredicto, no solo los que aplican: esconder los
 * que no aplican dejaria sin saber por que falta el que se esperaba, y el motivo suele
 * ser un dato del expediente que falta.
 */
export async function getTiposParaParticipante(uuid: string): Promise<TipoParaParticipante[]> {
  const r = await axiosInstance.get<ApiResponse<TipoParaParticipante[]>>(
    `/cuestionarios/tipos-para/${uuid}`)
  return r.data.data
}

export async function getCuestionario(id: number): Promise<Cuestionario> {
  const r = await axiosInstance.get<ApiResponse<Cuestionario>>(`/cuestionarios/${id}`)
  return r.data.data
}

export async function abrirCuestionario(
  idTipoCuestionario: number, uuidParticipante: string, origen: OrigenCuestionario = 'APLICACION',
): Promise<Cuestionario> {
  const r = await axiosInstance.post<ApiResponse<Cuestionario>>('/cuestionarios',
    { idTipoCuestionario, uuidParticipante, origen })
  return r.data.data
}

// ── Llenado por bloques ─────────────────────────────────────────────────────

export async function getBloqueLleno(id: number, idBloque: number): Promise<BloqueLleno> {
  const r = await axiosInstance.get<ApiResponse<BloqueLleno>>(
    `/cuestionarios/${id}/bloques/${idBloque}`)
  return r.data.data
}

/**
 * Guarda el bloque completo.
 *
 * Lo que no vaya en la lista se borra. Es la única forma de que desmarcar una
 * casilla tenga efecto: con un guardado incremental, quitar una marca no mandaría
 * nada y la respuesta anterior se quedaría ahí.
 */
export async function guardarBloque(
  id: number, idBloque: number,
  respuestas: Array<{ idVariable: number; ordenRespuesta?: number; valor: string | null }>,
): Promise<BloqueLleno> {
  const r = await axiosInstance.put<ApiResponse<BloqueLleno>>(
    `/cuestionarios/${id}/bloques/${idBloque}`, { respuestas })
  return r.data.data
}

export async function getFaltantes(id: number): Promise<{ total: number; codigos: string[] }> {
  const r = await axiosInstance.get<ApiResponse<{ total: number; codigos: string[] }>>(
    `/cuestionarios/${id}/faltantes`)
  return r.data.data
}

export async function cerrarCuestionario(id: number): Promise<Cuestionario> {
  const r = await axiosInstance.patch<ApiResponse<Cuestionario>>(`/cuestionarios/${id}/cerrar`)
  return r.data.data
}

export async function validarCuestionario(id: number, nota?: string): Promise<Cuestionario> {
  const r = await axiosInstance.patch<ApiResponse<Cuestionario>>(
    `/cuestionarios/${id}/validar`, { nota: nota ?? null })
  return r.data.data
}

export async function reabrirCuestionario(id: number): Promise<Cuestionario> {
  const r = await axiosInstance.patch<ApiResponse<Cuestionario>>(`/cuestionarios/${id}/reabrir`)
  return r.data.data
}

export async function anularCuestionario(id: number, motivo: string): Promise<Cuestionario> {
  const r = await axiosInstance.patch<ApiResponse<Cuestionario>>(
    `/cuestionarios/${id}/anular`, { motivo })
  return r.data.data
}

// ── Lecturas pendientes y en desacuerdo ─────────────────────────────────────

export async function getLecturasPendientes(id: number): Promise<RespuestaCuestionario[]> {
  const r = await axiosInstance.get<ApiResponse<RespuestaCuestionario[]>>(
    `/cuestionarios/${id}/lecturas-pendientes`)
  return r.data.data
}

export async function getDiscrepancias(
  id: number, soloSinResolver = true,
): Promise<DiscrepanciaLectura[]> {
  const r = await axiosInstance.get<ApiResponse<DiscrepanciaLectura[]>>(
    `/cuestionarios/${id}/discrepancias`, { params: { soloSinResolver } })
  return r.data.data
}

export async function resolverDiscrepancia(
  idDiscrepancia: number, valorElegido: string, nota?: string,
): Promise<DiscrepanciaLectura> {
  const r = await axiosInstance.patch<ApiResponse<DiscrepanciaLectura>>(
    `/cuestionarios/discrepancias/${idDiscrepancia}`, { valorElegido, nota: nota ?? null })
  return r.data.data
}

// ── Cargas masivas ──────────────────────────────────────────────────────────

/**
 * El archivo viaja en los dos pasos.
 *
 * Guardarlo entre peticiones evitaría la segunda subida, pero dejaría la
 * confirmación trabajando contra una lectura vieja: si entre los dos pasos alguien
 * cargó el mismo participante, la segunda lectura lo nota y la guardada no.
 */
export async function previsualizarVolcado(
  archivo: File, idTipo: number,
): Promise<PrevisualizacionVolcado> {
  const cuerpo = new FormData()
  cuerpo.append('archivo', archivo)
  const r = await axiosInstance.post<ApiResponse<PrevisualizacionVolcado>>(
    '/cuestionarios/carga/volcado/previsualizar', cuerpo,
    { params: { idTipo }, headers: { 'Content-Type': 'multipart/form-data' } })
  return r.data.data
}

/**
 * Encola la carga. No espera a que acabe.
 *
 * Devuelve la tarea recién creada —con las cifras en cero— y a partir de ahí hay que
 * preguntar por ella con `consultarCargaVolcado`. La carga tarda minutos con un
 * archivo grande, y una petición abierta tanto tiempo la corta cualquier cosa de
 * enmedio: así, que se corte no deja a nadie sin saber qué pasó.
 */
export async function confirmarVolcado(
  archivo: File, idTipo: number, sobrescribir = false,
): Promise<InformeCargaVolcado> {
  const cuerpo = new FormData()
  cuerpo.append('archivo', archivo)
  const r = await axiosInstance.post<ApiResponse<InformeCargaVolcado>>(
    '/cuestionarios/carga/volcado/confirmar', cuerpo,
    {
      params: { idTipo, sobrescribir },
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  return r.data.data
}

export async function consultarCargaVolcado(id: number): Promise<InformeCargaVolcado> {
  const r = await axiosInstance.get<ApiResponse<InformeCargaVolcado>>(
    `/cuestionarios/carga/volcado/tareas/${id}`)
  return r.data.data
}

/** Las últimas cargas, para quien no se quedó mirando la pantalla mientras corría. */
export async function cargasDeVolcadoRecientes(): Promise<InformeCargaVolcado[]> {
  const r = await axiosInstance.get<ApiResponse<InformeCargaVolcado[]>>(
    '/cuestionarios/carga/volcado/tareas')
  return r.data.data
}

export async function previsualizarCatalogo(
  archivo: File, idTipo: number, nombreCatalogo?: string,
): Promise<PrevisualizacionCatalogo> {
  const cuerpo = new FormData()
  cuerpo.append('archivo', archivo)
  const r = await axiosInstance.post<ApiResponse<PrevisualizacionCatalogo>>(
    '/cuestionarios/carga/catalogo/previsualizar', cuerpo,
    {
      params: { idTipo, nombreCatalogo: nombreCatalogo || undefined },
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  return r.data.data
}

export async function confirmarCatalogo(
  archivo: File, idTipo: number, nombreCatalogo?: string,
): Promise<PrevisualizacionCatalogo> {
  const cuerpo = new FormData()
  cuerpo.append('archivo', archivo)
  const r = await axiosInstance.post<ApiResponse<PrevisualizacionCatalogo>>(
    '/cuestionarios/carga/catalogo/confirmar', cuerpo,
    {
      params: { idTipo, nombreCatalogo: nombreCatalogo || undefined },
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  return r.data.data
}
