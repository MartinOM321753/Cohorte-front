import type { ReactNode } from 'react'

export interface CampoInfo {
  label: string
  /** Un campo con valor vacío no se dibuja: el panel solo muestra lo que existe. */
  value: ReactNode
}

interface Ocupacion {
  ocupadas: number
  total: number
  porcentaje: number
  etiqueta: string
}

/**
 * Panel lateral de las cuatro vistas.
 *
 * <p>Recibe ya filtrados los campos que el sistema guarda de verdad. No rellena
 * huecos con guiones ni con textos de relleno: si un dato no existe en el
 * modelo, la fila simplemente no aparece.
 *
 * <p>El bloque {@link seleccion} describe la pieza que el usuario acaba de tocar
 * en la escena — el piso dentro del refrigerador, la caja dentro del piso — y es
 * lo que convierte el recorrido en algo consultable sin entrar a cada nivel.
 */
export function InfoPanel({
  titulo,
  subtitulo,
  campos,
  ocupacion,
  seleccion,
  vacio,
  extra,
}: {
  titulo: string
  subtitulo?: ReactNode
  campos: CampoInfo[]
  ocupacion?: Ocupacion
  seleccion?: {
    titulo: string
    pie?: string
    campos: CampoInfo[]
    ocupacion?: Ocupacion
  }
  /** Texto de ayuda cuando no hay nada seleccionado todavía. */
  vacio?: string
  extra?: ReactNode
}) {
  return (
    <div className="flex min-w-0 flex-col gap-3 p-3">
      <div className="min-w-0">
        <h3 className="truncate text-sm font-semibold text-foreground">{titulo}</h3>
        {subtitulo ? (
          <p className="mt-0.5 text-[11px] text-muted-foreground">{subtitulo}</p>
        ) : null}
      </div>

      {ocupacion ? <BarraOcupacion {...ocupacion} /> : null}

      <Campos campos={campos} />

      {seleccion ? (
        <div className="min-w-0 rounded-md border border-border bg-muted/40 p-2.5">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Seleccionado</p>
          <h4 className="mt-0.5 truncate text-[13px] font-semibold text-foreground">
            {seleccion.titulo}
          </h4>
          {seleccion.ocupacion ? (
            <div className="mt-2">
              <BarraOcupacion {...seleccion.ocupacion} />
            </div>
          ) : null}
          <div className="mt-2">
            <Campos campos={seleccion.campos} />
          </div>
          {seleccion.pie ? (
            <p className="mt-2 text-[10px] italic text-muted-foreground">{seleccion.pie}</p>
          ) : null}
        </div>
      ) : null}

      {vacio ? <p className="text-[11px] italic text-muted-foreground">{vacio}</p> : null}

      {extra}
    </div>
  )
}

function Campos({ campos }: { campos: CampoInfo[] }) {
  const visibles = campos.filter(
    (c) => c.value !== null && c.value !== undefined && c.value !== '' && c.value !== false,
  )
  if (visibles.length === 0) return null
  return (
    <dl className="grid min-w-0 grid-cols-1 gap-x-3 gap-y-2 @[15rem]:grid-cols-2 lg:grid-cols-1">
      {visibles.map((c) => (
        <div key={c.label} className="min-w-0">
          <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">{c.label}</dt>
          <dd className="break-words text-[12px] font-medium text-foreground">{c.value}</dd>
        </div>
      ))}
    </dl>
  )
}

function BarraOcupacion({ etiqueta, ocupadas, total, porcentaje }: Ocupacion) {
  return (
    <div className="min-w-0">
      <div className="flex items-baseline justify-between gap-2 text-[11px]">
        <span className="text-muted-foreground">{etiqueta}</span>
        <span className="font-medium tabular-nums text-foreground">
          {ocupadas}/{total}
        </span>
      </div>
      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full transition-[width] duration-300"
          style={{
            width: `${Math.min(100, Math.max(0, porcentaje))}%`,
            background: 'var(--imss-green-500)',
          }}
        />
      </div>
      <p className="mt-1 text-right text-[10px] text-muted-foreground">
        {porcentaje}% de ocupación
      </p>
    </div>
  )
}
