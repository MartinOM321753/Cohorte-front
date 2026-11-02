import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/axiosInstance'
import type { ApiResponse } from '@/types/api'
import type {
  AgregadoRequest,
  Correlacion,
  CorrelacionRequest,
  DispersionTemporal,
  DispersionTemporalRequest,
  InstitucionAlcance,
  Metrica,
  SerieAgregada,
  VistaAnalisis,
} from '../types/analisis.types'

interface HookOpts { enabled?: boolean }

/** Instituciones del alcance del usuario, para el filtro de institución. */
export function useInstitucionesAlcance(opts?: HookOpts) {
  return useQuery<InstitucionAlcance[]>({
    queryKey: ['analisis-instituciones'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<InstitucionAlcance[]>>('/analisis/instituciones')
      return res.data.data ?? []
    },
    staleTime: 5 * 60_000,
    enabled: opts?.enabled ?? true,
  })
}

/** Catálogo de métricas analizables dentro del alcance del usuario. */
export function useMetricas(opts?: HookOpts) {
  return useQuery<Metrica[]>({
    queryKey: ['analisis-metricas'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<Metrica[]>>('/analisis/metricas')
      return res.data.data ?? []
    },
    staleTime: 5 * 60_000,
    enabled: opts?.enabled ?? true,
  })
}

function dispararDescarga(data: Blob, disposition: string | undefined, fallback: string) {
  const match = disposition?.match(/filename="?([^"]+)"?/)
  const nombre = match?.[1] ?? fallback
  const url = URL.createObjectURL(data)
  const a = document.createElement('a')
  a.href = url
  a.download = nombre
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

/**
 * Descarga el CSV de agregados para la petición dada y dispara la descarga en el
 * navegador. Usa el permiso ANALISIS_EXPORTAR en el backend.
 */
export async function descargarAgregadoCsv(request: AgregadoRequest, separador: ',' | ';' = ',') {
  const res = await api.post<Blob>('/analisis/exportar', request, {
    params: { separador },
    responseType: 'blob',
  })
  dispararDescarga(res.data, res.headers['content-disposition'] as string | undefined, 'analisis.csv')
}

/**
 * Descarga datos crudos a nivel participante (CSV o XLSX). Usa el permiso
 * ANALISIS_EXPORTA_CRUDO en el backend.
 */
export async function descargarCrudo(request: AgregadoRequest, formato: 'csv' | 'xlsx') {
  const res = await api.post<Blob>('/analisis/exportar-crudo', request, {
    params: { formato, separador: ',' },
    responseType: 'blob',
  })
  dispararDescarga(res.data, res.headers['content-disposition'] as string | undefined, `analisis_crudo.${formato}`)
}

/** Vistas guardadas del usuario. */
export function useVistas(opts?: HookOpts) {
  return useQuery<VistaAnalisis[]>({
    queryKey: ['analisis-vistas'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<VistaAnalisis[]>>('/analisis/vistas')
      return res.data.data ?? []
    },
    enabled: opts?.enabled ?? true,
  })
}

/** Guarda una vista con la configuración actual. */
export function useGuardarVista() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (vars: { nombre: string; configuracion: string }) => {
      const res = await api.post<ApiResponse<VistaAnalisis>>('/analisis/vistas', vars)
      return res.data.data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['analisis-vistas'] }),
  })
}

/** Elimina una vista guardada. */
export function useEliminarVista() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (uuid: string) => {
      await api.delete(`/analisis/vistas/${uuid}`)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['analisis-vistas'] }),
  })
}

/**
 * Agregación de una o varias métricas. La clave de caché incluye la petición
 * completa, así que cambiar filtros o dimensiones re-consulta automáticamente.
 */
export function useAgregado(request: AgregadoRequest, opts?: HookOpts) {
  return useQuery<SerieAgregada[]>({
    queryKey: ['analisis-agregado', request],
    queryFn: async () => {
      const res = await api.post<ApiResponse<SerieAgregada[]>>('/analisis/agregado', request)
      return res.data.data ?? []
    },
    staleTime: 60_000,
    enabled: (opts?.enabled ?? true) && request.metricas.length > 0,
  })
}

/**
 * Correlación entre dos métricas numéricas (panel "nube de posibilidades").
 * La clave de caché incluye la petición completa; cambiar métricas, grupo o
 * filtros re-consulta automáticamente.
 */
export function useCorrelacion(request: CorrelacionRequest, opts?: HookOpts) {
  return useQuery<Correlacion | null>({
    queryKey: ['analisis-correlacion', request],
    queryFn: async () => {
      const res = await api.post<ApiResponse<Correlacion>>('/analisis/correlacion', request)
      return res.data.data ?? null
    },
    staleTime: 60_000,
    enabled: (opts?.enabled ?? true) && !!request.metricaX && !!request.metricaY,
  })
}

/** Dispersión temporal: nube de puntos por corte + línea de tendencia (media por corte). */
export function useDispersionTemporal(request: DispersionTemporalRequest, opts?: HookOpts) {
  return useQuery<DispersionTemporal | null>({
    queryKey: ['analisis-dispersion-temporal', request],
    queryFn: async () => {
      const res = await api.post<ApiResponse<DispersionTemporal>>('/analisis/dispersion-temporal', request)
      return res.data.data ?? null
    },
    staleTime: 60_000,
    enabled: (opts?.enabled ?? true) && !!request.metrica,
  })
}
