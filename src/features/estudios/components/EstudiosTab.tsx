import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { ReactNode } from 'react'
import { AlertCircle, Paperclip } from 'lucide-react'

import { useAuthStore } from '@/stores/authStore'
import { EstudioListDTO, EstudioMedicoRequestDTO } from '@/types/api'
import { DocumentosDialog } from '@/features/documentos/components/DocumentosDialog'
import { estudioMedicoSchema, type EstudioMedicoFormData } from '../schemas/estudio.schema'
import { useCreateEstudio, useGetEstudios, useGetTiposEstudio } from '../hooks/useEstudios'
import { PacienteSearchCombobox } from '@/features/pacientes/components/PacienteSearchCombobox'
import { useGetConfiguracionHorarioActiva } from '@/features/configuracion/hooks/useHorarios'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { DateTimePicker, ultimoMomentoValido } from '@/components/ui/date-time-picker'
import type { HorarioActivoMinimo } from '@/components/ui/date-time-picker'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import { Textarea } from '@/components/ui/textarea'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { SedeBadge } from '@/components/common/SedeBadge'

// Se calcula en cada uso, no una sola vez al importar el modulo: asi la fecha no
// se queda congelada en la hora en que se cargo la pagina, y respeta el horario
// activo (ver ultimoMomentoValido).
function defaultValues(horario?: HorarioActivoMinimo | null): EstudioMedicoFormData {
  return {
    pacienteUUID: '',
    usuarioRealizaUUID: '',
    idTipoEstudio: 0,
    fechaEstudio: ultimoMomentoValido(horario),
    observaciones: '',
  }
}

