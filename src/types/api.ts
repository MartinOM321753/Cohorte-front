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
  segundoNombre?: string
  apellidoPaterno: string
  apellidoMaterno?: string
  fechaNacimiento?: string
  sexo?: 'M' | 'F'
  curp?: string
  telefono?: string
  email?: string
}

export interface PersonaResponseDTO {
  id?: number
  nombre: string
  segundoNombre?: string
  apellidoPaterno: string
  apellidoMaterno?: string
  fechaNacimiento?: string
  sexo?: 'M' | 'F'
  curp?: string
  telefono?: string
  email?: string
}

export interface PersonaRequestDTO {
  nombre: string
  segundoNombre?: string
  apellidoPaterno: string
  apellidoMaterno?: string
  fechaNacimiento?: string
  sexo?: 'M' | 'F'
  curp?: string
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
  uuid: string
  folio: string
  activo: boolean
  fechaRegistro: string
  fechaActualizacion: string
  persona: PersonaResponseDTO
  reclutamiento?: ReclutamientoParticipanteResponseDTO | null
  institucionId?: number
  institucionNombre?: string
  propiaInstitucion?: boolean
  /**
   * true → ya no gestionas a este participante pero conservas registros suyos.
   * Se puede consultar lo propio; no registrar ni actualizar.
   */
  soloConsulta?: boolean
  tieneAcceso?: boolean
}

export interface PacienteRequestDTO {
  // Opcional: si se omite, el backend genera uno automáticamente (formato COH-AA-NNNNN)
  folio?: string
  persona: PersonaRequestDTO
  reclutamiento: ReclutamientoParticipanteRequestDTO
  /**
   * Institución a la que quedará asignado. Si se omite, la del usuario. El backend
   * la valida contra el conjunto autorizado y la ignora al actualizar.
   */
  idInstitucion?: number
}

// ============================================
// RECLUTAMIENTO DE PARTICIPANTES (clasificación retorno/nuevo)
// ============================================

/** RETORNO: ya participó antes y fue recontactado · NUEVO: nunca ha participado. */
export type TipoReclutamiento = 'RETORNO' | 'NUEVO'

/** Resultado del contacto/recontacto — aplica principalmente a participantes RETORNO. */
export type EstadoContacto =
  | 'PENDIENTE'
  | 'ACEPTA_PARTICIPAR'
  | 'ACEPTA_CUESTIONARIO_RECUPERACION'
  | 'RECHAZA_CONTACTO_FUTURO'

/** Medio por el cual se contactó/reclutó al participante. */
export type MedioContacto = 'TELEFONO' | 'CORREO' | 'PRESENCIAL' | 'OTRO'

export interface ReclutamientoParticipanteRequestDTO {
  tipoReclutamiento: TipoReclutamiento
  estadoContacto?: EstadoContacto | null
  medioContacto?: MedioContacto | null
  /** UUID del usuario que realizó el contacto/reclutamiento. Si se omite, se usa el autenticado. */
  uuidUsuarioRecluta?: string | null
  observaciones?: string
  /** ISO datetime */
  fechaContacto?: string | null
}

export interface ReclutamientoParticipanteResponseDTO {
  id: number
  tipoReclutamiento: TipoReclutamiento
  estadoContacto?: EstadoContacto | null
  medioContacto?: MedioContacto | null
  institucionReclutamiento?: { id: number; uuid: string; nombre: string } | null
  usuarioRecluta?: { id: number; uuid: string; nombreCompleto: string } | null
  observaciones?: string | null
  fechaContacto?: string | null
  fechaRegistro?: string | null
}

/** Etiquetas legibles para mostrar en la UI */
export const TIPO_RECLUTAMIENTO_LABELS: Record<TipoReclutamiento, string> = {
  RETORNO: 'Retorno (ya participó antes)',
  NUEVO: 'Nuevo (primera vez)',
}

export const ESTADO_CONTACTO_LABELS: Record<EstadoContacto, string> = {
  PENDIENTE: 'Pendiente',
  ACEPTA_PARTICIPAR: 'Acepta participar',
  ACEPTA_CUESTIONARIO_RECUPERACION: 'Acepta cuestionario de recuperación',
  RECHAZA_CONTACTO_FUTURO: 'Rechaza contacto futuro',
}

