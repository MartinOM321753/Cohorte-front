import api from '@/lib/axiosInstance'
import {
  ApiResponse,
  Refrigerador,
  RefrigeradorRequestDTO,
  PisosDTO,
  Caja,
  CajaRequestDTO,
  Muestra,
  MuestraDetalleDTO,
  MuestraRequestDTO,
  PosicionCaja,
  Almacen,
  AlmacenRequestDTO,
  AsignarPosicionRequestDTO,
  TrasladoMuestra,
  TrasladoRequestDTO,
  DevolucionRequestDTO,
  ConfirmarRecepcionRequestDTO,
  IniciarDevolucionRequestDTO,
  GenerarAlicuotasRequest,
  MuestraTipoInstitucionResponse,
  CancelarPrestamoRequestDTO,
  SpringPage,
  TipoMuestra,
  TipoMuestraRequestDTO,
  TuboMuestra,
  TuboMuestraRequestDTO,
  TipoEstudioMuestra,
  TipoEstudioMuestraRequestDTO,
  ParametroEstudioMuestra,
  ParametroEstudioMuestraRequestDTO,
  EstudioMuestraRequestDTO,
  EstudioMuestraResponse,
  HistorialCambioMuestraResponse,
} from '@/types/api'
import { Usuario } from '@/types/api'

// ============================================
// REFRIGERADORES
// ============================================

export async function getRefrigeradores() {
  const response = await api.get<ApiResponse<Refrigerador[]>>('/almacenamiento/refrigeradores')
  return response.data.data
}

export async function getRefrigeradorById(id: number) {
  const response = await api.get<ApiResponse<Refrigerador>>(`/almacenamiento/refrigeradores/${id}`)
  return response.data.data
}

export async function createRefrigerador(data: RefrigeradorRequestDTO) {
  const response = await api.post<ApiResponse<Refrigerador>>('/almacenamiento/refrigeradores', data)
  return response.data.data
}

export async function updateRefrigerador(id: number, data: Partial<RefrigeradorRequestDTO>) {
  const response = await api.put<ApiResponse<Refrigerador>>(`/almacenamiento/refrigeradores/${id}`, data)
  return response.data.data
}

export async function deleteRefrigerador(id: number) {
  const response = await api.delete<ApiResponse<void>>(`/almacenamiento/refrigeradores/${id}`)
  return response.data
}

// ============================================
// PISOS DE REFRIGERADOR
// ============================================

export async function getPisosByRefrigerador(idRefrigerador: number) {
  try {
    const response = await api.get<ApiResponse<any[]>>(`/almacenamiento/refrigeradores/${idRefrigerador}/pisos`)
    return response.data.data || []
  } catch (error: any) {
    // Si la API retorna 404 o error, retornar array vacío en lugar de lanzar error
    if (error.response?.status === 404) {
      return []
    }
    throw error
  }
}

export async function createPisos(data: PisosDTO) {
  const response = await api.post<ApiResponse<any[]>>('/almacenamiento/refrigeradores/pisos', data)
  return response.data.data
}

// ============================================
// POSICIONES DE PISO
// ============================================

export async function getPosicionesByPiso(idPiso: number) {
  const response = await api.get<ApiResponse<any[]>>(`/almacenamiento/refrigeradores/pisos/${idPiso}/posiciones`)
  return response.data.data
}

export async function getPosicionesLibresByPiso(idPiso: number) {
  const response = await api.get<ApiResponse<any[]>>(`/almacenamiento/refrigeradores/pisos/${idPiso}/posiciones/libres`)
  return response.data.data
}

// ============================================
// CAJAS CRIOGÉNICAS
// ============================================

export async function getCajas() {
  const response = await api.get<ApiResponse<Caja[]>>('/almacenamiento/cajas')
  return response.data.data
}

export async function getCajaById(id: number) {
  const response = await api.get<ApiResponse<Caja>>(`/almacenamiento/cajas/${id}`)
  return response.data.data
}

export async function createCaja(data: CajaRequestDTO) {
  const response = await api.post<ApiResponse<Caja>>('/almacenamiento/cajas', data)
  return response.data.data
}

export async function updateCaja(id: number, data: Partial<CajaRequestDTO>) {
  const response = await api.put<ApiResponse<Caja>>(`/almacenamiento/cajas/${id}`, data)
  return response.data.data
}

