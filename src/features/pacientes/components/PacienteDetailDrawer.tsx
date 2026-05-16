import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import type { ReactNode } from 'react'
import { Paciente } from '@/types/api'
import { formatDate, getFullName } from '@/lib/utils'

interface PacienteDetailDrawerProps {
  paciente: Paciente
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function PacienteDetailDrawer({
  paciente,
  open,
  onOpenChange,
}: PacienteDetailDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[480px] max-w-none sm:w-[480px] sm:max-w-none">
        <SheetHeader className="border-b border-border">
          <SheetTitle>Detalle del paciente</SheetTitle>
          <SheetDescription>Información completa del paciente.</SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-4">
          <Section title="Estado">
            <Badge
              className={[
                'rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.04em]',
                paciente.activo
                  ? 'bg-[--status-success-bg] text-[--status-success-fg]'
                  : 'bg-[--status-danger-bg] text-[--status-danger-fg]',
              ].join(' ')}
            >
              {paciente.activo ? 'Activo' : 'Inactivo'}
            </Badge>
          </Section>

          <Section title="Datos demográficos" withDivider>
            <div className="grid grid-cols-2 gap-3">
              <DetailItem label="Folio" value={paciente.folio} valueClassName="font-mono" />
              <DetailItem label="Sexo" value={formatSexo(paciente.persona.sexo)} />
              <DetailItem label="Nombre completo" value={getFullName(paciente.persona)} className="col-span-2" />
              <DetailItem label="Correo electrónico" value={paciente.persona.email || '-'} className="col-span-2" />
              <DetailItem label="Teléfono" value={paciente.persona.telefono || '-'} className="col-span-2" />
              <DetailItem
                label="Fecha de nacimiento"
                value={
                  paciente.persona.fechaNacimiento
                    ? formatDate(paciente.persona.fechaNacimiento)
                    : '-'
                }
                className="col-span-2"
              />
            </div>
          </Section>

          <Section title="Historial del sistema" withDivider>
            <div className="grid grid-cols-2 gap-3">
              <DetailItem
                label="Registro"
                value={
                  paciente.fechaRegistro
                    ? formatDate(paciente.fechaRegistro, 'dd/MM/yyyy HH:mm')
                    : '-'
                }
                className="col-span-2"
              />
              <DetailItem
                label="Última actualización"
                value={
                  paciente.fechaActualizacion
                    ? formatDate(paciente.fechaActualizacion, 'dd/MM/yyyy HH:mm')
                    : '-'
                }
                className="col-span-2"
              />
              <div className="col-span-2">
                <div className="text-xs text-muted-foreground">UUID</div>
                <div className="mt-1 font-mono text-xs text-muted-foreground">
                  {paciente.UUID || '-'}
                </div>
              </div>
            </div>
          </Section>
        </div>
      </SheetContent>
    </Sheet>
  )
}

function Section({
  title,
  withDivider,
  children,
}: {
  title: string
  withDivider?: boolean
  children: ReactNode
}) {
  return (
    <section className={withDivider ? 'mt-5 border-t border-border pt-4' : ''}>
      <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
        {title}
      </div>
      {children}
    </section>
  )
}

function DetailItem({
  label,
  value,
  className,
  valueClassName,
}: {
  label: string
  value: string
  className?: string
  valueClassName?: string
}) {
  return (
    <div className={className}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={['mt-1 text-[13px] font-medium text-foreground', valueClassName].filter(Boolean).join(' ')}>
        {value}
      </div>
    </div>
  )
}

function formatSexo(sexo: string | null | undefined) {
  if (sexo === 'M') return 'Masculino'
  if (sexo === 'F') return 'Femenino'
  return 'No especificado'
}
