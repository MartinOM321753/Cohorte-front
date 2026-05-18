/**
 * Global API types and interfaces
 * Mapping to Spring Boot backend responses
 */

export interface ApiResponse<T> {
  data: T
  message: string
  status: string
  error: boolean
}

// ============================================
// PERSONAS
// ============================================
export interface Persona {
  id?: number
  nombre: string
  apellidoPaterno: string
  apellidoMaterno?: string
  fechaNacimiento?: string
  sexo?: 'M' | 'F'
  telefono?: string
  email?: string
}

export interface PersonaResponseDTO {
  id?: number
  nombre: string
  apellidoPaterno: string
  apellidoMaterno?: string
  fechaNacimiento?: string
  sexo?: 'M' | 'F'
  telefono?: string
  email?: string
}

export interface PersonaRequestDTO {
  nombre: string
  apellidoPaterno: string
  apellidoMaterno?: string
  fechaNacimiento: string
  sexo: 'M' | 'F'
  telefono?: string
  email?: string
}

// ============================================
// USUARIOS
// ============================================
export interface Usuario {
  id: number
  uuid: string
  username: string
  idRol: number
  rol: {
    id: number
    nombre: string
  }
  persona: Persona
  activo: boolean
  fechaCreacion?: string
}

export interface UserRequestDTO {
  username: string
  password: string
  idRol: number
  persona: PersonaRequestDTO
}

export interface LoginRequest {
  username: string
  password: string
}

export interface LoginResponse {
  data: string // JWT token
  message: string
  status: string
  error: boolean
}

// ============================================
// PACIENTES
// ============================================
export interface Paciente {
  id: number
  UUID: string
  folio: string
  activo: boolean
  fechaRegistro: string
  fechaActualizacion: string
  persona: PersonaResponseDTO
}

export interface PacienteRequestDTO {
  folio: string
  persona: PersonaRequestDTO
}

export interface PacienteResumenDTO {
  id: number
  folio: string
  nombreCompleto: string
  sexo: 'M' | 'F' | 'O'
  uuid: string
}

export interface UsuarioResumenDTO {
  id: number
  username: string
  nombreCompleto: string
  uuid: string
}

// ============================================
// CITAS
// ============================================
export interface Cita {
  id: number
  uuid: string
  pacienteUUID: string
  usuarioAgendaUUID: string
  // Legacy fields (pre-calendar refactor)
  fechaCita?: string
  duracionMinutos?: number

  // New calendar fields
  startAtUtc?: string
  endAtUtc?: string
  startAtLocal?: string
  timezone?: string
  durationMinutes?: number
  colorHex?: string
  estadoCita: 'PROGRAMADA' | 'COMPLETADA' | 'CANCELADA' | 'NO_ASISTIO'
  observaciones?: string
  fechaCreacion?: string
  paciente?: PacienteResumenDTO
  usuarioAgenda?: UsuarioResumenDTO
}

export interface CitaRequestDTO {
  // Backend contract (Spring Boot DTO)
  pacienteUUID?: string
  usuarioAgendaUUID?: string
  startAtLocal?: string
  timezone?: string
  durationMinutes?: number
  colorHex?: string
  observaciones?: string
}

export interface CitaUpdateRequestDTO {
  startAtLocal?: string
  timezone?: string
  durationMinutes?: number
  colorHex?: string

  estadoCita?: string
  observaciones?: string
}

// ============================================
// ESTUDIOS MÉDICOS
// ============================================
export interface TipoEstudio {
  id: number
  nombre: string
  descripcion?: string
  activo: boolean
  fechaCreacion?: string
}

export interface TipoEstudioRequestDTO {
  nombre: string
  descripcion?: string
}

export interface ParametroEstudio {
  id: number
  idTipoEstudio: number
  nombre: string
  unidad?: string
  tipo: 'NUMERICO' | 'TEXTO' | 'BOOLEANO' | 'GRUPO'
  activo: boolean
}

export interface ParametroEstudioRequestDTO {
  idTipoEstudio: number
  nombre: string
  unidad?: string
  tipo?: string
}

export interface ResultadoEstudio {
  id?: number
  idParametro: number
  valorNumerico?: number
  valorTexto?: string
  valorBooleano?: boolean
  grupoCodigo?: string
  grupoEtiqueta?: string
  orden?: number
}

export interface ResultadoEstudioRequestDTO {
  idParametro: number
  valorNumerico?: number
  valorTexto?: string
  valorBooleano?: boolean
  grupoCodigo?: string
  grupoEtiqueta?: string
  orden?: number
}

export interface EstudioAdjunto {
  id?: number
  tipo: 'PDF' | 'IMAGEN' | 'VIDEO' | 'OTRO'
  nombreOriginal: string
  mimeType: string
  rutaUrl: string
  descripcion?: string
  orden?: number
}

export interface EstudioAdjuntoRequestDTO {
  tipo: string
  nombreOriginal: string
  mimeType: string
  rutaUrl: string
  descripcion?: string
  orden?: number
}

export interface EstudioMedico {
  id: number
  uuid: string
  pacienteUUID: string
  usuarioRealizaUUID: string
  idTipoEstudio: number
  tipoEstudio: TipoEstudio
  fechaEstudio: string
  observaciones?: string
  resultados: ResultadoEstudio[]
  adjuntos: EstudioAdjunto[]
  fechaCreacion?: string
}

