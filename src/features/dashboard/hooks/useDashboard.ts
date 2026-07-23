import { useQuery } from '@tanstack/react-query'
import api from '@/lib/axiosInstance'
import type { ApiResponse } from '@/types/api'

// ── Types ────────────────────────────────────────────────────────────────────

export interface DashboardStats {
  pacientesActivos:         number
  citasMes:                 number
  citasSinActualizar:       number
  estudiosConResultadosMes: number
  examenesLabMes:           number
  muestrasBiobanco:         number
  documentosGenerales:      number
  deltasPacientes:          number
}

export interface AgendaHoyItem {
  uuid:             string
  horaInicio:       string   // "HH:mm" en hora local
  horaFin:          string   // "HH:mm" en hora local
  duracionMinutos:  number
  estadoCita:       string   // "Programada" | "Confirmada" | "Realizada" | "No_Asistio"
  colorHex:         string | null
  observaciones:    string | null
  paciente: {
    folio:          string
    nombreCompleto: string
  }
}

export interface ExamenesCalidadDTO {
  enRango:       number
  fueraDeRango:  number
  sinReferencia: number
}

export interface PisoResumenDTO {
  pisoId:    number
  numeroPiso: string
  total:     number
  ocupadas:  number
  pct:       number
}

export interface RefrigeradorOcupacionDTO {
  refrigeradorId:  number
  nombre:          string
  totalPosiciones: number
  ocupadas:        number
  pct:             number
  pisos:           PisoResumenDTO[]
}

export interface CajaOcupacionDTO {
  cajaId:          number
  codigo:          string
  tipoCaja:        string | null
  totalPosiciones: number
  ocupadas:        number
  pct:             number
}

// ── Global chart types ────────────────────────────────────────────────────────

export interface SomatometriaGlobalPoint {
  fecha: string
  pesoKg:                    number | null
  imc:                       number | null
  presionSistolica:          number | null
  presionDiastolica:         number | null
  circunferenciaAbdominalCm: number | null
}

export interface ExamenResultGlobalPoint {
  fecha:           string
  nombreExamen:    string
  unidad:          string | null
  valorObtenido:   number
  valorMinHombres: number | null
  valorMaxHombres: number | null
  valorMinMujeres: number | null
  valorMaxMujeres: number | null
}

// ── Hooks ─────────────────────────────────────────────────────────────────────

interface HookOpts { enabled?: boolean }

/** Estadísticas numéricas del mes en curso para el dashboard. */
export function useDashboardStats(opts?: HookOpts) {
  return useQuery<DashboardStats>({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<DashboardStats>>('/dashboard/stats')
      return res.data.data
    },
    staleTime: 60_000,
    enabled: opts?.enabled ?? true,
  })
}

/** Citas no canceladas de hoy, ordenadas por hora de inicio. */
export function useAgendaHoy(opts?: HookOpts) {
  return useQuery<AgendaHoyItem[]>({
    queryKey: ['dashboard-agenda-hoy'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<AgendaHoyItem[]>>('/dashboard/agenda-hoy')
      return res.data.data ?? []
    },
    staleTime: 60_000,
    enabled: opts?.enabled ?? true,
  })
}

/** Datos de somatometría global para gráficas de tendencia. */
export function useSomatometriaGlobal(opts?: HookOpts) {
  return useQuery<SomatometriaGlobalPoint[]>({
    queryKey: ['dashboard-somatometria-global'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<SomatometriaGlobalPoint[]>>('/dashboard/somatometria-global')
      return res.data.data ?? []
    },
    staleTime: 5 * 60_000,
    enabled: opts?.enabled ?? true,
  })
}

/** Datos de resultados de exámenes globales para gráficas. */
export function useExamenesGlobal(opts?: HookOpts) {
  return useQuery<ExamenResultGlobalPoint[]>({
    queryKey: ['dashboard-examenes-global'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<ExamenResultGlobalPoint[]>>('/dashboard/examenes-global')
      return res.data.data ?? []
    },
    staleTime: 5 * 60_000,
    enabled: opts?.enabled ?? true,
  })
}

/** Calidad de resultados: en rango / fuera de rango / sin referencia. */
export function useExamenesCalidad(opts?: HookOpts) {
  return useQuery<ExamenesCalidadDTO>({
    queryKey: ['dashboard-examenes-calidad'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<ExamenesCalidadDTO>>('/dashboard/examenes-calidad')
      return res.data.data
    },
    staleTime: 5 * 60_000,
    enabled: opts?.enabled ?? true,
  })
}

/** Ocupación de refrigeradores del biobanco, ordenados por % DESC. */
export function useBiobancoOcupacion(opts?: HookOpts) {
  return useQuery<RefrigeradorOcupacionDTO[]>({
    queryKey: ['dashboard-biobanco-ocupacion'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<RefrigeradorOcupacionDTO[]>>('/dashboard/biobanco-ocupacion')
      return res.data.data ?? []
    },
    staleTime: 2 * 60_000,
    enabled: opts?.enabled ?? true,
  })
}

/** Ocupación de cajas criogénicas del biobanco, ordenadas por % DESC. */
export function useBiobancoOcupacionCajas(opts?: HookOpts) {
  return useQuery<CajaOcupacionDTO[]>({
    queryKey: ['dashboard-biobanco-cajas'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<CajaOcupacionDTO[]>>('/dashboard/biobanco-cajas')
      return res.data.data ?? []
    },
    staleTime: 2 * 60_000,
    enabled: opts?.enabled ?? true,
  })
}
