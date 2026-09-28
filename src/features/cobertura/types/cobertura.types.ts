export type CatalogoTipo = 'EXAMEN' | 'ESTUDIO'

export interface CoberturaItemDTO {
  tipoId:          number
  nombre:          string
  pacientesActivos: number
  conRegistro:     number
  enProceso:       number
  sinRegistro:     number
  pct:             number
}

export interface DistribucionBucketDTO {
  cantidadTipos:     number
  cantidadPacientes: number
  totalTipos:        number
}

export interface PacientePendienteDTO {
  folio:          string
  uuid:           string
  nombreCompleto: string
  sexo:           'M' | 'F' | string
  coberturaTotal: number
  totalTipos:     number
}

export interface CeldaCoberturaDTO {
  tipoId: number
  estado: 'HECHO' | 'PROCESO' | 'FALTA'
  /** id del estudio/resultado más reciente de ese tipo; null si FALTA */
  refId:  number | null
}

export interface ResultadoLineaDTO {
  parametro:      string
  unidad:         string | null
  grupoEtiqueta:  string | null
  orden:          number | null
  valorNumerico:  number | null
  valorTexto:     string | null
  valorBooleano:  boolean | null
}

export interface EstudioResumenDTO {
  id:            number
  fechaEstudio:  string
  observaciones: string | null
  resultados:    ResultadoLineaDTO[]
}

export interface CoberturaPacienteDTO {
  folio:      string
  uuid:       string
  nombre:     string
  sexo:       'M' | 'F' | string
  total:      number
  totalTipos: number
  celdas:     CeldaCoberturaDTO[]
}
