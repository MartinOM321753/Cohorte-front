import { useMemo, useState } from 'react'
import { ChevronDown, ChevronRight, Database, Table2, Type } from 'lucide-react'

import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

import { useCamposReporte } from '../hooks/useReportes'
import type { CampoReporte } from '../types.api'

interface Props {
  /** Insertar el campo dentro del texto que se está editando. */
  onInsertarEnTexto: (clave: string) => void
  /** Soltar un bloque en la hoja. */
  onAgregarBloque: (campo: CampoReporte) => void
}

/**
 * Los datos que se pueden meter en el reporte, agrupados por su origen.
 *
 * <p>Cada estudio del catálogo aparece como su propio grupo, con sus parámetros
 * uno a uno. Eso es lo que permite armar una hoja que mezcle cinco valores del
 * DEXA, tres de signos vitales y la tabla de un tercero: se toma de donde haga
 * falta, sin que la plantilla esté atada a ningún estudio.</p>
 *
 * <p>Los grupos vienen plegados salvo el primero: con veintitantos estudios en el
 * catálogo, una lista abierta sería inmanejable.</p>
 */
export function PanelDatos({ onInsertarEnTexto, onAgregarBloque }: Props) {
  const { data: campos, isLoading } = useCamposReporte()
  const [busqueda, setBusqueda] = useState('')
  const [plegados, setPlegados] = useState<Record<string, boolean>>({})

  const grupos = useMemo(() => {
    const texto = busqueda.trim().toLowerCase()
    const filtrados = (campos ?? []).filter((c) =>
      !texto || c.rotulo.toLowerCase().includes(texto) || c.grupo.toLowerCase().includes(texto))

    const mapa = new Map<string, CampoReporte[]>()
    for (const c of filtrados) {
      if (!mapa.has(c.grupo)) mapa.set(c.grupo, [])
      mapa.get(c.grupo)!.push(c)
    }
    return [...mapa.entries()]
  }, [campos, busqueda])

  // Buscando se abre todo: si el resultado quedara plegado, parecería que no hay
  // coincidencias.
  const buscando = busqueda.trim().length > 0

  if (isLoading) {
    return <div className="p-4 text-[13px] text-muted-foreground">Cargando los datos disponibles…</div>
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b p-3">
        <Input
          className="h-8 text-[12px]"
          placeholder="Buscar un dato o un estudio…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
      </div>

      <div className="flex-1 overflow-auto p-2">
        {grupos.length === 0 ? (
          <p className="p-2 text-[12px] text-muted-foreground">
            Ningún dato coincide con «{busqueda}».
          </p>
        ) : grupos.map(([grupo, lista], indice) => {
          const abierto = buscando || !(plegados[grupo] ?? indice > 0)
          return (
            <div key={grupo} className="mb-1">
              <button
                type="button"
                className="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left hover:bg-[var(--muted)]"
                onClick={() => setPlegados((p) => ({ ...p, [grupo]: !(p[grupo] ?? indice > 0) }))}
              >
                {abierto
                  ? <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" strokeWidth={1.75} />
                  : <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" strokeWidth={1.75} />}
                <span className="min-w-0 flex-1 truncate text-[11px] font-semibold uppercase tracking-[0.05em] text-muted-foreground">
                  {grupo}
                </span>
                <span className="text-[10px] text-muted-foreground">{lista.length}</span>
              </button>

              {abierto && (
                <div className="ml-2 space-y-0.5 border-l pl-2">
                  {lista.map((campo) => (
                    <button
                      key={campo.clave}
                      type="button"
                      title={campo.ayuda ?? campo.clave}
                      onClick={() =>
                        campo.clase === 'BLOQUE' ? onAgregarBloque(campo) : onInsertarEnTexto(campo.clave)
                      }
                      className={cn(
                        'flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left hover:bg-[var(--muted)]',
                        campo.clase === 'BLOQUE' && 'bg-sky-50/40',
                      )}
                    >
                      {campo.clase === 'BLOQUE'
                        ? <Table2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sky-600" strokeWidth={1.75} />
                        : <Type className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" strokeWidth={1.75} />}
                      <span className="min-w-0">
                        <span className="block truncate text-[12px]">{campo.rotulo}</span>
                        {campo.ayuda && (
                          <span className="block text-[10.5px] leading-tight text-muted-foreground">
                            {campo.ayuda}
                          </span>
                        )}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="border-t p-3">
        <p className="flex items-start gap-2 text-[11px] leading-tight text-muted-foreground">
          <Database className="mt-px h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
          <span>
            Selecciona un texto de la hoja y pulsa un dato para insertarlo dentro. Los
            bloques se agregan como una caja aparte.
          </span>
        </p>
      </div>
    </div>
  )
}
