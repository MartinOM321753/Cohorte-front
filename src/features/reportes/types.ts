/**
 * ─────────────────────────────────────────────────────────────────────────────
 * EL DISEÑO DE UN REPORTE
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Esto es lo que se guarda en la columna `diseno` de la plantilla, y es el
 * contrato entre el editor —que lo escribe— y el maquetador del servidor —que lo
 * convierte en PDF—. Cualquier cambio de forma aquí hay que reflejarlo allá.
 *
 * Todas las medidas van en MILÍMETROS. No es capricho: el resultado se imprime
 * en papel, y razonar en píxeles obligaría a arrastrar un factor de conversión
 * por todo el código y a redondear en cada paso. El lienzo escala milímetros a
 * pantalla en un único sitio.
 *
 * Nada de esto tiene que ver con el módulo de etiquetas, que va por su cuenta.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/** Tamaños de hoja disponibles, con sus medidas reales. */
export const TAMANOS_PAGINA = {
  CARTA:  { nombre: 'Carta',  anchoMm: 215.9, altoMm: 279.4 },
  OFICIO: { nombre: 'Oficio', anchoMm: 215.9, altoMm: 355.6 },
  A4:     { nombre: 'A4',     anchoMm: 210,   altoMm: 297 },
} as const

export type TamanoPagina = keyof typeof TAMANOS_PAGINA

export interface Margenes {
  superiorMm: number
  derechoMm: number
  inferiorMm: number
  izquierdoMm: number
}

/** Lo que todo elemento tiene, sea del tipo que sea. */
export interface ElementoBase {
  id: string
  xMm: number
  yMm: number
  anchoMm: number
  altoMm: number
  /** Orden de apilamiento. Mayor queda encima. */
  z: number
  /**
   * Se dibuja igual en todas las páginas.
   *
   * Sigue existiendo para los diseños que ya lo usaban, pero para membrete y pie
   * ahora hay bandas propias, que es lo que conviene: no hay que acordarse de
   * marcarlo elemento por elemento.
   */
  repiteEnTodas?: boolean
  /** Bloqueado: se ve pero no se puede mover ni redimensionar por accidente. */
  bloqueado?: boolean
  /**
   * Oculto: ni en pantalla ni en el papel.
   *
   * Sirve para apartar algo sin borrarlo mientras se prueba una variante. Se
   * respeta también al imprimir; si solo se ocultara en el editor, saldría en el
   * PDF una cosa que quien lo diseñó creía haber quitado.
   */
  oculto?: boolean
  /**
   * Cómo se llama en el panel de capas. Opcional: sin él se usa una descripción
   * automática, que para un texto es su propio contenido.
   */
  nombre?: string
  /**
   * A qué grupo pertenece, si pertenece a alguno.
   *
   * Agrupar no anida ni crea un elemento contenedor: es una etiqueta compartida.
   * Con eso basta para lo que hace falta —seleccionar y mover juntos un logo y su
   * texto— y evita todo el problema de las coordenadas relativas y del
   * redimensionado en cascada, que es donde estos editores se complican.
   */
  grupoId?: string
  /**
   * Giro en grados, en el sentido de las agujas del reloj.
   *
   * <p>Se aplica con `transform`, que el motor de PDF sí entiende —lo comprobé en
   * su tabla de propiedades—. Las manijas de redimensionado siguen trabajando sin
   * girar: cambiar el tamaño de algo torcido tirando de una esquina requiere
   * rehacer toda la aritmética del arrastre, y no compensa para lo que se usa.</p>
   */
  rotacionGrados?: number
}

export type AlineacionTexto = 'left' | 'center' | 'right' | 'justify'

export interface ElementoTexto extends ElementoBase {
  tipo: 'texto'
  contenido: string
  tamanoPt: number
  negrita?: boolean
  cursiva?: boolean
  color: string
  alineacion: AlineacionTexto
  /** Interlineado como múltiplo del tamaño de letra. */
  interlineado?: number
}

/**
 * Cómo se coloca la imagen dentro de su caja.
 *
 * - `contener`: entera, sin deformar; puede dejar aire a los lados.
 * - `cubrir`: llena la caja sin deformar, recortando lo que sobra.
 * - `estirar`: se deforma hasta ocupar la caja exacta.
 * - `libre`: se acerca y se desplaza a mano, para encuadrar a gusto.
 */
export type AjusteImagen = 'contener' | 'cubrir' | 'estirar' | 'libre'

