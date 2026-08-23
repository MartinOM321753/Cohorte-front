import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getRefrigeradores,
  getRefrigeradorById,
  createRefrigerador,
  updateRefrigerador,
  deleteRefrigerador,
  getPisosByRefrigerador,
  createPisos,
  updatePiso,
  deletePiso,
  getCajas,
  getCajaById,
  createCaja,
  updateCaja,
  deleteCaja,
  getPosicionesByCaja,
  getPosicionesLibresByCaja,
  getPosicionesByPiso,
  getPosicionesLibresByPiso,
  getMuestras,
  getMuestraById,
  getMuestrasByPaciente,
  countMuestrasByPaciente,
  createMuestra,
  updateMuestra,
  deleteMuestra,
  darDeBajaMuestra,
  getMuestrasEnBiobanco,
  getAlicuotasByMuestra,
  asignarPosicionMuestra,
  liberarPosicionMuestra,
  getAlmacenes,
  createAlmacen,
  updateAlmacen,
  deleteAlmacen,
  activateAlmacen,
  getAllTraslados,
  getHistorialTraslados,
  getTrasladosByMuestra,
  getTrasladosByGrupo,
  iniciarPrestamo,
  confirmarRecepcion,
  iniciarDevolucion,
  confirmarDevolucion,
  cancelarPrestamo,
  getAlicuotasEnDestino,
  generarAlicuotasEnReceptora,
  getTipoInstitucion,
  getUsuariosByRol,
  getTiposMuestra,
  getTiposMuestraActivos,
  createTipoMuestra,
  updateTipoMuestra,
  toggleTipoMuestra,
  addTuboMuestra,
  updateTuboMuestra,
  deleteTuboMuestra,
  getUbicacion3D,
  getVista3DRefrigerador,
  getVista3DPiso,
  getVista3DCaja,
  getZplEtiqueta,
  getZplAlicuotas,
  listarImpresoras,
  imprimirEtiqueta,
  imprimirAlicuotas,
  imprimirLoteCompleto,
} from '../api/biobanco.api'
import {
  RefrigeradorRequestDTO,
  PisosDTO,
  CajaRequestDTO,
  MuestraRequestDTO,
  MuestraDetalleDTO,
  AlmacenRequestDTO,
  AsignarPosicionRequestDTO,
  TrasladoRequestDTO,
  DevolucionRequestDTO,
  ConfirmarRecepcionRequestDTO,
  IniciarDevolucionRequestDTO,
  CancelarPrestamoRequestDTO,
  GenerarAlicuotasRequest,
  TipoMuestraRequestDTO,
  TuboMuestraRequestDTO,
} from '@/types/api'
import { toast } from 'sonner'

// ============================================
// HOOKS PARA REFRIGERADORES
// ============================================

export function useGetRefrigeradores(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['refrigeradores'],
    queryFn: () => getRefrigeradores(),
    enabled: options?.enabled ?? true,
  })
}

export function useGetRefrigeradorById(id: number) {
  return useQuery({
    queryKey: ['refrigeradores', id],
    queryFn: () => getRefrigeradorById(id),
    enabled: !!id,
  })
}

export function useCreateRefrigerador() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: RefrigeradorRequestDTO) => createRefrigerador(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['refrigeradores'] })
      toast.success('Refrigerador creado exitosamente')
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Error al crear el refrigerador'
      toast.error(message)
    },
  })
}

export function useUpdateRefrigerador() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<RefrigeradorRequestDTO> }) =>
      updateRefrigerador(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['refrigeradores'] })
      toast.success('Refrigerador actualizado exitosamente')
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Error al actualizar el refrigerador'
      toast.error(message)
    },
  })
}

export function useDeleteRefrigerador() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => deleteRefrigerador(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['refrigeradores'] })
      toast.success('Refrigerador eliminado exitosamente')
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Error al eliminar el refrigerador'
      toast.error(message)
    },
  })
}

// ============================================
// HOOKS PARA PISOS
// ============================================

export function useGetPisosByRefrigerador(idRefrigerador: number) {
  return useQuery({
    queryKey: ['pisos', idRefrigerador],
    queryFn: () => getPisosByRefrigerador(idRefrigerador),
    enabled: !!idRefrigerador,
  })
}

