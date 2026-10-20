/**
 * Las formas que viajan desde el módulo de cuestionarios.
 *
 * Viven en la feature y no en `types/api` a propósito: son treinta tipos que solo
 * usa esta pantalla, y mezclarlos con los tipos compartidos obligaría a leerlos a
 * todo el que abra ese archivo.
 */

export type TipoVariable =
  | 'OPCION_UNICA'
  | 'CASILLA'
  | 'OPCION_MULTIPLE'
  | 'NUMERO'
  | 'NUMERO_CON_ESCAPE'
  | 'TEXTO'
  | 'FECHA'
  | 'GRUPO'

/**
 * Cómo se llama cada tipo fuera del código.
 *
 * Quien edita el catálogo es un investigador, no quien programó el enum:
 * `NUMERO_CON_ESCAPE` no le dice nada, y «no se contesta» es lo que de verdad hay que
 * entender de `GRUPO` antes de elegirlo por error.
 */
export const TIPO_VARIABLE_ETIQUETAS: Record<TipoVariable, string> = {
  OPCION_UNICA: 'Una sola opción',
  CASILLA: 'Casilla que se marca',
  OPCION_MULTIPLE: 'Casilla de un grupo de varias',
  NUMERO: 'Número',
  NUMERO_CON_ESCAPE: 'Número con respuesta de escape',
  TEXTO: 'Texto',
  FECHA: 'Fecha',
  GRUPO: 'Encabezado — no se contesta',
}

/** Los tipos que se contestan eligiendo de una lista. */
export const TIPOS_CON_OPCIONES: TipoVariable[] = [
  'OPCION_UNICA', 'CASILLA', 'OPCION_MULTIPLE', 'NUMERO_CON_ESCAPE',
]

/**
 * Por qué una respuesta no tiene valor. Son cinco y no una porque significan cosas
 * distintas: `NO_AUTORIZADO` dice que el reconocimiento de escritura de Azure no
 * estaba licenciado —el dato está en el papel, sin leer— mientras que
 * `SIN_RESPUESTA` dice que el participante no marcó.
 */
export type MarcaAusencia =
  | 'NINGUNA'
  | 'SIN_RESPUESTA'
  | 'EN_BLANCO'
  | 'CERO_MARCAS'
  | 'NO_AUTORIZADO'
  | 'ERROR_LECTURA'

export type EstadoCuestionario = 'BORRADOR' | 'COMPLETO' | 'VALIDADO' | 'ANULADO'

/**
 * A quien va dirigido un instrumento por sexo. Es enum propio y no el sexo de la
 * persona: su valor mas comun —ambos— no existe como sexo de nadie.
 */
export type DirigidoA = 'AMBOS' | 'HOMBRES' | 'MUJERES'

export const DIRIGIDO_A_ETIQUETAS: Record<DirigidoA, string> = {
  AMBOS: 'Hombres y mujeres',
  HOMBRES: 'Solo hombres',
  MUJERES: 'Solo mujeres',
}

export type OrigenCuestionario = 'PAPEL_REMARK' | 'APLICACION' | 'CAPTURA_MANUAL'

/**
 * Como se compara la pregunta llave con el valor que habilita.
 *
 * `DISTINTO` es la casilla de descarte: el «Ninguna» que encabeza la 112 apaga las
 * 135 celdas de la rejilla, y eso no se puede decir con una igualdad —habria que
 * enumerar todo lo que no es «Ninguna»—.
 */
export type OperadorDependencia = 'IGUAL' | 'DISTINTO' | 'EN'

export const OPERADOR_ETIQUETAS: Record<OperadorDependencia, string> = {
  IGUAL: 'es igual a',
  DISTINTO: 'es distinto de',
  EN: 'es alguno de',
}

/**
 * Como se pinta un bloque.
 *
 * `MATRIZ` es la rejilla donde cada celda es una pregunta distinta, como las 15
 * actividades por 9 columnas de la 112. `ESCALA` es la otra tabla, la mas comun:
 * un renglon por pregunta y una columna por opcion, que es la forma de la
 * frecuencia alimentaria, el AGES o el indice de Barthel.
 */
export type PresentacionSeccion = 'LISTA' | 'MATRIZ' | 'ESCALA'

// ── Catalogo ────────────────────────────────────────────────────────────────

