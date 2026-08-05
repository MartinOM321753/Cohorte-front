import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Printer } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { PrintableLabelsView } from '@/components/print/PrintableLabelsView'
import { useGetConfiguracionesActivas } from '@/features/configuracion/hooks/useEtiquetas'
import type { DocumentoResponseDTO, PrintableLabelBatchDTO } from '@/types/api'

import { useDocumentosPaciente } from '../hooks/useDocumentos'
import { getLabelDataDocumentos, type ContenidoCodigo } from '../api/documentos.api'
import { SelectorContenidoCodigo } from './SelectorContenidoCodigo'

// ─── Agrupación ───────────────────────────────────────────────────────────────

type ClaveGrupo = 'CONSENTIMIENTO' | 'CUESTIONARIO' | 'GENERAL' | 'OTRO'

const GRUPOS: { clave: ClaveGrupo; titulo: string }[] = [
  { clave: 'CONSENTIMIENTO', titulo: 'Consentimientos' },
  { clave: 'CUESTIONARIO', titulo: 'Cuestionarios' },
  { clave: 'GENERAL', titulo: 'Documentos' },
  { clave: 'OTRO', titulo: 'Otros' },
]

function grupoDe(doc: DocumentoResponseDTO): ClaveGrupo {
  switch (doc.tipoEntidad) {
    case 'PACIENTE_CONSENTIMIENTO': return 'CONSENTIMIENTO'
    case 'PACIENTE_CUESTIONARIO': return 'CUESTIONARIO'
    case 'PACIENTE_GENERAL': return 'GENERAL'
    default: return 'OTRO'
  }
}

/**
 * Los cuatro cuestionarios comparten el mismo tipo de entidad; lo único que los
 * distingue es el prefijo de la etiqueta ({PREFIJO}/{folio}/F4). Se traduce para
 * que en la lista se sepa cuál es cuál sin abrir cada pestaña.
 */
const PREFIJO_A_NOMBRE: Record<string, string> = {
  CI: 'Consentimiento informado',
  C1: 'Cuestionario general de la Cohorte',
  C2: 'Minimental (>45 años)',
  C3: 'Afluencia verbal (>45 años)',
  C4: 'AGES',
}

function descripcionDe(doc: DocumentoResponseDTO): string {
  const prefijo = doc.etiqueta?.split('/')[0] ?? ''
  const porPrefijo = PREFIJO_A_NOMBRE[prefijo]
  if (porPrefijo) return porPrefijo
  if (doc.archivoSubido) return doc.nombreOriginal
  return doc.descripcion || 'Etiqueta sin archivo'
}

