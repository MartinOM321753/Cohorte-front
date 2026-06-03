import { useQuery } from '@tanstack/react-query'
import api from '@/lib/axiosInstance'
import type { ApiResponse } from '@/types/api'

// ── Types ────────────────────────────────────────────────────────────────────

export interface DashboardStats {
  pacientesActivos: number
  citasProgramadas: number
  muestrasBiobanco: number
  estudiosConResultados: number
  examenesLab: number
  documentosGenerales: number
  documentosMuestra: number
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

// ── Hooks ─────────────────────────────────────────────────────────────────────

/**
 * Estadísticas numéricas para el dashboard:
 * pacientes activos, citas del mes y muestras en biobanco.
 */
export function useDashboardStats() {
  return useQuery<DashboardStats>({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<DashboardStats>>('/dashboard/stats')
      return res.data.data
    },
    staleTime: 60_000,   // consideramos los números "frescos" por 1 min
  })
}

// ── Global chart types ────────────────────────────────────────────────────────

export interface SomatometriaGlobalPoint {
  fecha: string
  pesoKg:                  number | null
  imc:                     number | null
  presionSistolica:        number | null
  presionDiastolica:       number | null
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

// ── Global chart hooks ────────────────────────────────────────────────────────

export function useSomatometriaGlobal() {
  return useQuery<SomatometriaGlobalPoint[]>({
    queryKey: ['dashboard-somatometria-global'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<SomatometriaGlobalPoint[]>>('/dashboard/somatometria-global')
      return res.data.data ?? []
    },
    staleTime: 5 * 60_000,
  })
}

export function useExamenesGlobal() {
  return useQuery<ExamenResultGlobalPoint[]>({
    queryKey: ['dashboard-examenes-global'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<ExamenResultGlobalPoint[]>>('/dashboard/examenes-global')
      return res.data.data ?? []
    },
    staleTime: 5 * 60_000,
  })
}

/**
 * Citas no canceladas de hoy, ordenadas por hora de inicio.
 */
export function useAgendaHoy() {
  return useQuery<AgendaHoyItem[]>({
    queryKey: ['dashboard-agenda-hoy'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<AgendaHoyItem[]>>('/dashboard/agenda-hoy')
      return res.data.data ?? []
    },
    staleTime: 60_000,
  })
}
