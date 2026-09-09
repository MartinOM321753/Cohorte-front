import { useMemo } from 'react'

import { layoutCuadricula, type MedirTexto } from '@/components/print/layoutCuadricula'
import { FUENTE_ETIQUETA } from '@/components/print/medirTexto'
import type { ConfiguracionEtiquetaResponse } from '@/types/api'

import type { TablaEtiquetas } from '../api/etiquetasLibres.api'
import { configCuadriculaDe, contenidoDeFila, type DisenoEtiqueta } from '../disenoEtiqueta'

/**
 * El interior de una etiqueta, con los datos en las celdas del diseño.
 *
 * Cada renglón sale con posición y tamaño absolutos, igual que en las etiquetas
 * de muestras: es la casilla la que recorta, así que nada puede invadir la
 * etiqueta de al lado aunque el maquetado avise que no cabe.
 */
export function CasillaCuadricula({
  tabla,
  indiceFila,
  configuracion,
  diseno,
  medir,
  guias = false,
}: {
  tabla: TablaEtiquetas
  indiceFila: number
  configuracion: ConfiguracionEtiquetaResponse
  diseno: DisenoEtiqueta
  medir: MedirTexto
  /** Dibuja el contorno de cada celda. Solo en pantalla, nunca en el papel. */
  guias?: boolean
}) {
  const maquetado = useMemo(
    () =>
      layoutCuadricula(
        configCuadriculaDe(configuracion, diseno),
        contenidoDeFila(tabla, indiceFila, diseno),
        medir,
      ),
    [tabla, indiceFila, configuracion, diseno, medir],
  )

  return (
    <>
      {guias &&
        maquetado.celdas.map((c) => (
          <div
            key={`guia-${c.fila}-${c.columna}`}
            className="solo-pantalla"
            style={{
              position: 'absolute',
              left: `${c.rect.leftMm}mm`,
              top: `${c.rect.topMm}mm`,
              width: `${c.rect.anchoMm}mm`,
              height: `${c.rect.altoMm}mm`,
              outline: '1px dotted #bcd0c4',
              pointerEvents: 'none',
            }}
          />
        ))}

      {maquetado.celdas.flatMap((c) =>
        c.renglones.map((r, i) => (
          <div
            key={`${c.fila}-${c.columna}-${i}`}
            className="elemento elemento-texto"
            style={{
              left: `${r.leftMm}mm`,
              top: `${r.topMm}mm`,
              width: `${r.anchoMm}mm`,
              height: `${r.altoMm}mm`,
              fontSize: `${r.fontPt}pt`,
              lineHeight: `${r.altoMm}mm`,
              fontWeight: r.negrita ? 600 : 400,
              // La misma fuente con la que se midió. Si no coincidieran, el
              // ajuste al ancho estaría midiendo un texto distinto del que se ve.
              fontFamily: FUENTE_ETIQUETA,
              textAlign:
                r.alineacion === 'IZQUIERDA'
                  ? 'left'
                  : r.alineacion === 'DERECHA'
                    ? 'right'
                    : 'center',
            }}
          >
            {r.texto}
          </div>
        )),
      )}

      {maquetado.desbordado && (
        <span
          className="solo-pantalla"
          style={{
            position: 'absolute',
            right: '1px',
            bottom: '1px',
            fontSize: '8px',
            color: '#dc2626',
            fontWeight: 600,
          }}
          title={`No cabe: ${maquetado.clavesConProblema.join(', ')}`}
        >
          !
        </span>
      )}
    </>
  )
}
