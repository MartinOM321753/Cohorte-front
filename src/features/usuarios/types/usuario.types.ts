export interface UsuarioPersona {
  id?: number
  nombre: string
  apellidoPaterno: string
  apellidoMaterno?: string | null
  fechaNacimiento: string
  sexo: 'M' | 'F'
  telefono?: string | null
  email?: string | null
}

export interface UsuarioRol {
  id: number
  nombre: string
}

export interface Usuario {
  id: number
  UUID: string
  username: string
  activo: boolean
  persona: UsuarioPersona
  rol: UsuarioRol
}

export interface UsuarioRequestDTO {
  username: string
  password: string
  idRol: number
  persona: {
    nombre: string
    apellidoPaterno: string
    apellidoMaterno?: string
    fechaNacimiento: string
    sexo: 'M' | 'F'
    telefono?: string
    email?: string
  }
}

export const ROLES_SISTEMA = [
  { id: 1, nombre: 'ADMINISTRADOR', label: 'Administrador' },
  { id: 2, nombre: 'MEDICO', label: 'Médico' },
  { id: 3, nombre: 'LABORATORISTA', label: 'Laboratorista' },
  { id: 4, nombre: 'RECEPCIONISTA', label: 'Recepcionista' },
  { id: 5, nombre: 'PACIENTE', label: 'Paciente' },
] as const

export type RolNombre = (typeof ROLES_SISTEMA)[number]['nombre']

export function getNombreCompleto(persona: UsuarioPersona): string {
  return [persona.nombre, persona.apellidoPaterno, persona.apellidoMaterno]
    .filter(Boolean)
    .join(' ')
}

export function getRolBadgeClass(rolNombre: string): string {
  switch (rolNombre) {
    case 'ADMINISTRADOR':
      return 'bg-[var(--imss-green-100)] text-[var(--imss-green-700)]'
    case 'MEDICO':
      return 'bg-[var(--status-info-bg)] text-[var(--status-info-fg)]'
    case 'LABORATORISTA':
      return 'bg-[var(--status-warning-bg)] text-[var(--status-warning-fg)]'
    case 'RECEPCIONISTA':
      return 'bg-purple-100 text-purple-700'
    default:
      return 'bg-[var(--imss-ink-100)] text-[var(--imss-ink-500)]'
  }
}
