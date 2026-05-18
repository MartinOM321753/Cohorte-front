import { Cita } from '@/types/api'

export function getCitaStartDate(cita: Cita): Date | null {
  const raw = cita.startAtUtc || cita.fechaCita || cita.startAtLocal
  if (!raw) return null
  const d = new Date(raw)
  return Number.isNaN(d.getTime()) ? null : d
}

export function getCitaDurationMinutes(cita: Cita): number {
  const v = cita.durationMinutes ?? cita.duracionMinutos ?? 60
  return typeof v === 'number' && Number.isFinite(v) ? v : 60
}

