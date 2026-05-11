import { useQuery } from '@tanstack/react-query'
import { getPacientesActivos } from '@/features/pacientes/api/pacientes.api'
import { getCitas } from '@/features/citas/api/citas.api'
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
        // Obtener pacientes activos
        const pacientesActivos = await getPacientesActivos()

        // Obtener citas programadas para el mes actual
        const now = new Date()
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0)
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)

        // Por ahora, obtenemos todas las citas y filtramos en el frontend
        // TODO: Implementar endpoint en backend para filtrar por fecha y estado
        const allCitas = await getCitas()
        
        const citasProgramadas = allCitas.filter((cita: any) => {
          // Normalizar estado a mayúsculas por si acaso
          const estado = String(cita.estadoCita).toUpperCase().trim()
          
          // Parsear la fecha - puede ser ISO string o timestamp
          let fechaCita: Date
          try {
            fechaCita = new Date(cita.fechaCita)
          } catch (e) {
            console.error('Error parsing date:', cita.fechaCita)
            return false
          }

          // Validar que la fecha sea válida
          if (isNaN(fechaCita.getTime())) {
            console.error('Invalid date:', cita.fechaCita)
            return false
          }

          // Comparar fechas y estado
          const isInRange = fechaCita >= startOfMonth && fechaCita <= endOfMonth
          const isProgramada = estado === 'PROGRAMADA'
          
          return isProgramada && isInRange
        })

        return {
          pacientesActivos: Array.isArray(pacientesActivos) ? pacientesActivos.length : 0,
          citasProgramadas: Array.isArray(citasProgramadas) ? citasProgramadas.length : 0,
          estudiosPendientes: 0, // TODO: Implementar cuando esté disponible
          muestrasBiobanco: 0, // TODO: Implementar cuando esté disponible
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
      const citasProgramadas = allCitas.filter((cita: any) =>
        cita.estadoCita === 'PROGRAMADA'
      )

      // Ordenar por fecha y tomar las próximas
      const citasOrdenadas = citasProgramadas
        .sort((a: any, b: any) => new Date(a.fechaCita).getTime() - new Date(b.fechaCita).getTime())
        .slice(0, limit)

      return citasOrdenadas
    },
  })
}