export interface ElementoImagen extends ElementoBase {
  tipo: 'imagen'
  /** Referencia al archivo. Se guarda la referencia, nunca la imagen. */
  url: string
  /** Texto que describe la imagen, para quien no pueda verla. */
  descripcion?: string
  ajuste?: AjusteImagen
  /**
   * Solo en `libre`: cuánto se acerca, tomando como 1 el tamaño que tendría en
   * `contener`. Partir de ahí y no del tamaño original hace que el encuadre no
   * cambie al sustituir la imagen por otra de distinta resolución.
   */
  zoom?: number
  /** Solo en `libre`: cuánto se corre respecto al centro de la caja, en mm. */
  desplazamientoXMm?: number
  desplazamientoYMm?: number
}

export type FormaFigura =
  | 'rectangulo' | 'elipse' | 'linea' | 'flecha' | 'triangulo' | 'rombo'

/**
 * Cómo se pinta un borde o una línea.
 *
 * <p>Los cuatro están comprobados contra el motor de PDF: aparecen en su tabla de
 * valores. Se dejaron fuera los que dependen de sombreado —`groove`, `ridge`—
 * porque en papel a un cuarto de milímetro no se distinguen de una línea sólida.</p>
 */
export type EstiloBorde = 'solid' | 'dashed' | 'dotted' | 'double'

/** El radio de cada esquina, en milímetros. */
export interface RadiosEsquina {
  supIzq: number
  supDer: number
  infDer: number
  infIzq: number
}

/** Dónde lleva punta una flecha. */
export type PuntaFlecha = 'fin' | 'inicio' | 'ambas'

export interface ElementoFigura extends ElementoBase {
  tipo: 'figura'
  forma: FormaFigura
  relleno?: string
  colorBorde?: string
  grosorBordeMm?: number
  estiloBorde?: EstiloBorde
  /**
   * Radio único, de cuando solo se podía redondear por igual.
   *
   * Se conserva para los diseños que ya lo traen: sin `radios`, este manda en las
   * cuatro esquinas.
   */
  radioMm?: number
  /** Radio por esquina. Si está, sustituye a `radioMm`. */
  radios?: RadiosEsquina
  /** Solo en flecha. */
  punta?: PuntaFlecha
}

/**
 * Una columna de una tabla.
 *
 * <p>Es una cadena y no una unión cerrada a propósito: cada bloque imprime
 * columnas distintas —la tabla de un estudio saca «Parámetro / Resultado / Unidad
 * / Referencia», el listado de estudios saca «Estudio / Fecha / Resultados»— y la
 * lista de cada uno la manda el servidor dentro del catálogo de campos. Tenerla
 * también aquí era lo que hacía que el panel ofreciera marcar columnas que el
 * documento nunca sacaba.</p>
 */
export type ColumnaTabla = string

/** Aspecto de una tabla. Todo opcional: sin nada, sale con el aspecto de siempre. */
export interface EstiloTabla {
  tamanoPt?: number
  colorTexto?: string
  colorEncabezado?: string
  fondoEncabezado?: string
  colorBorde?: string
  mostrarEncabezado?: boolean
  columnas?: ColumnaTabla[]
}

export interface ElementoDatos extends ElementoBase {
  tipo: 'datos'
  /**
   * Qué se inserta. El tipo de estudio va dentro de la clave
   * —`estudio.10.param.101`—, y por eso una misma hoja puede llevar datos de
   * estudios distintos.
   */
  clave: string
  /** Qué hacer cuando el contenido no cabe en la caja. */
  desbordamiento: 'crecer' | 'ajustar' | 'recortar'
  /** Para bloques con tabla: qué filas se muestran. Vacío o ausente = todas. */
  seleccion?: number[]
  /** Para bloques con tabla: cómo se ve. */
  estilo?: EstiloTabla
}

/**
 * Un icono del catálogo.
 *
 * <p>Lo que se guarda es el <b>código del glifo</b>, no un dibujo ni una ruta. Un
 * icono aquí es una letra de una tipografía: el motor de PDF no dibuja SVG sin
 * arrastrar un procesador de XML entero, y PDFBox solo carga tipografías. Con el
 * código, editor y documento pintan exactamente el mismo trazo.</p>
 */
export interface ElementoIcono extends ElementoBase {
  tipo: 'icono'
  /** Código del glifo en hexadecimal, como lo da el catálogo. */
  codigo: string
  /** El nombre con el que se eligió. Solo para reconocerlo en las capas. */
  nombre?: string
  color?: string
}

