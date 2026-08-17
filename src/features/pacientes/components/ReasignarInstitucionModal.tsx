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
import { useReasignarInstitucion } from '../hooks/useCreatePaciente'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * Redistribuye participantes entre instituciones del grupo.
 *
 * Existe por la importación masiva: entró todo el padrón a nombre de la sede que
 * subió el archivo y hay que repartirlo. Solo se mueven los que no tienen nada
 * registrado; los demás vuelven en el resumen con el motivo, sin abortar el resto.
 */
export function ReasignarInstitucionModal({ open, onOpenChange }: Props) {
  const [busqueda, setBusqueda] = useState('')
  const [seleccion, setSeleccion] = useState<Set<string>>(new Set())
  const [destino, setDestino] = useState('')
  const [resumen, setResumen] = useState<ResumenReasignacion | null>(null)

  const { data, isLoading } = useGetPacientes({ incluirJerarquia: true }, { enabled: open })
  const { data: instituciones = [] } = useGetInstitucionesParaRegistro({ enabled: open })
  const mutation = useReasignarInstitucion()

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
      setBusqueda('')
      setSeleccion(new Set())
      setResumen(null)
    }
  }, [open])

  const todosMarcados = filtrados.length > 0 && filtrados.every((p) => seleccion.has(p.uuid))

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

        {resumen ? (
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

        <DialogFooter>
          {resumen ? (
            <Button onClick={() => onOpenChange(false)}>Cerrar</Button>
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
