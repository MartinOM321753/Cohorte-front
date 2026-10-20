import { useEffect, useMemo, useState } from 'react'
import { ArrowRightLeft, CheckCircle2, Search, XCircle } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import { Alert, AlertDescription } from '@/components/ui/alert'
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
import { getFullName } from '@/lib/utils'
import type { Paciente, ResumenReasignacion } from '@/types/api'

import { useGetPacientes, useGetInstitucionesParaRegistro } from '../hooks/useGetPacientes'
import { useReasignarInstitucion, useReasignarInstitucionPorRango } from '../hooks/useCreatePaciente'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type Modo = 'seleccion' | 'rango'

interface RangoProgramado {
  desde: number
  hasta: number
  destinoNombre: string
}

const FOLIO_MAX = 999999

/** Folio como lo guarda el sistema: seis dígitos. */
function formatearFolio(n: number) {
  return String(n).padStart(6, '0')
}

/**
 * Redistribuye participantes entre instituciones del grupo.
 *
 * Existe por la importación masiva: entró todo el padrón a nombre de la sede que
 * subió el archivo y hay que repartirlo. Hay dos formas: elegir participantes uno por
 * uno (en pantalla, con resumen inmediato) o por rango de folios (en segundo plano,
 * con el resumen por correo). Solo se mueven los que no tienen nada registrado.
 */