/**
 * Una celda de una tabla hecha a mano.
 *
 * <p>Lo que se guarda es texto, no un elemento: una tabla con elementos dentro
 * obligaría a arrastrar coordenadas relativas por cada celda y a recolocarlas
 * enteras al insertar una fila. El texto admite marcadores {@code &#123;&#123;clave&#125;&#125;},
 * así que una celda puede traer un dato del participante sin dejar de ser texto.</p>
 */
export interface CeldaTabla {
  texto: string
  negrita?: boolean
  cursiva?: boolean
  alineacion?: AlineacionTexto
  colorTexto?: string
  fondo?: string
}

/** Una columna de una tabla hecha a mano. */
export interface ColumnaPersonalizada {
  /**
   * Ancho como porcentaje del ancho de la caja.
   *
   * En porcentaje y no en milímetros para que al estirar la tabla las columnas se
   * repartan solas: guardando milímetros, ensanchar la caja dejaría un hueco a la
   * derecha que habría que repartir a mano columna por columna.
   */
  anchoPct: number
}

/**
 * Una tabla dibujada a mano, con sus propios encabezados y su propio contenido.
 *
 * <p>No tiene nada que ver con {@link ElementoDatos}: aquel imprime una tabla que
 * arma el servidor a partir de los resultados del participante, y sus columnas son
 * las que ese bloque sabe sacar. Esta la escribe quien diseña, celda por celda, y
 * sirve para lo que ningún bloque cubre —una firma, un cuadro de indicaciones, una
 * rejilla de casillas para llenar a mano—.</p>
 */
export interface ElementoTabla extends ElementoBase {
  tipo: 'tabla'
  columnas: ColumnaPersonalizada[]
  /** Las filas, encabezado incluido: si lo hay, es la primera. */
  filas: CeldaTabla[][]
  /** La primera fila se pinta como encabezado y se repite al partir página. */
  conEncabezado?: boolean
  tamanoPt?: number
  colorTexto?: string
  colorEncabezado?: string
  fondoEncabezado?: string
  colorBorde?: string
  grosorBordeMm?: number
  /** Aire dentro de cada celda, en milímetros. */
  rellenoMm?: number
  /** Fondo de las filas alternas del cuerpo. Ausente: todas iguales. */
  fondoAlterno?: string
  /**
   * Qué hacer cuando la tabla no cabe en la caja.
   *
   * Igual que en los bloques de datos: al crecer, el alto de la caja pasa a ser un
   * mínimo y la tabla sigue hacia abajo; al recortar, se ve solo lo que entra.
   */
  desbordamiento?: 'crecer' | 'recortar'
}

/** Las columnas que sabe dibujar una lista de resultados. */
export const COLUMNAS_LISTA = ['nombre', 'valor', 'barra', 'referencia', 'estado'] as const
export type ColumnaLista = (typeof COLUMNAS_LISTA)[number]

export const ROTULOS_COLUMNA_LISTA: Record<ColumnaLista, string> = {
  nombre: 'Medición',
  valor: 'Resultado',
  barra: 'Barra de rango',
  referencia: 'Referencia',
  estado: 'Estado',
}

/**
 * La lista de resultados del reporte que se entrega al participante.
 *
 * <p>Sale de la misma clave y la misma selección que {@link ElementoDatos}: es el
 * mismo contenido con otro trato, no otro dato. La tabla está pensada para el
 * expediente —densa, columnas parejas—; esto es para quien se lleva el papel a
 * casa, con el valor grande y una barra que enseña dónde cae dentro de lo
 * habitual.</p>
 *
 * <p>La barra es lo único del reporte cuya posición sale del dato y no del diseño:
 * la franja y la marca se colocan en porcentajes que dependen del rango de esa
 * persona, así que se calculan al imprimir y aquí no hay nada que colocar.</p>
 */
export interface ElementoLista extends ElementoBase {
  tipo: 'lista'
  clave: string
  desbordamiento: 'crecer' | 'recortar'
  seleccion?: number[]
  estilo?: EstiloTabla
}

export type Elemento =
  | ElementoTexto | ElementoImagen | ElementoFigura | ElementoDatos | ElementoIcono
  | ElementoTabla | ElementoLista

export interface PaginaDiseno {
  id: string
  elementos: Elemento[]
  /**
   * La hoja reparte su contenido entre las páginas que haga falta, en vez de
   * colocarlo en coordenadas fijas.
   *
   * <p>Existe porque el lienzo tiene alto fijo y recorta: una tabla más larga que
   * la página se cortaba <b>sin avisar</b> —el PDF salía, se veía bien y le
   * faltaban filas—. En flujo los elementos van uno detrás de otro y el motor
   * decide dónde parte.</p>
   *
   * <p>Ausente es lienzo, que es lo que traen todos los diseños anteriores.</p>
   */
  flujo?: boolean
}