export async function asignarCajaAPosicion(idCaja: number, idPosicionPiso: number) {
  const response = await api.put<ApiResponse<Caja>>(`/almacenamiento/cajas/${idCaja}`, { idPosicionPiso })
  return response.data.data
}

export async function deleteCaja(id: number) {
  const response = await api.delete<ApiResponse<void>>(`/almacenamiento/cajas/${id}`)
  return response.data
}

// ============================================
// POSICIONES DE CAJA
// ============================================

export async function getPosicionesByCaja(idCaja: number) {
  const response = await api.get<ApiResponse<PosicionCaja[]>>(`/almacenamiento/cajas/${idCaja}/posiciones`)
  return response.data.data
}

export async function getPosicionesLibresByCaja(idCaja: number) {
  const response = await api.get<ApiResponse<PosicionCaja[]>>(`/almacenamiento/cajas/${idCaja}/posiciones/libres`)
  return response.data.data
}

// ============================================
// MUESTRAS
// ============================================

export async function getMuestras(params?: { pacienteUUID?: string }) {
  const response = await api.get<ApiResponse<MuestraDetalleDTO[]>>('/almacenamiento/muestras', { params })
  return response.data.data
}

export async function getMuestraById(id: number) {
  const response = await api.get<ApiResponse<MuestraDetalleDTO>>(`/almacenamiento/muestras/${id}`)
  return response.data.data
}

export async function getMuestrasByPaciente(uuid: string) {
  const response = await api.get<ApiResponse<Muestra[]>>(`/almacenamiento/muestras/paciente/uuid/${uuid}`)
  return response.data.data
}

export async function countMuestrasByPaciente(uuid: string): Promise<number> {
  const response = await api.get<ApiResponse<number>>(`/almacenamiento/muestras/paciente/uuid/${uuid}/count`)
  return response.data.data
}

export async function createMuestra(data: MuestraRequestDTO) {
  const response = await api.post<ApiResponse<MuestraDetalleDTO>>('/almacenamiento/muestras', data)
  return response.data.data
}

export async function updateMuestra(id: number, data: Partial<MuestraRequestDTO>) {
  const response = await api.put<ApiResponse<Muestra>>(`/almacenamiento/muestras/${id}`, data)
  return response.data.data
}

export async function deleteMuestra(id: number) {
  const response = await api.delete<ApiResponse<void>>(`/almacenamiento/muestras/${id}`)
  return response.data
}

export async function getMuestrasEnBiobanco(page = 0, size = 50) {
  const response = await api.get<ApiResponse<SpringPage<MuestraDetalleDTO>>>('/almacenamiento/muestras/biobanco', {
    params: { page, size },
  })
  return response.data.data
}

export async function getAlicuotasByMuestra(idMuestra: number) {
  const response = await api.get<ApiResponse<MuestraDetalleDTO[]>>(`/almacenamiento/muestras/${idMuestra}/alicuotas`)
  return response.data.data
}

export async function asignarPosicionMuestra(id: number, data: AsignarPosicionRequestDTO) {
  const response = await api.put<ApiResponse<Muestra>>(`/almacenamiento/muestras/${id}/posicion`, data)
  return response.data.data
}

export async function liberarPosicionMuestra(id: number, motivo?: string) {
  const response = await api.delete<ApiResponse<Muestra>>(`/almacenamiento/muestras/${id}/posicion`, {
    params: motivo ? { motivo } : undefined,
  })
  return response.data.data
}

// ============================================
// PISOS — UPDATE / DELETE (endpoints nuevos)
// ============================================

export async function updatePiso(id: number, data: { numeroPiso: string; filas: number; columnas: number; altura: number; activo: boolean }) {
  const response = await api.put<ApiResponse<any>>(`/almacenamiento/refrigeradores/pisos/${id}`, data)
  return response.data.data
}

export async function deletePiso(id: number) {
  const response = await api.delete<ApiResponse<void>>(`/almacenamiento/refrigeradores/pisos/${id}`)
  return response.data
}

// ============================================
// ALMACENES EXTERNOS
// ============================================

export async function getAlmacenes() {
  const response = await api.get<ApiResponse<Almacen[]>>('/almacenamiento/instituciones')
  return response.data.data
}

export async function getAlmacenById(id: number) {
  const response = await api.get<ApiResponse<Almacen>>(`/almacenamiento/instituciones/${id}`)
  return response.data.data
}

