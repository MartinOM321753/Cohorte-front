import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  HandHelping, Loader2, PackageCheck, FlaskConical, Undo2, Ban, AlertTriangle,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn, formatDate } from '@/lib/utils'
import { useAuthStore } from '@/stores/authStore'
import { EntregaMuestra } from '@/types/api'
import {
  useGetEntregasActivas, useDevolverEntrega, useConsumirEntrega, useCancelarEntrega,
} from '../hooks/useEntregas'

type Modo = 'devolver' | 'consumir' | 'cancelar'

export function EntregasTab() {
  const userUuid = useAuthStore((s) => s.user?.uuid) || ''
  const puedeDevolver = useAuthStore((s) => s.hasPermiso('ENTREGAS_DEVOLVER'))
  const puedeConsumir = useAuthStore((s) => s.hasPermiso('ENTREGAS_CONSUMIR'))
  const puedeCancelar = useAuthStore((s) => s.hasPermiso('ENTREGAS_CANCELAR'))

  const { data: entregas = [], isLoading } = useGetEntregasActivas()
  const devolver = useDevolverEntrega()
  const consumir = useConsumirEntrega()
  const cancelar = useCancelarEntrega()

  const [target, setTarget] = useState<{ entrega: EntregaMuestra; modo: Modo } | null>(null)
  const [texto, setTexto] = useState('')

  const abrir = (entrega: EntregaMuestra, modo: Modo) => { setTarget({ entrega, modo }); setTexto('') }
  const cerrar = () => { setTarget(null); setTexto('') }

  const submitting = devolver.isPending || consumir.isPending || cancelar.isPending

  const confirmar = async () => {
    if (!target) return
    const { entrega, modo } = target
    try {
      if (modo === 'devolver') {
        await devolver.mutateAsync({ idEntrega: entrega.id, data: { uuidCierra: userUuid, observaciones: texto.trim() || undefined } })
      } else if (modo === 'consumir') {
        await consumir.mutateAsync({ idEntrega: entrega.id, data: { uuidCierra: userUuid, observaciones: texto.trim() || undefined } })
      } else {
        if (!texto.trim()) { toast.error('Indique el motivo de la cancelación.'); return }
        await cancelar.mutateAsync({ idEntrega: entrega.id, data: { uuidUsuario: userUuid, motivo: texto.trim() } })
      }
      cerrar()
    } catch { /* el hook muestra el toast */ }
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold flex items-center gap-2">
          <HandHelping className="h-4 w-4" /> Entregas a colaboradores
        </h3>
        <p className="text-sm text-muted-foreground">
          Muestras entregadas a personas físicas. Al cerrar, regístrelas como devueltas o, si no regresan,
          como consumidas (conservan su volumen para capturar estudios).
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : entregas.length === 0 ? (
        <div className="rounded-md border border-dashed py-10 text-center text-sm text-muted-foreground">
          No hay entregas activas.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {entregas.map((e) => (
            <div key={e.id} className="rounded-lg border p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-mono text-sm font-semibold truncate">{e.muestra.etiqueta}</div>
                  <div className="text-xs text-muted-foreground">
                    {e.muestra.esAlicuota ? 'Alícuota' : 'Tubo principal'}
                    {e.muestra.valor != null && ` · ${e.muestra.valor} ${e.muestra.unidad ?? ''}`}
                  </div>
                </div>
                {e.vencido && (
                  <Badge variant="outline" className="text-[10px] bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30 shrink-0">
                    <AlertTriangle className="h-3 w-3 mr-1" /> Vencida
                  </Badge>
                )}
              </div>

              <div className="text-sm space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground">Destinatario: </span>
                  <span className="font-medium">{e.destinatario?.nombreCompleto ?? '—'}</span>
                  {e.destinatario && (
                    <Badge variant="outline" className="text-[10px]">
                      {e.destinatario.tipo === 'USUARIO' ? 'Usuario' : 'Colaborador'}
                    </Badge>
                  )}
                </div>
                {e.destinatario?.cargo && <div className="text-xs text-muted-foreground">{e.destinatario.cargo}</div>}
                <div className="text-xs text-muted-foreground">Entregada: {formatDate(e.fechaEntrega)}</div>
                {e.fechaLimite && <div className="text-xs text-muted-foreground">Límite: {formatDate(e.fechaLimite)}</div>}
              </div>

              {e.motivo && <p className="text-xs text-muted-foreground line-clamp-2">{e.motivo}</p>}

              <div className="flex flex-wrap gap-1.5 pt-1">
                {puedeDevolver && (
                  <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => abrir(e, 'devolver')}>
                    <Undo2 className="h-3.5 w-3.5 mr-1" /> Devolver
                  </Button>
                )}
                {puedeConsumir && (
                  <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => abrir(e, 'consumir')}>
                    <FlaskConical className="h-3.5 w-3.5 mr-1" /> Consumida
                  </Button>
                )}
                {puedeCancelar && (
                  <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground" onClick={() => abrir(e, 'cancelar')}>
                    <Ban className="h-3.5 w-3.5 mr-1" /> Cancelar
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={target !== null} onOpenChange={(o) => { if (!o && !submitting) cerrar() }}>
        <DialogContent className="sm:max-w-[460px]">
          {target && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {target.modo === 'devolver' && <><PackageCheck className="h-5 w-5" /> Registrar devolución</>}
                  {target.modo === 'consumir' && <><FlaskConical className="h-5 w-5" /> Marcar como consumida</>}
                  {target.modo === 'cancelar' && <><Ban className="h-5 w-5" /> Cancelar entrega</>}
                </DialogTitle>
                <DialogDescription>
                  Muestra <span className="font-mono font-semibold">{target.entrega.muestra.etiqueta}</span>
                  {' '}— {target.entrega.destinatario?.nombreCompleto}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3">
                <div className={cn('rounded-md border px-3 py-2 text-xs',
                  target.modo === 'consumir'
                    ? 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30 text-amber-800 dark:text-amber-300'
                    : 'bg-muted text-muted-foreground')}>
                  {target.modo === 'devolver' && 'La muestra regresará al biobanco (sin posición, para reubicarla). Su volumen no se modifica.'}
                  {target.modo === 'consumir' && 'La muestra no regresó: queda como consumida (estado terminal). Conserva su volumen para capturar estudios pendientes y NO es una baja.'}
                  {target.modo === 'cancelar' && 'Corrige el registro: la muestra regresa al biobanco y, de ser posible, a su posición anterior.'}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">
                    {target.modo === 'cancelar' ? 'Motivo (obligatorio)' : 'Observaciones (opcional)'}
                  </Label>
                  <Textarea rows={3} maxLength={500} value={texto} onChange={(e) => setTexto(e.target.value)}
                    disabled={submitting}
                    placeholder={target.modo === 'cancelar' ? 'Motivo de la cancelación…' : 'Notas adicionales…'} />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={cerrar} disabled={submitting}>Cerrar</Button>
                <Button onClick={confirmar} disabled={submitting}
                  className={target.modo === 'consumir' ? 'bg-amber-600 text-white hover:bg-amber-700' : undefined}>
                  {submitting
                    ? <><Loader2 className="h-4 w-4 animate-spin mr-1.5" />Procesando…</>
                    : target.modo === 'devolver' ? 'Registrar devolución'
                    : target.modo === 'consumir' ? 'Marcar consumida'
                    : 'Cancelar entrega'}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
