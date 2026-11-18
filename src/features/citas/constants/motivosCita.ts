import { useGetConfiguracionClave } from '@/features/configuracion/hooks/useConfiguracionClave'

export const MOTIVOS_CITA_DEFAULT = [
  'Consulta general',
  'Seguimiento',
  'Toma de muestras',
  'Estudios médicos',
  'Valoración inicial',
  'Entrega de resultados',
  'Otro',
] as const

export const CLAVE_MOTIVOS = 'MOTIVOS_CITA'

export function useMotivos(): string[] {
  const { data } = useGetConfiguracionClave(CLAVE_MOTIVOS)
  if (data) {
    try {
      const parsed = JSON.parse(data) as string[]
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
    } catch { /* fallback */ }
  }
  return [...MOTIVOS_CITA_DEFAULT]
}
