import type {
  ColumnaLista, Elemento, ElementoImagen, ElementoLista, ElementoTabla,
} from '../types'
import {
  anchosDe, COLUMNAS_LISTA, encuadreDeImagen, filasCuadradas, ladoDeIconoMm,
  TABLA_POR_DEFECTO,
} from '../types'
import { useImagenesReporte } from '../hooks/useImagenesReporte'
import { piezasDeFigura } from '../lib/figuras'
import { caracterDeIcono } from '../lib/catalogoIconos'
import { idDeClaveImagen, urlDeImagen } from '../api/imagenes.api'

/**
 * Dibuja un elemento del diseño.
 *
 * <p>Es el mismo dibujo que tendrá que producir el maquetador del servidor al
 * generar el PDF, y por eso se mantiene deliberadamente pobre: posición absoluta,
 * colores planos y tablas. Nada de flexbox ni de grid, que el motor de PDF no
 * entiende. Si aquí se usara CSS que allá no existe, la vista previa enseñaría
 * una cosa y el papel otra.</p>
 */
export function ElementoRender({ elemento, escala }: { elemento: Elemento; escala: number }) {
  switch (elemento.tipo) {
    case 'texto':
      return (
        <div
          className="h-full w-full overflow-hidden whitespace-pre-wrap break-words"
          style={{
            // pt a px: 1pt = 1/72", y un milímetro son 1/25.4". La escala está en
            // px por milímetro, así que un punto mide (25.4/72) mm en pantalla.
            fontSize: `${elemento.tamanoPt * (25.4 / 72) * escala}px`,
            fontWeight: elemento.negrita ? 700 : 400,
            fontStyle: elemento.cursiva ? 'italic' : 'normal',
            color: elemento.color,
            textAlign: elemento.alineacion,
            lineHeight: elemento.interlineado ?? 1.35,
          }}
        >
          {elemento.contenido}
        </div>
      )

    case 'imagen':
      return <ImagenRender elemento={elemento} escala={escala} />

    case 'icono': {
      // El glifo se centra con line-height igual al alto de la caja: es lo que el
      // motor de PDF también entiende, porque `flex` allá no existe.
      const lado = ladoDeIconoMm(elemento.anchoMm, elemento.altoMm)
      return (
        <div
          style={{
            fontFamily: 'IconosReporte',
            fontSize: `${lado * escala}px`,
            lineHeight: `${elemento.altoMm * escala}px`,
            color: elemento.color ?? '#111111',
            textAlign: 'center',
            width: '100%',
            height: '100%',
            overflow: 'hidden',
          }}
        >
          {caracterDeIcono(elemento.codigo)}
        </div>
      )
    }

    case 'figura':
      return (
        <div className="relative h-full w-full">
          {piezasDeFigura(elemento, elemento.anchoMm, elemento.altoMm, escala)
            .map((pieza, i) => (
              <div key={i} style={pieza.estilo as React.CSSProperties} />
            ))}
        </div>
      )

    case 'datos':
      // Todavía no se resuelve ningún dato: el editor aún no ofrece este tipo.
      // Se dibuja el hueco para que un diseño que ya lo tenga no desaparezca.
      return (
        <div className="flex h-full w-full items-center justify-center border border-dashed border-sky-300 bg-sky-50/60 text-[10px] text-sky-700">
          {elemento.clave}
        </div>
      )

    case 'tabla':
      return <TablaRender elemento={elemento} escala={escala} />

    case 'lista':
      return <ListaRender elemento={elemento} escala={escala} />
  }
}

/** Filas de muestra para que se vea el reparto de la lista mientras se diseña. */
const MUESTRA_LISTA: {
  nombre: string; valor: string; unidad: string; referencia: string
  estado: string; color: string; franja: [number, number]; marca: number
}[] = [
  { nombre: 'Glucosa en ayuno', valor: '92', unidad: 'mg/dL', referencia: '70 – 99',
    estado: 'En rango', color: '#1f7a4d', franja: [25, 50], marca: 44 },
  { nombre: 'Ácido úrico', valor: '6.4', unidad: 'mg/dL', referencia: 'Por arriba · 2.4 – 6',
    estado: 'Por arriba', color: '#b0700f', franja: [25, 50], marca: 80 },
  { nombre: 'Colesterol LDL', valor: '132', unidad: 'mg/dL', referencia: 'A revisar · menor a 100',
    estado: 'A revisar', color: '#a8261e', franja: [0, 50], marca: 66 },
]

