import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import * as api from '../api/cuestionarios.api'
import type {
  BloqueRequest, DependenciaDeBloqueRequest, OrigenCuestionario, TipoCuestionarioRequest,
  VariableRequest,
} from '../api/cuestionarios.types'
import { mensajeErrorApi } from '@/lib/apiErrors'

/**
 * Las llaves de caché, en un sitio.
 *
 * Cada mutación tiene que invalidar lo que de verdad cambió, y con llaves escritas a
 * mano en cada hook es cuestión de tiempo que una se escriba distinto y la pantalla se
 * quede mostrando datos viejos sin que nada falle.
 */
export const llaves = {
  tipos: ['cuestionarios', 'tipos'] as const,
  tipo: (id: number) => ['cuestionarios', 'tipos', id] as const,
  bloques: (idTipo: number) => ['cuestionarios', 'tipos', idTipo, 'bloques'] as const,
  preguntas: (idTipo: number, buscar: string, pagina: number) =>
    ['cuestionarios', 'tipos', idTipo, 'preguntas', buscar, pagina] as const,
  preguntasDeBloque: (idBloque: number) =>
    ['cuestionarios', 'bloques', idBloque, 'preguntas'] as const,
  sinDocumentar: (idTipo: number) =>
    ['cuestionarios', 'tipos', idTipo, 'sin-documentar'] as const,
  lista: (idTipo: number | null, pagina: number) =>
    ['cuestionarios', 'lista', idTipo, pagina] as const,
  pendientes: (pagina: number) => ['cuestionarios', 'pendientes', pagina] as const,
  deParticipante: (uuid: string) => ['cuestionarios', 'participante', uuid] as const,
  uno: (id: number) => ['cuestionarios', id] as const,
  tiposPara: (uuid: string) => ['cuestionarios', 'tipos-para', uuid] as const,
  bloqueLleno: (id: number, idBloque: number) =>
    ['cuestionarios', id, 'bloques', idBloque] as const,
  faltantes: (id: number) => ['cuestionarios', id, 'faltantes'] as const,
  lecturasPendientes: (id: number) => ['cuestionarios', id, 'lecturas-pendientes'] as const,
  discrepancias: (id: number) => ['cuestionarios', id, 'discrepancias'] as const,
  cargasDeVolcado: ['cuestionarios', 'cargas-volcado'] as const,
}

function alFallar(error: unknown) {
  toast.error(mensajeErrorApi(error, 'No se pudo completar la operacion'))
}

// ── Instrumentos ────────────────────────────────────────────────────────────

export function useTiposCuestionario() {
  return useQuery({ queryKey: llaves.tipos, queryFn: api.getTiposCuestionario })
}

export function useTodosLosTipos() {
  return useQuery({
    queryKey: [...llaves.tipos, 'todos'],
    queryFn: api.getTodosLosTipos,
  })
}

export function useCrearTipo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (datos: TipoCuestionarioRequest) => api.crearTipoCuestionario(datos),
    onSuccess: (tipo) => {
      qc.invalidateQueries({ queryKey: llaves.tipos })
      toast.success(`Cuestionario ${tipo.clave} creado`)
    },
    onError: alFallar,
  })
}

export function useActualizarTipo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, datos }: { id: number; datos: TipoCuestionarioRequest }) =>
      api.actualizarTipoCuestionario(id, datos),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: llaves.tipos })
      toast.success('Cuestionario actualizado')
    },
    onError: alFallar,
  })
}

export function useDesactivarTipo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.desactivarTipoCuestionario(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: llaves.tipos })
      toast.success('Cuestionario retirado de uso')
    },
    onError: alFallar,
  })
}

export function useEliminarTipo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.eliminarTipoCuestionario(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: llaves.tipos })
      toast.success('Cuestionario eliminado')
    },
    onError: alFallar,
  })
}

// ── Bloques ─────────────────────────────────────────────────────────────────