export const MEDIO_CONTACTO_LABELS: Record<MedioContacto, string> = {
  TELEFONO: 'Teléfono',
  CORREO: 'Correo electrónico',
  PRESENCIAL: 'Presencial',
  OTRO: 'Otro',
}

export interface PacienteResumenDTO {
  id: number
  folio: string
  nombreCompleto: string
  sexo: 'M' | 'F' | 'O'
  uuid: string
  /** Estado del participante. false → sus muestras están en cuarentena (mutaciones bloqueadas). */
  activo?: boolean
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
  /** Sede que registró; puede no ser la del usuario. */
  institucionUuid?: string
  institucionNombre?: string
}

/** Slim projection returned by GET /citas/paciente/{uuid}/resumen */
export interface CitaResumen {
  citaUuid: string
  pacienteUuid: string
  fecha: string        // LocalDateTime in local TZ — ISO format "2026-05-18T07:00:00"
  tipo: string | null
  estado: string       // "Programada" | "No_Asistio" | "Completada" | "Cancelada"
  profesional: string | null
  /** Sede que agendó; puede no ser la del usuario. */
  institucionUuid?: string | null
  institucionNombre?: string | null
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
  /** Rango de referencia por sexo — solo aplica a tipo NUMERICO */
  valorMinMujeres?: number | null
  valorMaxMujeres?: number | null
  valorMinHombres?: number | null
  valorMaxHombres?: number | null
  /** Opciones predefinidas — solo aplica a tipo TEXTO_OPCIONES */
  opciones?: string[] | null
  /** Nombres con los que los instrumentos titulan la columna de este parámetro. */
  alias?: string[] | null
}

export interface ParametroEstudioRequestDTO {
  idTipoEstudio: number
  nombre: string
  unidad?: string
  tipo: TipoParametro
  valorMinMujeres?: number | null
  valorMaxMujeres?: number | null
  valorMinHombres?: number | null
  valorMaxHombres?: number | null
  /** Lista de valores válidos — solo cuando tipo == TEXTO_OPCIONES */
  opciones?: string[]
  /**
   * Alias de columna para la carga masiva. La lista reemplaza la anterior.
   * Se comparan sin acentos, mayúsculas ni espacios de sobra.
   */
  alias?: string[]
}

export interface TipoEstudio {
  id: number
  nombre: string
  descripcion?: string
  tipoCapturaDefecto?: 'NORMAL' | 'GRUPOS'
  activo: boolean
  tieneResultados?: boolean
  fechaCreacion?: string
  parametroEstudios?: ParametroEstudio[]
}