export interface EstudioMedicoRequestDTO {
  pacienteUUID: string
  usuarioRealizaUUID: string
  idTipoEstudio: number
  fechaEstudio: string
  observaciones?: string
  resultados?: ResultadoEstudioRequestDTO[]
  adjuntos?: EstudioAdjuntoRequestDTO[]
}

// ============================================
// EXÁMENES DE LABORATORIO
// ============================================
export interface Examen {
  id: number
  uuid: string
  nombreExamen: string
  descripcion?: string
  unidad?: string
  valorMinMujeres?: number
  valorMaxMujeres?: number
  valorMinHombres?: number
  valorMaxHombres?: number
  activo: boolean
}

export interface ExamenRequestDTO {
  nombreExamen: string
  descripcion?: string
  unidad?: string
  valorMinMujeres?: number
  valorMaxMujeres?: number
  valorMinHombres?: number
  valorMaxHombres?: number
}

export interface ResultadoExamen {
  id: number
  uuid: string
  pacienteUUID: string
  usuarioRegistroUUID: string
  idExamen: number
  examen: Examen
  valorObtenido: number
  observaciones?: string
  fechaResultado: string
  fechaCreacion?: string
}

export interface ResultadoExamenRequestDTO {
  pacienteUUID: string
  usuarioRegistroUUID: string
  idExamen: number
  valorObtenido: number
  observaciones?: string
  fechaResultado: string
}

// ============================================
// PRUEBA ESCALÓN
// ============================================
export interface PruebaEscalon {
  id: number
  uuid: string
  pacienteUUID: string
  usuarioRealizaUUID: string
  fechaEstudio: string
  etapas: EtapaPruebaEscalon[]
}

export interface PruebaEscalonRequestDTO {
  pacienteUUID: string
  usuarioRealizaUUID: string
  fechaEstudio: string
}

export interface EtapaPruebaEscalon {
  id: number
  idPruebaEscalon: number
  etapa: number
  observaciones?: string
  mediciones: MedicionEscalon[]
}

export interface EtapaRequestDTO {
  idPruebaEscalon: number
  etapa: number
  observaciones?: string
}

export interface MedicionEscalon {
  id: number
  idEtapa: number
  parametro: string
  valor: number
  unidad?: string
}

export interface MedicionRequestDTO {
  idEtapa: number
  parametro: string
  valor: number
  unidad?: string
}

// ============================================
// BIOBANCO - MUESTRAS
// ============================================
export interface Muestra {
  id: number
  uuid: string
  etiqueta: string
  valor: number
  unidad: string
  fechaRecoleccion: string
  observaciones?: string
  pacienteUUID: string
  usuarioRecolectaUUID: string
  idPosicionCaja: number
  activo: boolean
}

export interface MuestraRequestDTO {
  etiqueta: string
  valor: number
  unidad: string
  fechaRecoleccion: string
  observaciones?: string
  pacienteUUID: string
  usuarioRecolectaUUID: string
  idPosicionCaja: number
}

export interface MuestraDetalleDTO {
  id: number
  uuid: string
  etiqueta: string
  valor: number
  unidad: string
  fechaRecoleccion: string
  observaciones?: string | null
  activo: boolean
  paciente: {
    id: number
    folio: string
    nombreCompleto: string
    sexo: string
    uuid: string
  }
  usuarioRecolecta: {
    id: number
    username: string
    nombreCompleto: string
    uuid: string
  }
  ubicacion: {
    idPosicionCaja: number
    fila: string
    columna: string
    codigoCaja: string
    numeroPiso: string
    codigoRefrigerador: string
  }
}

// ============================================
// BIOBANCO - REFRIGERADORES
// ============================================
export interface PisoRefrigerador {
  id?: number
  numeroPiso: string
  filas: number
  columnas: number
  altura?: string
  activo: boolean
  posiciones?: PosicionPiso[]
}

export interface PosicionPiso {
  id: number
  fila: string
  columna: string
  altura: string
  ocupada: boolean
}

export interface Refrigerador {
  id: number
  codigo: string
  nombre: string
  marca: string
  modelo: string
  pisos: PisoRefrigerador[]
  activo: boolean
}

export interface RefrigeradorRequestDTO {
  codigo: string
  nombre: string
  marca: string
  modelo: string
}

export interface PisosDTO {
  idRefrigerador: number
  pisos: PisoRefrigerador[]
}

// ============================================
// BIOBANCO - CAJAS
// ============================================
export interface Caja {
  id: number
  codigoCaja: string
  filas: number
  columnas: number
  tipoCaja: string
  color?: string
  observaciones?: string
  idPosicionPiso?: number
  posiciones: PosicionCaja[]
  activo: boolean
}

export interface CajaRequestDTO {
  codigoCaja: string
  filas: number
  columnas: number
  tipoCaja: string
  color?: string
  observaciones?: string
  idPosicionPiso?: number
}

export interface PosicionCaja {
  id: number
  idCaja: number
  fila: number
  columna: number
  ocupada: boolean
  muestra?: Muestra
}

// ============================================
// PAGINATION
// ============================================
export interface PaginatedResponse<T> {
  content: T[]
  totalElements: number
  totalPages: number
  currentPage: number
  pageSize: number
  hasNextPage: boolean
  hasPreviousPage: boolean
}

export interface PaginationParams {
  page?: number
  size?: number
  sort?: string
}