export function useBloques(idTipo: number | null) {
  return useQuery({
    queryKey: llaves.bloques(idTipo ?? 0),
    queryFn: () => api.getBloques(idTipo as number),
    enabled: typeof idTipo === 'number' && idTipo > 0,
  })
}

export function useCrearBloque(idTipo: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (datos: BloqueRequest) => api.crearBloque(idTipo, datos),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: llaves.bloques(idTipo) })
      qc.invalidateQueries({ queryKey: llaves.tipos })
      toast.success('Bloque creado')
    },
    onError: alFallar,
  })
}

export function useActualizarBloque(idTipo: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ idBloque, datos }: { idBloque: number; datos: BloqueRequest }) =>
      api.actualizarBloque(idBloque, datos),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: llaves.bloques(idTipo) })
      toast.success('Bloque actualizado')
    },
    onError: alFallar,
  })
}

/**
 * Pone la misma pregunta llave a todo un bloque.
 *
 * Invalida las preguntas del bloque y no solo el listado: lo que cambia es cada
 * pregunta, y es justo lo que la pantalla esta mostrando.
 */
export function useDependenciaDeBloque(idTipo: number, idBloque: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (datos: DependenciaDeBloqueRequest) => api.dependenciaDeBloque(idBloque, datos),
    onSuccess: (tocadas) => {
      qc.invalidateQueries({ queryKey: llaves.preguntasDeBloque(idBloque) })
      qc.invalidateQueries({ queryKey: llaves.bloques(idTipo) })
      toast.success(tocadas === 1
        ? 'Una pregunta actualizada'
        : `${tocadas} preguntas actualizadas`)
    },
    onError: alFallar,
  })
}

export function useReordenarBloques(idTipo: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (ids: number[]) => api.reordenarBloques(idTipo, ids),
    onSuccess: () => qc.invalidateQueries({ queryKey: llaves.bloques(idTipo) }),
    onError: alFallar,
  })
}

export function useEliminarBloque(idTipo: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (idBloque: number) => api.eliminarBloque(idBloque),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: llaves.bloques(idTipo) })
      qc.invalidateQueries({ queryKey: llaves.tipos })
      toast.success('Bloque eliminado')
    },
    onError: alFallar,
  })
}

// ── Preguntas ───────────────────────────────────────────────────────────────

export function useBuscarPreguntas(
  idTipo: number | null, buscar: string, pagina: number, tamano = 50,
) {
  return useQuery({
    queryKey: llaves.preguntas(idTipo ?? 0, buscar, pagina),
    queryFn: () => api.buscarPreguntas(idTipo as number, buscar, pagina, tamano),
    enabled: typeof idTipo === 'number' && idTipo > 0,
    // El catálogo cambia poco y la búsqueda se teclea: sin esto, cada letra que el
    // usuario borra vuelve a pedir una página que acaba de recibir.
    placeholderData: (anterior) => anterior,
  })
}

export function usePreguntasDeBloque(idBloque: number | null) {
  return useQuery({
    queryKey: llaves.preguntasDeBloque(idBloque ?? 0),
    queryFn: () => api.getPreguntasDeBloque(idBloque as number),
    enabled: typeof idBloque === 'number' && idBloque > 0,
  })
}

export function usePreguntasSinDocumentar(idTipo: number | null) {
  return useQuery({
    queryKey: llaves.sinDocumentar(idTipo ?? 0),
    queryFn: () => api.getPreguntasSinDocumentar(idTipo as number),
    enabled: typeof idTipo === 'number' && idTipo > 0,
  })
}

export function useCrearPregunta(idTipo: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (datos: VariableRequest) => api.crearPregunta(idTipo, datos),
    onSuccess: (variable) => {
      qc.invalidateQueries({ queryKey: ['cuestionarios', 'tipos', idTipo] })
      toast.success(`Pregunta ${variable.codigo} creada`)
    },
    onError: alFallar,
  })
}

