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
  /** Acepta nombre de usuario o correo electrónico */
  identifier: string
  password: string
  latitud?: number | null
  longitud?: number | null
  /** Margen de error de la lectura GPS en metros (accuracy del browser) */
  precisionM?: number | null
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
  // La API puede devolver el valor capitalizado ("Programada") o en mayúsculas ("PROGRAMADA")
  estadoCita: string
  observaciones?: string
  fechaCreacion?: string
  paciente?: PacienteResumenDTO
  usuarioAgenda?: UsuarioResumenDTO
}

/** Slim projection returned by GET /citas/paciente/{uuid}/resumen */
export interface CitaResumen {
  citaUuid: string
  pacienteUuid: string
  fecha: string        // LocalDateTime in local TZ — ISO format "2026-05-18T07:00:00"
  tipo: string | null
  estado: string       // "Programada" | "No_Asistio" | "Completada" | "Cancelada"
  profesional: string | null
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
export type TipoParametro = 'NUMERICO' | 'TEXTO' | 'BOOLEANO' | 'TEXTO_OPCIONES'

export interface ParametroEstudio {
  id: number
  nombre: string
  unidad?: string
  tipo: TipoParametro
  tipoEstudio?: string
  /** Rango de referencia — solo aplica a tipo NUMERICO */
  valorMinimo?: number | null
  valorMaximo?: number | null
  /** Opciones predefinidas — solo aplica a tipo TEXTO_OPCIONES */
  opciones?: string[] | null
}

export interface ParametroEstudioRequestDTO {
  idTipoEstudio: number
  nombre: string
  unidad?: string
  tipo: TipoParametro
  valorMinimo?: number | null
  valorMaximo?: number | null
  /** Lista de valores válidos — solo cuando tipo == TEXTO_OPCIONES */
  opciones?: string[]
}

export interface TipoEstudio {
  id: number
  nombre: string
  descripcion?: string
  activo: boolean
  fechaCreacion?: string
  parametroEstudios?: ParametroEstudio[]
}

export interface TipoEstudioRequestDTO {
  nombre: string
  descripcion?: string
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

export interface ResultadoEstudioResponse {
  id: number
  parametro: string
  valorNumerico?: number
  valorTexto?: string
  valorBooleano?: boolean
  grupoCodigo?: string
  grupoEtiqueta?: string
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

/** Summary DTO — returned by GET /estudios and GET /estudios/paciente/{uuid} */
export interface EstudioListDTO {
  id: number
  fechaEstudio: string
  paciente: string
  pacienteuuid: string
  usuarioRealiza: string
  usuarioRealizauuid: string
  tipoEstudio: string
  tipoEstudioid: number
  cantidadResultados?: number
  cantidadAdjuntos?: number
}

/** Full detail DTO — returned by GET /estudios/{id} */
export interface EstudioMedico {
  id: number
  observaciones?: string
  fechaEstudio: string
  fechaRegistro: string
  paciente: PacienteResumenDTO
  usuarioRealiza: UsuarioResumenDTO
  tipoEstudio: TipoEstudio
  resultados: ResultadoEstudioResponse[]
  adjuntos: EstudioAdjuntoRequestDTO[]
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
// CATÁLOGO — UNIDADES DE MEDIDA
// ============================================
export interface UnidadMedida {
  id: number
  nombre: string
  activo: boolean
}

export interface UnidadMedidaRequestDTO {
  nombre: string
}

// ============================================
// DOCUMENTOS (almacenamiento MinIO)
// ============================================
export type TipoDocumentoPaciente = 'CONSENTIMIENTO' | 'GENERAL'

export interface DocumentoResponseDTO {
  id: number
  nombreOriginal: string
  mimeType: string | null
  tamanioBytes: number | null
  descripcion: string | null
  fechaSubida: string
  subidoPorUUID: string | null
  tipoEntidad: string | null
  /**
   * El backend indica si el usuario autenticado puede descargar/visualizar
   * el contenido del archivo. Si es false, los botones de acción se ocultan.
   */
  puedeDescargar: boolean
  /** URL firmada temporal de MinIO para descargar/visualizar el archivo */
  url: string | null
}

// ============================================
// BIOBANCO - TIPOS DE MUESTRA (Stream C)
// ============================================
export interface TuboMuestra {
  id: number
  nombre: string
  prefijoCodigo?: string | null
  numeroAlicuotas: number
  volumenAlicuota?: number | null
  unidadVolumen?: string | null
  destinoSugerido?: string | null
  orden: number
  activo: boolean
}

export interface TuboMuestraRequestDTO {
  nombre: string
  prefijoCodigo?: string
  numeroAlicuotas: number
  volumenAlicuota?: number
  unidadVolumen?: string
  destinoSugerido?: string
  orden?: number
  activo?: boolean
}

export interface TipoMuestra {
  id: number
  nombre: string
  descripcion?: string | null
  temperaturaAlmacenamiento?: string | null
  activo: boolean
  tubos: TuboMuestra[]
}

export interface TipoMuestraRequestDTO {
  nombre: string
  descripcion?: string
  temperaturaAlmacenamiento?: string
}

/** Resumen ligero incluido en MuestraDetalleDTO */
export interface TipoMuestraResumen {
  id: number
  nombre: string
  temperaturaAlmacenamiento?: string | null
}

export interface TuboMuestraResumen {
  id: number
  nombre: string
  prefijoCodigo?: string | null
  numeroAlicuotas: number
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
  valor?: number
  unidad?: string
  fechaRecoleccion: string
  observaciones?: string
  pacienteUUID: string
  usuarioRecolectaUUID: string
  idPosicionCaja?: number | null
  // Stream C
  idTipoMuestra?: number | null
  idTuboMuestra?: number | null
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
  ubicacion?: {
    idPosicionCaja: number
    fila: string
    columna: string
    codigoCaja: string
    numeroPiso: string
    codigoRefrigerador: string
  } | null
  // Stream C
  tipoMuestra?: TipoMuestraResumen | null
  tuboMuestra?: TuboMuestraResumen | null
  idMuestraPadre?: number | null
  numeroAlicuota?: number | null
  totalAlicuotas?: number | null
  /** Solo presente en respuesta de creación cuando se auto-generaron alícuotas */
  alicuotasGeneradas?: number | null
}

// ============================================
// BIOBANCO - ESTUDIOS DE MUESTRAS (reemplaza Stream D)
// ============================================

export interface ParametroEstudioMuestra {
  id: number
  idTipoEstudioMuestra?: number | null
  nombreTipoEstudioMuestra?: string | null
  nombre: string
  unidad?: string | null
  tipo: TipoParametro
  valorMinimo?: number | null
  valorMaximo?: number | null
  /** Valores válidos — solo cuando tipo == TEXTO_OPCIONES */
  opciones?: string[] | null
}

export interface ParametroEstudioMuestraRequestDTO {
  idTipoEstudioMuestra: number
  nombre: string
  unidad?: string
  tipo: TipoParametro
  valorMinimo?: number | null
  valorMaximo?: number | null
  opciones?: string[]
}

export interface TipoEstudioMuestra {
  id: number
  nombre: string
  descripcion?: string | null
  activo: boolean
  fechaCreacion?: string | null
  parametros?: ParametroEstudioMuestra[] | null
}

export interface TipoEstudioMuestraRequestDTO {
  nombre: string
  descripcion?: string
}

export interface ResultadoEstudioMuestraRequestDTO {
  idParametro: number
  valorNumerico?: number | null
  valorTexto?: string | null
  valorBooleano?: boolean | null
  grupoCodigo?: string | null
  grupoEtiqueta?: string | null
  orden?: number | null
}

export interface ResultadoEstudioMuestraResponse {
  id: number
  parametro: string
  idParametro: number
  valorNumerico?: number | null
  valorTexto?: string | null
  valorBooleano?: boolean | null
  grupoCodigo?: string | null
  grupoEtiqueta?: string | null
  orden?: number | null
}

export interface EstudioMuestraRequestDTO {
  idTipoEstudioMuestra: number
  usuarioRealizaUUID: string
  fechaEstudio: string
  observaciones?: string
  cantidadConsumida?: number | null
  unidadConsumida?: string | null
  resultados?: ResultadoEstudioMuestraRequestDTO[]
}

export interface EstudioMuestraResponse {
  id: number
  idMuestra: number
  etiquetaMuestra: string
  tipoEstudioMuestra: TipoEstudioMuestra
  usuarioRealiza: UsuarioResumenDTO
  fechaEstudio: string
  fechaRegistro: string
  observaciones?: string | null
  cantidadConsumida?: number | null
  unidadConsumida?: string | null
  resultados: ResultadoEstudioMuestraResponse[]
  cantidadResultados: number
}

export interface HistorialCambioMuestraResponse {
  id: number
  campo: string
  valorAnterior?: string | null
  valorNuevo?: string | null
  usuario: string
  fechaCambio: string
  motivo?: string | null
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
  idPosicionPiso?: number | null
  /** String formateado devuelto por el backend, ej.: "Refrigerador: REF01 | Piso: 1 | Posición: F1-C2-A3" */
  ubicacionPiso?: string | null
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
// BIOBANCO - INSTITUCIONES EXTERNAS
// ============================================

export type TipoInstitucion = 'INMEGEN' | 'INSP' | 'HOSPITAL' | 'LABORATORIO' | 'OTRA'

export const TIPO_INSTITUCION_LABELS: Record<TipoInstitucion, string> = {
  INMEGEN:     'INMEGEN',
  INSP:        'INSP',
  HOSPITAL:    'Hospital',
  LABORATORIO: 'Laboratorio',
  OTRA:        'Otra institución',
}

export interface EncargadoResumen {
  id: number
  uuid: string
  username: string
  nombreCompleto: string
  email?: string
}

/** Institución externa (antes "Almacén") — destino de traslados de muestras */
export interface Almacen {
  id: number
  nombre: string
  estado: string
  ciudad: string
  direccion?: string
  responsable?: string
  telefono?: string
  activo: boolean
  tipo?: TipoInstitucion | null
  tieneBiobanco?: boolean
  encargado?: EncargadoResumen | null
}

export interface AlmacenRequestDTO {
  nombre: string
  estado: string
  ciudad: string
  direccion?: string
  responsable?: string
  telefono?: string
  activo?: boolean
  tipo?: TipoInstitucion
  tieneBiobanco?: boolean
  uuidEncargado?: string | null
}

// ============================================
// BIOBANCO - TRASLADOS DE MUESTRAS
// ============================================
export interface TrasladoMuestra {
  id: number
  muestra: {
    id: number
    etiqueta: string
    unidad: string
  }
  almacen: Almacen
  autorizadoPor: {
    id: number
    uuid: string
    username: string
    nombreCompleto: string
  }
  estado: 'TRASLADADA' | 'RECIBIDA' | 'EN_DEVOLUCION' | 'DEVUELTA'
  fechaTraslado: string
  fechaRetorno?: string | null
  motivo: string
  observaciones?: string | null
}

export interface TrasladoRequestDTO {
  idMuestra: number
  idAlmacen: number
  uuidAutoriza: string
  motivo: string
  observaciones?: string
}

export interface DevolucionRequestDTO {
  observaciones?: string
}

export interface ConfirmarRecepcionRequestDTO {
  uuidEncargado: string
}

export interface IniciarDevolucionRequestDTO {
  uuidEncargado: string
  observaciones?: string
}

// ============================================
// SOMATOMETRÍA
// ============================================
export interface Somatometria {
  id: number
  pacienteUUID: string
  pacienteNombre?: string
  fechaMedicion: string         // ISO date "YYYY-MM-DD"
  pesoKg?: number | null
  tallaM?: number | null
  /** IMC calculado en backend (peso / talla²) */
  imc?: number | null
  presionSistolica?: number | null
  presionDiastolica?: number | null
  circunferenciaAbdominalCm?: number | null
  frecuenciaCardiacaReposo?: number | null
  observaciones?: string | null
  usuarioRegistraNombre?: string | null
  fechaRegistro: string         // ISO datetime
}

export interface SomatometriaRequestDTO {
  pacienteUUID: string
  usuarioRegistraUUID: string
  fechaMedicion: string         // "YYYY-MM-DD"
  pesoKg?: number | null
  tallaM?: number | null
  presionSistolica?: number | null
  presionDiastolica?: number | null
  circunferenciaAbdominalCm?: number | null
  frecuenciaCardiacaReposo?: number | null
  observaciones?: string | null
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

/** Matches Spring Data's Page<T> JSON serialization */
export interface SpringPage<T> {
  content: T[]
  totalElements: number
  totalPages: number
  number: number   // current page (0-indexed)
  size: number
  first: boolean
  last: boolean
}
