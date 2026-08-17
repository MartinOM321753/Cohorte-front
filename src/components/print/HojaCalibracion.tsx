/**
 * Hoja de calibración: la cuadrícula vacía, con reglas y marcas medibles.
 *
 * Sirve para averiguar cuánto deforma la hoja el controlador de la impresora.
 * Ese desplazamiento y ese encogimiento no se pueden leer desde el navegador —el
 * diálogo de impresión ajusta la página por su cuenta— así que la única forma de
 * corregirlos es imprimir una vez, medir con una regla y guardar la corrección.
 *
 * Se dibuja con la misma geometría y los mismos estilos que la hoja de
 * etiquetas, de modo que lo que se mide aquí es exactamente lo que después se
 * imprime.
 */

import type { ConfiguracionEtiquetaResponse } from '@/types/api'
import type { GeometriaHoja } from './hojaImpresion'

/** Estilos propios de la calibración; se suman a los de la hoja. */
export const ESTILOS_CALIBRACION = `
.cal-caja {
  position: absolute;
  box-sizing: border-box;
  border: 0.3mm solid #000;
}
.cal-caja-num {
  position: absolute;
  top: 0.5mm;
  left: 0.8mm;
  font-size: 6pt;
  color: #666;
}
/* Marcas de referencia: las dos líneas de cada eje que se miden con la regla. */
.cal-linea-h {
  position: absolute;
  left: 0;
  height: 0;
  border-top: 0.25mm solid #d00;
}
.cal-linea-v {
  position: absolute;
  top: 0;
  width: 0;
  border-left: 0.25mm solid #d00;
}
.cal-rotulo {
  position: absolute;
  font-size: 7pt;
  color: #d00;
  white-space: nowrap;
  background: #fff;
  padding: 0 0.5mm;
}
/* Reglas milimetradas pegadas a los bordes de la hoja. Van por encima de las
   cajas: el margen de página puede ser estrecho y entonces la regla cae sobre la
   primera fila o columna, y se prefiere que la regla siga siendo legible. */
.cal-tick-h { position: absolute; top: 0; width: 0; border-left: 0.15mm solid #000; z-index: 2; }
.cal-tick-v { position: absolute; left: 0; height: 0; border-top: 0.15mm solid #000; z-index: 2; }
.cal-tick-num {
  position: absolute;
  font-size: 5pt;
  color: #000;
  background: #fff;
  line-height: 1;
  z-index: 2;
}
/* El número de la regla vertical se escribe hacia abajo para que quepa en el
   margen izquierdo, que suele medir menos de 5 mm. */
.cal-tick-num-v { writing-mode: vertical-rl; }
.cal-cruz-h { position: absolute; height: 0; border-top: 0.3mm solid #000; }
.cal-cruz-v { position: absolute; width: 0; border-left: 0.3mm solid #000; }
.cal-pie {
  position: absolute;
  left: 8mm;
  font-size: 7pt;
  color: #333;
  line-height: 1.5;
}
`

/**
 * Separación a la que se dibujan las reglas respecto al borde del papel.
 *
 * Toda impresora reserva una franja que su mecánica no alcanza a marcar —entre 3
 * y 6 mm según el modelo—. Las reglas se dibujaban pegadas al borde, o sea
 * dentro de esa franja, así que salían recortadas o no salían. Las marcas siguen
 * colocadas en su milímetro exacto: lo único que cambia es que el trazo arranca
 * más adentro, donde la impresora sí llega.
 */
const INSET_REGLA_MM = 7

/** Marca en cruz de 4 mm, para ver a simple vista si la hoja salió corrida. */
function Cruz({ xMm, yMm }: { xMm: number; yMm: number }) {
  return (
    <>
      <div className="cal-cruz-h" style={{ left: `${xMm - 2}mm`, top: `${yMm}mm`, width: '4mm' }} />
      <div className="cal-cruz-v" style={{ left: `${xMm}mm`, top: `${yMm - 2}mm`, height: '4mm' }} />
    </>
  )
}