export function useCreatePisos() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: PisosDTO) => createPisos(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pisos'] })
      queryClient.invalidateQueries({ queryKey: ['refrigeradores'] })
      toast.success('Pisos creados exitosamente')
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Error al crear los pisos'
      toast.error(message)
    },
  })
}

export function useUpdatePiso() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: { numeroPiso: string; filas: number; columnas: number; altura: number; activo: boolean } }) =>
      updatePiso(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pisos'] })
      queryClient.invalidateQueries({ queryKey: ['refrigeradores'] })
      toast.success('Piso actualizado exitosamente')
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Error al actualizar el piso'
      toast.error(message)
    },
  })
}

export function useDeletePiso() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => deletePiso(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pisos'] })
      queryClient.invalidateQueries({ queryKey: ['refrigeradores'] })
      toast.success('Piso eliminado exitosamente')
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Error al eliminar el piso'
      toast.error(message)
    },
  })
}

// ============================================
// HOOKS PARA POSICIONES DE PISO
// ============================================

export function useGetPosicionesByPiso(idPiso: number) {
  return useQuery({
    queryKey: ['posiciones-piso', idPiso],
    queryFn: () => getPosicionesByPiso(idPiso),
    enabled: !!idPiso,
  })
}

export function useGetPosicionesLibresByPiso(idPiso: number) {
  return useQuery({
    queryKey: ['posiciones-piso-libres', idPiso],
    queryFn: () => getPosicionesLibresByPiso(idPiso),
    enabled: !!idPiso,
  })
}

// ============================================
// HOOKS PARA CAJAS
// ============================================

export function useGetCajas() {
  return useQuery({
    queryKey: ['cajas'],
    queryFn: () => getCajas(),
  })
}

export function useGetCajaById(id: number) {
  return useQuery({
    queryKey: ['cajas', id],
    queryFn: () => getCajaById(id),
    enabled: !!id,
  })
}

export function useCreateCaja() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CajaRequestDTO) => createCaja(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cajas'] })
      queryClient.invalidateQueries({ queryKey: ['pisos'] })
      toast.success('Caja criogénica creada exitosamente')
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Error al crear la caja'
      toast.error(message)
    },
  })
}

export function useUpdateCaja() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<CajaRequestDTO> }) =>
      updateCaja(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cajas'] })
      toast.success('Caja actualizada exitosamente')
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Error al actualizar la caja'
      toast.error(message)
    },
  })
}

export function useDeleteCaja() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => deleteCaja(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cajas'] })
      queryClient.invalidateQueries({ queryKey: ['pisos'] })
      toast.success('Caja eliminada exitosamente')
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Error al eliminar la caja'
      toast.error(message)
    },
  })
}

// ============================================
// HOOKS PARA POSICIONES DE CAJA
// ============================================

export function useGetPosicionesByCaja(idCaja: number) {
  return useQuery({
    queryKey: ['posiciones', idCaja],
    queryFn: () => getPosicionesByCaja(idCaja),
    enabled: !!idCaja,
  })
}

export function useGetPosicionesLibresByCaja(idCaja: number) {
  return useQuery({
    queryKey: ['posiciones-libres', idCaja],
    queryFn: () => getPosicionesLibresByCaja(idCaja),
    enabled: !!idCaja,
  })
}

// ============================================
// HOOKS PARA MUESTRAS
// ============================================

export function useGetMuestras(params?: { pacienteUUID?: string; incluirHistorico?: boolean }) {
  return useQuery<MuestraDetalleDTO[]>({
    queryKey: ['muestras', params],
    queryFn: () => getMuestras(params),
  })
}

export function useGetMuestraById(id: number) {
  return useQuery<MuestraDetalleDTO>({
    queryKey: ['muestras', id],
    queryFn: () => getMuestraById(id),
    enabled: !!id,
  })
}

export function useGetMuestrasByPaciente(uuid: string) {
  return useQuery({
    queryKey: ['muestras-paciente', uuid],
    queryFn: () => getMuestrasByPaciente(uuid),
    enabled: !!uuid,
  })
}

export function useCountMuestrasByPaciente(
  uuid: string,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ['muestras-count', uuid],
    queryFn: () => countMuestrasByPaciente(uuid),
    enabled: (options?.enabled ?? true) && !!uuid,
  })
}

