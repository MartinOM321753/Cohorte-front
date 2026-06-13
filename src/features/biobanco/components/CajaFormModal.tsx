import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useCreateCaja, useUpdateCaja, useGetRefrigeradores, useGetPisosByRefrigerador, useGetCajaById } from '../hooks/useBiobanco'
import { Caja, PosicionPiso } from '@/types/api'
import { PosicionPisoSelectorModal } from './PosicionPisoSelectorModal'
import { AlertCircle, MapPin, X } from 'lucide-react'
import { Controller } from 'react-hook-form'  // ← agregar


const cajaSchema = z.object({
  codigoCaja: z.string().max(50, 'Máximo 50 caracteres').optional(),
  filas: z.number().min(1, 'Debe tener al menos 1 fila'),
  columnas: z.number().min(1, 'Debe tener al menos 1 columna'),
  tipoCaja: z.string().min(1, 'El tipo de caja es obligatorio').max(50, 'Máximo 50 caracteres'),
  color: z.string().max(30, 'Máximo 30 caracteres').optional(),
  observaciones: z.string().max(500, 'Máximo 500 caracteres').optional(),
  idPosicionPiso: z.number().optional(),
})

type CajaFormData = z.infer<typeof cajaSchema>

interface CajaFormModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  caja?: Caja | null
}

const DEFAULT_VALUES: CajaFormData = {
  codigoCaja: '',
  filas: 1,
  columnas: 1,
  tipoCaja: '',
  color: '#3b82f6',
  observaciones: '',
  idPosicionPiso: undefined,
}

