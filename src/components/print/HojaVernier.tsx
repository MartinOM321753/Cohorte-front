/**
 * Hoja vernier: encuentra el paso real de la hoja de etiquetas sin medirlo.
 *
 * Medir con regla el hueco entre dos etiquetas es poco fiable —son milímetros,
 * los cantos son redondeados y el error se multiplica por el número de columna—
 * y medir desde el borde del papel es directamente imposible, porque toda
 * impresora reserva una franja de varios milímetros que no puede marcar.
 *
 * Este método evita las dos cosas. Se imprime sobre una hoja de etiquetas real
 * una banda de filas, cada una con las marcas colocadas según un paso distinto,
 * y el operador solo tiene que decir cuál fila coincide con los troqueles.
 * Reconocer una coincidencia es mucho más preciso que medir una distancia: es el
 * principio del calibrador vernier.
 *
 * Como las marcas caen sobre las etiquetas, y no en los bordes del papel, nada
 * de lo que se imprime aquí entra en la zona muerta de la impresora.
 */

import type { ConfiguracionEtiquetaResponse } from '@/types/api'
import type { GeometriaHoja } from './hojaImpresion'

export const ESTILOS_VERNIER = `
/* Marca de referencia: cae en el borde izquierdo teórico de la etiqueta. Se
   dibuja solo en la parte central de la altura porque las esquinas del troquel
   son redondeadas y ahí no hay borde recto contra el cual comparar. */
.ver-marca {
  position: absolute;
  width: 0;
  border-left: 0.3mm solid #000;
}
.ver-rotulo {
  position: absolute;
  font-size: 6pt;
  font-family: monospace;
  color: #000;
  white-space: nowrap;
}
.ver-titulo {
  position: absolute;
  font-size: 7pt;
  font-weight: 700;
  color: #000;
  white-space: nowrap;
}
.ver-nota {
  position: absolute;
  font-size: 6.5pt;
  color: #000;
  line-height: 1.45;
}
`

/** Fracción de la altura de la etiqueta que ocupa la marca, centrada. */
const ALTO_MARCA = 0.62

/**
 * Distancia mínima al borde del papel a la que se puede confiar en que algo se
 * imprima. La mecánica de cada impresora reserva una franja que no alcanza —de 3
 * a 6 mm según el modelo— y lo que caiga ahí sale cortado o no sale.
 */
const MARGEN_IMPRIMIBLE_MM = 7

export interface CandidatosVernier {
  /** Pasos horizontales a probar, en mm. */
  pasos: number[]
  /** Corrimientos a probar respecto al origen actual, en mm. */
  corrimientos: number[]
}

/**
 * Candidatos alrededor de lo que hay configurado.
 *
 * El paso se explora hacia abajo con más amplitud que hacia arriba: si el
 * contenido se corre hacia la derecha conforme avanzan las columnas —que es el
 * síntoma que trae aquí a alguien— el paso configurado es mayor que el real.
 */
export function candidatosPorOmision(geo: GeometriaHoja, fino = false): CandidatosVernier {
  const p = geo.pasoHorizontalMm
  // El barrido fino se usa cuando ya se hizo uno grueso y queda poco desfase:
  // misma cantidad de filas, ventana cuatro veces más estrecha, para distinguir
  // diferencias que con pasos de medio milímetro se confunden entre sí.
  // El barrido grueso abre hacia abajo lo suficiente para cubrir cualquier
  // reparto de margen y hueco que la hoja admita: con la etiqueta fija, margen y
  // hueco están atados por el ancho del papel, y ese abanico de repartos mueve
  // el paso varios milímetros. Un rango corto se queda fuera y no encuentra nada.
  const salto = fino ? 0.125 : 0.75
  const desde = fino ? -0.5 : -5

  const pasos: number[] = []
  for (let i = 0; i < 9; i++) pasos.push(Math.round((p + desde + i * salto) * 100) / 100)

  // Los corrimientos negativos acercan la marca al borde del papel, y pasado
  // cierto punto caen en la franja que la impresora no marca: esas filas
  // saldrían vacías y el operador no sabría si es que no coinciden o que no se
  // imprimieron. La ventana se corre hacia la derecha para conservar la misma
  // cantidad de candidatos, todos imprimibles.
  const saltoCorr = fino ? 0.125 : 0.5
  const dMin = Math.max(fino ? -0.5 : -2, MARGEN_IMPRIMIBLE_MM - geo.origenXMm)
  const corrimientos: number[] = []
  for (let i = 0; i < 9; i++) {
    corrimientos.push(Math.round((dMin + i * saltoCorr) * 1000) / 1000)
  }

  return { pasos, corrimientos }
}

interface HojaVernierProps {
  config: ConfiguracionEtiquetaResponse
  geo: GeometriaHoja
  candidatos: CandidatosVernier
}

