import { useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  ShieldCheck, ShieldAlert, X, Save, Info, Lock, CalendarClock, Infinity as InfinityIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { cn, formatDate } from '@/lib/utils'
import { useAuthStore } from '@/stores/authStore'
import { SeccionesSidebar } from './SeccionesSidebar'
import { SECCIONES } from '@/config/permisoSecciones'
import * as permisosApi from '../api/permisos.api'
import type { PermisoIndividualDTO, UsuarioPermisosResumenDTO } from '../types/permiso.types'

interface Props {
  uuid: string
  resumen: UsuarioPermisosResumenDTO
  puedeEditar: boolean
}

type Modo = 'ver' | 'conceder' | 'restringir'
type Estado = 'rol' | 'individual' | 'restringido' | 'ninguno'

const MOTIVO_MAX = 200

/**
 * Vista por módulos de los permisos de un usuario, ahora interactiva.
 *
 * <p>Sustituye al modal de conceder/restringir: en lugar de un desplegable con
 * todos los permisos sueltos, se trabaja sobre la misma lista por módulos que ya
 * se veía en solo lectura. Dos modos la desbloquean —conceder y restringir—; en
 * cada uno se marcan varios permisos y todos se guardan con el mismo motivo y la
 * misma duración. Para un motivo o una vigencia distinta por permiso, se hace de
 * uno en uno.</p>
 */
export function ModuloPermisosEditor({ uuid, resumen, puedeEditar }: Props) {
  const qc = useQueryClient()
  const [seccionActiva, setSeccionActiva] = useState<string>(SECCIONES[0].id)
  const [modo, setModo] = useState<Modo>('ver')
  const [seleccion, setSeleccion] = useState<Set<string>>(new Set())
  const [duracion, setDuracion] = useState<'permanente' | 'fecha'>('permanente')
  const [fechaFin, setFechaFin] = useState('')
  const [motivo, setMotivo] = useState('')

  // Set de permisos efectivos (los que el usuario tiene ahora, ya con las
  // restricciones aplicadas) para pintar el estado de cada acción.
  const permisosEfectivos = useMemo(() => {
    const s = new Set<string>()
    resumen.permisosEfectivos.forEach((p) => s.add(p.codigo))
    return s
  }, [resumen])

  // El override individual vigente de cada código, para saber si viene de una
  // concesión o de una restricción y con qué vigencia.
  const individualPorCodigo = useMemo(() => {
    const m = new Map<string, PermisoIndividualDTO>()
    resumen.permisosIndividuales.forEach((pi) => { if (pi.activo) m.set(pi.codigoPermiso, pi) })
    return m
  }, [resumen])

  const seccion = useMemo(
    () => SECCIONES.find((s) => s.id === seccionActiva) ?? SECCIONES[0],
    [seccionActiva],
  )

  // ── Estado de cada acción ──────────────────────────────────────────────────

  function estadoDe(cods: string[]): Estado {
    const restringido = cods.some((c) => individualPorCodigo.get(c)?.tipo === 'RESTRICCION')
    if (restringido) return 'restringido'
    const efectiva = cods.length > 0 && cods.every((c) => permisosEfectivos.has(c))
    if (!efectiva) return 'ninguno'
    const individual = cods.every((c) => individualPorCodigo.get(c)?.tipo === 'CONCESION')
    return individual ? 'individual' : 'rol'
  }

  /** En modo conceder solo se ofrecen los que aún no tiene; en restringir, los que no están ya restringidos. */
  function esCandidata(estado: Estado): boolean {
    if (modo === 'conceder') return estado === 'ninguno'
    if (modo === 'restringir') return estado !== 'restringido'
    return false
  }

  function seleccionada(cods: string[]): boolean {
    return cods.length > 0 && cods.every((c) => seleccion.has(c))
  }

  function toggleAccion(cods: string[]) {
    setSeleccion((prev) => {
      const next = new Set(prev)
      const marcar = !seleccionada(cods)
      cods.forEach((c) => (marcar ? next.add(c) : next.delete(c)))
      return next
    })
  }

  // ── Modos ──────────────────────────────────────────────────────────────────

  function iniciarModo(m: Modo) {
    setModo(m)
    setSeleccion(new Set())
    setMotivo('')
    setDuracion('permanente')
    setFechaFin('')
  }

  function cancelar() {
    iniciarModo('ver')
    setModo('ver')
  }

  const guardarMut = useMutation({
    mutationFn: async () => {
      const fn = modo === 'restringir' ? permisosApi.restringirPermiso : permisosApi.concederPermiso
      const cuerpo = (codigo: string) => ({
        codigoPermiso: codigo,
        motivo: motivo.trim(),
        fechaFin: duracion === 'fecha' && fechaFin ? fechaFin : null,
      })
      // En serie a propósito: son pocas y así la bitácora queda en orden y un
      // fallo a la mitad no deja la mitad aplicada sin que se note.
      for (const codigo of seleccion) {
        await fn(uuid, cuerpo(codigo))
      }
    },
    onSuccess: () => {
      const n = seleccion.size
      qc.invalidateQueries({ queryKey: ['permisos', 'usuario', uuid] })
      qc.invalidateQueries({ queryKey: ['permisos', 'bitacora'] })
      useAuthStore.getState().restoreSession()
      toast.success(modo === 'restringir'
        ? `${n} permiso(s) restringido(s)`
        : `${n} permiso(s) concedido(s)`)
      setModo('ver')
      setSeleccion(new Set())
      setMotivo('')
      setFechaFin('')
    },
    onError: () => toast.error('No se pudieron guardar los cambios'),
  })

  const motivoValido = motivo.trim().length > 0
  const fechaValida = duracion === 'permanente' || fechaFin.trim().length > 0
  const puedeGuardar = seleccion.size > 0 && motivoValido && fechaValida && !guardarMut.isPending
  const minFecha = new Date().toISOString().slice(0, 16)

  const conceder = modo === 'conceder'
  const restringir = modo === 'restringir'

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">
          Permisos por módulo ({permisosEfectivos.size})
        </h3>
        {puedeEditar && modo === 'ver' && (
          <div className="flex gap-1">
            <Button size="sm" variant="outline" className="h-7 text-[11px]"
              onClick={() => iniciarModo('conceder')}>
              <ShieldCheck className="h-3.5 w-3.5 mr-1" /> Conceder
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-[11px] text-destructive"
              onClick={() => iniciarModo('restringir')}>
              <ShieldAlert className="h-3.5 w-3.5 mr-1" /> Restringir
            </Button>
          </div>
        )}
      </div>

      {/* Aviso de contexto según el modo */}
      {modo === 'ver' ? (
        <div className="rounded-lg border border-border bg-muted/30 p-2.5 mb-3 flex items-start gap-2 text-[11px]">
          <Info className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
          <p className="text-muted-foreground">
            Cada acción muestra de dónde viene: <b>del rol</b>, <b>concedido</b> a este usuario o
            <b> restringido</b>. Usa <b>Conceder</b> o <b>Restringir</b> para desbloquear la lista y
            marcar varios a la vez.
          </p>
        </div>
      ) : (
        <div className={cn('rounded-lg p-2.5 mb-3 flex items-start gap-2 text-[11px] border',
          conceder ? 'border-blue-500/30 bg-blue-500/5' : 'border-red-500/30 bg-red-500/5')}>
          <Info className={cn('h-3.5 w-3.5 shrink-0 mt-0.5', conceder ? 'text-blue-600' : 'text-red-600')} />
          <p className={conceder ? 'text-blue-800 dark:text-blue-300' : 'text-red-800 dark:text-red-300'}>
            {conceder
              ? 'Modo conceder: marca los permisos que quieres AGREGAR a este usuario. Todos llevarán el mismo motivo y la misma duración.'
              : 'Modo restringir: marca los permisos que quieres BLOQUEAR, aunque los herede de un rol. Todos llevarán el mismo motivo y la misma duración.'}
          </p>
        </div>
      )}

      <div className="rounded-lg border border-border overflow-hidden flex flex-col lg:flex-row min-h-[380px]">
        <SeccionesSidebar
          activaId={seccionActiva}
          onSelect={setSeccionActiva}
          permisosActivos={permisosEfectivos}
        />

        <div className="flex-1 p-4 max-h-[55vh] overflow-y-auto">
          <div className="mb-3">
            <div className="flex items-center gap-2 mb-1">
              <seccion.icono className="h-5 w-5 text-[var(--imss-green-500)]" />
              <h2 className="text-[15px] font-semibold">{seccion.nombre}</h2>
            </div>
            <p className="text-[12px] text-muted-foreground">{seccion.descripcion}</p>
          </div>

          <div className="space-y-4">
            {seccion.subsecciones.map((sub) => (
              <div key={sub.id}>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
                  {sub.nombre}
                </p>
                <div className="space-y-1">
                  {sub.acciones.map((accion) => {
                    const estado = estadoDe(accion.permisos)
                    const candidata = esCandidata(estado)
                    const marcada = seleccionada(accion.permisos)
                    const editable = modo !== 'ver' && puedeEditar && candidata
                    // En modo edición el check refleja la selección; ya-lo-tiene o
                    // ya-restringido salen fijos para que se vea que no aplican.
                    // Fijos (no editables) se muestran marcados solo si de verdad
                    // "aplican": ya lo tiene (conceder) o ya está bloqueado (restringir).
                    const checked = modo === 'ver'
                      ? estado === 'rol' || estado === 'individual'
                      : editable
                        ? marcada
                        : (conceder ? (estado === 'rol' || estado === 'individual') : estado === 'restringido')
                    const ind = individualPorCodigo.get(accion.permisos[0])

                    return (
                      <label
                        key={accion.id}
                        className={cn('flex items-start gap-3 py-2 px-2 -mx-2 rounded transition-colors',
                          editable ? 'cursor-pointer hover:bg-muted/30' : 'cursor-default')}
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={() => editable && toggleAccion(accion.permisos)}
                          disabled={!editable}
                          className="mt-0.5 shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[13px]">{accion.label}</span>
                            <ChipEstado estado={estado} ind={ind} />
                          </div>
                          {accion.descripcion && (
                            <p className="text-[11px] text-muted-foreground mt-0.5">{accion.descripcion}</p>
                          )}
                        </div>
                      </label>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Barra de guardado: aparece al entrar en un modo */}
      {modo !== 'ver' && (
        <div className={cn('mt-3 rounded-lg border p-3 space-y-3',
          conceder ? 'border-blue-500/40 bg-blue-500/5' : 'border-red-500/40 bg-red-500/5')}>
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-medium">
              {seleccion.size} permiso(s) seleccionado(s)
            </span>
            <Button size="sm" variant="ghost" className="h-7 text-[11px]" onClick={cancelar}>
              <X className="h-3.5 w-3.5 mr-1" /> Cancelar
            </Button>
          </div>

          {/* Duración: permanente o hasta una fecha */}
          <div>
            <p className="text-[11px] font-medium mb-1">Duración</p>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button" size="sm"
                variant={duracion === 'permanente' ? 'default' : 'outline'}
                className="h-8 text-[12px]"
                onClick={() => setDuracion('permanente')}
              >
                <InfinityIcon className="h-3.5 w-3.5 mr-1" /> Permanente
              </Button>
              <Button
                type="button" size="sm"
                variant={duracion === 'fecha' ? 'default' : 'outline'}
                className="h-8 text-[12px]"
                onClick={() => setDuracion('fecha')}
              >
                <CalendarClock className="h-3.5 w-3.5 mr-1" /> Hasta una fecha
              </Button>
              {duracion === 'fecha' && (
                <Input
                  type="datetime-local"
                  value={fechaFin}
                  min={minFecha}
                  onChange={(e) => setFechaFin(e.target.value)}
                  className="h-8 w-[220px] text-[12px]"
                />
              )}
            </div>
          </div>

          {/* Motivo obligatorio */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <p className="text-[11px] font-medium">Motivo <span className="text-destructive">*</span></p>
              <span className="text-[10px] text-muted-foreground">{motivo.length}/{MOTIVO_MAX}</span>
            </div>
            <Textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value.slice(0, MOTIVO_MAX))}
              placeholder={conceder
                ? 'Razón de la concesión (obligatorio)…'
                : 'Razón de la restricción (obligatorio)…'}
              className="resize-none text-[12px]"
              rows={2}
            />
          </div>

          <div className="flex items-center justify-end gap-2">
            <Button
              size="sm"
              variant={restringir ? 'destructive' : 'default'}
              disabled={!puedeGuardar}
              onClick={() => guardarMut.mutate()}
              title={!motivoValido ? 'El motivo es obligatorio'
                : seleccion.size === 0 ? 'Marca al menos un permiso'
                : !fechaValida ? 'Indica la fecha de expiración' : undefined}
            >
              {guardarMut.isPending ? <Spinner className="h-4 w-4 mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Guardar {seleccion.size > 0 ? `(${seleccion.size})` : ''}
            </Button>
          </div>
        </div>
      )}
    </section>
  )
}

// ── Chip de estado ────────────────────────────────────────────────────────────

function ChipEstado({ estado, ind }: { estado: Estado; ind?: PermisoIndividualDTO }) {
  if (estado === 'rol') {
    return <Badge variant="secondary" className="text-[10px]">Del rol</Badge>
  }
  if (estado === 'individual') {
    const vigencia = ind?.fechaFin ? `hasta ${formatDate(ind.fechaFin)}` : 'permanente'
    return (
      <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 bg-blue-500/10 text-blue-700 dark:text-blue-400 text-[10px] font-medium">
        <ShieldCheck className="h-3 w-3" /> Concedido · {vigencia}
      </span>
    )
  }
  if (estado === 'restringido') {
    const vigencia = ind?.fechaFin ? `hasta ${formatDate(ind.fechaFin)}` : 'permanente'
    return (
      <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 bg-red-500/10 text-red-700 dark:text-red-400 text-[10px] font-medium">
        <Lock className="h-3 w-3" /> Restringido · {vigencia}
      </span>
    )
  }
  return <span className="text-[10px] text-muted-foreground">Sin acceso</span>
}