export function CajaFormModal({ open, onOpenChange, caja }: CajaFormModalProps) {
  const isEditing = !!caja
  const [selectedRefrigerador, setSelectedRefrigerador] = useState<string>('')
  const [selectedPiso, setSelectedPiso] = useState<string>('')
  const [selectedPosicionPiso, setSelectedPosicionPiso] = useState<PosicionPiso | null>(null)
  const [showPosicionSelector, setShowPosicionSelector] = useState(false)
  // In edit mode: controls whether the user has clicked "Cambiar posición"
  const [isChangingPosition, setIsChangingPosition] = useState(false)
  // Formatted label showing current position (like posicionLabel in MuestraFormModal)
  const [ubicacionLabel, setUbicacionLabel] = useState<string>('')

  const {
    register,
    handleSubmit,
    setValue,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CajaFormData>({
    resolver: zodResolver(cajaSchema),
    defaultValues: DEFAULT_VALUES,
  })

  const createCajaMutation = useCreateCaja()
  const updateCajaMutation = useUpdateCaja()
  // Fetch refrigeradores for both create AND edit modes
  const { data: refrigeradores } = useGetRefrigeradores({ enabled: open })
  const { data: pisos } = useGetPisosByRefrigerador(selectedRefrigerador ? parseInt(selectedRefrigerador) : 0)
  const { data: freshCaja } = useGetCajaById(open && isEditing ? caja!.id : 0)

  useEffect(() => {
    if (open) {
      const source = freshCaja ?? caja
      if (source) {
        reset({
          codigoCaja: source.codigoCaja,
          filas: source.filas,
          columnas: source.columnas,
          tipoCaja: source.tipoCaja,
          color: source.color || '',
          observaciones: source.observaciones || '',
          idPosicionPiso: source.idPosicionPiso ?? undefined,
        })
        // Populate the location label from the rich string the backend sends
        setUbicacionLabel(source.ubicacionPiso || '')
      } else {
        reset(DEFAULT_VALUES)
        setUbicacionLabel('')
      }
      // Reset position-change UI when the modal re-opens
      setIsChangingPosition(false)
      setSelectedRefrigerador('')
      setSelectedPiso('')
      setSelectedPosicionPiso(null)
      return
    }

    const timer = setTimeout(() => {
      reset(DEFAULT_VALUES)
      setUbicacionLabel('')
    }, 150)

    return () => clearTimeout(timer)
  }, [open, freshCaja, caja, reset])


  const onSubmit = async (data: CajaFormData) => {
    try {
      const { idPosicionPiso, ...rest } = data
      const payload = {
        ...rest,
        codigoCaja: rest.codigoCaja || '',
        color: rest.color ?? '',
        observaciones: rest.observaciones ?? '',
        ...(idPosicionPiso !== undefined && { idPosicionPiso }),
      }

      if (isEditing && caja) {
        await updateCajaMutation.mutateAsync({ id: caja.id, data: payload })
      } else {
        await createCajaMutation.mutateAsync(payload)
      }
      onOpenChange(false)
    } catch (error) { }
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setSelectedRefrigerador('')
      setSelectedPiso('')
      setSelectedPosicionPiso(null)
      setShowPosicionSelector(false)
      setIsChangingPosition(false)
      setUbicacionLabel('')
    }
    onOpenChange(newOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Caja Criogénica' : 'Crear Nueva Caja Criogénica'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Modifica los datos de la caja criogénica.'
              : 'Registra una nueva caja criogénica y asígnala a una posición disponible.'
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="codigoCaja">Código de Caja</Label>
              <Input
                id="codigoCaja"
                {...register('codigoCaja')}
                sanitize="codigo"
                placeholder="Auto: C-0001"
                disabled={isEditing}
              />
              {!isEditing && (
                <p className="text-[11px] text-muted-foreground">Dejar vacío para auto-generar</p>
              )}
              {errors.codigoCaja && (
                <p className="mt-1.5 flex items-center gap-1 text-xs text-destructive">
                  <AlertCircle className="h-3 w-3" strokeWidth={1.75} />
                  {errors.codigoCaja.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="tipoCaja">Tipo de Caja *</Label>
              <Input
                id="tipoCaja"
                {...register('tipoCaja')}
                sanitize="alfanumerico"
                placeholder="Gradilla 81 pozos"
              />
              {errors.tipoCaja && (
                <p className="mt-1.5 flex items-center gap-1 text-xs text-destructive">
                  <AlertCircle className="h-3 w-3" strokeWidth={1.75} />
                  {errors.tipoCaja.message}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="filas">Filas *</Label>
              <Input
                id="filas"
                type="number"
                min="1"
                {...register('filas', { valueAsNumber: true })}
              />
              {errors.filas && (
                <p className="mt-1.5 flex items-center gap-1 text-xs text-destructive">
                  <AlertCircle className="h-3 w-3" strokeWidth={1.75} />
                  {errors.filas.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="columnas">Columnas *</Label>
              <Input
                id="columnas"
                type="number"
                min="1"
                {...register('columnas', { valueAsNumber: true })}
              />
              {errors.columnas && (
                <p className="mt-1.5 flex items-center gap-1 text-xs text-destructive">
                  <AlertCircle className="h-3 w-3" strokeWidth={1.75} />
                  {errors.columnas.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Color</Label>
              <Controller
                name="color"
                control={control}
                render={({ field }) => (
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={field.value}
                      onChange={(e) => field.onChange(e.target.value)}
                      className="
            w-8 h-8 
            rounded-full 
            border border-input 
            cursor-pointer  
            p-0 
            overflow-hidden 
            bg-transparent
          "
                    />

                    <span className="text-sm font-mono text-muted-foreground">
                      {field.value || '—'}
                    </span>

                    {field.value && (
                      <button
                        type="button"
                        onClick={() => field.onChange('')}
                        className="
                          w-4 h-4
                          flex items-center justify-center
                          rounded-full
                          text-muted-foreground
                          hover:text-destructive
                          hover:bg-muted
                          transition-colors
                        "
                      >
                        ✕
                      </button>
                    )}
                  </div>
                )}
              />
            </div>
          </div>

          {/* ── POSICIÓN EN EL REFRIGERADOR ──────────────────────────────── */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">
                Posición en Refrigerador {!isEditing && <span className="text-muted-foreground font-normal">(Opcional)</span>}
              </Label>
            </div>

            {/* EDIT MODE — show current position card ──────────────────── */}
            {isEditing && !isChangingPosition && (
              <>
                {ubicacionLabel ? (
                  <div className="flex items-center gap-2">
                    <div className="flex-1 flex items-center gap-2 p-2.5 bg-blue-50 border border-blue-200 rounded-md">
                      <MapPin className="h-4 w-4 text-blue-600 shrink-0" />
                      <p className="text-sm text-blue-800 font-medium">{ubicacionLabel}</p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setIsChangingPosition(true)}
                    >
                      Cambiar
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      title="Quitar posición asignada"
                      onClick={() => {
                        setValue('idPosicionPiso', undefined)
                        setUbicacionLabel('')
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => setIsChangingPosition(true)}
                  >
                    <MapPin className="h-4 w-4 mr-2" />
                    Asignar a una posición
                  </Button>
                )}
              </>
            )}

            {/* SELECTOR — shown in create mode, OR in edit when "Cambiar" was clicked ─ */}
            {(!isEditing || isChangingPosition) && (
              <>
                {isEditing && isChangingPosition && (
                  <p className="text-xs text-muted-foreground">
                    Selecciona el nuevo refrigerador y piso donde deseas mover la caja.
                  </p>
                )}

                <div className="space-y-2">
                  <Label>Seleccionar Refrigerador</Label>
                  <Select
                    value={selectedRefrigerador}
                    onValueChange={(value) => {
                      setSelectedRefrigerador(value)
                      setSelectedPiso('')
                      setSelectedPosicionPiso(null)
                      setValue('idPosicionPiso', undefined)
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un refrigerador" />
                    </SelectTrigger>
                    <SelectContent>
                      {refrigeradores?.map((ref) => (
                        <SelectItem key={ref.id} value={ref.id.toString()}>
                          {ref.nombre} ({ref.codigo})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedRefrigerador && pisos && (
                  <div className="space-y-2">
                    <Label>Seleccionar Piso</Label>
                    <Select
                      value={selectedPiso}
                      onValueChange={(value) => {
                        setSelectedPiso(value)
                        setSelectedPosicionPiso(null)
                        setValue('idPosicionPiso', undefined)
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un piso" />
                      </SelectTrigger>
                      <SelectContent>
                        {pisos.map((piso: any) => (
                          <SelectItem key={piso.id} value={piso.id.toString()}>
                            Piso {piso.numeroPiso} ({piso.filas}×{piso.columnas}×{piso.altura})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {selectedPiso && (
                  <div className="space-y-2">
                    <Label>Posición en el Piso</Label>
                    {selectedPosicionPiso ? (
                      <div className="flex items-center gap-2">
                        <div className="flex-1 flex items-center gap-2 p-2.5 bg-blue-50 border border-blue-200 rounded-md">
                          <MapPin className="h-4 w-4 text-blue-600 shrink-0" />
                          <p className="text-sm text-blue-800">
                            Fila <strong>{selectedPosicionPiso.fila}</strong>, Columna{' '}
                            <strong>{selectedPosicionPiso.columna}</strong>, Altura{' '}
                            <strong>{selectedPosicionPiso.altura}</strong>
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setShowPosicionSelector(true)}
                        >
                          Cambiar
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedPosicionPiso(null)
                            setValue('idPosicionPiso', undefined)
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full"
                        onClick={() => setShowPosicionSelector(true)}
                      >
                        <MapPin className="h-4 w-4 mr-2" />
                        Seleccionar Posición
                      </Button>
                    )}
                  </div>
                )}

                {isEditing && isChangingPosition && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground"
                    onClick={() => {
                      setIsChangingPosition(false)
                      setSelectedRefrigerador('')
                      setSelectedPiso('')
                      setSelectedPosicionPiso(null)
                      // Restore original idPosicionPiso and label
                      const source = freshCaja ?? caja
                      setValue('idPosicionPiso', source?.idPosicionPiso ?? undefined)
                      setUbicacionLabel(source?.ubicacionPiso || '')
                    }}
                  >
                    ← Cancelar cambio de posición
                  </Button>
                )}
              </>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="observaciones">Observaciones</Label>
            <Controller
              name="observaciones"
              control={control}
              render={({ field }) => (
                <Textarea
                  id="observaciones"
                  {...field}
                  sanitize="descripcion"
                  placeholder="Observaciones adicionales..."
                  rows={3}
                />
              )}
            />
            {errors.observaciones && (
              <p className="mt-1.5 flex items-center gap-1 text-xs text-destructive">
                <AlertCircle className="h-3 w-3" strokeWidth={1.75} />
                {errors.observaciones.message}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Guardando...' : (isEditing ? 'Actualizar' : 'Crear')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>

      {selectedPiso && (
        <PosicionPisoSelectorModal
          open={showPosicionSelector}
          onOpenChange={setShowPosicionSelector}
          idPiso={parseInt(selectedPiso)}
          pisoLabel={`Piso ${pisos?.find((p: any) => p.id.toString() === selectedPiso)?.numeroPiso ?? ''}`}
          onSelect={(posicion) => {
            setSelectedPosicionPiso(posicion)
            setValue('idPosicionPiso', posicion.id)
            // Build label so the card shows position details immediately
            const pisoNum = pisos?.find((p: any) => p.id.toString() === selectedPiso)?.numeroPiso ?? selectedPiso
            const refNombre = refrigeradores?.find((r) => r.id.toString() === selectedRefrigerador)?.codigo ?? ''
            setUbicacionLabel(`${refNombre} | Piso: ${pisoNum} | F${posicion.fila}-C${posicion.columna}-A${posicion.altura}`)
            // If editing and user picked a new position, close the "change" mode
            if (isEditing) setIsChangingPosition(false)
          }}
        />
      )}
    </Dialog>
  )
}