/** Dónde vive un elemento: en la hoja, en el membrete o en el pie. */
export type Banda = 'cuerpo' | 'encabezado' | 'pie'

/**
 * El membrete o el pie de página.
 *
 * <p>Sus elementos llevan coordenadas <b>relativas a la banda</b>, no a la hoja.
 * Así, subir el pie de 20 a 30 mm mueve su contenido con él en vez de dejarlo
 * flotando donde estaba, y cambiar de Carta a Oficio no lo abandona a media
 * página.</p>
 *
 * <p>Es opcional en todos los sentidos: un diseño sin bandas no las tiene (los
 * anteriores no las traen y siguen funcionando igual), y tenerlas apagadas no
 * borra lo que haya dentro — se puede volver a encender y ahí sigue.</p>
 */
export interface BandaDiseno {
  activo: boolean
  altoMm: number
  elementos: Elemento[]
}

/**
 * La separación con el borde del papel en las hojas de flujo.
 *
 * <p>Sólo aplica a esas. En el lienzo cada elemento lleva sus milímetros medidos
 * desde la esquina de la hoja, así que un margen de página movería todos los
 * diseños que ya existen.</p>
 */
export interface MargenesFlujo {
  arribaMm: number
  derechaMm: number
  abajoMm: number
  izquierdaMm: number
}

export const MARGENES_FLUJO_POR_DEFECTO: MargenesFlujo = {
  arribaMm: 18, derechaMm: 16, abajoMm: 18, izquierdaMm: 16,
}

export interface DisenoReporte {
  /** Versión del formato. Permite migrar diseños viejos si esto cambia. */
  version: 1
  tamano: TamanoPagina
  orientacion: 'vertical' | 'horizontal'
  margenes: Margenes
  /** Los de las hojas de flujo. Ausente: los de siempre. */
  margenesFlujo?: MargenesFlujo
  paginas: PaginaDiseno[]
  /** Se repite arriba en todas las páginas. Ausente o apagado: no sale nada. */
  encabezado?: BandaDiseno
  /** Se repite abajo en todas las páginas. */
  pie?: BandaDiseno
}

// ── Utilidades del modelo ───────────────────────────────────────────────────

/** Medidas reales de la hoja, ya considerando la orientación. */
export function medidasDe(diseno: Pick<DisenoReporte, 'tamano' | 'orientacion'>) {
  const base = TAMANOS_PAGINA[diseno.tamano]
  return diseno.orientacion === 'horizontal'
    ? { anchoMm: base.altoMm, altoMm: base.anchoMm }
    : { anchoMm: base.anchoMm, altoMm: base.altoMm }
}

export function disenoVacio(): DisenoReporte {
  return {
    version: 1,
    tamano: 'CARTA',
    orientacion: 'vertical',
    margenes: { superiorMm: 18, derechoMm: 15, inferiorMm: 16, izquierdoMm: 15 },
    paginas: [{ id: nuevoId(), elementos: [] }],
  }
}

/**
 * Identificador de un elemento dentro del diseño. No sale de aquí: solo sirve
 * para distinguir elementos entre sí al arrastrarlos y al guardarlos.
 */
export function nuevoId(): string {
  return Math.random().toString(36).slice(2, 10)
}

/** El z más alto usado, para colocar lo nuevo encima de lo demás. */
export function zSuperior(elementos: Elemento[]): number {
  return elementos.reduce((max, e) => Math.max(max, e.z), 0)
}

/**
 * Copias independientes de unos elementos, con identificadores nuevos.
 *
 * <p>Los grupos se rehacen: lo copiado queda agrupado <b>entre sí</b> y no con el
 * original. Compartir la etiqueta haría que mover la copia arrastrara también a lo
 * copiado, que es justo lo contrario de duplicar.</p>
 */
export function clonarElementos(elementos: Elemento[]): Elemento[] {
  const gruposNuevos = new Map<string, string>()
  return elementos.map((e) => {
    const copia: Elemento = JSON.parse(JSON.stringify(e))
    copia.id = nuevoId()
    if (e.grupoId) {
      if (!gruposNuevos.has(e.grupoId)) gruposNuevos.set(e.grupoId, nuevoId())
      copia.grupoId = gruposNuevos.get(e.grupoId)
    }
    return copia
  })
}

