import type { Elemento, ElementoImagen, ElementoTabla } from '../types'
import {
  anchosDe, encuadreDeImagen, filasCuadradas, ladoDeIconoMm, TABLA_POR_DEFECTO,
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
  }
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