/** Regla milimetrada: raya cada milímetro, más larga cada 5, numerada cada 10. */
function Regla({ largoMm, orientacion }: { largoMm: number; orientacion: 'h' | 'v' }) {
  const marcas = []
  for (let mm = 0; mm <= Math.floor(largoMm); mm++) {
    const largo = mm % 10 === 0 ? 4 : mm % 5 === 0 ? 2.5 : 1.2
    // El trazo arranca en el inset seguro y crece hacia adentro de la hoja.
    marcas.push(
      orientacion === 'h' ? (
        <div
          key={mm}
          className="cal-tick-h"
          style={{ left: `${mm}mm`, top: `${INSET_REGLA_MM}mm`, height: `${largo}mm` }}
        />
      ) : (
        <div
          key={mm}
          className="cal-tick-v"
          style={{ top: `${mm}mm`, left: `${INSET_REGLA_MM}mm`, width: `${largo}mm` }}
        />
      ),
    )
    if (mm % 10 === 0 && mm > 0) {
      marcas.push(
        <div
          key={`n${mm}`}
          className={`cal-tick-num${orientacion === 'v' ? ' cal-tick-num-v' : ''}`}
          style={
            orientacion === 'h'
              ? { left: `${mm + 0.3}mm`, top: `${INSET_REGLA_MM + 4.2}mm` }
              : { top: `${mm + 0.3}mm`, left: `${INSET_REGLA_MM + 4.2}mm` }
          }
        >
          {mm}
        </div>,
      )
    }
  }
  return <>{marcas}</>
}

interface HojaCalibracionProps {
  config: ConfiguracionEtiquetaResponse
  geo: GeometriaHoja
}

/**
 * Contenido de la hoja de calibración. Se pinta dentro de un `.hoja`, igual que
 * las etiquetas: las cajas caen en las mismas posiciones que ocuparían ellas.
 */
export function HojaCalibracion({ config, geo }: HojaCalibracionProps) {
  const { cols, rows, origenXMm, origenYMm, pasoHorizontalMm, pasoVerticalMm } = geo

  // Las cuatro medidas que el operador toma con la regla. Se eligen los bordes
  // extremos de la cuadrícula porque cuanto más separadas estén, menos pesa el
  // error de lectura de la regla sobre el factor de escala que se calcula.
  const y1 = origenYMm
  const yN = origenYMm + (rows - 1) * pasoVerticalMm
  const x1 = origenXMm
  const xN = origenXMm + (cols - 1) * pasoHorizontalMm

  const cajas = []
  for (let f = 0; f < rows; f++) {
    for (let c = 0; c < cols; c++) {
      cajas.push(
        <div
          key={`${f}-${c}`}
          className="cal-caja"
          style={{
            left: `${origenXMm + c * pasoHorizontalMm}mm`,
            top: `${origenYMm + f * pasoVerticalMm}mm`,
            width: `${config.anchoMm}mm`,
            height: `${config.altoMm}mm`,
          }}
        >
          <span className="cal-caja-num">
            {f + 1}-{c + 1}
          </span>
        </div>,
      )
    }
  }

  return (
    <>
      {cajas}

      {/* Reglas pegadas al borde superior e izquierdo de la hoja. */}
      <Regla largoMm={geo.hojaAnchoMm} orientacion="h" />
      <Regla largoMm={geo.hojaAltoMm} orientacion="v" />

      {/* Marcas de referencia con su valor nominal impreso al lado. */}
      <div className="cal-linea-h" style={{ top: `${y1}mm`, width: `${geo.hojaAnchoMm}mm` }} />
      <div className="cal-rotulo" style={{ top: `${y1 - 4}mm`, left: `${geo.hojaAnchoMm - 62}mm` }}>
        A · borde superior fila 1 → {y1.toFixed(1)} mm
      </div>

      <div className="cal-linea-h" style={{ top: `${yN}mm`, width: `${geo.hojaAnchoMm}mm` }} />
      <div className="cal-rotulo" style={{ top: `${yN - 4}mm`, left: `${geo.hojaAnchoMm - 66}mm` }}>
        B · borde superior fila {rows} → {yN.toFixed(1)} mm
      </div>

      <div className="cal-linea-v" style={{ left: `${x1}mm`, height: `${geo.hojaAltoMm}mm` }} />
      <div className="cal-rotulo" style={{ top: `${geo.hojaAltoMm - 26}mm`, left: `${x1 + 1}mm` }}>
        C · {x1.toFixed(1)} mm
      </div>

      <div className="cal-linea-v" style={{ left: `${xN}mm`, height: `${geo.hojaAltoMm}mm` }} />
      <div className="cal-rotulo" style={{ top: `${geo.hojaAltoMm - 20}mm`, left: `${xN + 1}mm` }}>
        D · {xN.toFixed(1)} mm
      </div>

      {/* Cruces en las esquinas de la cuadrícula. */}
      <Cruz xMm={x1} yMm={y1} />
      <Cruz xMm={xN + config.anchoMm} yMm={y1} />
      <Cruz xMm={x1} yMm={yN + config.altoMm} />
      <Cruz xMm={xN + config.anchoMm} yMm={yN + config.altoMm} />

      <div className="cal-pie" style={{ top: `${geo.hojaAltoMm - 14}mm` }}>
        Calibración · {config.nombre} · etiqueta {config.anchoMm}×{config.altoMm} mm · paso{' '}
        {pasoHorizontalMm.toFixed(2)}×{pasoVerticalMm.toFixed(2)} mm · {cols}×{rows}
        <br />
        Imprime en papel bond con <strong>Márgenes: Ninguno</strong> y{' '}
        <strong>Escala: 100 %</strong>. Mide A, B, C y D desde el borde de la hoja.
        <br />
        Las reglas arrancan a {INSET_REGLA_MM} mm del borde, fuera de la franja que la impresora no
        alcanza a marcar; sus números siguen contando desde el borde del papel.
      </div>
    </>
  )
}