export async function createAlmacen(data: AlmacenRequestDTO) {
  const response = await api.post<ApiResponse<Almacen>>('/almacenamiento/instituciones', data)
  return response.data.data
}

export async function updateAlmacen(id: number, data: AlmacenRequestDTO) {
  const response = await api.put<ApiResponse<Almacen>>(`/almacenamiento/instituciones/${id}`, data)
  return response.data.data
}

export async function deleteAlmacen(id: number) {
  const response = await api.delete<ApiResponse<void>>(`/almacenamiento/instituciones/${id}`)
  return response.data
}

export async function activateAlmacen(id: number) {
  const response = await api.patch<ApiResponse<Almacen>>(`/almacenamiento/instituciones/${id}/activar`)
  return response.data.data
}

// ============================================
// PRÉSTAMOS / TRASLADOS DE MUESTRAS
// ============================================

/** Préstamos activos de mi institución (ENVIADA | RECIBIDA | EN_DEVOLUCION, yo soy origen O destino) */
export async function getAllTraslados() {
  const response = await api.get<ApiResponse<TrasladoMuestra[]>>('/almacenamiento/traslados')
  return response.data.data
}

/** Historial paginado de préstamos de mi institución */
export async function getHistorialTraslados(page = 0, size = 20) {
  const response = await api.get<ApiResponse<SpringPage<TrasladoMuestra>>>('/almacenamiento/traslados/historial', {
    params: { page, size },
  })
  return response.data.data
}

export async function getTrasladoById(id: number) {
  const response = await api.get<ApiResponse<TrasladoMuestra>>(`/almacenamiento/traslados/${id}`)
  return response.data.data
}

/** Cadena de custodia de una muestra */
export async function getTrasladosByMuestra(idMuestra: number) {
  const response = await api.get<ApiResponse<TrasladoMuestra[]>>(`/almacenamiento/traslados/muestra/${idMuestra}`)
  return response.data.data
}

/** Traslados de un lote (grupoTraslado) */
export async function getTrasladosByGrupo(grupoTraslado: string) {
  const response = await api.get<ApiResponse<TrasladoMuestra[]>>(`/almacenamiento/traslados/grupo/${grupoTraslado}`)
  return response.data.data
}

/** Iniciar préstamo — una o varias muestras a otra institución */
export async function iniciarPrestamo(data: TrasladoRequestDTO) {
  const response = await api.post<ApiResponse<TrasladoMuestra[]>>('/almacenamiento/traslados', data)
  return response.data.data
}

/** ENVIADA → RECIBIDA */
export async function confirmarRecepcion(idTraslado: number, data: ConfirmarRecepcionRequestDTO) {
  const response = await api.put<ApiResponse<TrasladoMuestra>>(`/almacenamiento/traslados/${idTraslado}/confirmar-recepcion`, data)
  return response.data.data
}

/** RECIBIDA → EN_DEVOLUCION */
export async function iniciarDevolucion(idTraslado: number, data: IniciarDevolucionRequestDTO) {
  const response = await api.put<ApiResponse<TrasladoMuestra>>(`/almacenamiento/traslados/${idTraslado}/iniciar-devolucion`, data)
  return response.data.data
}

/** EN_DEVOLUCION → DEVUELTA */
export async function confirmarDevolucion(idTraslado: number, data: DevolucionRequestDTO) {
  const response = await api.put<ApiResponse<TrasladoMuestra>>(`/almacenamiento/traslados/${idTraslado}/confirmar-devolucion`, data)
  return response.data.data
}

/** ENVIADA → CANCELADO (solo antes de que el destino confirme recepción) */
export async function cancelarPrestamo(idTraslado: number, data: CancelarPrestamoRequestDTO) {
  const response = await api.put<ApiResponse<TrasladoMuestra>>(`/almacenamiento/traslados/${idTraslado}/cancelar`, data)
  return response.data.data
}

/** Alícuotas de la muestra padre del traslado que están en la institución destino */
export async function getAlicuotasEnDestino(idTraslado: number) {
  const response = await api.get<ApiResponse<MuestraDetalleDTO[]>>(`/almacenamiento/traslados/${idTraslado}/alicuotas-en-destino`)
  return response.data.data
}

