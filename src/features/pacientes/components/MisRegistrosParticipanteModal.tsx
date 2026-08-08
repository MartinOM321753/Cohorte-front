import { Building2, FlaskConical, CalendarDays, Stethoscope, Activity, TestTube } from 'lucide-react'

import { Spinner } from '@/components/ui/spinner'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { formatDate } from '@/lib/utils'
import type { RegistroPropio } from '@/types/api'

import { useMisRegistrosDeParticipante } from '../hooks/useGetPacientes'

interface Props {
  uuid: string | null
  onClose: () => void
}

const SECCIONES: { clave: 'estudios' | 'muestras' | 'citas' | 'somatometrias' | 'examenes'
                   titulo: string; Icono: typeof Stethoscope }[] = [
  { clave: 'estudios',      titulo: 'Estudios médicos',   Icono: Stethoscope },
  { clave: 'examenes',      titulo: 'Resultados de examen', Icono: TestTube },
  { clave: 'muestras',      titulo: 'Muestras',            Icono: FlaskConical },
  { clave: 'citas',         titulo: 'Citas',               Icono: CalendarDays },
  { clave: 'somatometrias', titulo: 'Somatometrías',       Icono: Activity },
]

function Lista({ registros }: { registros: RegistroPropio[] }) {
  return (
    <ul className="divide-y rounded-md border">
      {registros.map((r) => (
        <li key={r.id} className="flex items-baseline justify-between gap-3 px-3 py-2">
          <span className="text-[13px]">{r.descripcion || '—'}</span>
          <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
            {r.fecha ? formatDate(r.fecha, 'dd/MM/yyyy') : '—'}
          </span>
        </li>
      ))}
    </ul>
  )
}

/**
 * Muestra lo que ESTA institución le registró a un participante que ya no gestiona.
 *
 * No es el expediente: el historial completo le corresponde a la institución dueña.
 * Aquí solo aparece lo propio, y de ahí que no haya acciones — no se puede editar
 * nada de un participante que ya no está a tu cargo.
 */
export function MisRegistrosParticipanteModal({ uuid, onClose }: Props) {
  const { data, isLoading } = useMisRegistrosDeParticipante(uuid)

  const secciones = SECCIONES
    .map((s) => ({ ...s, registros: data?.[s.clave] ?? [] }))
    .filter((s) => s.registros.length > 0)

  return (
    <Dialog open={!!uuid} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{data?.nombreCompleto ?? 'Registros'}</DialogTitle>
          <DialogDescription>
            {data ? (
              <>
                Folio <span className="font-mono">{data.folio}</span>. Solo se muestra lo que tu
                institución le registró; el expediente completo le corresponde a{' '}
                <strong>{data.institucionActualNombre ?? 'su institución'}</strong>.
              </>
            ) : (
              'Registros de tu institución'
            )}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
            <Spinner className="h-4 w-4" />
            Cargando…
          </div>
        ) : secciones.length === 0 ? (
          <Alert>
            <Building2 className="h-4 w-4" />
            <AlertDescription>
              No conservas registros de este participante.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="flex-1 space-y-4 overflow-y-auto pr-1">
            {secciones.map(({ clave, titulo, Icono, registros }) => (
              <section key={clave} className="space-y-1.5">
                <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                  <Icono className="h-3 w-3" />
                  {titulo} ({registros.length})
                </p>
                <Lista registros={registros} />
              </section>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