/** Cuánto del ancho se lleva cada columna. Los mismos pesos que el servidor. */
const PESO_COLUMNA: Record<string, number> = {
  nombre: 32, valor: 16, barra: 22, referencia: 20, estado: 14,
}

/**
 * La lista de resultados, con datos de muestra.
 *
 * <p>Se dibujan valores inventados y no huecos porque lo que hay que decidir al
 * diseñar es el reparto del ancho, y con celdas vacías no se ve. Son siempre los
 * mismos tres y se reconocen como ejemplo; los de verdad salen al emitir.</p>
 *
 * <p>La barra va con cajas absolutas dentro de una relativa, igual que en el PDF.
 * Sus porcentajes aquí son fijos: en el documento se calculan con el rango del
 * participante, que en el editor todavía no existe.</p>
 */
function ListaRender({ elemento, escala }: { elemento: ElementoLista; escala: number }) {
  const cols = (elemento.estilo?.columnas ?? [...COLUMNAS_LISTA])
    .filter((c): c is ColumnaLista => (COLUMNAS_LISTA as readonly string[]).includes(c))
  const usadas = cols.length ? cols : [...COLUMNAS_LISTA]

  const total = usadas.reduce((s, c) => s + (PESO_COLUMNA[c] ?? 10), 0)
  const px = (elemento.estilo?.tamanoPt ?? 9) * (25.4 / 72) * escala
  const borde = elemento.estilo?.colorBorde ?? '#dde5e9'

  return (
    <div className="h-full w-full overflow-hidden">
      <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed',
                      fontSize: `${px}px`, color: elemento.estilo?.colorTexto ?? '#111111' }}>
        <colgroup>
          {usadas.map((c) => (
            <col key={c} style={{ width: `${((PESO_COLUMNA[c] ?? 10) / total) * 100}%` }} />
          ))}
        </colgroup>
        <tbody>
          {MUESTRA_LISTA.map((m) => (
            <tr key={m.nombre}>
              {usadas.map((c) => (
                <td key={c} style={{
                  borderBottom: `1px solid ${borde}`,
                  padding: `${1.8 * escala}px ${2 * escala}px`,
                  verticalAlign: 'middle',
                  textAlign: c === 'valor' || c === 'estado' ? 'right' : 'left',
                  fontWeight: c === 'valor' ? 700 : 400,
                  color: c === 'valor' || c === 'estado' ? m.color
                       : c === 'referencia' ? '#5a6b78' : undefined,
                  fontSize: c === 'referencia' || c === 'estado' ? `${px * 0.9}px` : undefined,
                }}>
                  {c === 'nombre' && m.nombre}
                  {c === 'valor' && (
                    <>
                      {m.valor}{' '}
                      <span style={{ fontWeight: 400, color: '#5a6b78', fontSize: `${px * 0.85}px` }}>
                        {m.unidad}
                      </span>
                    </>
                  )}
                  {c === 'referencia' && m.referencia}
                  {c === 'estado' && m.estado}
                  {c === 'barra' && (
                    <div style={{ position: 'relative', height: `${2.2 * escala}px`,
                                  background: '#eff2f0' }}>
                      <div style={{ position: 'absolute', top: 0, bottom: 0,
                                    left: `${m.franja[0]}%`, width: `${m.franja[1]}%`,
                                    background: '#e6f1ea' }} />
                      <div style={{ position: 'absolute', top: `${-0.8 * escala}px`,
                                    height: `${3.8 * escala}px`, left: `${m.marca}%`,
                                    width: `${0.8 * escala}px`, background: m.color }} />
                    </div>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/**
 * Una tabla hecha a mano.
 *
 * <p>Se dibuja con una tabla HTML de verdad, no con cajas colocadas a mano: es lo
 * que reparte el ancho entre las columnas y lo que hace que una celda con dos
 * renglones estire su fila entera. El maquetador del servidor emite exactamente la
 * misma estructura, así que lo que se ve aquí es lo que sale en el papel.</p>
 *
 * <p>Las medidas se dan en píxeles ya escalados —no en milímetros— porque este
 * dibujo vive dentro del lienzo, que trabaja en píxeles; el del PDF las emite en
 * milímetros. Es la única diferencia entre los dos.</p>
 */
function TablaRender({ elemento, escala }: { elemento: ElementoTabla; escala: number }) {
  const anchos = anchosDe(elemento)
  const filas = filasCuadradas(elemento)
  const conEncabezado = elemento.conEncabezado !== false && filas.length > 0

  const tamanoPt = elemento.tamanoPt ?? TABLA_POR_DEFECTO.tamanoPt
  const colorTexto = elemento.colorTexto ?? TABLA_POR_DEFECTO.colorTexto
  const colorBorde = elemento.colorBorde ?? TABLA_POR_DEFECTO.colorBorde
  const grosorMm = elemento.grosorBordeMm ?? TABLA_POR_DEFECTO.grosorBordeMm
  const rellenoMm = elemento.rellenoMm ?? TABLA_POR_DEFECTO.rellenoMm

  const borde = `${grosorMm * escala}px solid ${colorBorde}`
  const relleno = `${rellenoMm * escala}px ${rellenoMm * 1.3 * escala}px`

  return (
    <div
      className="h-full w-full"
      // «Recortar» esconde lo que se sale; «crecer» deja que la tabla siga hacia
      // abajo, y por eso la caja no puede recortarla.
      style={{ overflow: elemento.desbordamiento === 'recortar' ? 'hidden' : 'visible' }}
    >
      <table
        style={{
          borderCollapse: 'collapse',
          width: '100%',
          tableLayout: 'fixed',
          fontSize: `${tamanoPt * (25.4 / 72) * escala}px`,
          color: colorTexto,
        }}
      >
        <colgroup>
          {anchos.map((pct, i) => <col key={i} style={{ width: `${pct}%` }} />)}
        </colgroup>
        <tbody>
          {filas.map((fila, i) => {
            const esEncabezado = conEncabezado && i === 0
            // Las alternas se cuentan desde la primera fila del cuerpo, no desde la
            // del encabezado: si no, con encabezado la franja empezaba invertida.
            const indiceCuerpo = conEncabezado ? i - 1 : i
            const alterna = !esEncabezado && elemento.fondoAlterno && indiceCuerpo % 2 === 1
              ? elemento.fondoAlterno
              : undefined

            return (
              <tr key={i}>
                {fila.map((celda, j) => (
                  <td
                    key={j}
                    style={{
                      border: borde,
                      padding: relleno,
                      verticalAlign: 'top',
                      textAlign: celda.alineacion ?? 'left',
                      fontWeight: celda.negrita || esEncabezado ? 700 : 400,
                      fontStyle: celda.cursiva ? 'italic' : 'normal',
                      color: celda.colorTexto
                        ?? (esEncabezado
                          ? elemento.colorEncabezado ?? TABLA_POR_DEFECTO.colorEncabezado
                          : colorTexto),
                      background: celda.fondo
                        ?? (esEncabezado
                          ? elemento.fondoEncabezado ?? TABLA_POR_DEFECTO.fondoEncabezado
                          : alterna),
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                    }}
                  >
                    {celda.texto}
                  </td>
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

/**
 * Una imagen del diseño.
 *
 * <p>El tamaño y la posición se calculan aquí en vez de dejárselos a
 * {@code object-fit}, que el motor de PDF no conoce: con él, «entera» y
 * «recortada» se veían bien en pantalla y salían estiradas en el papel. Ahora los
 * dos lados usan lo mismo —una caja con recorte y la imagen colocada dentro— y
 * comparten la función que decide dónde va.</p>
 */
function ImagenRender({ elemento, escala }: { elemento: ElementoImagen; escala: number }) {
  const { data: imagenes } = useImagenesReporte()
  const id = idDeClaveImagen(elemento.url)

  if (id == null) {
    return (
      <div className="flex h-full w-full items-center justify-center border border-dashed border-neutral-300 text-center text-[10px] leading-tight text-neutral-400">
        Elige una imagen
      </div>
    )
  }

  const intrinseco = imagenes?.find((i) => i.id === id) ?? null
  const encuadre = encuadreDeImagen(
    { anchoMm: elemento.anchoMm, altoMm: elemento.altoMm }, intrinseco, elemento)

  return (
    <div className="relative h-full w-full overflow-hidden">
      <img
        src={urlDeImagen(id)}
        alt={elemento.descripcion ?? ''}
        draggable={false}
        style={{
          position: 'absolute',
          left: `${encuadre.izquierdaMm * escala}px`,
          top: `${encuadre.arribaMm * escala}px`,
          width: `${encuadre.anchoMm * escala}px`,
          height: `${encuadre.altoMm * escala}px`,
          maxWidth: 'none',
        }}
      />
    </div>
  )
}
