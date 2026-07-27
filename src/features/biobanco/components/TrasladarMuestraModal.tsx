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
import { Input } from '@/components/ui/input'
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
import { useQuery } from '@tanstack/react-query'
import { getInstitucionesActivas } from '../../instituciones/api/instituciones.api'
import { useIniciarPrestamo } from '../hooks/useBiobanco'
import { MuestraDetalleDTO } from '@/types/api'
import { useAuthStore } from '@/stores/authStore'

// ── Schema ────────────────────────────────────────────────────────────────────

const schema = z.object({
  idInstitucionDestino: z.string().min(1, 'Debes seleccionar una institución destino'),
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
  fechaLimite: z.string().optional(),
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
                  value={o.label}
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
  const userUuid     = useAuthStore((s) => s.user?.uuid) || ''
  const myInstitucionId = useAuthStore((s) => s.user?.institucion?.id)
  const prestarMutation = useIniciarPrestamo()

  // Carga la lista completa de instituciones activas (endpoint /instituciones/activas)
  // y filtra cliente-side: solo las que tienen biobanco y no son la propia institución del usuario.
  const { data: todasInstituciones = [] } = useQuery({
    queryKey: ['instituciones', 'activas'],
    queryFn:  getInstitucionesActivas,
    enabled:  open,
    staleTime: 1000 * 60 * 5, // 5 min
  })

  // Excluye:
  //   • Mi propia institución (no puedo autoprestarme).
  //   • La institución dueña original de la muestra: si soy tenedor pero no dueña,
  //     "prestar" a la dueña crearía un préstamo B→A redundante en lugar de
  //     usar el flujo formal de devolución. Para eso hay que iniciar devolución.
  const idDuenaOriginal = muestra?.idInstitucion ?? null
  const soyDuena = idDuenaOriginal != null && idDuenaOriginal === myInstitucionId
  const institucionsConBiobanco = todasInstituciones.filter(
    (i) => i.tieneBiobanco && i.activo
      && i.id !== myInstitucionId
      && (soyDuena || i.id !== idDuenaOriginal),
  )

  const institucionOptions = institucionsConBiobanco.map((i) => ({
    value: String(i.id),
    label: `${i.nombre}${i.ciudad ? ` — ${i.ciudad}` : ''}${i.estado ? `, ${i.estado}` : ''}`,
  }))

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { idInstitucionDestino: '', motivo: '', observaciones: '', fechaLimite: '' },
  })

  const handleClose = () => {
    if (prestarMutation.isPending) return
    reset()
    onOpenChange(false)
  }

  const onSubmit = async (data: FormData) => {
    if (!muestra) return
    try {
      await prestarMutation.mutateAsync({
        idsMuestras: [muestra.id],
        idInstitucionDestino: parseInt(data.idInstitucionDestino),
        uuidAutoriza: userUuid,
        motivo: data.motivo,
        observaciones: data.observaciones || undefined,
        fechaLimite: data.fechaLimite ? `${data.fechaLimite}T23:59:59` : undefined,
      })
      handleClose()
    } catch (_) {}
  }

  if (!muestra) return null

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className="sm:max-w-[500px]"
        // Evitar que el Dialog cierre al interactuar con Popovers/Comboboxes.
        // El Dialog tiene botones Cancelar e Iniciar Préstamo explícitos.
        onInteractOutside={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightFromLine className="h-5 w-5" />
            Prestar Muestra
          </DialogTitle>
          <DialogDescription>
            Muestra: <span className="font-mono font-semibold">{muestra.etiqueta}</span>
            {' — '}Paciente: {muestra.paciente?.nombreCompleto}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

          {/* Institución destino — combobox searchable ──────────────── */}
          <div className="space-y-2">
            <Label>
              Institución destino <span className="text-destructive">*</span>
            </Label>
            {institucionsConBiobanco.length === 0 ? (
              <p className="text-sm text-muted-foreground rounded-md border border-input px-3 py-2">
                No hay instituciones con biobanco activas registradas
              </p>
            ) : (
              <Controller
                name="idInstitucionDestino"
                control={control}
                render={({ field }) => (
                  <Combobox
                    value={field.value}
                    onChange={field.onChange}
                    options={institucionOptions}
                    placeholder="Selecciona la institución destino"
                    searchPlaceholder="Buscar por nombre, ciudad o estado..."
                    emptyText="Institución no encontrada"
                    hasError={!!errors.idInstitucionDestino}
                  />
                )}
              />
            )}
            {errors.idInstitucionDestino && (
              <p className="flex items-center gap-1 text-xs text-destructive">
                <AlertCircle className="h-3 w-3" strokeWidth={1.75} />
                {errors.idInstitucionDestino.message}
              </p>
            )}
          </div>

          {/* Motivo ─────────────────────────────────────────────────────── */}
          <div className="space-y-2">
            <Label>
              Motivo del préstamo <span className="text-destructive">*</span>
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

          {/* Fecha límite ─────────────────────────────────────────────── */}
          <div className="space-y-2">
            <Label>Fecha límite de devolución</Label>
            <Input
              type="date"
              {...register('fechaLimite')}
              min={new Date().toISOString().split('T')[0]}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Opcional. Se marcará como vencido si no se devuelve antes de esta fecha.
            </p>
          </div>

          <div className="rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">
            La posición de la muestra quedará libre al iniciar el préstamo. La institución destino
            podrá asignarle una posición en su propio biobanco.
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting || prestarMutation.isPending}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting || prestarMutation.isPending || institucionsConBiobanco.length === 0}>
              {isSubmitting || prestarMutation.isPending ? 'Registrando...' : 'Iniciar Préstamo'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
