// Contrato del visualizador 3D de ubicación.
//
// Refleja exactamente lo que el backend sabe devolver (Refrigerador →
// PisoRefrigerador → PosicionPiso → CajaCriogenica → PosicionCaja → Muestra).
// Si un dato no está aquí es porque el modelo no lo guarda, no porque falte
// mapearlo.

/** Ficha de la muestra para el panel lateral. */
export interface Ubicacion3DMuestra {
  id: number
  etiqueta: string
  estadoMuestra?: string | null
  valor?: number | null
  unidad?: string | null
  fechaRecoleccion?: string | null
  observaciones?: string | null
  tipoMuestra?: string | null
  temperaturaAlmacenamiento?: string | null
  tuboMuestra?: string | null
  numeroAlicuota?: number | null
  totalAlicuotas?: number | null
  idMuestraPadre?: number | null
  etiquetaMuestraPadre?: string | null
  pacienteFolio?: string | null
  pacienteNombre?: string | null
  usuarioRecolecta?: string | null
  institucionPropietaria?: string | null
  institucionActual?: string | null
}

export interface Ubicacion3DPrestamo {
  idTraslado: number
  estado?: string | null
  institucionOrigen?: string | null
  institucionDestino?: string | null
  autorizadoPor?: string | null
  fechaTraslado?: string | null
  fechaLimite?: string | null
  motivo?: string | null
}

/** Plancha de la pila del refrigerador (vista 0). */
export interface Ubicacion3DPisoResumen {
  id: number
  numeroPiso: string
  filas: number
  columnas: number
  altura: number
  totalPosiciones: number
  posicionesOcupadas: number
  posicionesLibres: number
  porcentajeOcupacion: number
  totalCajas: number
  /** Huecos ocupados por celda de la planta, recorrido fila-mayor (filas × columnas). */
  reticula: number[]
  esDestino: boolean
}

export interface Ubicacion3DRefrigerador {
  id: number
  codigo: string
  nombre?: string | null
  marca?: string | null
  modelo?: string | null
  activo: boolean
  nombreInstitucion?: string | null
  totalPisos: number
  totalPosiciones: number
  posicionesOcupadas: number
  porcentajeOcupacion: number
  pisos: Ubicacion3DPisoResumen[]
  /** null al explorar sin muestra objetivo. */
  idPisoDestino: number | null
}

/** Un hueco del piso y, si lo hay, la caja que lo ocupa (vista 1). */
export interface Ubicacion3DCajaEnPiso {
  idPosicionPiso: number
  fila: string
  columna: string
  altura: string
  filaIndex: number
  columnaIndex: number
  alturaIndex: number
  ocupada: boolean
  idCaja?: number | null
  codigoCaja?: string | null
  tipoCaja?: string | null
  color?: string | null
  capacidad?: number | null
  ocupadas?: number | null
  esDestino: boolean
}

export interface Ubicacion3DPiso {
  id: number
  numeroPiso: string
  filas: number
  columnas: number
  altura: number
  totalPosiciones: number
  posicionesOcupadas: number
  posicionesLibres: number
  porcentajeOcupacion: number
  totalCajas: number
  cajas: Ubicacion3DCajaEnPiso[]
  idRefrigerador?: number | null
  codigoRefrigerador?: string | null
  /** Todo lo que sigue es null al explorar sin muestra objetivo. */
  idCajaDestino: number | null
  filaDestinoIndex: number | null
  columnaDestinoIndex: number | null
  alturaDestinoIndex: number | null
}

/** Celda de la rejilla de una caja (vistas 2 y 3). */
export interface Ubicacion3DPosicion {
  id: number
  fila: number
  columna: number
  ocupada: boolean
  idMuestra?: number | null
  etiquetaMuestra?: string | null
  /** Siempre false al explorar sin muestra objetivo. */
  esDestino: boolean
}

export interface Ubicacion3DCaja {
  id: number
  codigoCaja: string
  filas: number
  columnas: number
  tipoCaja?: string | null
  color?: string | null
  observaciones?: string | null
  capacidad: number
  ocupadas: number
  libres: number
  porcentajeOcupacion: number
  posiciones: Ubicacion3DPosicion[]
  /** null al explorar sin muestra objetivo. */
  filaDestino: number | null
  columnaDestino: number | null
  idPiso?: number | null
  numeroPiso?: string | null
  idRefrigerador?: number | null
  codigoRefrigerador?: string | null
  coordenadaEnPiso?: string | null
}

export interface Ubicacion3D {
  muestra: Ubicacion3DMuestra
  disponible: boolean
  motivoNoDisponible?: 'PRESTADA' | 'SIN_POSICION' | 'BAJA' | null
  mensajeNoDisponible?: string | null
  prestamo?: Ubicacion3DPrestamo | null
  refrigerador?: Ubicacion3DRefrigerador | null
  piso?: Ubicacion3DPiso | null
  caja?: Ubicacion3DCaja | null
}

/** Las cuatro vistas, en el orden en que las recorre el breadcrumb. */
export const VISTAS_3D = ['refrigerador', 'piso', 'caja', 'posicion'] as const
export type Vista3D = (typeof VISTAS_3D)[number]