/** Generar alícuotas en institución receptora */
export async function generarAlicuotasEnReceptora(idMuestra: number, data: GenerarAlicuotasRequest) {
  const response = await api.post<ApiResponse<MuestraDetalleDTO[]>>(`/almacenamiento/muestras/${idMuestra}/generar-alicuotas`, data)
  return response.data.data
}

/** Obtener tipo+tubo asignado por mi institución a una muestra recibida */
export async function getTipoInstitucion(idMuestra: number) {
  const response = await api.get<ApiResponse<MuestraTipoInstitucionResponse | null>>(`/almacenamiento/muestras/${idMuestra}/tipo-institucion`)
  return response.data.data
}

export async function getUsuariosByRol(roleName: string) {
  const response = await api.get<ApiResponse<Usuario[]>>(`/users/rol/${roleName}`)
  return response.data.data
}

// ============================================
// TIPOS DE MUESTRA (Stream C)
// ============================================

export async function getTiposMuestra() {
  const response = await api.get<ApiResponse<TipoMuestra[]>>('/muestras/tipos/todos')
  return response.data.data
}

export async function getTiposMuestraActivos() {
  const response = await api.get<ApiResponse<TipoMuestra[]>>('/muestras/tipos')
  return response.data.data
}

export async function getTipoMuestraById(id: number) {
  const response = await api.get<ApiResponse<TipoMuestra>>(`/muestras/tipos/${id}`)
  return response.data.data
}

export async function createTipoMuestra(data: TipoMuestraRequestDTO) {
  const response = await api.post<ApiResponse<TipoMuestra>>('/muestras/tipos', data)
  return response.data.data
}

export async function updateTipoMuestra(id: number, data: TipoMuestraRequestDTO) {
  const response = await api.put<ApiResponse<TipoMuestra>>(`/muestras/tipos/${id}`, data)
  return response.data.data
}

export async function toggleTipoMuestra(id: number) {
  const response = await api.put<ApiResponse<TipoMuestra>>(`/muestras/tipos/${id}/toggle`)
  return response.data.data
}

export async function addTuboMuestra(idTipo: number, data: TuboMuestraRequestDTO) {
  const response = await api.post<ApiResponse<TuboMuestra>>(`/muestras/tipos/${idTipo}/tubos`, data)
  return response.data.data
}

export async function updateTuboMuestra(idTubo: number, data: TuboMuestraRequestDTO) {
  const response = await api.put<ApiResponse<TuboMuestra>>(`/muestras/tipos/tubos/${idTubo}`, data)
  return response.data.data
}

export async function deleteTuboMuestra(idTubo: number) {
  const response = await api.delete<ApiResponse<void>>(`/muestras/tipos/tubos/${idTubo}`)
  return response.data
}

// ============================================
// TIPOS DE ESTUDIO DE MUESTRA — catálogo
// ============================================

export async function getTiposEstudioMuestra() {
  const response = await api.get<ApiResponse<TipoEstudioMuestra[]>>('/muestras/estudios/tipos')
  return response.data.data
}

export async function getTodosLosTiposEstudioMuestra() {
  const response = await api.get<ApiResponse<TipoEstudioMuestra[]>>('/muestras/estudios/tipos/todos')
  return response.data.data
}

export async function createTipoEstudioMuestra(data: TipoEstudioMuestraRequestDTO) {
  const response = await api.post<ApiResponse<TipoEstudioMuestra>>('/muestras/estudios/tipos', data)
  return response.data.data
}

export async function updateTipoEstudioMuestra(id: number, data: TipoEstudioMuestraRequestDTO) {
  const response = await api.put<ApiResponse<TipoEstudioMuestra>>(`/muestras/estudios/tipos/${id}`, data)
  return response.data.data
}

export async function toggleTipoEstudioMuestra(id: number) {
  const response = await api.put<ApiResponse<boolean>>(`/muestras/estudios/tipos/${id}/toggle`)
  return response.data.data
}

export async function getParametrosByTipoEstudioMuestra(idTipo: number) {
  const response = await api.get<ApiResponse<ParametroEstudioMuestra[]>>(`/muestras/estudios/tipos/${idTipo}/parametros`)
  return response.data.data
}

// ============================================
// PARÁMETROS DE ESTUDIO DE MUESTRA
// ============================================

export async function createParametroEstudioMuestra(data: ParametroEstudioMuestraRequestDTO) {
  const response = await api.post<ApiResponse<ParametroEstudioMuestra>>('/muestras/estudios/parametros', data)
  return response.data.data
}

