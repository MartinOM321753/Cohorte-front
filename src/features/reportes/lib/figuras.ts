import type { ElementoFigura } from '../types'
import { radiosDe } from '../types'

/**
 * Cómo se dibuja cada figura, en piezas que el motor de PDF sabe pintar.
 *
 * <p>Aquí no hay SVG ni `canvas`: el generador de PDF entiende CSS 2.1 con algunos
 * añadidos, y de ellos están comprobados —buscándolos en sus propias fuentes— el
 * radio por esquina, los estilos de borde `dashed`, `dotted` y `double`, y
 * `transform` con `rotate`. Quedaron fuera `opacity` y `box-shadow`, que no
 * reconoce: usarlos habría dado un editor bonito y un papel distinto.</p>
 *
 * <p>Por eso el triángulo y las puntas de flecha se construyen con el truco de los
 * bordes —una caja sin tamaño cuyos bordes laterales son transparentes— y el rombo
 * con un cuadrado girado. Son formas que salen de rectángulos, que es lo único que
 * ambos lados dibujan igual.</p>
 *
 * <p>Las medidas se dan en una unidad genérica: el lienzo pasa milímetros por la
 * escala de pantalla y el maquetador los emite en milímetros. La función es la
 * misma; solo cambia con qué se multiplica.</p>
 */

/** Una caja hija de la figura, ya resuelta a propiedades de estilo. */
export interface PiezaFigura {
  /** Estilos en pares CSS, listos para pintar. */
  estilo: Record<string, string>
}

const COLOR_TRAZO = '#333333'
const GROSOR_TRAZO_MM = 0.3

/**
 * Las piezas de una figura, en unidades ya convertidas.
 *
 * @param u factor por el que se multiplica cada milímetro
 */
export function piezasDeFigura(
  el: Pick<ElementoFigura, 'forma' | 'relleno' | 'colorBorde' | 'grosorBordeMm'
                          | 'estiloBorde' | 'radioMm' | 'radios' | 'punta'>,
  anchoMm: number,
  altoMm: number,
  u: number,
): PiezaFigura[] {
  const color = el.colorBorde ?? COLOR_TRAZO
  const estilo = el.estiloBorde ?? 'solid'
  const grosorMm = el.grosorBordeMm ?? 0

  switch (el.forma) {
    case 'linea':
      return [trazo(anchoMm, altoMm, el.grosorBordeMm ?? GROSOR_TRAZO_MM, color, estilo, u)]

    case 'flecha':
      return flecha(anchoMm, altoMm, el.grosorBordeMm ?? GROSOR_TRAZO_MM, color, estilo,
                    el.punta ?? 'fin', u)

    case 'triangulo':
      // Sin tamaño propio: lo que se ve son sus bordes. El de abajo lleva el color
      // del relleno y los laterales son transparentes, así que queda una punta.
      return [{
        estilo: {
          position: 'absolute', left: '0', top: '0', width: '0', height: '0',
          borderLeft: `${(anchoMm / 2) * u}px solid transparent`,
          borderRight: `${(anchoMm / 2) * u}px solid transparent`,
          borderBottom: `${altoMm * u}px solid ${el.relleno ?? color}`,
        },
      }]

    case 'rombo': {
      // Un rectángulo girado 45°. Se encoge por raíz de dos para que las puntas no
      // se salgan de la caja al girar.
      const lado = 1 / Math.SQRT2
      const w = anchoMm * lado
      const h = altoMm * lado
      return [{
        estilo: {
          position: 'absolute',
          left: `${((anchoMm - w) / 2) * u}px`,
          top: `${((altoMm - h) / 2) * u}px`,
          width: `${w * u}px`,
          height: `${h * u}px`,
          background: el.relleno ?? 'transparent',
          ...(grosorMm > 0 ? { border: `${grosorMm * u}px ${estilo} ${color}` } : {}),
          transform: 'rotate(45deg)',
        },
      }]
    }

    case 'elipse':
      return [{
        estilo: {
          position: 'absolute', left: '0', top: '0', width: '100%', height: '100%',
          background: el.relleno ?? 'transparent',
          ...(grosorMm > 0 ? { border: `${grosorMm * u}px ${estilo} ${color}` } : {}),
          borderRadius: '50%',
        },
      }]

    default: {
      const r = radiosDe(el)
      return [{
        estilo: {
          position: 'absolute', left: '0', top: '0', width: '100%', height: '100%',
          background: el.relleno ?? 'transparent',
          ...(grosorMm > 0 ? { border: `${grosorMm * u}px ${estilo} ${color}` } : {}),
          borderTopLeftRadius: `${r.supIzq * u}px`,
          borderTopRightRadius: `${r.supDer * u}px`,
          borderBottomRightRadius: `${r.infDer * u}px`,
          borderBottomLeftRadius: `${r.infIzq * u}px`,
        },
      }]
    }
  }
}

/**
 * El trazo de una línea.
 *
 * <p>Se dibuja como el borde superior de una caja sin alto, y no como un rectángulo
 * de color. Es lo que permite que salga discontinua: un rectángulo relleno no tiene
 * forma de ser punteado, mientras que un borde sí.</p>
 */
function trazo(anchoMm: number, altoMm: number, grosorMm: number,
               color: string, estilo: string, u: number): PiezaFigura {
  return {
    estilo: {
      position: 'absolute',
      left: '0',
      top: `${((altoMm - grosorMm) / 2) * u}px`,
      width: `${anchoMm * u}px`,
      height: '0',
      borderTop: `${grosorMm * u}px ${estilo} ${color}`,
    },
  }
}

/**
 * Una flecha: el trazo y sus puntas.
 *
 * <p>La punta se acorta el trazo por debajo para que no asome por delante del
 * vértice, que es lo que delata una flecha mal montada.</p>
 */
function flecha(anchoMm: number, altoMm: number, grosorMm: number,
                color: string, estilo: string, punta: string, u: number): PiezaFigura[] {
  const largoPunta = Math.max(grosorMm * 3, 2)
  const medioAlto = Math.max(grosorMm * 2, 1.4)

  const alInicio = punta === 'inicio' || punta === 'ambas'
  const alFin = punta === 'fin' || punta === 'ambas'

  const desdeMm = alInicio ? largoPunta : 0
  const hastaMm = anchoMm - (alFin ? largoPunta : 0)
  const centro = (altoMm - grosorMm) / 2

  const piezas: PiezaFigura[] = [{
    estilo: {
      position: 'absolute',
      left: `${desdeMm * u}px`,
      top: `${centro * u}px`,
      width: `${Math.max(0, hastaMm - desdeMm) * u}px`,
      height: '0',
      borderTop: `${grosorMm * u}px ${estilo} ${color}`,
    },
  }]

  if (alFin) {
    piezas.push({
      estilo: {
        position: 'absolute',
        left: `${hastaMm * u}px`,
        top: `${(altoMm / 2 - medioAlto) * u}px`,
        width: '0', height: '0',
        borderTop: `${medioAlto * u}px solid transparent`,
        borderBottom: `${medioAlto * u}px solid transparent`,
        borderLeft: `${largoPunta * u}px solid ${color}`,
      },
    })
  }
  if (alInicio) {
    piezas.push({
      estilo: {
        position: 'absolute',
        left: '0',
        top: `${(altoMm / 2 - medioAlto) * u}px`,
        width: '0', height: '0',
        borderTop: `${medioAlto * u}px solid transparent`,
        borderBottom: `${medioAlto * u}px solid transparent`,
        borderRight: `${largoPunta * u}px solid ${color}`,
      },
    })
  }
  return piezas
}