export interface TipoCuestionario {
  id: number
  clave: string
  nombre: string
  descripcion: string | null
  version: string
  columnaEtiqueta: string
  activo: boolean
  fechaCreacion: string
  totalVariables: number
  variablesSinDocumentar: number
  totalBloques: number
  cuestionariosContestados: number
  dirigidoA: DirigidoA
  /** Nulo es sin limite por ese lado. Una edad exacta lleva las dos iguales. */
  edadMinima: number | null
  edadMaxima: number | null
  /** El publico en una frase, armada por el servidor: «Mujeres de 18 a 49 anos». */
  publico: string
  /** Si el participante puede empezarlo por su cuenta. Apagado por omision. */
  permiteAutollenado: boolean
}

/** Un instrumento del catalogo evaluado contra un participante concreto. */
export interface TipoParaParticipante {
  idTipoCuestionario: number
  clave: string
  nombre: string
  version: string
  publico: string
  aplica: boolean
  /**
   * Falta un dato del expediente para poder decidirlo. No es lo mismo que no aplicar:
   * el hueco es nuestro, no del participante, asi que no bloquea.
   */
  indeterminado: boolean
  motivo: string | null
  edad: number | null
  yaRegistrado: boolean
}

export interface TipoCuestionarioRequest {
  clave: string
  nombre: string
  descripcion?: string | null
  version: string
  columnaEtiqueta?: string | null
  dirigidoA?: DirigidoA
  edadMinima?: number | null
  edadMaxima?: number | null
  permiteAutollenado?: boolean
  activo?: boolean
}

export interface BloqueCuestionario {
  id: number
  nombre: string
  /** El titulo impreso del bloque, cuando el papel le pone uno. */
  titulo: string | null
  descripcion: string | null
  pagina: number | null
  orden: number
  totalVariables: number
  presentacion: PresentacionSeccion
}

export interface BloqueRequest {
  nombre: string
  titulo?: string | null
  descripcion?: string | null
  pagina?: number | null
  orden?: number | null
  presentacion?: PresentacionSeccion
}

/** Pone la misma pregunta llave a todas las preguntas de un bloque. */
export interface DependenciaDeBloqueRequest {
  /** Vacio quita la dependencia de todo el bloque. */
  dependeDe?: string | null
  valorHabilitante?: string | null
  operadorDependencia?: OperadorDependencia
}

export interface OpcionVariable {
  id: number
  codigo: string
  etiqueta: string
  orden: number
  esEscape: boolean
}

export interface VariableCuestionario {
  id: number
  codigo: string
  columnaVolcado: string | null
  pregunta: string | null
  tipo: TipoVariable
  idSeccion: number | null
  nombreSeccion: string | null
  orden: number
  pagina: number | null
  grupoMultiple: string | null
  dependeDe: string | null
  valorHabilitante: string | null
  operadorDependencia: OperadorDependencia
  /** Celda que ocupa cuando su bloque se pinta como rejilla. Nulo si no es una celda. */
  filaMatriz: string | null
  columnaMatriz: string | null
  obligatoria: boolean
  documentada: boolean
  activa: boolean
  valorMin: number | null
  valorMax: number | null
  longitudMax: number | null
  unidad: string | null
  observaciones: string | null
  /** La aclaracion que el papel imprime junto a la pregunta. Se le muestra a quien contesta. */
  instruccion: string | null
  /** La figura sin la cual la pregunta no se puede contestar. */
  figura: string | null
  opciones: OpcionVariable[]
}

export interface VariableRequest {
  codigo: string
  columnaVolcado?: string | null
  pregunta?: string | null
  tipo: TipoVariable
  idSeccion?: number | null
  orden?: number | null
  pagina?: number | null
  grupoMultiple?: string | null
  dependeDe?: string | null
  valorHabilitante?: string | null
  operadorDependencia?: OperadorDependencia
  filaMatriz?: string | null
  columnaMatriz?: string | null
  obligatoria?: boolean
  documentada?: boolean
  activa?: boolean
  valorMin?: number | null
  valorMax?: number | null
  longitudMax?: number | null
  unidad?: string | null
  observaciones?: string | null
  instruccion?: string | null
  figura?: string | null
  opciones?: Array<{ codigo: string; etiqueta: string; esEscape?: boolean }>
}

// ── Cuestionarios contestados ───────────────────────────────────────────────

export interface Cuestionario {
  id: number
  idTipoCuestionario: number
  claveCuestionario: string
  nombreCuestionario: string
  uuidParticipante: string
  folioParticipante: string
  nombreParticipante: string | null
  etiqueta: string | null
  estado: EstadoCuestionario
  origen: OrigenCuestionario
  fechaAplicacion: string | null
  fechaRegistro: string
  usuarioCaptura: string | null
  usuarioValida: string | null
  fechaValidacion: string | null
  archivoOrigen: string | null
  respuestasPendientes: number
  observaciones: string | null
  /** El participante no entraba en el publico del instrumento, o faltaba el dato. */
  fueraDeCriterio: boolean
  motivoFueraDeCriterio: string | null
}

