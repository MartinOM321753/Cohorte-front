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
  nombreCompleto: string
  sexo:           'M' | 'F' | string
  coberturaTotal: number
  totalTipos:     number
}

export interface CeldaCoberturaDTO {
  tipoId: number
  estado: 'HECHO' | 'PROCESO' | 'FALTA'
}

export interface CoberturaPacienteDTO {
  folio:      string
  nombre:     string
  sexo:       'M' | 'F' | string
  total:      number
  totalTipos: number
  celdas:     CeldaCoberturaDTO[]
}
