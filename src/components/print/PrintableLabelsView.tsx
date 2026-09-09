import { useMemo } from 'react'
import { BarcodeRenderer } from './BarcodeRenderer'
import { crearMedidor } from './codigoSimbolo'
import { HojaEtiquetas } from './HojaEtiquetas'
import { layoutEtiqueta } from './layoutEtiqueta'
import type { ConfiguracionEtiquetaResponse, LabelDataDTO } from '@/types/api'

/**
 * Etiquetas de muestras y documentos sobre la hoja.
 *
 * Aquí solo queda lo que es propio de estas etiquetas: los tres elementos con
 * papel fijo —nombre, código y etiqueta— y el símbolo de código de barras. La
 * hoja, el acomodo y la impresión los pone `HojaEtiquetas`, que es la misma que
 * usan las etiquetas hechas desde un archivo externo.
 */

interface PrintableLabelsViewProps {
  etiquetas: LabelDataDTO[]
  configuracion: ConfiguracionEtiquetaResponse
  open: boolean
  onClose: () => void
}

/**
 * Contenido de una etiqueta, ya resuelto por el maquetado.
 *
 * Cada elemento sale con posición y tamaño absolutos dentro del recuadro. El
 * recuadro recorta, así que aunque el maquetado marque desborde, lo que se
 * imprime nunca invade la etiqueta de al lado.
 */
function LabelCell({
  label,
  config,
}: {
  label: LabelDataDTO
  config: ConfiguracionEtiquetaResponse
}) {
  const maquetado = useMemo(() => {
    const medir = crearMedidor(label.codigoDatos, config.tipoCodigo, config.moduloCodigo, config.dpi)
    return layoutEtiqueta(config, medir)
  }, [label.codigoDatos, config])

  return (
    <>
      {maquetado.elementos.map((elem) => {
        const base: React.CSSProperties = {
          left: `${elem.leftMm}mm`,
          top: `${elem.topMm}mm`,
          width: `${elem.anchoMm}mm`,
          height: `${elem.altoMm}mm`,
        }

        if (elem.tipo === 'CODIGO') {
          return (
            <div key="codigo" className="elemento" style={base}>
              <BarcodeRenderer
                data={label.codigoDatos}
                tipo={config.tipoCodigo}
                modulo={config.moduloCodigo}
                escalaDots={elem.escalaDots ?? 1}
                dpi={config.dpi}
              />
            </div>
          )
        }

        const esEtiqueta = elem.tipo === 'ETIQUETA'
        return (
          <div
            key={elem.tipo}
            className={`elemento elemento-texto${esEtiqueta ? ' elemento-mono' : ''}`}
            style={{
              ...base,
              fontSize: `${elem.fontPt}pt`,
              lineHeight: `${elem.altoMm}mm`,
            }}
          >
            {esEtiqueta ? label.etiqueta : label.nombre}
          </div>
        )
      })}

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
          title="El contenido no cabe en la etiqueta ni en su tamaño mínimo; se recorta al imprimir"
        >
          !
        </span>
      )}
    </>
  )
}

export function PrintableLabelsView({
  etiquetas,
  configuracion,
  open,
  onClose,
}: PrintableLabelsViewProps) {
  // Dos lotes distintos pueden tener el mismo número de etiquetas; lo que marca
  // que el lote cambió es su contenido.
  const firma = useMemo(() => etiquetas.map((e) => e.etiqueta).join('|'), [etiquetas])

  return (
    <HojaEtiquetas
      total={etiquetas.length}
      configuracion={configuracion}
      open={open}
      onClose={onClose}
      firma={firma}
      nombreDe={(i) => etiquetas[i]?.etiqueta ?? ''}
      renderCasilla={(i) => <LabelCell label={etiquetas[i]} config={configuracion} />}
    />
  )
}
