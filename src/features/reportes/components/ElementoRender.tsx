import type { Elemento } from '../types'

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
      return elemento.url ? (
        <img
          src={elemento.url}
          alt={elemento.descripcion ?? ''}
          className="h-full w-full"
          style={{ objectFit: elemento.ajuste === 'cubrir' ? 'cover' : 'contain' }}
          draggable={false}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center border border-dashed border-neutral-300 text-[10px] text-neutral-400">
          Imagen
        </div>
      )

    case 'figura': {
      const borde = elemento.grosorBordeMm
        ? `${elemento.grosorBordeMm * escala}px solid ${elemento.colorBorde ?? '#333'}`
        : undefined

      if (elemento.forma === 'linea') {
        // Una línea es un rectángulo del grosor del borde: así se puede arrastrar
        // y girar como cualquier otro elemento, en vez de ser un caso aparte.
        return (
          <div className="flex h-full w-full items-center">
            <div
              className="w-full"
              style={{
                height: `${(elemento.grosorBordeMm ?? 0.3) * escala}px`,
                background: elemento.colorBorde ?? '#333',
              }}
            />
          </div>
        )
      }

      return (
        <div
          className="h-full w-full"
          style={{
            background: elemento.relleno ?? 'transparent',
            border: borde,
            borderRadius: elemento.forma === 'elipse'
              ? '50%'
              : `${(elemento.radioMm ?? 0) * escala}px`,
          }}
        />
      )
    }

    case 'datos':
      // Todavía no se resuelve ningún dato: el editor aún no ofrece este tipo.
      // Se dibuja el hueco para que un diseño que ya lo tenga no desaparezca.
      return (
        <div className="flex h-full w-full items-center justify-center border border-dashed border-sky-300 bg-sky-50/60 text-[10px] text-sky-700">
          {elemento.clave}
        </div>
      )
  }
}