export function useCreateMuestra() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: MuestraRequestDTO) => createMuestra(data),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['muestras'] })
      queryClient.invalidateQueries({ queryKey: ['posiciones'] })
      queryClient.invalidateQueries({ queryKey: ['posiciones-libres'] })
      const alicuotas = data?.alicuotasGeneradas
      if (alicuotas && alicuotas > 0) {
        toast.success(`Muestra registrada. Se generaron ${alicuotas} alícuotas — asigna sus posiciones desde la lista.`, { duration: 6000 })
      } else {
        toast.success('Muestra registrada exitosamente')
      }
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Error al registrar la muestra'
      toast.error(message)
    },
  })
}

export function useUpdateMuestra() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<MuestraRequestDTO> }) =>
      updateMuestra(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['muestras'] })
      queryClient.invalidateQueries({ queryKey: ['posiciones'] })
      queryClient.invalidateQueries({ queryKey: ['posiciones-libres'] })
      toast.success('Muestra actualizada exitosamente')
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Error al actualizar la muestra'
      toast.error(message)
    },
  })
}

export function useDeleteMuestra() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => deleteMuestra(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['muestras'] })
      queryClient.invalidateQueries({ queryKey: ['posiciones'] })
      queryClient.invalidateQueries({ queryKey: ['posiciones-libres'] })
      toast.success('Muestra eliminada exitosamente')
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Error al eliminar la muestra'
      toast.error(message)
    },
  })
}

export function useDarDeBajaMuestra() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, motivo }: { id: number; motivo: string }) => darDeBajaMuestra(id, motivo),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['muestras'] })
      queryClient.invalidateQueries({ queryKey: ['muestras-biobanco'] })
      queryClient.invalidateQueries({ queryKey: ['posiciones'] })
      queryClient.invalidateQueries({ queryKey: ['posiciones-libres'] })
      toast.success('Muestra dada de baja')
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Error al dar de baja la muestra'
      toast.error(message)
    },
  })
}

// ============================================
// HOOKS PARA ALMACENES EXTERNOS
// ============================================

export function useGetAlmacenes() {
  return useQuery({
    queryKey: ['almacenes'],
    queryFn: () => getAlmacenes(),
  })
}

export function useCreateAlmacen() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: AlmacenRequestDTO) => createAlmacen(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['almacenes'] })
      toast.success('Almacén creado exitosamente')
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Error al crear el almacén'
      toast.error(message)
    },
  })
}

export function useUpdateAlmacen() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: AlmacenRequestDTO }) => updateAlmacen(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['almacenes'] })
      toast.success('Almacén actualizado exitosamente')
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Error al actualizar el almacén'
      toast.error(message)
    },
  })
}

export function useDeleteAlmacen() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => deleteAlmacen(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['almacenes'] })
      toast.success('Almacén desactivado exitosamente')
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Error al desactivar el almacén'
      toast.error(message)
    },
  })
}

export function useActivateAlmacen() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => activateAlmacen(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['almacenes'] })
      toast.success('Almacén activado exitosamente')
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Error al activar el almacén'
      toast.error(message)
    },
  })
}

// ============================================
// HOOKS PARA MUESTRAS EN BIOBANCO
// ============================================

export function useGetMuestrasEnBiobanco(page = 0, size = 50) {
  return useQuery({
    queryKey: ['muestras-biobanco', page, size],
    queryFn: () => getMuestrasEnBiobanco(page, size),
  })
}

export function useGetAlicuotasByMuestra(idMuestra: number) {
  return useQuery({
    queryKey: ['alicuotas', idMuestra],
    queryFn: () => getAlicuotasByMuestra(idMuestra),
    enabled: !!idMuestra,
  })
}

export function useAsignarPosicionMuestra() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: AsignarPosicionRequestDTO }) =>
      asignarPosicionMuestra(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['muestras'] })
      queryClient.invalidateQueries({ queryKey: ['muestras-biobanco'] })
      queryClient.invalidateQueries({ queryKey: ['posiciones'] })
      queryClient.invalidateQueries({ queryKey: ['posiciones-libres'] })
      queryClient.invalidateQueries({ queryKey: ['traslados'] })
      toast.success('Posición asignada exitosamente')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al asignar posición')
    },
  })
}

