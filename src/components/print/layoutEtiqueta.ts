/**
 * Maquetado del contenido de una etiqueta dentro de su recuadro.
 *
 * Una etiqueta es una caja de tamaño fijo con un área útil dentro. Este módulo
 * decide qué tan grande sale cada elemento para que todo quepa en esa área, y
 * devuelve posiciones ya resueltas relativas a la esquina de la caja. Quien
 * dibuja —la vista previa, la hoja impresa o el generador de ZPL— solo coloca.
 *
 * Antes cada superficie hacía su propia cuenta: la vista de impresión, la vista
 * previa del panel de configuración y el generador de ZPL tenían tres copias del
 * mismo algoritmo, y ya habían divergido entre sí. Ninguna comprobaba que el
 * contenido cupiera, así que un código de barras largo o una fuente grande se
 * salían del recuadro sin que nada lo advirtiera.
 */

import type { DisposicionEtiqueta, TipoCodigo } from '@/types/api'

export type ElementoEtiqueta = 'NOMBRE' | 'CODIGO' | 'ETIQUETA'

/**
 * Lo que el maquetado necesita saber de la configuración. Se declara de forma
 * estructural para que sirva igual con la configuración guardada que con el
 * formulario del panel, que aún no tiene todos los campos resueltos.
 */
export interface ConfigMaquetado {
  anchoMm: number
  altoMm: number
  dpi: number
  margenIzquierdoMm: number
  margenSuperiorMm: number
  margenDerechoMm?: number
  margenInferiorMm?: number
  tipoCodigo: TipoCodigo
  moduloCodigo: number
  anchoBarraCodigo?: number
  tamanoFuenteNombre: number
  tamanoFuenteEtiqueta: number
  espaciadoNombre: number
  espaciadoCodigo: number
  espaciadoEtiqueta: number
  mostrarNombre: boolean
  mostrarCodigo: boolean
  mostrarEtiqueta: boolean
  disposicion: DisposicionEtiqueta
}

/** Medida de un símbolo a una escala dada, en milímetros. */
export interface MedidaCodigo {
  anchoMm: number
  altoMm: number
}

/**
 * Mide el símbolo a la escala pedida (módulo o ancho de barra, en dots).
 * El maquetado la llama varias veces mientras busca la escala que quepa, así
 * que conviene que quien la implemente memorice sus resultados.
 */
export type MedirCodigo = (escalaDots: number) => MedidaCodigo | null

export interface ElementoMaquetado {
  tipo: ElementoEtiqueta
  /** Posición relativa a la esquina superior izquierda de la etiqueta. */
  topMm: number
  leftMm: number
  anchoMm: number
  altoMm: number
  /** Tamaño de letra ya reducido, en puntos. Solo en NOMBRE y ETIQUETA. */
  fontPt?: number
  /** Escala del símbolo ya reducida, en dots. Solo en CODIGO. */
  escalaDots?: number
  /**
   * Grosor de la barra angosta con que sale el símbolo, en milímetros. Es lo que
   * decide si una lectora lo va a poder leer: la norma pide 0.19 mm o más para
   * Code 128 con pistola de mano.
   */
  anchoModuloMm?: number
}

export interface AreaUtil {
  leftMm: number
  topMm: number
  anchoMm: number
  altoMm: number
}

export interface Maquetado {
  areaUtil: AreaUtil
  elementos: ElementoMaquetado[]
  /**
   * El contenido no cabe ni en su tamaño mínimo. La caja lo recorta de todos
   * modos —nunca se dibuja fuera—, pero conviene avisarlo: significa que la
   * etiqueta es demasiado chica para lo que se le pidió.
   */
  desbordado: boolean
  /** El símbolo tuvo que achicarse respecto a lo configurado. */
  codigoReducido: boolean
  /** La letra tuvo que achicarse respecto a lo configurado. */
  fuenteReducida: boolean
}

/** Por debajo de esto la letra deja de ser legible impresa; no se reduce más. */
const MIN_FUENTE_DOTS = 8

/** El símbolo más chico que una lectora reconoce con holgura. */
const MIN_ESCALA_DOTS = 1

/**
 * Módulos en blanco que Code 128 exige a cada lado del símbolo.
 *
 * No se reservaban. Un código puede tener las barras perfectas y aun así no
 * leerse si arranca pegado al borde de la etiqueta, porque el lector necesita
 * ese blanco para encontrar dónde empieza.
 */
const ZONA_MUDA_MODULOS = 10

export function getOrdenElementos(disposicion: DisposicionEtiqueta): ElementoEtiqueta[] {
  switch (disposicion) {
    case 'NOMBRE_CODIGO_ETIQUETA': return ['NOMBRE', 'CODIGO', 'ETIQUETA']
    case 'CODIGO_NOMBRE_ETIQUETA': return ['CODIGO', 'NOMBRE', 'ETIQUETA']
    case 'CODIGO_ETIQUETA': return ['CODIGO', 'ETIQUETA']
    case 'NOMBRE_ETIQUETA_CODIGO': return ['NOMBRE', 'ETIQUETA', 'CODIGO']
    default: return ['NOMBRE', 'CODIGO', 'ETIQUETA']
  }
}