export function ReasignarInstitucionModal({ open, onOpenChange }: Props) {
  const [modo, setModo] = useState<Modo>('seleccion')
  const [busqueda, setBusqueda] = useState('')
  const [seleccion, setSeleccion] = useState<Set<string>>(new Set())
  const [destino, setDestino] = useState('')
  const [resumen, setResumen] = useState<ResumenReasignacion | null>(null)
  const [folioDesde, setFolioDesde] = useState('')
  const [folioHasta, setFolioHasta] = useState('')
  const [programada, setProgramada] = useState<RangoProgramado | null>(null)

  const { data, isLoading } = useGetPacientes({ incluirJerarquia: true }, { enabled: open })
  const { data: instituciones = [] } = useGetInstitucionesParaRegistro({ enabled: open })
  const mutation = useReasignarInstitucion()
  const mutationRango = useReasignarInstitucionPorRango()

  const participantes: Paciente[] = useMemo(() => (Array.isArray(data) ? data : []), [data])

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    if (!q) return participantes
    return participantes.filter((p) =>
      `${p.folio} ${getFullName(p.persona)}`.toLowerCase().includes(q),
    )
  }, [participantes, busqueda])

  useEffect(() => {
    if (open) {
      setModo('seleccion')
      setBusqueda('')
      setSeleccion(new Set())
      setResumen(null)
      setFolioDesde('')
      setFolioHasta('')
      setProgramada(null)
    }
  }, [open])

  const todosMarcados = filtrados.length > 0 && filtrados.every((p) => seleccion.has(p.uuid))

  // ─── Rango de folios ───────────────────────────────────────────────────────

  const desde = Number(folioDesde)
  const hasta = Number(folioHasta)
  const rangoVacio = folioDesde === '' || folioHasta === ''

  const rangoError: string | null = rangoVacio
    ? null
    : !Number.isInteger(desde) || !Number.isInteger(hasta)
      ? 'Escriba números enteros'
      : desde < 1 || hasta > FOLIO_MAX
        ? `Los folios van de 1 a ${FOLIO_MAX}`
        : desde > hasta
          ? 'El folio inicial no puede ser mayor que el final'
          : null

  const rangoValido = !rangoVacio && rangoError === null && destino !== ''
  const nombreDestino = instituciones.find((i) => String(i.id) === destino)?.nombre ?? ''

  async function reasignarRango() {
    if (!rangoValido) return
    try {
      await mutationRango.mutateAsync({
        folioDesde: desde,
        folioHasta: hasta,
        idInstitucion: Number(destino),
      })
      setProgramada({ desde, hasta, destinoNombre: nombreDestino })
    } catch {
      // El hook ya muestra el error; la ventana queda para que lo corrija.
    }
  }

  // ─── Selección manual ──────────────────────────────────────────────────────

  function alternar(uuid: string) {
    setSeleccion((prev) => {
      const s = new Set(prev)
      if (s.has(uuid)) s.delete(uuid)
      else s.add(uuid)
      return s
    })
  }

  function alternarTodos() {
    setSeleccion((prev) => {
      const s = new Set(prev)
      for (const p of filtrados) {
        if (todosMarcados) s.delete(p.uuid)
        else s.add(p.uuid)
      }
      return s
    })
  }

  async function reasignar() {
    if (seleccion.size === 0 || !destino) return
    const res = await mutation.mutateAsync({
      uuids: [...seleccion],
      idInstitucion: Number(destino),
    })
    setResumen(res)
    setSeleccion(new Set())
  }

  const rechazados = resumen?.detalle.filter((d) => !d.movido) ?? []

  // Vista de cierre: lo que quedó programado en el rango.
  const mostrandoProgramada = programada !== null
  const mostrandoResumen = !mostrandoProgramada && resumen !== null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5 text-primary" />
            Reasignar institución
          </DialogTitle>
          <DialogDescription>
            Mueve participantes a otra institución del grupo. Solo se pueden mover los que
            todavía no tienen estudios, muestras, somatometrías, exámenes, citas ni documentos.
          </DialogDescription>
        </DialogHeader>

        {mostrandoProgramada ? (
          <div className="flex-1 space-y-3 overflow-y-auto">
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                La reasignación de los folios <strong>{formatearFolio(programada.desde)}</strong> al{' '}
                <strong>{formatearFolio(programada.hasta)}</strong> hacia{' '}
                <strong>{programada.destinoNombre}</strong> quedó en proceso.
              </AlertDescription>
            </Alert>
            <p className="text-[13px] text-muted-foreground">
              Se procesa en segundo plano y puede cerrar esta ventana. Le llegará un correo con
              cuántos participantes se movieron y, de los que no, el motivo.
            </p>
          </div>
        ) : mostrandoResumen ? (
          <div className="flex-1 space-y-3 overflow-y-auto">
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                Se movieron <strong>{resumen.movidos}</strong> de {resumen.solicitados}{' '}
                participante(s).
              </AlertDescription>
            </Alert>

            {rechazados.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                  No se movieron ({rechazados.length})
                </p>
                <ul className="divide-y rounded-md border">
                  {rechazados.map((r) => (
                    <li key={r.uuid} className="flex items-start gap-2 px-3 py-2">
                      <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive" />
                      <span className="min-w-0 flex-1">
                        <span className="block font-mono text-[12px]">{r.folio ?? r.uuid}</span>
                        <span className="block text-[11px] text-muted-foreground">{r.motivo}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={modo === 'seleccion' ? 'default' : 'outline'}
                size="sm"
                className="h-8 text-[12px]"
                onClick={() => setModo('seleccion')}
              >
                Por selección
              </Button>
              <Button
                variant={modo === 'rango' ? 'default' : 'outline'}
                size="sm"
                className="h-8 text-[12px]"
                onClick={() => setModo('rango')}
              >
                Por rango de folios
              </Button>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-[12px] text-muted-foreground">Institución destino</Label>
              <Select value={destino} onValueChange={(v) => v && setDestino(v)}>
                <SelectTrigger className="h-9 text-[13px]">
                  <SelectValue placeholder="Seleccionar institución" />
                </SelectTrigger>
                <SelectContent>
                  {instituciones.map((i) => (
                    <SelectItem key={i.id} value={String(i.id)}>
                      {i.nombre}{i.propia ? ' (la tuya)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {modo === 'rango' ? (
              <div className="flex flex-1 flex-col gap-3 overflow-y-auto">
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-[12px] text-muted-foreground">Folio desde</Label>
                    <Input
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={FOLIO_MAX}
                      placeholder="1"
                      value={folioDesde}
                      onChange={(e) => setFolioDesde(e.target.value)}
                      className="h-9 font-mono text-[13px]"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-[12px] text-muted-foreground">Folio hasta</Label>
                    <Input
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={FOLIO_MAX}
                      placeholder="10000"
                      value={folioHasta}
                      onChange={(e) => setFolioHasta(e.target.value)}
                      className="h-9 font-mono text-[13px]"
                    />
                  </div>
                </div>

                {rangoError && (
                  <p className="text-[12px] text-destructive">{rangoError}</p>
                )}

                <p className="text-[12px] text-muted-foreground">
                  Se revisan los participantes de sus instituciones cuyo folio está en este rango.
                  Los que ya pertenecen a la institución destino se omiten. El proceso corre en segundo
                  plano y el resumen, con el motivo de cada uno que no se pudo mover, llega por correo.
                </p>
              </div>
            ) : (
              <>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    placeholder="Buscar por folio o nombre…"
                    className="h-9 pl-8 text-[13px]"
                  />
                </div>

                <div className="flex items-center justify-between gap-2">
                  <p className="text-[12px] text-muted-foreground">
                    {seleccion.size} seleccionado(s) de {filtrados.length} mostrado(s)
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-[12px]"
                    onClick={alternarTodos}
                    disabled={filtrados.length === 0}
                  >
                    {todosMarcados ? 'Quitar todos' : 'Seleccionar todos los mostrados'}
                  </Button>
                </div>

                <div className="flex-1 overflow-y-auto rounded-md border">
                  {isLoading ? (
                    <div className="flex items-center gap-2 px-3 py-6 text-sm text-muted-foreground">
                      <Spinner className="h-4 w-4" />
                      Cargando participantes…
                    </div>
                  ) : filtrados.length === 0 ? (
                    <p className="px-3 py-6 text-sm text-muted-foreground">
                      No hay participantes que coincidan.
                    </p>
                  ) : (
                    <ul className="divide-y">
                      {filtrados.map((p) => (
                        <li key={p.uuid}>
                          <label className="flex cursor-pointer items-center gap-2.5 px-3 py-2 hover:bg-muted/30">
                            <Checkbox
                              checked={seleccion.has(p.uuid)}
                              onCheckedChange={() => alternar(p.uuid)}
                            />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-[13px] font-medium">
                                {getFullName(p.persona)}
                              </span>
                              <span className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                                <span className="font-mono">{p.folio}</span>
                                {p.institucionNombre && <span>{p.institucionNombre}</span>}
                              </span>
                            </span>
                          </label>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </>
            )}
          </>
        )}

        <DialogFooter>
          {mostrandoProgramada ? (
            <Button onClick={() => onOpenChange(false)}>Cerrar</Button>
          ) : mostrandoResumen ? (
            <Button onClick={() => onOpenChange(false)}>Cerrar</Button>
          ) : modo === 'rango' ? (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button
                onClick={reasignarRango}
                disabled={!rangoValido || mutationRango.isPending}
                className="gap-1.5 bg-[var(--imss-green-500)] text-white hover:bg-[var(--imss-green-700)]"
              >
                {mutationRango.isPending ? (
                  <><Spinner className="h-4 w-4" />Iniciando…</>
                ) : (
                  <><ArrowRightLeft className="h-4 w-4" />Reasignar rango</>
                )}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button
                onClick={reasignar}
                disabled={seleccion.size === 0 || !destino || mutation.isPending}
                className="gap-1.5 bg-[var(--imss-green-500)] text-white hover:bg-[var(--imss-green-700)]"
              >
                {mutation.isPending ? (
                  <><Spinner className="h-4 w-4" />Reasignando…</>
                ) : (
                  <><ArrowRightLeft className="h-4 w-4" />Reasignar ({seleccion.size})</>
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