export function useLiberarPosicionMuestra() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, motivo }: { id: number; motivo?: string }) =>
      liberarPosicionMuestra(id, motivo),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['muestras'] })
      queryClient.invalidateQueries({ queryKey: ['muestras-biobanco'] })
      queryClient.invalidateQueries({ queryKey: ['posiciones'] })
      queryClient.invalidateQueries({ queryKey: ['posiciones-libres'] })
      toast.success('Posición liberada exitosamente')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al liberar posición')
    },
  })
}

// ============================================
// HOOKS PARA PRÉSTAMOS / TRASLADOS DE MUESTRAS
// ============================================

/** Préstamos activos de mi institución */
export function useGetAllTraslados() {
  return useQuery({
    queryKey: ['traslados'],
    queryFn: () => getAllTraslados(),
  })
}

/** Historial paginado de préstamos de mi institución */
export function useGetHistorialTraslados(page = 0, size = 20) {
  return useQuery({
    queryKey: ['traslados-historial', page, size],
    queryFn: () => getHistorialTraslados(page, size),
  })
}

export function useGetTrasladosByMuestra(idMuestra: number) {
  return useQuery({
    queryKey: ['traslados-muestra', idMuestra],
    queryFn: () => getTrasladosByMuestra(idMuestra),
    enabled: !!idMuestra,
  })
}

export function useGetTrasladosByGrupo(grupoTraslado: string) {
  return useQuery({
    queryKey: ['traslados-grupo', grupoTraslado],
    queryFn: () => getTrasladosByGrupo(grupoTraslado),
    enabled: !!grupoTraslado,
  })
}

/** Iniciar préstamo de una o varias muestras */
export function useIniciarPrestamo() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: TrasladoRequestDTO) => iniciarPrestamo(data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['traslados'] })
      queryClient.invalidateQueries({ queryKey: ['traslados-muestra'] })
      queryClient.invalidateQueries({ queryKey: ['traslados-historial'] })
      queryClient.invalidateQueries({ queryKey: ['muestras'] })
      queryClient.invalidateQueries({ queryKey: ['muestras-biobanco'] })
      queryClient.invalidateQueries({ queryKey: ['posiciones'] })
      queryClient.invalidateQueries({ queryKey: ['posiciones-libres'] })
      const count = Array.isArray(data) ? data.length : 1
      toast.success(count > 1 ? `Préstamo iniciado: ${count} muestras enviadas` : 'Préstamo iniciado exitosamente')
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Error al iniciar el préstamo'
      toast.error(message)
    },
  })
}

/** ENVIADA → RECIBIDA */
export function useConfirmarRecepcion() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ idTraslado, data }: { idTraslado: number; data: ConfirmarRecepcionRequestDTO }) =>
      confirmarRecepcion(idTraslado, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['traslados'] })
      queryClient.invalidateQueries({ queryKey: ['traslados-muestra'] })
      queryClient.invalidateQueries({ queryKey: ['traslados-historial'] })
      queryClient.invalidateQueries({ queryKey: ['muestras'] })
      queryClient.invalidateQueries({ queryKey: ['muestras-biobanco'] })
      toast.success('Recepción confirmada exitosamente')
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Error al confirmar la recepción'
      toast.error(message)
    },
  })
}

/** RECIBIDA → EN_DEVOLUCION */
export function useIniciarDevolucion() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ idTraslado, data }: { idTraslado: number; data: IniciarDevolucionRequestDTO }) =>
      iniciarDevolucion(idTraslado, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['traslados'] })
      queryClient.invalidateQueries({ queryKey: ['traslados-muestra'] })
      queryClient.invalidateQueries({ queryKey: ['traslados-historial'] })
      queryClient.invalidateQueries({ queryKey: ['muestras'] })
      queryClient.invalidateQueries({ queryKey: ['muestras-biobanco'] })
      toast.success('Devolución iniciada exitosamente')
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Error al iniciar la devolución'
      toast.error(message)
    },
  })
}