export function dotsToMm(dots: number, dpi: number): number {
  return (dots / dpi) * 25.4
}

export function dotsToPt(dots: number, dpi: number): number {
  return (dots / dpi) * 72
}

/**
 * Escala con que se pide el símbolo. En los códigos de dos dimensiones la fija
 * el módulo; en Code 128 la fija el ancho de barra, porque el módulo va a la
 * altura de las barras (`^BCN,<modulo*10>` en ZPL).
 */
export function escalaCodigoConfigurada(config: ConfigMaquetado): number {
  return config.tipoCodigo === 'CODE_128'
    ? (config.anchoBarraCodigo ?? 2)
    : config.moduloCodigo
}

function margenDerecho(config: ConfigMaquetado): number {
  const propio = config.margenDerechoMm
  // Sin margen derecho propio el área útil es simétrica, que es como se venía
  // calculando: ancho - 2 * margen izquierdo.
  return propio !== undefined && propio > 0 ? propio : config.margenIzquierdoMm
}

function margenInferior(config: ConfigMaquetado): number {
  return config.margenInferiorMm ?? 0
}

interface Pieza {
  tipo: ElementoEtiqueta
  altoMm: number
  /** Ancho que ocupa el dibujo del elemento. */
  anchoMm: number
  /** Ancho que necesita reservado, incluida la zona muda si la exige. */
  anchoNecesarioMm: number
  gapMm: number
  fontPt?: number
  escalaDots?: number
  /** Módulos del símbolo. Permite recalcular su ancho a cualquier escala. */
  modulos?: number
}

/**
 * Arma las piezas a una escala de símbolo y un factor de letra dados, y dice
 * cuánto miden en total. Es la función que la cascada evalúa una y otra vez.
 */
function armar(
  config: ConfigMaquetado,
  orden: ElementoEtiqueta[],
  medir: MedirCodigo,
  escalaDots: number,
  factorFuente: number,
): { piezas: Pieza[]; altoTotalMm: number; anchoMaxMm: number } {
  const dpi = config.dpi
  const piezas: Pieza[] = []

  for (const tipo of orden) {
    if (tipo === 'NOMBRE') {
      if (!config.mostrarNombre) continue
      const dots = Math.max(MIN_FUENTE_DOTS, config.tamanoFuenteNombre * factorFuente)
      piezas.push({
        tipo,
        altoMm: dotsToMm(dots, dpi),
        anchoMm: 0, // el texto se contiene solo, recortándose a lo ancho
        anchoNecesarioMm: 0,
        gapMm: dotsToMm(config.espaciadoNombre, dpi),
        fontPt: dotsToPt(dots, dpi),
      })
    } else if (tipo === 'ETIQUETA') {
      if (!config.mostrarEtiqueta) continue
      const dots = Math.max(MIN_FUENTE_DOTS, config.tamanoFuenteEtiqueta * factorFuente)
      piezas.push({
        tipo,
        altoMm: dotsToMm(dots, dpi),
        anchoMm: 0,
        anchoNecesarioMm: 0,
        gapMm: dotsToMm(config.espaciadoEtiqueta, dpi),
        fontPt: dotsToPt(dots, dpi),
      })
    } else {
      if (!config.mostrarCodigo) continue
      const medida = medir(escalaDots)
      if (!medida) continue

      // Los códigos lineales tienen que reservar además la zona muda; los de
      // dos dimensiones la llevan incorporada en el propio símbolo.
      const esLineal = config.tipoCodigo === 'CODE_128'
      const anchoModulo = dotsToMm(escalaDots, dpi)
      const modulos = anchoModulo > 0 ? medida.anchoMm / anchoModulo : 0

      piezas.push({
        tipo,
        altoMm: medida.altoMm,
        anchoMm: medida.anchoMm,
        anchoNecesarioMm: esLineal
          ? medida.anchoMm + 2 * ZONA_MUDA_MODULOS * anchoModulo
          : medida.anchoMm,
        gapMm: dotsToMm(config.espaciadoCodigo, dpi),
        escalaDots,
        modulos: esLineal ? modulos : undefined,
      })
    }
  }

  // La separación va entre elementos. Antes se sumaba también después del
  // último, y ese sobrante robaba altura útil sin corresponder a nada visible.
  const altoTotalMm = piezas.reduce(
    (acc, p, i) => acc + p.altoMm + (i < piezas.length - 1 ? p.gapMm : 0),
    0,
  )
  const anchoMaxMm = piezas.reduce((acc, p) => Math.max(acc, p.anchoNecesarioMm), 0)

  return { piezas, altoTotalMm, anchoMaxMm }
}

/**
 * Resuelve el contenido de una etiqueta dentro de su recuadro.
 *
 * Busca primero la escala de símbolo más grande que quepa —achicar el código
 * conserva la legibilidad del texto, que es lo que una persona lee— y solo si
 * con el símbolo mínimo sigue sin caber reduce la letra.
 */