/** Una banda vacía, del alto que se le pida. */
export function bandaVacia(altoMm: number): BandaDiseno {
  return { activo: true, altoMm, elementos: [] }
}

/** Los elementos de una banda, o ninguno si no existe o está apagada. */
export function elementosDeBanda(banda: BandaDiseno | undefined): Elemento[] {
  return banda?.activo ? banda.elementos : []
}

/**
 * Desde dónde empieza a pintarse una banda, en milímetros desde el borde
 * superior de la hoja. El pie se ancla abajo, así que depende del alto de la hoja.
 */
export function origenDeBanda(
  banda: Banda,
  diseno: Pick<DisenoReporte, 'tamano' | 'orientacion' | 'pie'>,
): number {
  if (banda !== 'pie') return 0
  const { altoMm } = medidasDe(diseno)
  return altoMm - (diseno.pie?.altoMm ?? 0)
}

/** Un milímetro en puntos tipográficos: 1 pt = 1/72", 1 mm = 1/25.4". */
export const PT_POR_MM = 72 / 25.4

/**
 * A qué tamaño se pinta un icono dentro de su caja.
 *
 * <p>Manda el lado corto para que el glifo quepa entero: los de Material Symbols
 * se dibujan dentro de un cuadrado, así que tomar el lado largo lo desbordaría por
 * el otro. Redimensionar la caja redimensiona el icono, que es lo que se espera al
 * tirar de una esquina.</p>
 */
export function ladoDeIconoMm(anchoMm: number, altoMm: number): number {
  return Math.max(1, Math.min(anchoMm, altoMm))
}

/** Las figuras que llevan relleno; el resto solo tienen trazo. */
export const FORMAS_CON_RELLENO: FormaFigura[] = ['rectangulo', 'elipse', 'triangulo', 'rombo']

/** Las que se dibujan como un trazo de un punto a otro. */
export const FORMAS_DE_TRAZO: FormaFigura[] = ['linea', 'flecha']

export const ROTULOS_FORMA: Record<FormaFigura, string> = {
  rectangulo: 'Rectángulo',
  elipse: 'Elipse',
  linea: 'Línea',
  flecha: 'Flecha',
  triangulo: 'Triángulo',
  rombo: 'Rombo',
}

/**
 * Los cuatro radios de una figura, resolviendo el valor antiguo.
 *
 * Un diseño hecho antes de que se pudiera redondear esquina por esquina solo trae
 * `radioMm`; entonces ese valor vale para las cuatro.
 */
export function radiosDe(el: Pick<ElementoFigura, 'radioMm' | 'radios'>): RadiosEsquina {
  if (el.radios) return el.radios
  const r = el.radioMm ?? 0
  return { supIzq: r, supDer: r, infDer: r, infIzq: r }
}

/** Dónde y de qué tamaño se dibuja la imagen dentro de su caja, en milímetros. */
export interface EncuadreImagen {
  anchoMm: number
  altoMm: number
  izquierdaMm: number
  arribaMm: number
}

/**
 * Resuelve el encuadre de una imagen dentro de su caja.
 *
 * <p>Vive aquí, y no en el CSS, por una razón que costó descubrir: el motor que
 * genera el PDF entiende CSS 2.1 y <b>no conoce {@code object-fit}</b> —no aparece
 * en ninguna parte de sus fuentes—. Así que «entera» y «recortada» se veían bien
 * en el editor y en el papel salían estiradas, sin que nada avisara. Calculando
 * aquí el tamaño y la posición exactos, ambos lados dibujan lo mismo con
 * propiedades que los dos entienden: una caja con {@code overflow:hidden} y una
 * imagen colocada dentro.</p>
 *
 * <p>Sin las medidas reales de la imagen no hay proporción que respetar, así que
 * se cae a estirar, que es lo que hacía antes.</p>
 */