/** EN_DEVOLUCION → DEVUELTA */
export function useConfirmarDevolucion() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ idTraslado, data }: { idTraslado: number; data: DevolucionRequestDTO }) =>
      confirmarDevolucion(idTraslado, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['traslados'] })
      queryClient.invalidateQueries({ queryKey: ['traslados-muestra'] })
      queryClient.invalidateQueries({ queryKey: ['traslados-historial'] })
      queryClient.invalidateQueries({ queryKey: ['muestras'] })
      queryClient.invalidateQueries({ queryKey: ['muestras-biobanco'] })
      toast.success('Devolución confirmada exitosamente')
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Error al confirmar la devolución'
      toast.error(message)
    },
  })
}

/** ENVIADA → CANCELADO */
export function useCancelarPrestamo() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ idTraslado, data }: { idTraslado: number; data: CancelarPrestamoRequestDTO }) =>
      cancelarPrestamo(idTraslado, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['traslados'] })
      queryClient.invalidateQueries({ queryKey: ['traslados-muestra'] })
      queryClient.invalidateQueries({ queryKey: ['traslados-historial'] })
      queryClient.invalidateQueries({ queryKey: ['muestras'] })
      queryClient.invalidateQueries({ queryKey: ['muestras-biobanco'] })
      toast.success('Préstamo cancelado. La muestra fue restaurada a su ubicación anterior.')
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Error al cancelar el préstamo'
      toast.error(message)
    },
  })
}

export function useGetUsuariosByRol(roleName: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['usuarios-rol', roleName],
    queryFn: () => getUsuariosByRol(roleName),
    enabled: options?.enabled ?? true,
  })
}

// ============================================
// HOOKS PARA PRÉSTAMOS — RECEPCIÓN/DEVOLUCIÓN EXTENDIDOS
// ============================================

export function useGetAlicuotasEnDestino(idTraslado: number, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['alicuotas-en-destino', idTraslado],
    queryFn: () => getAlicuotasEnDestino(idTraslado),
    enabled: (options?.enabled ?? true) && !!idTraslado,
  })
}

export function useGenerarAlicuotasEnReceptora() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ idMuestra, data }: { idMuestra: number; data: GenerarAlicuotasRequest }) =>
      generarAlicuotasEnReceptora(idMuestra, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['muestras'] })
      queryClient.invalidateQueries({ queryKey: ['muestras-biobanco'] })
      toast.success('Alícuotas generadas exitosamente.')
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Error al generar alícuotas'
      toast.error(message)
    },
  })
}

export function useGetTipoInstitucion(idMuestra: number, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['tipo-institucion', idMuestra],
    queryFn: () => getTipoInstitucion(idMuestra),
    enabled: (options?.enabled ?? true) && !!idMuestra,
  })
}


// ============================================
// HOOKS PARA TIPOS DE MUESTRA (Stream C)
// ============================================

export function useGetTiposMuestra() {
  return useQuery({
    queryKey: ['tipos-muestra'],
    queryFn: () => getTiposMuestra(),
  })
}

export function useGetTiposMuestraActivos(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['tipos-muestra-activos'],
    queryFn: () => getTiposMuestraActivos(),
    enabled: options?.enabled ?? true,
  })
}

export function useCreateTipoMuestra() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: TipoMuestraRequestDTO) => createTipoMuestra(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tipos-muestra'] })
      queryClient.invalidateQueries({ queryKey: ['tipos-muestra-activos'] })
      toast.success('Tipo de muestra creado')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al crear el tipo de muestra')
    },
  })
}

export function useUpdateTipoMuestra() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: TipoMuestraRequestDTO }) =>
      updateTipoMuestra(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tipos-muestra'] })
      queryClient.invalidateQueries({ queryKey: ['tipos-muestra-activos'] })
      toast.success('Tipo de muestra actualizado')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al actualizar el tipo de muestra')
    },
  })
}

export function useToggleTipoMuestra() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => toggleTipoMuestra(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tipos-muestra'] })
      queryClient.invalidateQueries({ queryKey: ['tipos-muestra-activos'] })
      toast.success(data.activo ? 'Tipo de muestra activado' : 'Tipo de muestra desactivado')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al cambiar el estado')
    },
  })
}

export function useAddTuboMuestra() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ idTipo, data }: { idTipo: number; data: TuboMuestraRequestDTO }) =>
      addTuboMuestra(idTipo, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tipos-muestra'] })
      queryClient.invalidateQueries({ queryKey: ['tipos-muestra-activos'] })
      toast.success('Tubo agregado')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al agregar el tubo')
    },
  })
}