export function useActualizarPregunta(idTipo: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, datos }: { id: number; datos: VariableRequest }) =>
      api.actualizarPregunta(id, datos),
    onSuccess: (variable) => {
      qc.invalidateQueries({ queryKey: ['cuestionarios', 'tipos', idTipo] })
      if (variable.idSeccion) {
        qc.invalidateQueries({ queryKey: llaves.preguntasDeBloque(variable.idSeccion) })
      }
      toast.success(`Pregunta ${variable.codigo} actualizada`)
    },
    onError: alFallar,
  })
}

export function useEliminarPregunta(idTipo: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.eliminarPregunta(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cuestionarios', 'tipos', idTipo] })
      toast.success('Pregunta retirada')
    },
    onError: alFallar,
  })
}

// ── Cuestionarios contestados ───────────────────────────────────────────────

export function useCuestionarios(idTipo: number | null, pagina: number, tamano = 20) {
  return useQuery({
    queryKey: llaves.lista(idTipo, pagina),
    queryFn: () => api.getCuestionarios(idTipo, pagina, tamano),
    placeholderData: (anterior) => anterior,
  })
}

export function useCuestionariosPendientes(pagina: number, tamano = 20) {
  return useQuery({
    queryKey: llaves.pendientes(pagina),
    queryFn: () => api.getCuestionariosPendientes(pagina, tamano),
    placeholderData: (anterior) => anterior,
  })
}

export function useCuestionariosDeParticipante(uuid: string | null) {
  return useQuery({
    queryKey: llaves.deParticipante(uuid ?? ''),
    queryFn: () => api.getCuestionariosDeParticipante(uuid as string),
    enabled: typeof uuid === 'string' && uuid.length > 0,
  })
}

export function useTiposParaParticipante(uuid: string | null) {
  return useQuery({
    queryKey: llaves.tiposPara(uuid ?? ''),
    queryFn: () => api.getTiposParaParticipante(uuid as string),
    enabled: typeof uuid === 'string' && uuid.length > 0,
  })
}

export function useCuestionario(id: number | null) {
  return useQuery({
    queryKey: llaves.uno(id ?? 0),
    queryFn: () => api.getCuestionario(id as number),
    enabled: typeof id === 'number' && id > 0,
  })
}

export function useAbrirCuestionario() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ idTipo, uuid, origen }:
      { idTipo: number; uuid: string; origen?: OrigenCuestionario }) =>
      api.abrirCuestionario(idTipo, uuid, origen),
    onSuccess: (cuestionario) => {
      qc.invalidateQueries({ queryKey: ['cuestionarios', 'lista'] })
      qc.invalidateQueries({ queryKey: llaves.deParticipante(cuestionario.uuidParticipante) })
      toast.success(`Cuestionario ${cuestionario.etiqueta ?? ''} abierto`)
    },
    onError: alFallar,
  })
}

// ── Llenado ─────────────────────────────────────────────────────────────────

export function useBloqueLleno(id: number | null, idBloque: number | null) {
  return useQuery({
    queryKey: llaves.bloqueLleno(id ?? 0, idBloque ?? 0),
    queryFn: () => api.getBloqueLleno(id as number, idBloque as number),
    enabled: typeof id === 'number' && id > 0 && typeof idBloque === 'number' && idBloque > 0,
  })
}

export function useGuardarBloque(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ idBloque, respuestas }: {
      idBloque: number
      respuestas: Array<{ idVariable: number; ordenRespuesta?: number; valor: string | null }>
    }) => api.guardarBloque(id, idBloque, respuestas),
    onSuccess: (bloque) => {
      qc.setQueryData(llaves.bloqueLleno(id, bloque.seccion.id), bloque)
      // Lo contestado en este bloque puede habilitar preguntas de otros —la llave de
      // un filtro abre páginas enteras— y cambia el conteo de faltantes.
      qc.invalidateQueries({ queryKey: llaves.faltantes(id) })
      qc.invalidateQueries({ queryKey: llaves.uno(id) })
      toast.success('Bloque guardado')
    },
    onError: alFallar,
  })
}