export interface TipoEstudioRequestDTO {
  nombre: string
  descripcion?: string
  tipoCapturaDefecto?: 'NORMAL' | 'GRUPOS'
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
  /** Sede que realizó el estudio; puede no ser la del usuario. */
  institucionId?: number
  institucionNombre?: string
  /**
   * false → el participante ya no está al alcance (permiso revocado). El estudio
   * sigue siendo de esta institución, pero su expediente no se puede abrir.
   */
  pacienteAlcanzable?: boolean
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
  /** Nombres con los que los instrumentos titulan la columna de este examen. */
  alias?: string[] | null
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
  /**
   * Alias de columna para la carga masiva. La lista reemplaza la anterior.
   * Dentro de una institución, un alias pertenece a un solo examen.
   */
  alias?: string[]
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
export type TipoDocumentoPaciente =
  | 'CONSENTIMIENTO'
  | 'GENERAL'
  | 'CUESTIONARIO'
  | 'CUESTIONARIO_GENERAL'
  | 'CUESTIONARIO_MINIMENTAL'
  | 'CUESTIONARIO_AFLUENCIA_VERBAL'
  | 'CUESTIONARIO_AGES'

export interface DocumentoResponseDTO {
  id: number
  nombreOriginal: string
  mimeType: string | null
  tamanioBytes: number | null
  descripcion: string | null
  fechaSubida: string
  subidoPorUUID: string | null
  tipoEntidad: string | null
  /** Código único imprimible del documento, formato D{YY}-{II}-{T}-{FOLIO}.{EXT} */
  etiqueta: string | null
  puedeDescargar: boolean
  archivoSubido: boolean
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
  estadoMuestra?: EstadoMuestra | null
}

export interface MuestraRequestDTO {
  etiqueta?: string
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
    /** false → participante inactivo, sus muestras están en cuarentena. */
    activo?: boolean
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
  /** Estado actual de la muestra en el biobanco */
  estadoMuestra?: EstadoMuestra | null
  idInstitucion?: number
  nombreInstitucion?: string
  idInstitucionActual?: number
  nombreInstitucionActual?: string
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
  tipoCapturaDefecto?: 'NORMAL' | 'GRUPOS'
  activo: boolean
  tieneResultados?: boolean
  fechaCreacion?: string | null
  parametros?: ParametroEstudioMuestra[] | null
}

export interface TipoEstudioMuestraRequestDTO {
  nombre: string
  descripcion?: string
  tipoCapturaDefecto?: 'NORMAL' | 'GRUPOS'
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
  idInstitucionCreadora?: number | null
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

export interface PisoResumen {
  id: number
  numeroPiso: string
  totalPosiciones: number
  posicionesOcupadas: number
  posicionesLibres: number
  porcentajeUso: number
}

export interface Refrigerador {
  id: number
  codigo: string
  nombre: string
  marca: string
  modelo: string
  activo: boolean
  totalPisos: number
  /** Resumen de ocupación por piso (id, numeroPiso, totalPosiciones, posicionesLibres, porcentajeUso) */
  pisos: PisoResumen[]
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
// CATÁLOGO DE INSTITUCIONES (jerarquía / multi-institución)
// ============================================

export interface TipoInstitucionResumen {
  id: number
  nombre: string
}

/** Catálogo configurable de tipos de institución (administrable en /catalogos/tipos-institucion) */
export interface TipoInstitucionCatalogo {
  id: number
  nombre: string
  activo: boolean
}

export interface InstitucionResumen {
  id: number
  uuid: string
  nombre: string
}

/** Institución del catálogo central (jerárquica, con ubicación geográfica y módulos habilitables) */
export interface Institucion {
  id: number
  uuid: string
  nombre: string
  tipoInstitucion: TipoInstitucionResumen | null
  institucionPadre: InstitucionResumen | null
  latitud?: number | null
  longitud?: number | null
  estado: string
  ciudad: string
  direccion?: string | null
  responsable?: string | null
  telefono?: string | null
  encargado?: EncargadoResumen | null
  tieneBiobanco: boolean
  activo: boolean
}

export interface InstitucionRequestDTO {
  nombre: string
  idTipoInstitucion: number
  idInstitucionPadre?: number | null
  latitud?: number | null
  longitud?: number | null
  estado: string
  ciudad: string
  direccion?: string
  responsable?: string
  telefono?: string
  uuidEncargado?: string | null
  tieneBiobanco?: boolean
  activo?: boolean
}

export interface InstitucionPaginadoResponse {
  content: Institucion[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

/** Módulos del sistema (ver enum ModuloSistema en backend) que se pueden habilitar por institución, estilo ERP. */
export const MODULOS_SISTEMA = [
  'PARTICIPANTES',
  'BIOBANCO',
  'EXAMENES',
  'ESTUDIOS_MEDICOS',
  'CITAS',
  'COBERTURA',
  'SOMATOMETRIA',
  'DOCUMENTOS',
  'BITACORA_ACCESOS',
  'BITACORA_ACCIONES',
] as const

export type ModuloSistema = (typeof MODULOS_SISTEMA)[number]

/** Etiquetas legibles para mostrar cada módulo en la UI de permisos. */
export const MODULO_LABELS: Record<ModuloSistema, string> = {
  PARTICIPANTES: 'Participantes',
  BIOBANCO: 'Biobanco',
  EXAMENES: 'Exámenes',
  ESTUDIOS_MEDICOS: 'Estudios médicos',
  CITAS: 'Citas',
  COBERTURA: 'Cobertura',
  SOMATOMETRIA: 'Somatometría',
  DOCUMENTOS: 'Documentos',
  BITACORA_ACCESOS: 'Bitácora Accesos',
  BITACORA_ACCIONES: 'Bitácora Acciones',
}

export interface InstitucionModuloPermiso {
  id: number
  idInstitucion: number
  nombreInstitucion: string
  modulo: ModuloSistema
  habilitado: boolean
  idOtorgadoPor: number | null
  nombreOtorgadoPor: string | null
  fechaOtorgamiento: string | null
}

export interface PermisoAccesoPacientes {
  id: number
  institucionOtorgaId: number
  institucionOtorgaNombre: string
  institucionRecibeId: number
  institucionRecibeNombre: string
  habilitado: boolean
  fechaOtorgamiento: string
}

/**
 * Autorización para que una institución hija registre participantes a nombre de
 * otras de su mismo grupo. Es independiente de `PermisoAccesoPacientes`: aquella
 * decide quién ve el padrón de otra sede, esta quién puede darlo de alta.
 */
export interface PermisoRegistroParticipantes {
  id: number
  institucionOtorgaId: number
  institucionOtorgaNombre: string
  institucionRecibeId: number
  institucionRecibeNombre: string
  habilitado: boolean
  fechaOtorgamiento: string
}

/** Una fila de «lo que mi institución le registró» a un participante. */
export interface RegistroPropio {
  id: number
  fecha: string | null
  descripcion: string | null
}

/**
 * Lo que UNA institución registró a un participante que ya no gestiona. No es el
 * expediente: el historial completo le corresponde a la institución dueña.
 */
export interface MisRegistrosParticipante {
  pacienteUuid: string
  folio: string
  nombreCompleto: string
  institucionActualNombre: string | null
  estudios: RegistroPropio[]
  muestras: RegistroPropio[]
  citas: RegistroPropio[]
  somatometrias: RegistroPropio[]
  examenes: RegistroPropio[]
}

/** Un tipo de registro que ata al participante con su institución actual. */
export interface VinculoInstitucion {
  tipo: string
  etiqueta: string
  cantidad: number
}

/**
 * Un participante solo cambia de institución mientras nada lo ate a la actual.
 * Cuando no se puede, llega el detalle con conteos para saber qué lo impide.
 */
export interface ElegibilidadCambioInstitucion {
  puedeCambiar: boolean
  vinculos: VinculoInstitucion[]
  motivo: string | null
}

export interface ResultadoReasignacion {
  uuid: string
  folio: string | null
  movido: boolean
  motivo: string | null
}

export interface ResumenReasignacion {
  solicitados: number
  movidos: number
  rechazados: number
  detalle: ResultadoReasignacion[]
}

/** Opción del desplegable de institución al registrar un participante. */
export interface InstitucionRegistroOpcion {
  id: number
  nombre: string
  /** Es la institución del usuario; viene preseleccionada. */
  propia: boolean
  /** Si es false, el participante no aparecerá en los listados del usuario. */
  visible: boolean
}

export interface TipoInstitucionRequestDTO {
  nombre: string
}

// ============================================
// BIOBANCO - ESTADO DE MUESTRA
// ============================================
export type EstadoMuestra = 'SIN_POSICION' | 'EN_BIOBANCO' | 'PRESTADA' | 'BAJA'

export interface AsignarPosicionRequestDTO {
  idPosicionCaja: number
  motivo?: string
}

// ============================================
// BIOBANCO - TRASLADOS DE MUESTRAS
// ============================================

/** Resumen de institución incluido en TrasladoMuestra */
export interface InstitucionTrasladoResumen {
  id: number
  nombre: string
  ciudad?: string
  estado?: string
}

/** Resumen de usuario incluido en TrasladoMuestra */
export interface UsuarioTrasladoResumen {
  id: number
  uuid: string
  username: string
  nombreCompleto: string
}

export interface TrasladoMuestra {
  id: number
  muestra: {
    id: number
    etiqueta: string
    unidad: string
    estadoMuestra?: EstadoMuestra | null
    esAlicuota?: boolean
    posicionLabel?: string | null
  }
  institucionOrigen: InstitucionTrasladoResumen
  institucionDestino: InstitucionTrasladoResumen
  autorizadoPor: UsuarioTrasladoResumen
  recibidoPor?: UsuarioTrasladoResumen | null
  grupoTraslado?: string | null
  estado: 'ENVIADA' | 'RECIBIDA' | 'EN_DEVOLUCION' | 'DEVUELTA' | 'CANCELADO'
  fechaTraslado: string
  fechaRetorno?: string | null
  fechaLimite?: string | null
  vencido?: boolean
  motivo: string
  observaciones?: string | null
}

export interface TrasladoRequestDTO {
  idsMuestras: number[]
  idInstitucionDestino: number
  uuidAutoriza: string
  motivo: string
  observaciones?: string
  fechaLimite?: string
}

export interface DevolucionRequestDTO {
  uuidConfirma: string
  observaciones?: string
}

export interface ConfirmarRecepcionRequestDTO {
  uuidConfirma: string
  idPosicionCaja?: number
}

export interface CancelarPrestamoRequestDTO {
  uuidUsuario: string
  motivo?: string
}

export interface IniciarDevolucionRequestDTO {
  uuidInicia: string
  observaciones?: string
  idsAlicuotasDevolver?: number[]
  /**
   * Institución destino de la devolución. Si es omitido, se devuelve al eslabón
   * anterior de la cadena (institución origen del traslado). Se puede elegir cualquier
   * institución que haya participado previamente en la cadena de custodia (atajo).
   */
  idInstitucionDestinoDevolucion?: number
}

export interface GenerarAlicuotasRequest {
  idTipoMuestra: number
  idTuboMuestra: number
}

export interface MuestraTipoInstitucionResponse {
  id: number
  tipoMuestra: TipoMuestraResumen
  tuboMuestra: TuboMuestraResumen
  nombreInstitucion: string
}

// ============================================
// SOMATOMETRÍA
// ============================================
export interface Somatometria {
  id: number
  pacienteUUID: string
  pacienteNombre?: string
  fechaMedicion: string         // ISO datetime "YYYY-MM-DDTHH:mm:ss"
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
  /** Sede que registró; puede no ser la del usuario. */
  institucionUuid?: string
  institucionNombre?: string
}

export interface SomatometriaRequestDTO {
  pacienteUUID: string
  usuarioRegistraUUID: string
  fechaMedicion: string         // "YYYY-MM-DDTHH:mm:ss"
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

// ============================================
// CONFIGURACIÓN DE ETIQUETAS (IMPRESIÓN)
// ============================================
export type TipoCodigo = 'DATAMATRIX' | 'CODE_128' | 'QR_CODE'
export type DisposicionEtiqueta = 'NOMBRE_CODIGO_ETIQUETA' | 'CODIGO_NOMBRE_ETIQUETA' | 'CODIGO_ETIQUETA' | 'NOMBRE_ETIQUETA_CODIGO'
/** Soporte físico: hoja suelta impresa por el navegador, o rollo enviado como ZPL. */
export type TipoMedio = 'HOJA_AVERY' | 'ROLLO_ZEBRA'
export type TamanoHoja = 'CARTA' | 'A4'

export interface ConfiguracionEtiquetaResponse {
  id: number
  nombre: string
  predeterminada: boolean
  anchoMm: number
  altoMm: number
  dpi: number
  etiquetasPorFila: number
  margenIzquierdoMm: number
  margenSuperiorMm: number
  tipoCodigo: TipoCodigo
  moduloCodigo: number
  /** Ancho de la barra angosta en dots. Solo aplica a Code 128 (^BY en ZPL). */
  anchoBarraCodigo: number
  tamanoFuenteNombre: number
  tamanoFuenteEtiqueta: number
  espaciadoNombre: number
  espaciadoCodigo: number
  espaciadoEtiqueta: number
  mostrarNombre: boolean
  mostrarCodigo: boolean
  mostrarEtiqueta: boolean
  disposicion: DisposicionEtiqueta
  activo: boolean
  fechaCreacion: string
  fechaActualizacion: string
  anchoDots: number
  altoDots: number
  filasPorPagina: number
  espacioHorizontalMm: number
  espacioVerticalMm: number
  margenPaginaSuperiorMm: number
  margenPaginaIzquierdoMm: number

  tipoMedio: TipoMedio
  tamanoHoja: TamanoHoja
  /**
   * Medidas de acomodo tal como están guardadas. Cero significa "no capturado".
   * Son las que el formulario devuelve al backend: no deben confundirse con las
   * `*Efectivo*`, o guardar una edición congelaría el valor deducido y a partir
   * de ahí cambiar el tamaño dejaría de mover el acomodo.
   */
  pasoHorizontalMm: number
  pasoVerticalMm: number
  margenDerechoMm: number
  margenInferiorMm: number
  /** Las mismas medidas ya resueltas. Son las que se usan para dibujar. */
  pasoHorizontalEfectivoMm: number
  pasoVerticalEfectivoMm: number
  margenDerechoEfectivoMm: number
  margenInferiorEfectivoMm: number
  carrilesRolloEfectivo: number
  /** Corrección de calibración de la impresora, aplicada a la hoja completa. */
  ajusteXMm: number
  ajusteYMm: number
  hojaAnchoMm: number
  hojaAltoMm: number
  carrilesRollo: number
  anchoCabezalMm: number
  offsetLhXDots: number
  offsetLhYDots: number
}

export interface ConfiguracionEtiquetaRequest {
  nombre: string
  predeterminada?: boolean
  anchoMm: number
  altoMm: number
  dpi: number
  etiquetasPorFila: number
  margenIzquierdoMm: number
  margenSuperiorMm: number
  tipoCodigo: TipoCodigo
  moduloCodigo: number
  /** Ancho de la barra angosta en dots. Solo aplica a Code 128 (^BY en ZPL). */
  anchoBarraCodigo: number
  tamanoFuenteNombre: number
  tamanoFuenteEtiqueta: number
  espaciadoNombre: number
  espaciadoCodigo: number
  espaciadoEtiqueta: number
  mostrarNombre: boolean
  mostrarCodigo: boolean
  mostrarEtiqueta: boolean
  disposicion: DisposicionEtiqueta
  filasPorPagina: number
  espacioHorizontalMm: number
  espacioVerticalMm: number
  margenPaginaSuperiorMm: number
  margenPaginaIzquierdoMm: number

  tipoMedio?: TipoMedio
  tamanoHoja?: TamanoHoja
  /** Cero significa "dedúcelo de tamaño + separación", como antes del campo. */
  pasoHorizontalMm?: number
  pasoVerticalMm?: number
  margenDerechoMm?: number
  margenInferiorMm?: number
  ajusteXMm?: number
  ajusteYMm?: number
  carrilesRollo?: number
  anchoCabezalMm?: number
  offsetLhXDots?: number
  offsetLhYDots?: number
}

export interface LabelDataDTO {
  /** Id de la muestra o documento. Necesario para acomodar por carriles. */
  id?: number
  etiqueta: string
  nombre: string
  codigoDatos: string
}

export interface PrintableLabelBatchDTO {
  configuracion: ConfiguracionEtiquetaResponse
  etiquetas: LabelDataDTO[]
}

export interface OpcionesEtiqueta {
  tiposCodigo: TipoCodigo[]
  disposiciones: DisposicionEtiqueta[]
}

// ─── Configuración de Horario de Citas ──────────────────────────────────────

export interface ConfiguracionHorarioResponse {
  id: number
  nombre: string
  horaInicio: number
  horaFin: number
  lunes: boolean
  martes: boolean
  miercoles: boolean
  jueves: boolean
  viernes: boolean
  sabado: boolean
  domingo: boolean
  activa: boolean
  fechaCreacion: string
  fechaActualizacion: string
}

export interface ConfiguracionHorarioRequest {
  nombre: string
  horaInicio: number
  horaFin: number
  lunes: boolean
  martes: boolean
  miercoles: boolean
  jueves: boolean
  viernes: boolean
  sabado: boolean
  domingo: boolean
  activa?: boolean
}