export async function updateParametroEstudioMuestra(id: number, data: ParametroEstudioMuestraRequestDTO) {
  const response = await api.put<ApiResponse<ParametroEstudioMuestra>>(`/muestras/estudios/parametros/${id}`, data)
  return response.data.data
}

export async function deleteParametroEstudioMuestra(id: number) {
  const response = await api.delete<ApiResponse<void>>(`/muestras/estudios/parametros/${id}`)
  return response.data
}

export async function addOpcionParametroEstudioMuestra(parametroId: number, valor: string) {
  const response = await api.post<ApiResponse<string>>(`/muestras/estudios/parametros/${parametroId}/opciones`, { valor })
  return response.data.data
}

export async function deleteOpcionParametroEstudioMuestra(opcionId: number) {
  const response = await api.delete<ApiResponse<void>>(`/muestras/estudios/parametros/opciones/${opcionId}`)
  return response.data
}

// ============================================
// ESTUDIOS POR MUESTRA
// ============================================

export async function getEstudiosByMuestra(idMuestra: number) {
  const response = await api.get<ApiResponse<EstudioMuestraResponse[]>>(`/muestras/${idMuestra}/estudios`)
  return response.data.data
}

export async function createEstudioMuestra(idMuestra: number, data: EstudioMuestraRequestDTO) {
  const response = await api.post<ApiResponse<EstudioMuestraResponse>>(`/muestras/${idMuestra}/estudios`, data)
  return response.data.data
}

export async function updateEstudioMuestra(id: number, data: EstudioMuestraRequestDTO) {
  const response = await api.put<ApiResponse<EstudioMuestraResponse>>(`/muestras/estudios/${id}`, data)
  return response.data.data
}

export async function deleteEstudioMuestra(id: number) {
  const response = await api.delete<ApiResponse<void>>(`/muestras/estudios/${id}`)
  return response.data
}

// ============================================
// HISTORIAL DE CAMBIOS DE MUESTRA
// ============================================

export async function getHistorialMuestra(idMuestra: number) {
  const response = await api.get<ApiResponse<HistorialCambioMuestraResponse[]>>(`/muestras/${idMuestra}/historial`)
  return response.data.data
}

// ============================================
// IMPRESIÓN ZPL (Zebra)
// ============================================

export async function getZplEtiqueta(idMuestra: number, configuracionId?: number): Promise<string> {
  const response = await api.get<ApiResponse<string>>(`/almacenamiento/muestras/${idMuestra}/etiqueta/zpl`, {
    params: configuracionId ? { configuracionId } : undefined,
  })
  return response.data.data
}

export async function getZplAlicuotas(idMuestraPadre: number, configuracionId?: number): Promise<string[]> {
  const response = await api.get<ApiResponse<string[]>>(`/almacenamiento/muestras/${idMuestraPadre}/alicuotas/etiquetas/zpl`, {
    params: configuracionId ? { configuracionId } : undefined,
  })
  return response.data.data
}

export async function listarImpresoras(): Promise<string[]> {
  const response = await api.get<ApiResponse<string[]>>('/almacenamiento/muestras/impresoras')
  return response.data.data
}

export async function imprimirEtiqueta(idMuestra: number, impresora: string, configuracionId?: number): Promise<void> {
  const params: Record<string, string | number> = { impresora }
  if (configuracionId) params.configuracionId = configuracionId
  await api.post(`/almacenamiento/muestras/${idMuestra}/etiqueta/imprimir`, null, { params })
}

export async function imprimirAlicuotas(idMuestraPadre: number, impresora: string, configuracionId?: number): Promise<number> {
  const params: Record<string, string | number> = { impresora }
  if (configuracionId) params.configuracionId = configuracionId
  const response = await api.post<ApiResponse<number>>(
    `/almacenamiento/muestras/${idMuestraPadre}/alicuotas/etiquetas/imprimir`,
    null,
    { params }
  )
  return response.data.data
}

export async function imprimirLoteCompleto(idMuestraPadre: number, impresora: string, configuracionId?: number): Promise<number> {
  const params: Record<string, string | number> = { impresora }
  if (configuracionId) params.configuracionId = configuracionId
  const response = await api.post<ApiResponse<number>>(
    `/almacenamiento/muestras/${idMuestraPadre}/lote-completo/imprimir`,
    null,
    { params }
  )
  return response.data.data
}