export function encuadreDeImagen(
  caja: { anchoMm: number; altoMm: number },
  intrinseco: { anchoPx?: number | null; altoPx?: number | null } | null | undefined,
  el: Pick<ElementoImagen, 'ajuste' | 'zoom' | 'desplazamientoXMm' | 'desplazamientoYMm'>,
): EncuadreImagen {
  const estirado = {
    anchoMm: caja.anchoMm, altoMm: caja.altoMm, izquierdaMm: 0, arribaMm: 0,
  }

  const ajuste = el.ajuste ?? 'contener'
  if (ajuste === 'estirar') return estirado

  const anchoPx = intrinseco?.anchoPx ?? 0
  const altoPx = intrinseco?.altoPx ?? 0
  if (anchoPx <= 0 || altoPx <= 0) return estirado

  const proporcion = anchoPx / altoPx

  // «Contener» toma el lado que se queda corto; «cubrir», el que se pasa.
  const cabeAncho = caja.anchoMm
  const cabeAlto = caja.altoMm * proporcion
  const baseAncho = ajuste === 'cubrir'
    ? Math.max(cabeAncho, cabeAlto)
    : Math.min(cabeAncho, cabeAlto)

  const zoom = ajuste === 'libre' ? Math.max(0.05, el.zoom ?? 1) : 1
  const ancho = baseAncho * zoom
  const alto = ancho / proporcion

  const dx = ajuste === 'libre' ? (el.desplazamientoXMm ?? 0) : 0
  const dy = ajuste === 'libre' ? (el.desplazamientoYMm ?? 0) : 0

  return {
    anchoMm: ancho,
    altoMm: alto,
    izquierdaMm: (caja.anchoMm - ancho) / 2 + dx,
    arribaMm: (caja.altoMm - alto) / 2 + dy,
  }
}

/**
 * El alto que le corresponde a una caja para respetar la proporción de la imagen.
 *
 * Se usa al elegir una imagen de la galería: dejar la caja de 40×25 con la que
 * nace el elemento obligaba a cuadrarla a mano cada vez.
 */
export function altoParaProporcion(
  anchoMm: number,
  intrinseco: { anchoPx?: number | null; altoPx?: number | null } | null | undefined,
): number | null {
  const anchoPx = intrinseco?.anchoPx ?? 0
  const altoPx = intrinseco?.altoPx ?? 0
  if (anchoPx <= 0 || altoPx <= 0) return null
  return Math.round((anchoMm * altoPx / anchoPx) * 10) / 10
}

// ── Tablas hechas a mano ────────────────────────────────────────────────────

/** Con qué aspecto nace una tabla, y con qué se dibuja lo que no se haya tocado. */
export const TABLA_POR_DEFECTO = {
  tamanoPt: 9,
  colorTexto: '#111111',
  colorEncabezado: '#33505c',
  fondoEncabezado: '#eef3f5',
  colorBorde: '#dde5e9',
  grosorBordeMm: 0.2,
  rellenoMm: 1.5,
} as const

/** Cuántas filas y columnas admite una tabla. */
export const LIMITES_TABLA = { minColumnas: 1, maxColumnas: 12, minFilas: 1, maxFilas: 60 }

/** El alto que se le da a una fila al calcular con cuánto nace la caja. */
const ALTO_FILA_APROX_MM = 7

export function celdaVacia(texto = ''): CeldaTabla {
  return { texto }
}

/**
 * Reparte el ancho a partes iguales.
 *
 * <p>Se recalcula entero en vez de repartir solo la diferencia: después de
 * insertar y quitar columnas varias veces, arrastrar los sobrantes acumulaba
 * décimas hasta que la última columna no llegaba al borde de la caja.</p>
 */
export function anchosARepartir(cuantas: number): ColumnaPersonalizada[] {
  const pct = Math.round((100 / Math.max(1, cuantas)) * 100) / 100
  const cols = Array.from({ length: cuantas }, () => ({ anchoPct: pct }))
  // Lo que falte para cien se le da a la última: con tres columnas, 33.33 tres
  // veces deja la tabla una décima corta.
  if (cols.length > 0) {
    const suma = cols.reduce((t, c) => t + c.anchoPct, 0)
    cols[cols.length - 1].anchoPct = Math.round((cols[cols.length - 1].anchoPct + 100 - suma) * 100) / 100
  }
  return cols
}

/** Los anchos de la tabla, resueltos aunque falten o sobren respecto a las columnas. */
export function anchosDe(tabla: Pick<ElementoTabla, 'columnas' | 'filas'>): number[] {
  const cuantas = cuantasColumnas(tabla)
  const suma = tabla.columnas.reduce((t, c) => t + (c?.anchoPct || 0), 0)
  if (tabla.columnas.length !== cuantas || suma <= 0) {
    return anchosARepartir(cuantas).map((c) => c.anchoPct)
  }
  // Se normaliza al vuelo: un diseño guardado a medias puede no sumar cien, y una
  // tabla que ocupa el 92 % de su caja se vería descuadrada sin decir por qué.
  return tabla.columnas.map((c) => (c.anchoPct / suma) * 100)
}