export function useFaltantes(id: number | null) {
  return useQuery({
    queryKey: llaves.faltantes(id ?? 0),
    queryFn: () => api.getFaltantes(id as number),
    enabled: typeof id === 'number' && id > 0,
  })
}

export function useCerrarCuestionario() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.cerrarCuestionario(id),
    onSuccess: (c) => {
      qc.invalidateQueries({ queryKey: llaves.uno(c.id) })
      qc.invalidateQueries({ queryKey: ['cuestionarios', 'lista'] })
      toast.success('Cuestionario cerrado')
    },
    onError: alFallar,
  })
}

export function useValidarCuestionario() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, nota }: { id: number; nota?: string }) => api.validarCuestionario(id, nota),
    onSuccess: (c) => {
      qc.invalidateQueries({ queryKey: llaves.uno(c.id) })
      qc.invalidateQueries({ queryKey: ['cuestionarios', 'lista'] })
      qc.invalidateQueries({ queryKey: ['cuestionarios', 'pendientes'] })
      toast.success('Cuestionario validado')
    },
    onError: alFallar,
  })
}

export function useReabrirCuestionario() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.reabrirCuestionario(id),
    onSuccess: (c) => {
      qc.invalidateQueries({ queryKey: llaves.uno(c.id) })
      qc.invalidateQueries({ queryKey: ['cuestionarios', 'lista'] })
      toast.success('Cuestionario reabierto')
    },
    onError: alFallar,
  })
}

export function useAnularCuestionario() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, motivo }: { id: number; motivo: string }) => api.anularCuestionario(id, motivo),
    onSuccess: (c) => {
      qc.invalidateQueries({ queryKey: llaves.uno(c.id) })
      qc.invalidateQueries({ queryKey: ['cuestionarios', 'lista'] })
      toast.success('Cuestionario anulado')
    },
    onError: alFallar,
  })
}

// ── Lecturas pendientes y en desacuerdo ─────────────────────────────────────

export function useLecturasPendientes(id: number | null) {
  return useQuery({
    queryKey: llaves.lecturasPendientes(id ?? 0),
    queryFn: () => api.getLecturasPendientes(id as number),
    enabled: typeof id === 'number' && id > 0,
  })
}

export function useDiscrepancias(id: number | null, soloSinResolver = true) {
  return useQuery({
    queryKey: [...llaves.discrepancias(id ?? 0), soloSinResolver],
    queryFn: () => api.getDiscrepancias(id as number, soloSinResolver),
    enabled: typeof id === 'number' && id > 0,
  })
}

export function useResolverDiscrepancia(idCuestionario: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, valorElegido, nota }:
      { id: number; valorElegido: string; nota?: string }) =>
      api.resolverDiscrepancia(id, valorElegido, nota),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: llaves.discrepancias(idCuestionario) })
      qc.invalidateQueries({ queryKey: llaves.uno(idCuestionario) })
      // Resolver escribe la respuesta, así que el bloque en pantalla queda viejo.
      qc.invalidateQueries({ queryKey: ['cuestionarios', idCuestionario, 'bloques'] })
      toast.success('Lectura adjudicada')
    },
    onError: alFallar,
  })
}

// ── Cargas de volcado en segundo plano ──────────────────────────────────────

/**
 * Las últimas cargas de volcado de la institución.
 *
 * Hace falta porque la carga ya no vive en la pantalla que la lanzó: corre en el
 * servidor y tarda minutos. Quien cierra la pestaña —o recarga— tiene que poder
 * volver y encontrar su carga, en lugar de quedarse sin saber si se guardó y subir el
 * archivo otra vez por si acaso.
 */
export function useCargasDeVolcado() {
  return useQuery({
    queryKey: llaves.cargasDeVolcado,
    queryFn: api.cargasDeVolcadoRecientes,
  })
}
