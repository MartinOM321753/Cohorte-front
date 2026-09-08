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

/** Un estudio, un examen: lo que cuelga dentro de una familia. */
interface Subgrupo {
  nombre: string
  campos: CampoReporte[]
}

interface Grupo {
  nombre: string
  /** Los que no pertenecen a ningún estudio concreto: van arriba, sueltos. */
  sueltos: CampoReporte[]
  subgrupos: Subgrupo[]
  total: number
}

/**
 * Los datos que se pueden meter en el reporte.
 *
 * <p>Dos niveles: la familia —Participante, Estudios, Exámenes— y, dentro, el
 * estudio o el examen concreto. Antes cada estudio era una familia suelta, así que
 * la lista era una hilera de veintitantos grupos al mismo nivel que «Participante»
 * sin que se viera que todos eran lo mismo.</p>
 *
 * <p>Al buscar no se despliega el árbol: se devuelve una lista plana donde cada
 * resultado dice de dónde viene. Quien diseña la plantilla suele recibir una lista
 * de nombres de parámetros y nada más, y lo que necesita al escribir «hemoglobina»
 * es justamente saber a qué estudio pertenece.</p>
 */
export function PanelDatos({ onInsertarEnTexto, onAgregarBloque }: Props) {
  const { data: campos, isLoading } = useCamposReporte()
  const [busqueda, setBusqueda] = useState('')
  const [gruposAbiertos, setGruposAbiertos] = useState<Record<string, boolean>>({})
  const [subsAbiertos, setSubsAbiertos] = useState<Record<string, boolean>>({})

  const texto = busqueda.trim().toLowerCase()
  const buscando = texto.length > 0

  const resultados = useMemo(() => {
    if (!buscando) return []
    // Coincide por rótulo, por familia o por el estudio del que viene.
    return (campos ?? []).filter((c) =>
      c.rotulo.toLowerCase().includes(texto)
      || c.grupo.toLowerCase().includes(texto)
      || (c.subgrupo ?? '').toLowerCase().includes(texto))
  }, [campos, texto, buscando])

  const grupos = useMemo<Grupo[]>(() => {
    const mapa = new Map<string, Grupo>()
    for (const c of campos ?? []) {
      let g = mapa.get(c.grupo)
      if (!g) {
        g = { nombre: c.grupo, sueltos: [], subgrupos: [], total: 0 }
        mapa.set(c.grupo, g)
      }
      g.total++
      if (!c.subgrupo) {
        g.sueltos.push(c)
        continue
      }
      let s = g.subgrupos.find((x) => x.nombre === c.subgrupo)
      if (!s) {
        s = { nombre: c.subgrupo, campos: [] }
        g.subgrupos.push(s)
      }
      s.campos.push(c)
    }
    return [...mapa.values()]
  }, [campos])

  if (isLoading) {
    return <div className="p-4 text-[13px] text-muted-foreground">Cargando los datos disponibles…</div>
  }

  const fila = (campo: CampoReporte, procedencia?: string) => (
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
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[12px]">{campo.rotulo}</span>
        {procedencia && (
          <span className="block truncate text-[10.5px] leading-tight text-sky-700">{procedencia}</span>
        )}
        {campo.ayuda && (
          <span className="block text-[10.5px] leading-tight text-muted-foreground">{campo.ayuda}</span>
        )}
      </span>
    </button>
  )

  return (
    <div className="flex h-full flex-col">
      <div className="border-b p-3">
        <Input
          className="h-8 text-[12px]"
          placeholder="Buscar un parámetro, un estudio o un examen…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
      </div>

      <div className="flex-1 overflow-auto p-2">
        {buscando ? (
          resultados.length === 0 ? (
            <p className="p-2 text-[12px] text-muted-foreground">
              Ningún dato coincide con «{busqueda}».
            </p>
          ) : (
            <>
              <p className="px-2 pb-1 text-[10.5px] text-muted-foreground">
                {resultados.length} {resultados.length === 1 ? 'resultado' : 'resultados'}
              </p>
              <div className="space-y-0.5">
                {resultados.map((c) =>
                  fila(c, c.subgrupo ? `${c.grupo} · ${c.subgrupo}` : c.grupo))}
              </div>
            </>
          )
        ) : (
          grupos.map((g, indice) => {
            // Solo la primera familia viene abierta: con el catálogo entero
            // desplegado no se encuentra nada.
            const abierto = gruposAbiertos[g.nombre] ?? indice === 0
            return (
              <div key={g.nombre} className="mb-1">
                <button
                  type="button"
                  className="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left hover:bg-[var(--muted)]"
                  onClick={() => setGruposAbiertos((p) => ({ ...p, [g.nombre]: !abierto }))}
                >
                  {abierto
                    ? <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" strokeWidth={1.75} />
                    : <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" strokeWidth={1.75} />}
                  <span className="min-w-0 flex-1 truncate text-[11px] font-semibold uppercase tracking-[0.05em] text-muted-foreground">
                    {g.nombre}
                  </span>
                  <span className="text-[10px] text-muted-foreground">{g.total}</span>
                </button>

                {abierto && (
                  <div className="ml-2 space-y-0.5 border-l pl-2">
                    {g.sueltos.map((c) => fila(c))}

                    {g.subgrupos.map((s) => {
                      const clave = `${g.nombre}/${s.nombre}`
                      const sAbierto = subsAbiertos[clave] ?? false
                      return (
                        <div key={clave}>
                          <button
                            type="button"
                            className="flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-left hover:bg-[var(--muted)]"
                            onClick={() => setSubsAbiertos((p) => ({ ...p, [clave]: !sAbierto }))}
                          >
                            {sAbierto
                              ? <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" strokeWidth={1.75} />
                              : <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" strokeWidth={1.75} />}
                            <span className="min-w-0 flex-1 truncate text-[12px]">{s.nombre}</span>
                            <span className="text-[10px] text-muted-foreground">{s.campos.length}</span>
                          </button>
                          {sAbierto && (
                            <div className="ml-2 space-y-0.5 border-l pl-2">
                              {s.campos.map((c) => fila(c))}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })
        )}
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