/** Cuántas columnas tiene de verdad: manda la fila más ancha. */
export function cuantasColumnas(tabla: Pick<ElementoTabla, 'columnas' | 'filas'>): number {
  return Math.max(
    tabla.columnas?.length ?? 0,
    ...(tabla.filas ?? []).map((f) => f.length),
    1,
  )
}

/**
 * Una tabla recién hecha, con encabezados sugeridos.
 *
 * <p>Los títulos salen escritos —«Columna 1», «Columna 2»— y no en blanco a
 * propósito: una tabla vacía sobre la hoja blanca no se distingue del fondo, y
 * quien la acaba de insertar no sabría dónde tiene que escribir.</p>
 */
export function contenidoDeTablaNueva(columnas: number, filas: number, conEncabezado: boolean) {
  const cols = Math.min(LIMITES_TABLA.maxColumnas, Math.max(LIMITES_TABLA.minColumnas, columnas))
  const fils = Math.min(LIMITES_TABLA.maxFilas, Math.max(LIMITES_TABLA.minFilas, filas))

  const cuerpo: CeldaTabla[][] = Array.from(
    { length: conEncabezado ? Math.max(0, fils - 1) : fils },
    () => Array.from({ length: cols }, () => celdaVacia()),
  )
  const encabezado: CeldaTabla[][] = conEncabezado
    ? [Array.from({ length: cols }, (_, i) => ({ texto: `Columna ${i + 1}`, negrita: true }))]
    : []

  return {
    columnas: anchosARepartir(cols),
    filas: [...encabezado, ...cuerpo],
    conEncabezado,
  }
}

/** Con cuánto alto nace la caja de una tabla de tantas filas. */
export function altoDeTablaNuevaMm(filas: number): number {
  return Math.max(ALTO_FILA_APROX_MM, filas * ALTO_FILA_APROX_MM)
}

/** La tabla con una fila más en esa posición. Al final si el índice se pasa. */
export function conFilaInsertada(
  tabla: Pick<ElementoTabla, 'columnas' | 'filas'>, indice: number,
): CeldaTabla[][] {
  const cols = cuantasColumnas(tabla)
  const donde = Math.max(0, Math.min(indice, tabla.filas.length))
  const nueva = Array.from({ length: cols }, () => celdaVacia())
  return [...tabla.filas.slice(0, donde), nueva, ...tabla.filas.slice(donde)]
}

/**
 * La tabla sin esa fila.
 *
 * <p>Nunca deja la tabla sin ninguna: una tabla de cero filas no se ve, y en la
 * hoja queda un recuadro seleccionado que no se sabe qué es ni cómo recuperar.</p>
 */
export function conFilaEliminada(
  tabla: Pick<ElementoTabla, 'filas'>, indice: number,
): CeldaTabla[][] {
  if (tabla.filas.length <= LIMITES_TABLA.minFilas) return tabla.filas
  return tabla.filas.filter((_, i) => i !== indice)
}

/** La tabla con una columna más en esa posición, con el ancho repartido de nuevo. */
export function conColumnaInsertada(
  tabla: Pick<ElementoTabla, 'columnas' | 'filas' | 'conEncabezado'>, indice: number,
): Pick<ElementoTabla, 'columnas' | 'filas'> {
  const cols = cuantasColumnas(tabla)
  if (cols >= LIMITES_TABLA.maxColumnas) return { columnas: tabla.columnas, filas: tabla.filas }

  const donde = Math.max(0, Math.min(indice, cols))
  const filas = tabla.filas.map((fila, i) => {
    // La celda nueva del encabezado nace con título: un encabezado con un hueco en
    // blanco parece un fallo del documento y no una columna sin nombrar.
    const nacida: CeldaTabla = tabla.conEncabezado && i === 0
      ? { texto: `Columna ${donde + 1}`, negrita: true }
      : celdaVacia()
    const completa = rellenarHasta(fila, cols)
    return [...completa.slice(0, donde), nacida, ...completa.slice(donde)]
  })
  return { columnas: anchosARepartir(cols + 1), filas }
}

/** La tabla sin esa columna. Nunca deja la tabla sin ninguna. */
export function conColumnaEliminada(
  tabla: Pick<ElementoTabla, 'columnas' | 'filas'>, indice: number,
): Pick<ElementoTabla, 'columnas' | 'filas'> {
  const cols = cuantasColumnas(tabla)
  if (cols <= LIMITES_TABLA.minColumnas) return { columnas: tabla.columnas, filas: tabla.filas }

  const filas = tabla.filas.map((fila) =>
    rellenarHasta(fila, cols).filter((_, i) => i !== indice))
  return { columnas: anchosARepartir(cols - 1), filas }
}

