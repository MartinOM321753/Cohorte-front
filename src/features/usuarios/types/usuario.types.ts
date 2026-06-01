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
  uuid: string
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
  // username ya no se envía: el backend lo genera automáticamente
  rolUuid: string
  persona: {
    nombre: string
    apellidoPaterno: string
    apellidoMaterno?: string
    fechaNacimiento: string
    sexo: 'M' | 'F'
    telefono?: string
    email: string   // requerido: la contraseña generada se envía aquí
  }
}

/** Rol tal como llega del endpoint GET /api/roles */
export interface RolOption {
  uuid: string
  nombre: string
}

/** Etiquetas legibles para mostrar en la UI */
export const ROL_LABELS: Record<string, string> = {
  ADMINISTRADOR: 'Administrador',
  MEDICO: 'Médico',
  LABORATORISTA: 'Laboratorista',
  RECEPCIONISTA: 'Recepcionista',
  PACIENTE: 'Paciente',
  ENCARGADO: 'Encargado de Almacén',
}

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
