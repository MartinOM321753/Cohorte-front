import { useMemo } from 'react'
import { Database, Table2, Type } from 'lucide-react'

import { Input } from '@/components/ui/input'
import { useState } from 'react'
import { cn } from '@/lib/utils'

import { useCamposReporte } from '../hooks/useReportes'
import type { CampoReporte, TipoReporte } from '../types.api'

interface Props {
  tipo: TipoReporte
  /** Insertar el campo en el texto que se está editando, si hay uno. */
  onInsertarEnTexto: (clave: string) => void
  /** Soltar un bloque en la hoja. */
  onAgregarBloque: (campo: CampoReporte) => void
}

/**
 * Los datos que se pueden meter en el reporte.
 *
 * <p>Dos formas de usarlos, deliberadamente distintas: un campo suelto se inserta
 * dentro de un texto —«folio {{participante.folio}}»— y un bloque ocupa su propia
 * caja en la hoja. Mezclarlos en un solo gesto confundiría, porque lo que hacen es
 * distinto.</p>
 */
export function PanelDatos({ tipo, onInsertarEnTexto, onAgregarBloque }: Props) {
  const { data: campos, isLoading } = useCamposReporte(tipo)
  const [busqueda, setBusqueda] = useState('')

  const porGrupo = useMemo(() => {
    const filtrados = (campos ?? []).filter((c) =>
      !busqueda.trim() ||
      c.rotulo.toLowerCase().includes(busqueda.toLowerCase()) ||
      c.clave.toLowerCase().includes(busqueda.toLowerCase()))

    const mapa = new Map<string, CampoReporte[]>()
    for (const c of filtrados) {
      if (!mapa.has(c.grupo)) mapa.set(c.grupo, [])
      mapa.get(c.grupo)!.push(c)
    }
    return [...mapa.entries()]
  }, [campos, busqueda])

  if (isLoading) {
    return <div className="p-4 text-[13px] text-muted-foreground">Cargando los datos disponibles…</div>
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b p-3">
        <Input
          className="h-8 text-[12px]"
          placeholder="Buscar un dato…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
      </div>

      <div className="flex-1 overflow-auto p-3">
        {porGrupo.length === 0 ? (
          <p className="text-[12px] text-muted-foreground">
            Ningún dato coincide con «{busqueda}».
          </p>
        ) : porGrupo.map(([grupo, lista]) => (
          <div key={grupo} className="mb-4">
            <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
              {grupo}
            </div>
            <div className="space-y-1">
              {lista.map((campo) => (
                <button
                  key={campo.clave}
                  type="button"
                  title={campo.ayuda ?? campo.clave}
                  onClick={() =>
                    campo.clase === 'BLOQUE' ? onAgregarBloque(campo) : onInsertarEnTexto(campo.clave)
                  }
                  className={cn(
                    'flex w-full items-start gap-2 rounded-md border px-2 py-1.5 text-left',
                    'hover:bg-[var(--muted)]',
                    campo.clase === 'BLOQUE' ? 'border-sky-200 bg-sky-50/50' : 'border-transparent',
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
          </div>
        ))}
      </div>

      <div className="border-t p-3">
        <p className="flex items-start gap-2 text-[11px] leading-tight text-muted-foreground">
          <Database className="mt-px h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
          <span>
            Selecciona un texto de la hoja y pulsa un dato para insertarlo dentro.
            Los bloques se agregan como una caja aparte.
          </span>
        </p>
      </div>
    </div>
  )
}
