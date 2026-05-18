import { useQuery } from '@tanstack/react-query'
import { getPacientesActivos } from '@/features/pacientes/api/pacientes.api'
import { getCitas } from '@/features/citas/api/citas.api'
import { getCitaStartDate } from '@/features/citas/lib/citaUtils'
import { Cita } from '@/types/api'

export interface DashboardStats {
  pacientesActivos: number
  citasProgramadas: number
  estudiosPendientes: number
  muestrasBiobanco: number
}

/**
 * Hook para obtener estadísticas del dashboard
 */
export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async (): Promise<DashboardStats> => {
      try {
        const pacientesActivos = await getPacientesActivos()

        const now = new Date()
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0)
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)

        const allCitas = await getCitas()

        const citasProgramadas = allCitas.filter((cita: any) => {
          const estado = String(cita.estadoCita).toUpperCase().trim()
          const fechaCita = getCitaStartDate(cita)
          if (!fechaCita) return false
          return estado === 'PROGRAMADA' && fechaCita >= startOfMonth && fechaCita <= endOfMonth
        })

        return {
          pacientesActivos: Array.isArray(pacientesActivos) ? pacientesActivos.length : 0,
          citasProgramadas: Array.isArray(citasProgramadas) ? citasProgramadas.length : 0,
          estudiosPendientes: 0,
          muestrasBiobanco: 0,
        }
      } catch (error: any) {
        console.error('Error in useDashboardStats:', error)
        throw error
      }
    },
  })
}

/**
 * Hook para obtener las próximas citas programadas
 */
export function useProximasCitas(limit: number = 5) {
  return useQuery({
    queryKey: ['proximas-citas', limit],
    queryFn: async (): Promise<Cita[]> => {
      const allCitas = await getCitas()
      const citasProgramadas = allCitas.filter((cita: any) => cita.estadoCita === 'PROGRAMADA')

      const citasOrdenadas = citasProgramadas
        .sort((a: any, b: any) => (getCitaStartDate(a)?.getTime() ?? 0) - (getCitaStartDate(b)?.getTime() ?? 0))
        .slice(0, limit)

      return citasOrdenadas
    },
  })
}