/**
 * La tabla con una columna más ancha o más estrecha.
 *
 * <p>Lo que esa columna gana se lo quitan las demás en proporción a lo que tenían,
 * de modo que la suma sigue siendo cien. Dejar que cada una se escribiera suelta
 * daba tablas que sumaban 92 o 140: la primera no llegaba al borde de la caja y la
 * segunda se salía, sin que ningún número del panel lo delatara.</p>
 */
export function conAnchoCambiado(
  tabla: Pick<ElementoTabla, 'columnas' | 'filas'>, indice: number, pct: number,
): ColumnaPersonalizada[] {
  const actuales = anchosDe(tabla)
  if (indice < 0 || indice >= actuales.length) return tabla.columnas
  if (actuales.length === 1) return [{ anchoPct: 100 }]

  // Se deja sitio para que ninguna otra columna quede en cero: una columna sin
  // ancho no se puede volver a agarrar para devolverle el suyo.
  const minimo = 2
  const tope = 100 - minimo * (actuales.length - 1)
  const nuevo = Math.max(minimo, Math.min(tope, pct))

  const restoAntes = 100 - actuales[indice]
  const restoAhora = 100 - nuevo

  return actuales.map((a, i) => {
    if (i === indice) return { anchoPct: redondear(nuevo) }
    // Si antes no quedaba nada que repartir, se reparte a partes iguales.
    const proporcion = restoAntes > 0 ? a / restoAntes : 1 / (actuales.length - 1)
    return { anchoPct: redondear(Math.max(minimo, restoAhora * proporcion)) }
  })
}

function redondear(v: number): number {
  return Math.round(v * 100) / 100
}

/** La tabla con una celda cambiada. */
export function conCeldaCambiada(
  tabla: Pick<ElementoTabla, 'columnas' | 'filas'>,
  fila: number, columna: number, cambios: Partial<CeldaTabla>,
): CeldaTabla[][] {
  const cols = cuantasColumnas(tabla)
  return tabla.filas.map((f, i) => {
    if (i !== fila) return f
    return rellenarHasta(f, cols).map((c, j) => (j === columna ? { ...c, ...cambios } : c))
  })
}

/**
 * Una fila con tantas celdas como columnas tenga la tabla.
 *
 * Las filas pueden quedarse cortas —un diseño guardado antes de añadir una
 * columna—, y sin igualarlas la tabla saldría con huecos que no se pueden pulsar.
 */
export function rellenarHasta(fila: CeldaTabla[], columnas: number): CeldaTabla[] {
  if (fila.length >= columnas) return fila.slice(0, columnas)
  return [...fila, ...Array.from({ length: columnas - fila.length }, () => celdaVacia())]
}

/** Las filas ya cuadradas a las columnas de la tabla, que es como se dibujan. */
export function filasCuadradas(tabla: Pick<ElementoTabla, 'columnas' | 'filas'>): CeldaTabla[][] {
  const cols = cuantasColumnas(tabla)
  return (tabla.filas ?? []).map((f) => rellenarHasta(f, cols))
}

/**
 * Cómo se llama un elemento en el panel de capas.
 *
 * <p>Se prefiere el nombre puesto a mano; si no hay, se describe por lo que es.
 * Un texto se describe por su contenido, que es lo que quien diseña reconoce de
 * un vistazo: «Texto» repetido nueve veces no distingue nada.</p>
 */
export function rotuloDeElemento(el: Elemento): string {
  if (el.nombre && el.nombre.trim()) return el.nombre.trim()

  switch (el.tipo) {
    case 'texto': {
      const limpio = (el.contenido ?? '').replace(/\s+/g, ' ').trim()
      if (!limpio) return 'Texto vacío'
      return limpio.length > 40 ? limpio.slice(0, 40) + '…' : limpio
    }
    case 'imagen': return el.descripcion?.trim() || 'Imagen'
    case 'figura':
      return el.forma === 'linea' ? 'Línea'
           : el.forma === 'elipse' ? 'Elipse' : 'Rectángulo'
    case 'datos': return el.clave
    case 'lista': return `Lista · ${el.clave}`
    case 'icono': return el.nombre ? `Icono: ${el.nombre}` : 'Icono'
    case 'tabla': {
      // Se describe por su tamaño y no por su contenido: el primer título de una
      // tabla —«Fecha», «Concepto»— no distingue una tabla de otra en la lista.
      const columnas = cuantasColumnas(el)
      const filas = el.filas?.length ?? 0
      return `Tabla ${filas}×${columnas}`
    }
  }
}
