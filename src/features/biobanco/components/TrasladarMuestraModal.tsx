import { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { AlertCircle, ArrowRightFromLine, Check, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useGetAlmacenes, useRegistrarTraslado } from '../hooks/useBiobanco'
import { MuestraDetalleDTO } from '@/types/api'
import { useAuthStore } from '@/stores/authStore'

// ── Schema ────────────────────────────────────────────────────────────────────

const schema = z.object({
  idAlmacen: z.string().min(1, 'Debes seleccionar un almacén destino'),
  motivo: z
    .string()
    .trim()
    .min(1, 'El motivo es obligatorio')
    .max(300, 'Máximo 300 caracteres'),
  observaciones: z
    .string()
    .trim()
    .max(500, 'Máximo 500 caracteres')
    .optional(),
})

type FormData = z.infer<typeof schema>

// ── Combobox reutilizable ─────────────────────────────────────────────────────

interface ComboboxProps {
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  disabled?: boolean
  hasError?: boolean
}

function Combobox({
  value,
  onChange,
  options,
  placeholder = 'Selecciona…',
  searchPlaceholder = 'Buscar…',
  emptyText = 'Sin resultados',
  disabled = false,
  hasError = false,
}: ComboboxProps) {
  const [open, setOpen] = useState(false)
  const selected = options.find((o) => o.value === value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            'w-full justify-between font-normal h-9 text-sm',
            !selected && 'text-muted-foreground',
            hasError && 'border-destructive',
          )}
        >
          <span className="truncate">{selected ? selected.label : placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder={searchPlaceholder} className="h-9" />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {options.map((o) => (
                <CommandItem
                  key={o.value}
                  value={o.label}          /* cmdk filtra por el nombre visible */
                  onSelect={() => {
                    onChange(o.value)
                    setOpen(false)
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value === o.value ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                  {o.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

interface TrasladarMuestraModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  muestra: MuestraDetalleDTO | null
}

export function TrasladarMuestraModal({ open, onOpenChange, muestra }: TrasladarMuestraModalProps) {
  const userUuid = useAuthStore((s) => s.user?.uuid) || ''
  const { data: almacenes = [] } = useGetAlmacenes()
  const trasladarMutation = useRegistrarTraslado()

  const almacenesActivos = almacenes.filter((a) => a.activo)

  // Opciones para el combobox: "Nombre — Ciudad, Estado"
  const almacenOptions = almacenesActivos.map((a) => ({
    value: String(a.id),
    label: `${a.nombre} — ${a.ciudad}, ${a.estado}`,
  }))

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { idAlmacen: '', motivo: '', observaciones: '' },
  })

  const handleClose = () => {
    reset()
    onOpenChange(false)
  }

  const onSubmit = async (data: FormData) => {
    if (!muestra) return
    try {
      await trasladarMutation.mutateAsync({
        idMuestra: muestra.id,
        idAlmacen: parseInt(data.idAlmacen),
        uuidAutoriza: userUuid,
        motivo: data.motivo,
        observaciones: data.observaciones,
      })
      handleClose()
    } catch (_) {}
  }

  if (!muestra) return null

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightFromLine className="h-5 w-5" />
            Trasladar Muestra
          </DialogTitle>
          <DialogDescription>
            Muestra: <span className="font-mono font-semibold">{muestra.etiqueta}</span>
            {' — '}Paciente: {muestra.paciente?.nombreCompleto}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

          {/* Almacén destino — combobox searchable ─────────────────────── */}
          <div className="space-y-2">
            <Label>
              Almacén destino <span className="text-destructive">*</span>
            </Label>
            {almacenesActivos.length === 0 ? (
              <p className="text-sm text-muted-foreground rounded-md border border-input px-3 py-2">
                No hay almacenes activos registrados
              </p>
            ) : (
              <Controller
                name="idAlmacen"
                control={control}
                render={({ field }) => (
                  <Combobox
                    value={field.value}
                    onChange={field.onChange}
                    options={almacenOptions}
                    placeholder="Selecciona el laboratorio destino"
                    searchPlaceholder="Buscar por nombre, ciudad o estado..."
                    emptyText="Almacén no encontrado"
                    hasError={!!errors.idAlmacen}
                  />
                )}
              />
            )}
            {errors.idAlmacen && (
              <p className="flex items-center gap-1 text-xs text-destructive">
                <AlertCircle className="h-3 w-3" strokeWidth={1.75} />
                {errors.idAlmacen.message}
              </p>
            )}
          </div>

          {/* Motivo ─────────────────────────────────────────────────────── */}
          <div className="space-y-2">
            <Label>
              Motivo del traslado <span className="text-destructive">*</span>
            </Label>
            <Textarea
              {...register('motivo')}
              sanitize="descripcion"
              placeholder="Ej: Análisis complementario, estudio externo..."
              rows={3}
              maxLength={300}
            />
            {errors.motivo && (
              <p className="flex items-center gap-1 text-xs text-destructive">
                <AlertCircle className="h-3 w-3" strokeWidth={1.75} />
                {errors.motivo.message}
              </p>
            )}
          </div>

          {/* Observaciones ──────────────────────────────────────────────── */}
          <div className="space-y-2">
            <Label>Observaciones</Label>
            <Textarea
              {...register('observaciones')}
              sanitize="descripcion"
              placeholder="Notas adicionales (opcional)"
              rows={2}
              maxLength={500}
            />
            {errors.observaciones && (
              <p className="flex items-center gap-1 text-xs text-destructive">
                <AlertCircle className="h-3 w-3" strokeWidth={1.75} />
                {errors.observaciones.message}
              </p>
            )}
          </div>

          <div className="rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">
            La posición de la muestra en la caja quedará reservada durante el traslado y se liberará al registrar la devolución.
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting || almacenesActivos.length === 0}>
              {isSubmitting ? 'Registrando...' : 'Registrar Traslado'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