function formatFecha(iso: string): string {
  return new Date(iso).toLocaleDateString('es-MX', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  pacienteUUID: string
  /** Render-prop para personalizar el disparador; recibe la función `open`. */
  trigger?: (open: () => void) => ReactNode
}

/**
 * Imprime en una sola hoja las etiquetas de consentimientos, cuestionarios y
 * documentos del participante. Antes de imprimir se eligen cuáles entran, y en la
 * vista previa se decide en qué posición de la hoja cae cada una.
 */
export function ImprimirEtiquetasLoteButton({ pacienteUUID, trigger }: Props) {
  const [open, setOpen] = useState(false)
  const [seleccion, setSeleccion] = useState<Set<number>>(new Set())
  const [configId, setConfigId] = useState('')
  const [contenido, setContenido] = useState<ContenidoCodigo>('ENLACE')
  const [cargando, setCargando] = useState(false)
  const [lote, setLote] = useState<PrintableLabelBatchDTO | null>(null)

  const { data: documentos = [], isLoading } = useDocumentosPaciente(pacienteUUID, { enabled: open })
  const { data: configuraciones } = useGetConfiguracionesActivas()

  // Solo se puede imprimir lo que ya tiene etiqueta asignada.
  const imprimibles = useMemo(
    () => documentos.filter((d) => !!d.etiqueta),
    [documentos],
  )

  const configSeleccionada = useMemo(
    () => configuraciones?.find((c) => String(c.id) === configId),
    [configuraciones, configId],
  )

  const agrupados = useMemo(
    () =>
      GRUPOS
        .map((g) => ({ ...g, docs: imprimibles.filter((d) => grupoDe(d) === g.clave) }))
        .filter((g) => g.docs.length > 0),
    [imprimibles],
  )

  useEffect(() => {
    if (configuraciones && configuraciones.length > 0 && !configId) {
      const pred = configuraciones.find((c) => c.predeterminada)
      setConfigId(String(pred ? pred.id : configuraciones[0].id))
    }
  }, [configuraciones, configId])

  function handleOpen() {
    setSeleccion(new Set())
    setOpen(true)
  }

  function alternar(id: number) {
    setSeleccion((prev) => {
      const s = new Set(prev)
      if (s.has(id)) s.delete(id)
      else s.add(id)
      return s
    })
  }

  function alternarGrupo(docs: DocumentoResponseDTO[], todosMarcados: boolean) {
    setSeleccion((prev) => {
      const s = new Set(prev)
      for (const d of docs) {
        if (todosMarcados) s.delete(d.id)
        else s.add(d.id)
      }
      return s
    })
  }

  function seleccionarTodo() {
    setSeleccion(new Set(imprimibles.map((d) => d.id)))
  }

  async function continuar() {
    // Se conserva el orden de la lista, no el de marcado: es el que el usuario ve.
    const ids = imprimibles.filter((d) => seleccion.has(d.id)).map((d) => d.id)
    if (ids.length === 0) return

    setCargando(true)
    try {
      const datos = await getLabelDataDocumentos(
        ids,
        configId ? Number(configId) : undefined,
        contenido,
      )
      setOpen(false)
      setLote(datos)
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message || err?.message || 'No se pudieron obtener las etiquetas',
      )
    } finally {
      setCargando(false)
    }
  }

  return (
    <>
      {trigger ? (
        trigger(handleOpen)
      ) : (
        <Button variant="outline" size="sm" className="gap-1.5" onClick={handleOpen}>
          <Printer className="h-3.5 w-3.5" />
          Imprimir etiquetas
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Imprimir etiquetas en lote</DialogTitle>
            <DialogDescription>
              Elige las etiquetas que necesitas imprimir. En el siguiente paso podrás decidir en
              qué posición de la hoja se coloca cada una.
            </DialogDescription>
          </DialogHeader>

          {isLoading ? (
            <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
              <Spinner className="h-4 w-4" />
              Cargando etiquetas…
            </div>
          ) : imprimibles.length === 0 ? (
            <p className="py-6 text-sm text-muted-foreground">
              Este participante todavía no tiene etiquetas generadas.
            </p>
          ) : (
            <>
              <div className="flex items-center justify-between gap-2">
                <p className="text-[12px] text-muted-foreground">
                  {seleccion.size} de {imprimibles.length} seleccionada(s)
                </p>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" className="h-7 text-[12px]" onClick={seleccionarTodo}>
                    Seleccionar todo
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-[12px]"
                    onClick={() => setSeleccion(new Set())}
                    disabled={seleccion.size === 0}
                  >
                    Limpiar
                  </Button>
                </div>
              </div>

              <div className="flex-1 space-y-4 overflow-y-auto pr-1">
                {agrupados.map((grupo) => {
                  const todosMarcados = grupo.docs.every((d) => seleccion.has(d.id))
                  return (
                    <section key={grupo.clave} className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id={`grupo-${grupo.clave}`}
                          checked={todosMarcados}
                          onCheckedChange={() => alternarGrupo(grupo.docs, todosMarcados)}
                        />
                        <Label
                          htmlFor={`grupo-${grupo.clave}`}
                          className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground cursor-pointer"
                        >
                          {grupo.titulo} ({grupo.docs.length})
                        </Label>
                      </div>

                      <ul className="divide-y rounded-md border">
                        {grupo.docs.map((doc) => (
                          <li key={doc.id}>
                            <label className="flex cursor-pointer items-start gap-2.5 px-3 py-2 hover:bg-muted/30">
                              <Checkbox
                                className="mt-0.5"
                                checked={seleccion.has(doc.id)}
                                onCheckedChange={() => alternar(doc.id)}
                              />
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-[13px] font-medium">
                                  {descripcionDe(doc)}
                                </span>
                                <span className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                                  <span className="font-mono">{doc.etiqueta}</span>
                                  {doc.fechaSubida && <span>{formatFecha(doc.fechaSubida)}</span>}
                                  {!doc.archivoSubido && (
                                    <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                                      Pendiente de archivo
                                    </span>
                                  )}
                                </span>
                              </span>
                            </label>
                          </li>
                        ))}
                      </ul>
                    </section>
                  )
                })}
              </div>

              {configuraciones && configuraciones.length > 0 ? (
                <div className="flex flex-col gap-3 border-t pt-3">
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-[12px] text-muted-foreground">Configuración de etiqueta</Label>
                    <Select value={configId} onValueChange={(v) => v && setConfigId(v)}>
                      <SelectTrigger className="h-9 text-[13px]">
                        <SelectValue placeholder="Seleccionar configuración" />
                      </SelectTrigger>
                      <SelectContent>
                        {configuraciones.map((c) => (
                          <SelectItem key={c.id} value={String(c.id)}>
                            {c.nombre}{c.predeterminada ? ' *' : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <SelectorContenidoCodigo
                    tipoCodigo={configSeleccionada?.tipoCodigo}
                    value={contenido}
                    onChange={setContenido}
                  />
                </div>
              ) : (
                <p className="border-t pt-3 text-xs text-amber-600">
                  No hay configuraciones de etiqueta. Cree una en Configuración &gt; Etiquetas.
                </p>
              )}
            </>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={continuar}
              disabled={seleccion.size === 0 || cargando || !configuraciones?.length}
              className="gap-1.5 bg-[var(--imss-green-500)] text-white hover:bg-[var(--imss-green-700)]"
            >
              {cargando ? (
                <><Spinner className="h-4 w-4" />Preparando…</>
              ) : (
                <><Printer className="h-4 w-4" />Vista previa ({seleccion.size})</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {lote && (
        <PrintableLabelsView
          open
          etiquetas={lote.etiquetas}
          configuracion={lote.configuracion}
          onClose={() => setLote(null)}
        />
      )}
    </>
  )
}
