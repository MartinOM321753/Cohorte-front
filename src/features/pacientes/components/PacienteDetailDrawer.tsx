import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { CalendarPlus, Pencil } from 'lucide-react'
import { getFullName, formatDate } from '@/lib/utils'
import type { Paciente } from '@/types/api'

interface PacienteDetailDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  paciente: Paciente | null
  onEdit: (paciente: Paciente) => void
  onSchedule: (paciente: Paciente) => void
}

interface DetailRowProps {
  label: string
  value?: string | null
  mono?: boolean
}

function DetailRow({ label, value, mono }: DetailRowProps) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-[var(--imss-ink-100)] py-2.5 last:border-0">
      <span className="text-[11px] font-medium uppercase tracking-widest text-[var(--imss-ink-300)]">
        {label}
      </span>
      <span
        className={`text-[13px] text-[var(--imss-ink-900)] ${mono ? 'font-mono text-[12px]' : ''}`}
      >
        {value || '—'}
      </span>
    </div>
  )
}


export function PacienteDetailDrawer({
  open,
  onOpenChange,
  paciente,
  onEdit,
  onSchedule,
}: PacienteDetailDrawerProps) {
  if (!paciente) return null

  const nombreCompleto = getFullName(paciente.persona)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-[400px]">
        {/* Header */}
        <SheetHeader className="border-b border-[var(--imss-ink-100)] px-5 py-4">
          <div className="flex items-center gap-3">
            {/* Avatar con iniciales */}
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--imss-green-100)] text-[var(--imss-green-700)]">
              <span className="text-[14px] font-semibold">
                {nombreCompleto
                  .split(' ')
                  .slice(0, 2)
                  .map((n) => n.charAt(0))
                  .join('')
                  .toUpperCase()}
              </span>
            </div>
            <div>
              <SheetTitle className="text-[15px] font-semibold text-[var(--imss-ink-900)]">
                {nombreCompleto}
              </SheetTitle>
              <p className="text-[12px] text-[var(--imss-ink-300)]">Folio: {paciente.folio}</p>
            </div>
          </div>

          {/* Badges */}
          <div className="flex items-center gap-2 pt-1">
            {paciente.activo ? (
              <span className="inline-flex items-center rounded-full bg-[var(--status-success-bg)] px-2.5 py-0.5 text-[11px] font-medium text-[var(--status-success-fg)]">
                Activo
              </span>
            ) : (
              <span className="inline-flex items-center rounded-full bg-[var(--status-danger-bg)] px-2.5 py-0.5 text-[11px] font-medium text-[var(--status-danger-fg)]">
                Inactivo
              </span>
            )}
            {paciente.persona.sexo === 'M' ? (
              <span className="inline-flex items-center rounded-full bg-[var(--status-info-bg)] px-2.5 py-0.5 text-[11px] font-medium text-[var(--status-info-fg)]">
                Masculino
              </span>
            ) : paciente.persona.sexo === 'F' ? (
              <span className="inline-flex items-center rounded-full bg-purple-100 px-2.5 py-0.5 text-[11px] font-medium text-purple-700">
                Femenino
              </span>
            ) : null}
          </div>
        </SheetHeader>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* Datos personales */}
          <section>
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-widest text-[var(--imss-ink-300)]">
              Datos personales
            </p>
            <div className="rounded-md border border-[var(--imss-ink-100)] px-3">
              <DetailRow label="Nombre completo" value={nombreCompleto} />
              <DetailRow
                label="Fecha de nacimiento"
                value={
                  paciente.persona.fechaNacimiento
                    ? new Date(
                        paciente.persona.fechaNacimiento + 'T12:00:00'
                      ).toLocaleDateString('es-MX', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric',
                      })
                    : null
                }
              />
              <DetailRow label="Correo electrónico" value={paciente.persona.email} />
              <DetailRow label="Teléfono" value={paciente.persona.telefono} />
            </div>
          </section>

          {/* Datos del sistema */}
          <section>
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-widest text-[var(--imss-ink-300)]">
              Datos del expediente
            </p>
            <div className="rounded-md border border-[var(--imss-ink-100)] px-3">
              <DetailRow label="Folio" value={paciente.folio} mono />
              <DetailRow
                label="Fecha de registro"
                value={
                  paciente.fechaRegistro
                    ? formatDate(paciente.fechaRegistro, 'dd/MM/yyyy HH:mm')
                    : null
                }
              />
              <DetailRow
                label="Última actualización"
                value={
                  paciente.fechaActualizacion
                    ? formatDate(paciente.fechaActualizacion, 'dd/MM/yyyy HH:mm')
                    : null
                }
              />
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="flex flex-col gap-2 border-t border-[var(--imss-ink-100)] px-5 py-3">
          <Button
            className="w-full gap-2 bg-[var(--imss-green-500)] text-white hover:bg-[var(--imss-green-700)] text-[13px]"
            onClick={() => {
              onOpenChange(false)
              onEdit(paciente)
            }}
          >
            <Pencil className="h-3.5 w-3.5" strokeWidth={1.75} />
            Editar paciente
          </Button>
          <Button
            variant="outline"
            className="w-full gap-2 text-[13px]"
            onClick={() => {
              onOpenChange(false)
              onSchedule(paciente)
            }}
          >
            <CalendarPlus className="h-3.5 w-3.5" strokeWidth={1.75} />
            Agendar cita
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