export interface RespuestaCuestionario {
  id: number
  idVariable: number
  codigoVariable: string
  ordenRespuesta: number
  valorCodigo: string | null
  valorNumerico: number | null
  valorTexto: string | null
  valorFecha: string | null
  marcaAusencia: MarcaAusencia
  valorCrudo: string | null
  celdaOrigen: string | null
}

export interface BloqueLleno {
  seccion: BloqueCuestionario
  variables: VariableCuestionario[]
  respuestas: RespuestaCuestionario[]
  /** Las que la pregunta llave sí habilitó. Las demás no se preguntan. */
  variablesHabilitadas: number[]
}

export interface DiscrepanciaLectura {
  id: number
  idVariable: number | null
  codigoVariable: string | null
  columnaVolcado: string | null
  celdaOrigen: string | null
  valorEnFirme: string | null
  lecturasAlternas: string | null
  resuelta: boolean
  valorAdjudicado: string | null
  usuarioResuelve: string | null
  fechaResolucion: string | null
  nota: string | null
}

export interface Pagina<T> {
  contenido: T[]
  pagina: number
  tamano: number
  total: number
  totalPaginas: number
}

// ── Cargas masivas ──────────────────────────────────────────────────────────

export interface FilaPreviaVolcado {
  numeroFila: number
  etiqueta: string | null
  folio: string | null
  nombreParticipante: string | null
  /** Null si la fila se va a cargar. */
  motivoRechazo: string | null
  yaExiste: boolean
  conValor: number
  sinRespuesta: number
  noAutorizadas: number
  conError: number
  noPreguntadas: number
  /** Por que no entraba en el publico del instrumento. No impide la carga. */
  avisoCriterio: string | null
  edad: number | null
  /**
   * Lo que incumple alguna regla de la plantilla. Tampoco impide la carga: la hoja
   * ya se contesto en papel y el dato existe aunque incumpla.
   */
  avisosDeRegla: string[]
}

export interface ProblemaCelda {
  numeroFila: number
  celda: string
  variable: string
  detalle: string
}

export interface PrevisualizacionVolcado {
  /** Clave(s) rotulada(s) en las etiquetas. No decide nada: el instrumento se elige. */
  claveDetectada: string | null
  /** Que revisar del rotulado (otra clave, o varias). No impide la carga. */
  avisoEtiqueta: string | null
  nombreInstrumento: string
  hojaRespuestas: string
  hojaDiscrepancias: string | null
  totalColumnas: number
  columnasEmparejadas: number
  columnasSinVariable: string[]
  variablesSinColumna: string[]
  filas: FilaPreviaVolcado[]
  problemas: ProblemaCelda[]
  problemasOmitidos: number
  discrepancias: number
}

/**
 * En qué va —o cómo acabó— una carga de volcado.
 *
 * La carga no se hace en la petición que sube el archivo: cada fila es un
 * cuestionario de dos mil respuestas, así que un archivo de cientos de participantes
 * tarda minutos y la petición no sobreviviría. Se encola y se pregunta por ella.
 *
 * Es la misma forma mientras corre y al terminar, para que la pantalla no tenga que
 * adivinar qué recibió.
 */
export interface InformeCargaVolcado {
  id: number
  estado: 'EN_PROCESO' | 'TERMINADA' | 'FALLIDA'
  /** Si ya no va a cambiar. Es lo que corta las consultas. */
  termino: boolean
  nombreArchivo: string | null
  nombreInstrumento: string
  sobrescribir: boolean
  /** Cero hasta que se alcanza a leer la hoja. */
  totalFilas: number
  filasProcesadas: number
  cuestionariosCreados: number
  respuestasGuardadas: number
  pendientesDeLectura: number
  discrepanciasGuardadas: number
  /** Por qué se cortó. Lo de una fila suelta no viene aquí, va como fila omitida. */
  mensajeError: string | null
  inicio: string
  fin: string | null
  filasOmitidas: Array<{ numeroFila: number; etiqueta: string | null; motivo: string }>
}

export interface ChoqueCatalogo {
  variable: string
  detalle: string
  /** Un choque que bloquea no se puede aceptar: dejaría respuestas ilegibles. */
  bloquea: boolean
}

export interface PrevisualizacionCatalogo {
  nombreCatalogo: string
  variablesNuevas: number
  variablesActualizadas: number
  variablesSinCambio: number
  variablesQueSobran: string[]
  seccionesNuevas: string[]
  opciones: number
  choques: ChoqueCatalogo[]
}