/** Marcas de una fila: una por columna, al borde izquierdo teórico de cada etiqueta. */
function FilaPaso({
  fila,
  paso,
  config,
  geo,
}: {
  fila: number
  paso: number
  config: ConfiguracionEtiquetaResponse
  geo: GeometriaHoja
}) {
  const topFila = geo.origenYMm + fila * geo.pasoVerticalMm
  const alto = config.altoMm * ALTO_MARCA
  const top = topFila + (config.altoMm - alto) / 2

  const marcas = []
  for (let c = 0; c < geo.cols; c++) {
    marcas.push(
      <div
        key={c}
        className="ver-marca"
        style={{ left: `${geo.origenXMm + c * paso}mm`, top: `${top}mm`, height: `${alto}mm` }}
      />,
    )
  }

  return (
    <>
      {marcas}
      {/* El rótulo va separado de la primera marca: pegado a ella estorbaría
          justo la comparación contra el troquel que hay que juzgar. */}
      <span
        className="ver-rotulo"
        style={{ left: `${geo.origenXMm + 9}mm`, top: `${topFila + config.altoMm / 2 - 1.4}mm` }}
      >
        {paso.toFixed(2)}
      </span>
    </>
  )
}

export function HojaVernier({ config, geo, candidatos }: HojaVernierProps) {
  const { pasos, corrimientos } = candidatos
  const filaAltura = geo.pasoVerticalMm
  const alto = config.altoMm * ALTO_MARCA

  // Cada título ocupa su propia fila de etiquetas en vez de ir en el margen
  // superior: ese margen suele quedar dentro de la franja que la impresora no
  // alcanza a marcar, y ahí el título saldría cortado o no saldría.
  const filaTitulo1 = 0
  const inicioBandaPaso = 1
  const filaTitulo2 = inicioBandaPaso + pasos.length
  const inicioBandaCorrimiento = filaTitulo2 + 1
  const filasUsadas = inicioBandaCorrimiento + corrimientos.length

  const cabeEnLaHoja = filasUsadas <= geo.rows

  /** Texto centrado verticalmente en la fila indicada. */
  const yTexto = (fila: number) => geo.origenYMm + fila * filaAltura + config.altoMm / 2 - 1.4

  return (
    <>
      {/* ── Banda 1: paso ──────────────────────────────────────────────── */}
      <span
        className="ver-titulo"
        style={{ left: `${geo.origenXMm}mm`, top: `${yTexto(filaTitulo1)}mm` }}
      >
        1) PASO — la fila cuyas 4 marcas guarden la MISMA distancia al troquel
      </span>

      {pasos.map((p, i) => (
        <FilaPaso key={`p${p}`} fila={inicioBandaPaso + i} paso={p} config={config} geo={geo} />
      ))}

      {/* ── Banda 2: corrimiento ───────────────────────────────────────── */}
      <span
        className="ver-titulo"
        style={{ left: `${geo.origenXMm}mm`, top: `${yTexto(filaTitulo2)}mm` }}
      >
        2) CORRIMIENTO — solo 1ª columna; la marca que caiga sobre el troquel
      </span>

      {corrimientos.map((d, i) => {
        const fila = inicioBandaCorrimiento + i
        const topFila = geo.origenYMm + fila * filaAltura
        return (
          <span key={`c${d}`}>
            <div
              className="ver-marca"
              style={{
                left: `${geo.origenXMm + d}mm`,
                top: `${topFila + (config.altoMm - alto) / 2}mm`,
                height: `${alto}mm`,
              }}
            />
            <span
              className="ver-rotulo"
              style={{ left: `${geo.origenXMm + 9}mm`, top: `${yTexto(fila)}mm` }}
            >
              {/* Sin decimales de sobra, pero sin perderlos: con el barrido fino
                  los candidatos distan 0.125 mm y redondear a un decimal haría
                  que dos filas distintas mostraran el mismo número. */}
              {(d > 0 ? '+' : '') + String(Number(d.toFixed(3)))}
            </span>
          </span>
        )
      })}

      {/* Pie en el margen inferior de la hoja, que no lleva etiquetas. Las
          instrucciones largas viven en la pantalla; aquí solo lo imprescindible
          para que la hoja se entienda sola si alguien la levanta de la mesa. */}
      <div
        className="ver-nota"
        style={{
          left: `${geo.origenXMm}mm`,
          top: `${geo.origenYMm + geo.rows * filaAltura + 1.5}mm`,
          width: `${geo.hojaAnchoMm - 2 * geo.origenXMm}mm`,
        }}
      >
        Vernier · {config.nombre} · paso actual {geo.pasoHorizontalMm.toFixed(2)} mm · origen X{' '}
        {geo.origenXMm.toFixed(2)} mm · imprimir al 100 %, sin márgenes, sobre hoja de etiquetas.
        {!cabeEnLaHoja && (
          <>
            {' '}
            <strong>AVISO: los candidatos no caben en la hoja.</strong>
          </>
        )}
      </div>
    </>
  )
}
