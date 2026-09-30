import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import type { Persona } from '@/types/api'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format a date string to a human-readable format
 */
export function formatDate(date: string | Date, formatStr: string = 'dd/MM/yyyy'): string {
  if (!date) return '-'
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date
    return format(dateObj, formatStr, { locale: es })
  } catch {
    return '-'
  }
}

/**
 * Format a date string to a human-readable datetime format
 */
export function formatDateTime(date: string | Date): string {
  return formatDate(date, 'dd/MM/yyyy HH:mm')
}

/**
 * Get full name from persona object
 */
export function getFullName(persona: Persona | null | undefined): string {
  if (!persona) return '-'
  const { nombre, apellidoPaterno, apellidoMaterno } = persona
  return [nombre, apellidoPaterno, apellidoMaterno].filter(Boolean).join(' ')
}

/**
 * Get initials from persona object
 */
export function getInitials(persona: Persona | null | undefined): string {
  if (!persona) return 'US'
  const { nombre, apellidoPaterno } = persona
  return `${nombre?.charAt(0) || ''}${apellidoPaterno?.charAt(0) || ''}`.toUpperCase()
}

/**
 * Calculate age from birth date
 */
export function calculateAge(birthDate: string | Date | null | undefined): number | null {
  if (!birthDate) return null
  try {
    const dateObj = typeof birthDate === 'string' ? parseISO(birthDate) : birthDate
    const today = new Date()
    let age = today.getFullYear() - dateObj.getFullYear()
    const monthDiff = today.getMonth() - dateObj.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dateObj.getDate())) {
      age--
    }
    return age
  } catch {
    return null
  }
}

/**
 * Format sex value to display text
 */
export function formatSex(sex: string | null | undefined): string {
  if (!sex) return '-'
  const map: Record<string, string> = {
    M: 'Masculino',
    F: 'Femenino',
    MASCULINO: 'Masculino',
    FEMENINO: 'Femenino',
  }
  return map[sex.toUpperCase()] || sex
}
