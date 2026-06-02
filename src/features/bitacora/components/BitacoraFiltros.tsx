import { useState } from 'react'
import { CalendarIcon, FilterX, Search } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { cn } from '@/lib/utils'
import type { TipoEventoAcceso, TipoAccion } from '../types/bitacora.types'
import { TIPO_EVENTO_LABELS, TIPO_ACCION_LABELS } from '../types/bitacora.types'

// ── Tipos ──────────────────────────────────────────────────────────────────────

interface FiltrosAccesosState {
  desde: Date | undefined
  hasta: Date | undefined
  usuarioUuid: string
  tipoEvento: TipoEventoAcceso | ''
}

interface FiltrosAccionesState {
  desde: Date | undefined
  hasta: Date | undefined
  usuarioUuid: string
  tipoAccion: TipoAccion | ''
  entidad: string
}

interface BitacoraFiltrosAccesosProps {
  tipo: 'accesos'
  onApply: (f: FiltrosAccesosState) => void
  onReset: () => void
}

interface BitacoraFiltrosAccionesProps {
  tipo: 'acciones'
  onApply: (f: FiltrosAccionesState) => void
  onReset: () => void
}

type Props = BitacoraFiltrosAccesosProps | BitacoraFiltrosAccionesProps

// ── Helpers ────────────────────────────────────────────────────────────────────

function DatePickerField({
  label,
  value,
  onChange,
}: {
  label: string
  value: Date | undefined
  onChange: (d: Date | undefined) => void
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-[12px] text-[var(--imss-ink-400)]">{label}</Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              'h-9 w-full justify-start gap-2 text-[13px]',
              !value && 'text-muted-foreground'
            )}
          >
            <CalendarIcon className="h-3.5 w-3.5 shrink-0" />
            {value ? format(value, 'dd/MM/yyyy', { locale: es }) : 'Seleccionar'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={value}
            onSelect={onChange}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}

// ── Componente principal ───────────────────────────────────────────────────────

export function BitacoraFiltros(props: Props) {
  const [desde, setDesde] = useState<Date | undefined>()
  const [hasta, setHasta] = useState<Date | undefined>()
  const [usuarioUuid, setUsuarioUuid] = useState('')
  const [tipoEvento, setTipoEvento] = useState<TipoEventoAcceso | ''>('')
  const [tipoAccion, setTipoAccion] = useState<TipoAccion | ''>('')
  const [entidad, setEntidad] = useState('')

  function handleApply() {
    if (props.tipo === 'accesos') {
      props.onApply({ desde, hasta, usuarioUuid: usuarioUuid.trim(), tipoEvento })
    } else {
      props.onApply({ desde, hasta, usuarioUuid: usuarioUuid.trim(), tipoAccion, entidad: entidad.trim() })
    }
  }

  function handleReset() {
    setDesde(undefined)
    setHasta(undefined)
    setUsuarioUuid('')
    setTipoEvento('')
    setTipoAccion('')
    setEntidad('')
    props.onReset()
  }

  return (
    <div className="rounded-lg border border-[var(--imss-ink-100)] bg-card p-4">
      <div className="flex flex-wrap items-end gap-3">
        {/* Rango de fechas */}
        <div className="flex items-end gap-2">
          <DatePickerField label="Desde" value={desde} onChange={setDesde} />
          <DatePickerField label="Hasta" value={hasta} onChange={setHasta} />
        </div>

        {/* UUID / username de usuario */}
        <div className="flex flex-col gap-1.5 min-w-[200px]">
          <Label className="text-[12px] text-[var(--imss-ink-400)]">UUID de usuario</Label>
          <Input
            placeholder="xxxxxxxx-xxxx-xxxx"
            value={usuarioUuid}
            onChange={(e) => setUsuarioUuid(e.target.value)}
            className="h-9 text-[13px]"
          />
        </div>

        {/* Selector específico por tipo */}
        {props.tipo === 'accesos' ? (
          <div className="flex flex-col gap-1.5 min-w-[160px]">
            <Label className="text-[12px] text-[var(--imss-ink-400)]">Tipo de evento</Label>
            <Select
              value={tipoEvento === '' ? '__all__' : tipoEvento}
              onValueChange={(v) => setTipoEvento(v === '__all__' ? '' : v as TipoEventoAcceso)}
            >
              <SelectTrigger className="h-9 text-[13px]">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todos</SelectItem>
                {(Object.entries(TIPO_EVENTO_LABELS) as [TipoEventoAcceso, string][]).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-1.5 min-w-[160px]">
              <Label className="text-[12px] text-[var(--imss-ink-400)]">Tipo de acción</Label>
              <Select
                value={tipoAccion === '' ? '__all__' : tipoAccion}
                onValueChange={(v) => setTipoAccion(v === '__all__' ? '' : v as TipoAccion)}
              >
                <SelectTrigger className="h-9 text-[13px]">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todas</SelectItem>
                  {(Object.entries(TIPO_ACCION_LABELS) as [TipoAccion, string][]).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5 min-w-[160px]">
              <Label className="text-[12px] text-[var(--imss-ink-400)]">Entidad</Label>
              <Input
                placeholder="Ej. Paciente, Usuario…"
                value={entidad}
                onChange={(e) => setEntidad(e.target.value)}
                className="h-9 text-[13px]"
              />
            </div>
          </>
        )}

        {/* Botones */}
        <div className="flex items-end gap-2 pb-[1px]">
          <Button
            onClick={handleApply}
            className="h-9 gap-1.5 bg-[var(--imss-green-500)] text-white hover:bg-[var(--imss-green-700)] text-[13px]"
          >
            <Search className="h-3.5 w-3.5" />
            Buscar
          </Button>
          <Button
            variant="outline"
            onClick={handleReset}
            className="h-9 gap-1.5 text-[13px]"
          >
            <FilterX className="h-3.5 w-3.5" />
            Limpiar
          </Button>
        </div>
      </div>
    </div>
  )
}
