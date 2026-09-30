import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Paciente } from '@/types/api'
import { formatDate, getFullName } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'

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
      <SheetContent className="w-full sm:w-[500px]">
        <SheetHeader>
          <SheetTitle>Detalle del Paciente</SheetTitle>
          <SheetDescription>
            Información completa y historial del paciente
          </SheetDescription>
        </SheetHeader>

        <div className="mt-8 space-y-6">
          {/* Status */}
          <div>
            <h3 className="text-sm font-semibold text-slate-900 mb-2">Estado</h3>
            <Badge className={paciente.activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
              {paciente.activo ? 'Activo' : 'Inactivo'}
            </Badge>
          </div>

          {/* Información Personal */}
          <div>
            <h3 className="text-sm font-semibold text-slate-900 mb-4">Información Personal</h3>
            <div className="space-y-3">
              <DetailRow label="Folio" value={paciente.folio} />
              <DetailRow label="Nombre Completo" value={getFullName(paciente.persona)} />
              <DetailRow label="Email" value={paciente.persona.email || '-'} />
              <DetailRow label="Teléfono" value={paciente.persona.telefono || '-'} />
              <DetailRow
                label="Fecha de Nacimiento"
                value={paciente.persona.fechaNacimiento ? formatDate(paciente.persona.fechaNacimiento) : '-'}
              />
              <DetailRow
                label="Sexo"
                value={paciente.persona.sexo === 'M' ? 'Masculino' : paciente.persona.sexo === 'F' ? 'Femenino' : 'Otro'}
              />
            </div>
          </div>

          {/* Historial */}
          <div>
            <h3 className="text-sm font-semibold text-slate-900 mb-3">Historial del Sistema</h3>
            <div className="space-y-2 text-sm text-slate-600">
              <DetailRow
                label="Registro"
                value={paciente.fechaRegistro ? formatDate(paciente.fechaRegistro, 'dd/MM/yyyy HH:mm') : '-'}
              />
              <DetailRow
                label="Última Actualización"
                value={paciente.fechaActualizacion ? formatDate(paciente.fechaActualizacion, 'dd/MM/yyyy HH:mm') : '-'}
              />
              <DetailRow label="UUID" value={paciente.UUID} />
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-start gap-2">
      <span className="text-slate-600 text-sm">{label}:</span>
      <span className="font-medium text-slate-900 text-sm">{value}</span>
    </div>
  )
}