export function useUpdateTuboMuestra() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: TuboMuestraRequestDTO }) =>
      updateTuboMuestra(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tipos-muestra'] })
      queryClient.invalidateQueries({ queryKey: ['tipos-muestra-activos'] })
      toast.success('Tubo actualizado')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al actualizar el tubo')
    },
  })
}

export function useDeleteTuboMuestra() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => deleteTuboMuestra(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tipos-muestra'] })
      queryClient.invalidateQueries({ queryKey: ['tipos-muestra-activos'] })
      toast.success('Tubo eliminado')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al eliminar el tubo')
    },
  })
}

// ============================================
// HOOKS PARA IMPRESIÓN ZPL (Zebra)
// ============================================

export function useGetZplEtiqueta() {
  return useMutation({
    mutationFn: (idMuestra: number) => getZplEtiqueta(idMuestra),
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al generar etiqueta ZPL')
    },
  })
}

export function useGetZplAlicuotas() {
  return useMutation({
    mutationFn: (idMuestraPadre: number) => getZplAlicuotas(idMuestraPadre),
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al generar etiquetas ZPL')
    },
  })
}

export function useListarImpresoras(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['impresoras'],
    queryFn: listarImpresoras,
    staleTime: 30000,
    enabled: options?.enabled ?? true,
  })
}

export function useImprimirEtiqueta() {
  return useMutation({
    mutationFn: ({ idMuestra, impresora, configuracionId }: { idMuestra: number; impresora: string; configuracionId?: number }) =>
      imprimirEtiqueta(idMuestra, impresora, configuracionId),
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al imprimir etiqueta')
    },
  })
}

export function useImprimirAlicuotas() {
  return useMutation({
    mutationFn: ({ idMuestraPadre, impresora, configuracionId }: { idMuestraPadre: number; impresora: string; configuracionId?: number }) =>
      imprimirAlicuotas(idMuestraPadre, impresora, configuracionId),
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al imprimir etiquetas')
    },
  })
}

export function useImprimirLoteCompleto() {
  return useMutation({
    mutationFn: ({ idMuestraPadre, impresora, configuracionId }: { idMuestraPadre: number; impresora: string; configuracionId?: number }) =>
      imprimirLoteCompleto(idMuestraPadre, impresora, configuracionId),
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al imprimir lote')
    },
  })
}


// ============================================
// HOOK PARA UBICACIÓN 3D
// ============================================

/**
 * Escena completa de ubicación de una muestra. Se pide solo cuando el modal
 * está abierto: la respuesta recorre todo el refrigerador y no vale la pena
 * traerla mientras la tarjeta solo muestra el texto de la posición.
 */
export function useGetUbicacion3D(idMuestra: number | null) {
  return useQuery({
    queryKey: ['ubicacion-3d', idMuestra],
    queryFn: () => getUbicacion3D(idMuestra as number),
    enabled: idMuestra != null,
  })
}

/**
 * Escenas del explorador libre. Se piden nivel por nivel y no de una vez: al
 * recorrer un refrigerador entero, traer todas sus cajas y todas sus posiciones
 * por adelantado sería descargar el biobanco completo para ver una plancha.
 *
 * `enabled` deja pedir solo el nivel que se está viendo sin perder la clave de
 * caché: al volver atrás, la escena ya descargada se reusa sin nueva petición.
 */
export function useGetVista3DRefrigerador(idRefrigerador: number | null, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['vista-3d', 'refrigerador', idRefrigerador],
    queryFn: () => getVista3DRefrigerador(idRefrigerador as number),
    enabled: idRefrigerador != null && (options?.enabled ?? true),
  })
}

export function useGetVista3DPiso(idPiso: number | null, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['vista-3d', 'piso', idPiso],
    queryFn: () => getVista3DPiso(idPiso as number),
    enabled: idPiso != null && (options?.enabled ?? true),
  })
}

export function useGetVista3DCaja(idCaja: number | null, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['vista-3d', 'caja', idCaja],
    queryFn: () => getVista3DCaja(idCaja as number),
    enabled: idCaja != null && (options?.enabled ?? true),
  })
}
