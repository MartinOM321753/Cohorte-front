/**
 * Las fórmulas del catálogo, tal como viajan por la API.
 *
 * Viven en su propio archivo y no en `types.api.ts` porque son otra cosa que una
 * plantilla: una plantilla es un diseño y una fórmula es un cálculo, y lo único que
 * comparten es que las dos las arma la misma persona.
 */

/** Una variable dentro de una fórmula. */
export interface VariableFormula {
  /** Cómo la menciona la fórmula: «estatura». */
  nombre: string
  /**
   * De dónde sale el dato, en el catálogo: `estudio.7.param.85`.
   *
   * Se guarda la clave y no el nombre del parámetro para que la fórmula sobreviva
   * a que alguien renombre el estudio.
   */
  clave: string
  /**
   * En qué unidad entra al cálculo.
   *
   * Es la decisión que evita el error que nada delata: la estatura está guardada en
   * centímetros y el índice de masa corporal la necesita en metros. Sin indicar, el
   * dato entra tal como está guardado.
   */
  unidad?: string | null
}

export interface FormulaReporte {
  id: number
  nombre: string
  descripcion?: string | null
  expresion: string
  variables: VariableFormula[]
  /**
   * Los límites de la referencia, cuando dependen del participante.
   *
   * El peso deseable del reporte de salud es «18.5 × talla² — 24.9 × talla²»: no es
   * un rango fijo, son dos cuentas que dan un número distinto para cada persona. Son
   * opcionales por separado, porque hay filas con un solo lado.
   */
  expresionMinimo?: string | null
  expresionMaximo?: string | null
  unidadSalida?: string | null
  decimales?: number | null
  /** Sube cada vez que cambia el cálculo. Las versiones anteriores quedan archivadas. */
  version: number
  activo: boolean
  fechaCreacion?: string
  fechaActualizacion?: string
  /** Lo que conviene mirar aunque se haya podido guardar. */
  advertencias?: AvisoFormula[]
}

export interface FormulaReporteRequest {
  nombre: string
  descripcion?: string
  expresion: string
  variables: VariableFormula[]
  expresionMinimo?: string | null
  expresionMaximo?: string | null
  unidadSalida?: string | null
  decimales?: number | null
}

/**
 * Un aviso del validador.
 *
 * `IMPIDE` es lo único que no deja guardar: la fórmula no se puede leer, nombra una
 * variable que no existe, o promete una unidad que la operación no produce. Todo lo
 * demás `ADVIERTE` y se guarda igual — el criterio de qué tiene sentido es de quien
 * arma el reporte.
 */
export interface AvisoFormula {
  nivel: 'IMPIDE' | 'ADVIERTE'
  mensaje: string
  /** Dónde señalar en el texto; −1 cuando el aviso no es de un punto concreto. */
  posicion: number
}

export interface RevisionFormula {
  sePuedeGuardar: boolean
  avisos: AvisoFormula[]
}

/** Con qué se puede calcular: solo lo numérico y con unidad declarada. */
export interface VariableDisponible {
  clave: string
  rotulo: string
  /** Participante, Estudios, Exámenes de laboratorio. */
  grupo: string
  /** El estudio concreto del que sale, cuando sale de uno. */
  subgrupo?: string | null
  /** En la que está guardado el dato. */
  unidad: string
  /** A cuáles se puede pasar; siempre incluye la suya. */
  unidadesPosibles: string[]
  ayuda?: string | null
  /**
   * Los valores que admite, si tiene un conjunto cerrado.
   *
   * Vacío en los numéricos de medición. Cuando viene lleno —parámetros de opciones,
   * de sí/no, y el sexo del participante— la variable solo sirve para comparar dentro
   * de una condición.
   */
  opciones?: OpcionVariable[]
}

/**
 * Un valor posible de una variable.
 *
 * Lo que se ve y lo que se escribe no siempre coinciden: el sexo se elige como «Mujer»
 * y en la fórmula queda un `1`, que es como estaba modelado desde el principio y como
 * siguen funcionando las fórmulas ya escritas.
 */
export interface OpcionVariable {
  etiqueta: string
  /** Ya listo para insertar: entrecomillado si es texto. */
  valorEnFormula: string
}

/** El resultado de probar una fórmula contra un participante. */
export interface PruebaFormula {
  resultado: string
  conUnidad: string
  /** false cuando al participante le falta algún dato que la fórmula necesita. */
  calculable: boolean
  /** Cuánto valió cada variable y en qué unidad entró. */
  variables: Record<string, string>
}