export function EstudiosTab() {
  const userUuid = useAuthStore((s) => s.user?.uuid) || ''
  const puedeCrear = useAuthStore((s) => s.hasPermiso('ESTUDIOS_CREAR'))
  const isAdmin   = useAuthStore((s) => s.hasPermiso('ESTUDIOS_ELIMINAR'))
  const canUploadEstudio = useAuthStore((s) => s.hasPermiso('DOCUMENTOS_SUBIR'))
  const { data: horarioActivo } = useGetConfiguracionHorarioActiva()

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

  const [docEstudioId, setDocEstudioId] = useState<number | null>(null)

  const { data: estudios, isLoading: isLoadingEstudios, isError: isErrorEstudios } = useGetEstudios()
  const { data: tiposEstudio, isLoading: isLoadingTipos } = useGetTiposEstudio()
  const createMutation = useCreateEstudio()

  const tiposActivos = useMemo(() => (tiposEstudio || []).filter((t) => t.activo), [tiposEstudio])

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<EstudioMedicoFormData>({
    resolver: zodResolver(estudioMedicoSchema),
    defaultValues: { ...defaultValues(horarioActivo), usuarioRealizaUUID: userUuid },
  })

  useEffect(() => {
    if (userUuid) {
      setValue('usuarioRealizaUUID', userUuid)
    }
  }, [userUuid, setValue])

  const idTipoEstudio = watch('idTipoEstudio')
  const watchedPacienteUUID = watch('pacienteUUID')
  const watchedFechaEstudio = watch('fechaEstudio')

  const onSubmit = (data: EstudioMedicoFormData) => {
    const payload: EstudioMedicoRequestDTO = {
      pacienteUUID: data.pacienteUUID.trim(),
      usuarioRealizaUUID: userUuid.trim(),
      idTipoEstudio: Number(data.idTipoEstudio),
      fechaEstudio: data.fechaEstudio,
      observaciones: data.observaciones?.trim() || undefined,
      resultados: [],
    }

    createMutation.mutate(payload, {
      onSuccess: () => {
        reset({ ...defaultValues(horarioActivo), usuarioRealizaUUID: userUuid })
      },
    })
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
      <Card className="lg:col-span-3">
        <div className="flex items-center justify-between gap-3 border-b p-4">
          <div className="space-y-0.5">
            <div className="text-sm font-medium">Estudios registrados</div>
            <div className="text-xs text-muted-foreground">Listado de estudios médicos en el sistema.</div>
          </div>
          <Badge variant="secondary" className="font-mono">
            {(estudios || []).length}
          </Badge>
        </div>

        <div className="p-4">
          {isLoadingEstudios ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Spinner />
              Cargando estudios…
            </div>
          ) : isErrorEstudios ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" strokeWidth={1.75} />
              <AlertDescription>No se pudieron cargar los estudios.</AlertDescription>
            </Alert>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Participante</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {(estudios || []).map((e: EstudioListDTO) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-mono">{String(e.fechaEstudio || '').slice(0, 16).replace('T', ' ')}</TableCell>
                    <TableCell>
                      <span className="flex flex-wrap items-center gap-1.5">
                        {e.tipoEstudio}
                        <SedeBadge
                          idInstitucion={e.institucionId}
                          nombreInstitucion={e.institucionNombre}
                        />
                      </span>
                    </TableCell>
                    {/* Cuando el participante ya no está al alcance —permiso revocado— se
                        muestra el registro pero sin invitar a abrirlo: el enlace rebotaría
                        y parecería un error. El estudio sigue siendo de esta institución. */}
                    <TableCell className="truncate max-w-[160px]">
                      {e.pacienteAlcanzable === false ? (
                        <span
                          className="italic text-muted-foreground"
                          title="El participante pertenece a otra institución y ya no está a tu alcance"
                        >
                          Participante de otra institución
                        </span>
                      ) : (
                        e.paciente
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        title="Documentos adjuntos"
                        onClick={() => setDocEstudioId(e.id)}
                      >
                        <Paperclip className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {(estudios || []).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="py-8 text-center text-sm text-muted-foreground">
                      Sin estudios registrados
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </div>
      </Card>

      {/* ── Dialog documentos ── */}
      <DocumentosDialog
        open={docEstudioId !== null}
        onOpenChange={(open) => !open && setDocEstudioId(null)}
        entidad="estudio"
        estudioId={docEstudioId ?? 0}
        titulo="Documentos del estudio"
        descripcion="Sube y consulta los archivos adjuntos a este estudio médico."
        usuarioUUID={userUuid}
        canDelete={isAdmin}
        canUpload={canUploadEstudio}
      />

      {puedeCrear && <Card className="lg:col-span-2">
        <div className="border-b p-4">
          <div className="text-sm font-medium">Registrar estudio</div>
          <div className="text-xs text-muted-foreground">Captura los datos básicos; resultados/adjuntos se agregan luego.</div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 p-4">
          <input type="hidden" {...register('pacienteUUID')} />
          <input type="hidden" {...register('usuarioRealizaUUID')} />

          <FormField label="Participante" required error={errors.pacienteUUID?.message}>
            <PacienteSearchCombobox
              value={watchedPacienteUUID}
              onChange={(uuid) => setValue('pacienteUUID', uuid)}
            />
          </FormField>

          <FormField label="Tipo de estudio" required error={errors.idTipoEstudio?.message}>
            <Select
              value={idTipoEstudio ? String(idTipoEstudio) : ''}
              onValueChange={(v) => setValue('idTipoEstudio', Number(v))}
              disabled={isLoadingTipos}
            >
              <SelectTrigger>
                <SelectValue placeholder={isLoadingTipos ? 'Cargando…' : 'Seleccione un tipo'} />
              </SelectTrigger>
              <SelectContent>
                {tiposActivos.map((t) => (
                  <SelectItem key={t.id} value={String(t.id)}>
                    {t.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          <FormField label="Fecha y hora del estudio" required error={errors.fechaEstudio?.message}>
            <input type="hidden" {...register('fechaEstudio')} />
            <DateTimePicker
              value={watchedFechaEstudio}
              onChange={(v) => setValue('fechaEstudio', v, { shouldValidate: true })}
              placeholder="Selecciona fecha y hora"
              timeStepMinutes={1}
              maxDateTime={new Date()}
              minHour={horarioActivo?.horaInicio ?? 8}
              maxHour={(horarioActivo?.horaFin ?? 17) - 1}
              disabledDaysOfWeek={disabledDaysOfWeek}
            />
          </FormField>

          <FormField label="Observaciones" error={errors.observaciones?.message}>
            <Textarea placeholder="Notas clínicas relevantes…" {...register('observaciones')} />
          </FormField>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => reset({ ...defaultValues(horarioActivo), usuarioRealizaUUID: userUuid })}
              disabled={createMutation.isPending}
            >
              Limpiar
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" />
                  Registrando…
                </>
              ) : (
                'Registrar'
              )}
            </Button>
          </div>
        </form>
      </Card>}
    </div>
  )
}

function FormField({
  label,
  required,
  error,
  children,
}: {
  label: string
  required?: boolean
  error?: string
  children: ReactNode
}) {
  return (
    <div className="space-y-2">
      <Label className="text-sm">
        {label}
        {required && <span className="ml-1 text-destructive">*</span>}
      </Label>
      {children}
      {error && (
        <p className="flex items-start gap-1.5 text-xs text-destructive">
          <AlertCircle className="mt-[1px] size-3.5 shrink-0" />
          <span>{error}</span>
        </p>
      )}
    </div>
  )
}
