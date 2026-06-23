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

/** Institución resumida tal como la devuelve el backend dentro del usuario */
export interface UsuarioInstitucionResumen {
  id?: number
  uuid: string
  nombre: string
}

export interface Usuario {
  id: number
  UUID: string
  username: string
  activo: boolean
  debeResetear?: boolean
  persona: UsuarioPersona
  rol: UsuarioRol
  institucion?: UsuarioInstitucionResumen | null
}

export interface UsuarioRequestDTO {
  // username ya no se envía: el backend lo genera automáticamente
  rolUuid: string
  institucionUuid: string
  persona: {
    nombre: string
    apellidoPaterno: string
    apellidoMaterno?: string
    fechaNacimiento: string
    sexo: 'M' | 'F'
    telefono?: string
    email: string   // requerido: se usa para enviar la invitacion/reset inicial
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
  PACIENTE: 'Participante',
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