export interface MedicionCalibracion {
  aMm: number
  bMm: number
  cMm: number
  dMm: number
}

export interface ResultadoCalibracion {
  pasoVerticalMm: number
  pasoHorizontalMm: number
  ajusteYMm: number
  ajusteXMm: number
  escalaVertical: number
  escalaHorizontal: number
  valido: boolean
  motivo?: string
}

/**
 * Despeja la corrección a partir de lo medido en el papel.
 *
 * La impresora deforma la hoja de forma lineal: lo que se pide en `y` sale en
 * `a + k·y`, donde `k` es el encogimiento que aplica el controlador y `a` un
 * desplazamiento fijo. Con dos marcas separadas se despejan ambos, y como el
 * modelo tiene justo dos perillas por eje —el ajuste y el paso— la corrección se
 * puede expresar entera:
 *
 *     k  = (B − A) / (Bnominal − Anominal)
 *     a  = A − k · Anominal
 *     paso corregido   = paso / k
 *     origen corregido = (origen − a) / k
 *
 * Pedir el origen corregido menos el margen de página da el ajuste a guardar.
 */
export function calcularCalibracion(
  geo: GeometriaHoja,
  config: ConfiguracionEtiquetaResponse,
  medido: MedicionCalibracion,
): ResultadoCalibracion {
  const nominalA = geo.origenYMm
  const nominalB = geo.origenYMm + (geo.rows - 1) * geo.pasoVerticalMm
  const nominalC = geo.origenXMm
  const nominalD = geo.origenXMm + (geo.cols - 1) * geo.pasoHorizontalMm

  const vacio: ResultadoCalibracion = {
    pasoVerticalMm: geo.pasoVerticalMm,
    pasoHorizontalMm: geo.pasoHorizontalMm,
    ajusteYMm: config.ajusteYMm || 0,
    ajusteXMm: config.ajusteXMm || 0,
    escalaVertical: 1,
    escalaHorizontal: 1,
    valido: false,
  }

  // Sin separación entre las marcas no hay dos puntos que resolver. Pasa cuando
  // la cuadrícula tiene una sola fila o una sola columna.
  if (nominalB - nominalA <= 0 || nominalD - nominalC <= 0) {
    return { ...vacio, motivo: 'La cuadrícula necesita al menos dos filas y dos columnas para calibrarse.' }
  }
  if (medido.bMm - medido.aMm <= 0 || medido.dMm - medido.cMm <= 0) {
    return { ...vacio, motivo: 'La segunda medida de cada eje debe ser mayor que la primera.' }
  }

  const kY = (medido.bMm - medido.aMm) / (nominalB - nominalA)
  const kX = (medido.dMm - medido.cMm) / (nominalD - nominalC)

  // Una desviación de más del 15 % no es deformación del controlador: es que se
  // midió mal o se imprimió con otra hoja. Corregirla dejaría la configuración
  // peor de como estaba.
  if (kY < 0.85 || kY > 1.15 || kX < 0.85 || kX > 1.15) {
    return {
      ...vacio,
      motivo: `La escala medida (${(kX * 100).toFixed(1)} % × ${(kY * 100).toFixed(1)} %) se aleja demasiado de lo esperado. Revisa que se haya impreso al 100 % y sin márgenes, y vuelve a medir.`,
    }
  }

  const aY = medido.aMm - kY * nominalA
  const aX = medido.cMm - kX * nominalC

  const origenYCorregido = (geo.origenYMm - aY) / kY
  const origenXCorregido = (geo.origenXMm - aX) / kX

  return {
    pasoVerticalMm: geo.pasoVerticalMm / kY,
    pasoHorizontalMm: geo.pasoHorizontalMm / kX,
    ajusteYMm: origenYCorregido - config.margenPaginaSuperiorMm,
    ajusteXMm: origenXCorregido - config.margenPaginaIzquierdoMm,
    escalaVertical: kY,
    escalaHorizontal: kX,
    valido: true,
  }
}
