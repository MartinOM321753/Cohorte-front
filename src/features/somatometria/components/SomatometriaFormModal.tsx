import { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Pencil } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { DateTimePicker } from '@/components/ui/date-time-picker'

import { somatometriaSchema, type SomatometriaFormData } from '../schemas/somatometria.schema'
import {
  useCreateSomatometria,
  useUpdateSomatometria,
  useSomatometriaByPaciente,
} from '../hooks/useSomatometria'
import { useGetConfiguracionHorarioActiva } from '@/features/configuracion/hooks/useHorarios'
import { formatDate } from '@/lib/utils'
import { SedeBadge } from '@/components/common/SedeBadge'
import type { Somatometria } from '@/types/api'

// ─── Form Modal ────────────────────────────────────────────────────────────────

interface SomatometriaFormModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  pacienteUUID: string
  usuarioRegistraUUID: string
  somatometria?: Somatometria | null
}

const DEFAULT_VALUES: SomatometriaFormData = {
  fechaMedicion: '',
  pesoKg: undefined,
  tallaM: undefined,
  presionSistolica: undefined,
  presionDiastolica: undefined,
  circunferenciaAbdominalCm: undefined,
  frecuenciaCardiacaReposo: undefined,
  observaciones: '',
}

export function SomatometriaFormModal({
  open,
  onOpenChange,
  pacienteUUID,
  usuarioRegistraUUID,
  somatometria,
}: SomatometriaFormModalProps) {
  const puedeCrear = useAuthStore((s) => s.hasPermiso('SOMATOMETRIA_CREAR'))
  const puedeEditar = useAuthStore((s) => s.hasPermiso('SOMATOMETRIA_EDITAR'))
  const isEdit = !!somatometria
  const puedeSubmit = isEdit ? puedeEditar : puedeCrear
  const createMutation = useCreateSomatometria()
  const updateMutation = useUpdateSomatometria(pacienteUUID)
  const { data: horarioActivo } = useGetConfiguracionHorarioActiva()

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<SomatometriaFormData>({
    resolver: zodResolver(somatometriaSchema),
    defaultValues: DEFAULT_VALUES,
  })

  const disabledDaysOfWeek = useMemo(() => {
    if (!horarioActivo) return undefined
    const days: number[] = []
    if (!horarioActivo.domingo) days.push(0)
    if (!horarioActivo.lunes) days.push(1)
    if (!horarioActivo.martes) days.push(2)
    if (!horarioActivo.miercoles) days.push(3)
    if (!horarioActivo.jueves) days.push(4)
    if (!horarioActivo.viernes) days.push(5)
    if (!horarioActivo.sabado) days.push(6)
    return days.length > 0 ? days : undefined
  }, [horarioActivo])

  useEffect(() => {
    if (open) {
      if (somatometria) {
        reset({
          fechaMedicion: somatometria.fechaMedicion?.slice(0, 16) ?? '',
          pesoKg: somatometria.pesoKg ?? undefined,
          tallaM: somatometria.tallaM ?? undefined,
          presionSistolica: somatometria.presionSistolica ?? undefined,
          presionDiastolica: somatometria.presionDiastolica ?? undefined,
          circunferenciaAbdominalCm: somatometria.circunferenciaAbdominalCm ?? undefined,
          frecuenciaCardiacaReposo: somatometria.frecuenciaCardiacaReposo ?? undefined,
          observaciones: somatometria.observaciones ?? '',
        })
      } else {
        reset(DEFAULT_VALUES)
      }
    }
  }, [open, somatometria, reset])

  const onSubmit = async (data: SomatometriaFormData) => {
    const payload = {
      pacienteUUID,
      usuarioRegistraUUID,
      fechaMedicion: data.fechaMedicion,
      pesoKg: data.pesoKg ?? null,
      tallaM: data.tallaM ?? null,
      presionSistolica: data.presionSistolica ?? null,
      presionDiastolica: data.presionDiastolica ?? null,
      circunferenciaAbdominalCm: data.circunferenciaAbdominalCm ?? null,
      frecuenciaCardiacaReposo: data.frecuenciaCardiacaReposo ?? null,
      observaciones: data.observaciones || null,
    }

    try {
      if (isEdit && somatometria) {
        await updateMutation.mutateAsync({ id: somatometria.id, dto: payload })
        toast.success('Medición actualizada correctamente')
      } else {
        await createMutation.mutateAsync(payload)
        toast.success('Medición registrada correctamente')
      }
      onOpenChange(false)
    } catch (err: any) {
      // El mensaje util viene del backend en response.data.message; err.message
      // es el texto generico de Axios ("Request failed with status code 400"),
      // que no le dice nada a quien captura. Reglas de negocio como el horario
      // activo se explican solo en el primero.
      toast.error(
        err?.response?.data?.message ?? err?.message ?? 'Error al guardar la medición',
      )
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending || isSubmitting

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle className="text-[16px] font-semibold text-[var(--imss-ink-900)]">
            {isEdit ? 'Editar medición' : 'Registrar somatometría'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-1">
          {/* Fecha y hora */}
          <div className="space-y-1.5">
            <Label className="text-[13px]">
              Fecha y hora de medición <span className="text-red-500">*</span>
            </Label>
            <DateTimePicker
              value={watch('fechaMedicion')}
              onChange={(v) => setValue('fechaMedicion', v, { shouldValidate: true })}
              placeholder="Selecciona fecha"
              timeStepMinutes={1}
              maxDateTime={new Date()}
              minHour={horarioActivo?.horaInicio ?? 8}
              maxHour={(horarioActivo?.horaFin ?? 17) - 1}
              disabledDaysOfWeek={disabledDaysOfWeek}
            />
            {errors.fechaMedicion && (
              <p className="text-[11px] text-[var(--status-danger-fg)]">
                {errors.fechaMedicion.message}
              </p>
            )}
          </div>

          {/* Peso y Talla */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="pesoKg" className="text-[13px]">Peso (kg)</Label>
              <Input
                id="pesoKg"
                type="number"
                step="0.1"
                placeholder="kg"
                {...register('pesoKg')}
                className="h-9 text-[13px]"
              />
              {errors.pesoKg && (
                <p className="text-[11px] text-[var(--status-danger-fg)]">
                  {errors.pesoKg.message}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tallaM" className="text-[13px]">Talla (m)</Label>
              <Input
                id="tallaM"
                type="number"
                step="0.01"
                placeholder="m"
                {...register('tallaM')}
                className="h-9 text-[13px]"
              />
              {errors.tallaM && (
                <p className="text-[11px] text-[var(--status-danger-fg)]">
                  {errors.tallaM.message}
                </p>
              )}
            </div>
          </div>

          {/* Presión arterial */}
          <div className="space-y-1.5">
            <Label className="text-[13px]">Presión arterial (sistólica / diastólica)</Label>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <Input
                  id="presionSistolica"
                  type="number"
                  placeholder="Sistólica (mmHg)"
                  {...register('presionSistolica')}
                  className="h-9 text-[13px]"
                />
                {errors.presionSistolica && (
                  <p className="text-[11px] text-[var(--status-danger-fg)]">
                    {errors.presionSistolica.message}
                  </p>
                )}
              </div>
              <div>
                <Input
                  id="presionDiastolica"
                  type="number"
                  placeholder="Diastólica (mmHg)"
                  {...register('presionDiastolica')}
                  className="h-9 text-[13px]"
                />
                {errors.presionDiastolica && (
                  <p className="text-[11px] text-[var(--status-danger-fg)]">
                    {errors.presionDiastolica.message}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Circ. abdominal y FC */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="circunferenciaAbdominalCm" className="text-[13px]">
                Circ. abdominal (cm)
              </Label>
              <Input
                id="circunferenciaAbdominalCm"
                type="number"
                step="0.1"
                {...register('circunferenciaAbdominalCm')}
                className="h-9 text-[13px]"
              />
              {errors.circunferenciaAbdominalCm && (
                <p className="text-[11px] text-[var(--status-danger-fg)]">
                  {errors.circunferenciaAbdominalCm.message}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="frecuenciaCardiacaReposo" className="text-[13px]">
                FC reposo (lpm)
              </Label>
              <Input
                id="frecuenciaCardiacaReposo"
                type="number"
                {...register('frecuenciaCardiacaReposo')}
                className="h-9 text-[13px]"
              />
              {errors.frecuenciaCardiacaReposo && (
                <p className="text-[11px] text-[var(--status-danger-fg)]">
                  {errors.frecuenciaCardiacaReposo.message}
                </p>
              )}
            </div>
          </div>

          {/* Observaciones */}
          <div className="space-y-1.5">
            <Label htmlFor="observaciones" className="text-[13px]">Observaciones</Label>
            <Textarea
              id="observaciones"
              rows={3}
              placeholder="Notas adicionales..."
              {...register('observaciones')}
              className="text-[13px]"
            />
          </div>

          <DialogFooter className="gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
              className="text-[13px]"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isPending || !puedeSubmit}
              className="bg-[var(--imss-green-500)] text-white hover:bg-[var(--imss-green-700)] text-[13px]"
            >
              {isPending
                ? isEdit ? 'Guardando...' : 'Registrando...'
                : isEdit ? 'Guardar cambios' : 'Registrar medición'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Historial Dialog ──────────────────────────────────────────────────────────

interface SomatometriaHistorialDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  pacienteUUID: string
  onEditar: (s: Somatometria) => void
}

export function SomatometriaHistorialDialog({
  open,
  onOpenChange,
  pacienteUUID,
  onEditar,
}: SomatometriaHistorialDialogProps) {
  const puedeEditar = useAuthStore((s) => s.hasPermiso('SOMATOMETRIA_EDITAR'))
  const { data: historial = [], isLoading } = useSomatometriaByPaciente(pacienteUUID, {
    enabled: open && !!pacienteUUID,
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[780px]">
        <DialogHeader>
          <DialogTitle className="text-[16px] font-semibold text-[var(--imss-ink-900)]">
            Historial de somatometría
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-2 py-4">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-9 w-full" />)}
          </div>
        ) : historial.length === 0 ? (
          <p className="py-8 text-center text-[13px] text-[var(--imss-ink-300)]">
            Sin mediciones registradas
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--muted)]">
                  <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--imss-ink-500)]">
                    Fecha
                  </th>
                  <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--imss-ink-500)]">
                    Peso
                  </th>
                  <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--imss-ink-500)]">
                    Talla
                  </th>
                  <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--imss-ink-500)]">
                    IMC
                  </th>
                  <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--imss-ink-500)]">
                    Presión
                  </th>
                  <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--imss-ink-500)]">
                    FC
                  </th>
                  <th className="px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--imss-ink-500)]">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {historial.map((s) => (
                  <tr
                    key={s.id}
                    className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--imss-green-50)]"
                  >
                    <td className="px-3 py-2.5 font-mono text-[12px] text-[var(--imss-ink-900)]">
                      <span className="flex flex-wrap items-center gap-1.5">
                        {formatDate(s.fechaMedicion, 'dd/MM/yyyy HH:mm')}
                        <SedeBadge
                          uuidInstitucion={s.institucionUuid}
                          nombreInstitucion={s.institucionNombre}
                        />
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-[var(--imss-ink-900)]">
                      {s.pesoKg != null ? `${s.pesoKg} kg` : '—'}
                    </td>
                    <td className="px-3 py-2.5 text-[var(--imss-ink-900)]">
                      {s.tallaM != null ? `${s.tallaM} m` : '—'}
                    </td>
                    <td className="px-3 py-2.5 text-[var(--imss-ink-900)]">
                      {s.imc != null ? Number(s.imc).toFixed(1) : '—'}
                    </td>
                    <td className="px-3 py-2.5 text-[var(--imss-ink-900)]">
                      {s.presionSistolica && s.presionDiastolica
                        ? `${s.presionSistolica}/${s.presionDiastolica}`
                        : '—'}
                    </td>
                    <td className="px-3 py-2.5 text-[var(--imss-ink-900)]">
                      {s.frecuenciaCardiacaReposo != null ? `${s.frecuenciaCardiacaReposo} lpm` : '—'}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      {puedeEditar && (
                        <button
                          onClick={() => onEditar(s)}
                          className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--imss-ink-500)] hover:bg-[var(--imss-green-50)] hover:text-[var(--imss-green-700)]"
                          title="Editar"
                        >
                          <Pencil className="h-3.5 w-3.5" strokeWidth={1.75} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