export function layoutEtiqueta(config: ConfigMaquetado, medir: MedirCodigo): Maquetado {
  const areaUtil: AreaUtil = {
    leftMm: config.margenIzquierdoMm,
    topMm: config.margenSuperiorMm,
    anchoMm: Math.max(0, config.anchoMm - config.margenIzquierdoMm - margenDerecho(config)),
    altoMm: Math.max(0, config.altoMm - config.margenSuperiorMm - margenInferior(config)),
  }

  const orden = getOrdenElementos(config.disposicion)
  const escalaConfigurada = Math.max(MIN_ESCALA_DOTS, Math.round(escalaCodigoConfigurada(config)))

  type Medida = { altoTotalMm: number; anchoMaxMm: number }
  const cabeAlto = (r: Medida) => r.altoTotalMm <= areaUtil.altoMm
  const cabeAncho = (r: Medida) => r.anchoMaxMm <= areaUtil.anchoMm
  const cabe = (r: Medida) => cabeAlto(r) && cabeAncho(r)

  let escala = escalaConfigurada
  let resultado = armar(config, orden, medir, escala, 1)

  // Cascada 1: achicar el símbolo. Es lo único que reduce el ancho, y de paso
  // reduce el alto, así que sirve contra las dos restricciones.
  while (!cabe(resultado) && escala > MIN_ESCALA_DOTS) {
    escala -= 1
    resultado = armar(config, orden, medir, escala, 1)
  }

  // Cascada 2: la letra solo se achica cuando lo que falta es ALTO.
  //
  // Antes bastaba con que algo no cupiera para reducirla, incluso si el que no
  // cabía era el símbolo a lo ancho. En una etiqueta angosta eso dejaba el
  // texto en 3 pt —ilegible— sin quitarle un milímetro al código, que es lo que
  // en realidad no cabía. El desborde a lo ancho se sigue reportando; lo que se
  // evita es estropear el texto a cambio de nada.
  let factorFuente = 1
  while (!cabeAlto(resultado) && factorFuente > 0.5) {
    factorFuente = Math.round((factorFuente - 0.05) * 100) / 100
    resultado = armar(config, orden, medir, escala, factorFuente)
  }

  // Los códigos lineales se ensanchan hasta llenar el área útil.
  //
  // El grosor de barra se venía eligiendo en dots enteros de la impresora, que a
  // 203 dpi saltan de 0.125 a 0.25 mm. Cuando el salto grande no cabía, quedaba
  // el chico —la mitad de grueso— y con él una franja de la etiqueta sin usar:
  // en una etiqueta de 39.5 mm eso dejaba barras de 4.9 mil habiendo espacio
  // para 8.5. Aquí no se imprime en dots sino en milímetros, así que el grosor
  // puede tomar cualquier valor intermedio y conviene usar el mayor que quepa,
  // sin pasar del configurado. Las proporciones entre barras no cambian, que es
  // lo único que el símbolo necesita conservar para seguir siendo válido.
  for (const p of resultado.piezas) {
    if (p.tipo !== 'CODIGO' || !p.modulos || p.modulos <= 0) continue

    const anchoModuloActual = p.anchoMm / p.modulos
    const anchoModuloMax = areaUtil.anchoMm / (p.modulos + 2 * ZONA_MUDA_MODULOS)
    const anchoModuloConfig = dotsToMm(escalaConfigurada, config.dpi)
    const anchoModulo = Math.min(anchoModuloConfig, anchoModuloMax)

    if (anchoModulo > anchoModuloActual) {
      p.anchoMm = p.modulos * anchoModulo
      p.anchoNecesarioMm = (p.modulos + 2 * ZONA_MUDA_MODULOS) * anchoModulo
    }
  }

  // Posiciones, ya desde el borde del área útil y hacia abajo.
  const elementos: ElementoMaquetado[] = []
  let y = areaUtil.topMm

  for (let i = 0; i < resultado.piezas.length; i++) {
    const p = resultado.piezas[i]
    const anchoElemento = p.anchoMm > 0 ? Math.min(p.anchoMm, areaUtil.anchoMm) : areaUtil.anchoMm
    // Centrado dentro del área útil, nunca antes de su borde izquierdo.
    const left = areaUtil.leftMm + Math.max(0, (areaUtil.anchoMm - anchoElemento) / 2)

    elementos.push({
      tipo: p.tipo,
      topMm: y,
      leftMm: left,
      anchoMm: anchoElemento,
      altoMm: p.altoMm,
      fontPt: p.fontPt,
      escalaDots: p.escalaDots,
      anchoModuloMm: p.modulos && p.modulos > 0 ? anchoElemento / p.modulos : undefined,
    })

    y += p.altoMm + (i < resultado.piezas.length - 1 ? p.gapMm : 0)
  }

  return {
    areaUtil,
    elementos,
    desbordado: !cabe(resultado),
    codigoReducido: escala < escalaConfigurada,
    fuenteReducida: factorFuente < 1,
  }
}
