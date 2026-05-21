import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { ReactNode } from 'react'
import {
  AlertCircle,
  Check,
  ChevronsUpDown,
  ClipboardList,
  Minus,
  TrendingDown,
  TrendingUp,
} from 'lucide-react'

import { useAuthStore } from '@/stores/authStore'
import { Paciente, ResultadoExamen, ResultadoExamenRequestDTO } from '@/types/api'
import { resultadoExamenSchema, type ResultadoExamenFormData } from '../schemas/examen.schema'
import {
  useGetExamenes,
  useGetResultadosByPacienteUUID,
  useSaveResultadoExamen,
} from '../hooks/useExamenes'
import { useGetPacientes } from '@/features/pacientes/hooks/useGetPacientes'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { DatePicker } from '@/components/ui/date-time-picker'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { Textarea } from '@/components/ui/textarea'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'

// ── helpers ───────────────────────────────────────────────────────────────────

function getPacienteUUID(p: Paciente): string {
  return p.UUID || (p as unknown as { uuid?: string }).uuid || ''
}

function getRangeStatus(
  resultado: ResultadoExamen,
  sexo?: 'M' | 'F'
): 'low' | 'normal' | 'high' | null {
  const { examen, valorObtenido } = resultado
  if (!examen) return null
  const min = sexo === 'F' ? examen.valorMinMujeres : examen.valorMinHombres
  const max = sexo === 'F' ? examen.valorMaxMujeres : examen.valorMaxHombres
  if (min == null || max == null) return null
  if (valorObtenido < min) return 'low'
  if (valorObtenido > max) return 'high'
  return 'normal'
}

function RangeIndicator({ status }: { status: 'low' | 'normal' | 'high' | null }) {
  if (status === null) return <span className="text-xs text-muted-foreground">—</span>
  if (status === 'normal')
    return (
      <Badge
        variant="secondary"
        className="gap-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
      >
        <Minus className="h-3 w-3" />
        Normal
      </Badge>
    )
  if (status === 'low')
    return (
      <Badge
        variant="secondary"
        className="gap-1 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
      >
        <TrendingDown className="h-3 w-3" />
        Bajo
      </Badge>
    )
  return (
    <Badge
      variant="secondary"
      className="gap-1 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
    >
      <TrendingUp className="h-3 w-3" />
      Alto
    </Badge>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

const DEFAULT_VALUES: ResultadoExamenFormData = {
  pacienteUUID: '',
  usuarioRegistroUUID: '',
  idExamen: 0,
  valorObtenido: 0,
  observaciones: '',
  fechaResultado: new Date().toISOString().slice(0, 10),
}

export function ResultadosExamenTab() {
  const userUuid = useAuthStore((s) => s.user?.uuid) || ''
  const [openPaciente, setOpenPaciente] = useState(false)

  const { data: pacientesRaw, isLoading: isLoadingPacientes } = useGetPacientes({ activos: true })
  const { data: examenes, isLoading: isLoadingExamenes } = useGetExamenes()
  const saveMutation = useSaveResultadoExamen()

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ResultadoExamenFormData>({
    resolver: zodResolver(resultadoExamenSchema),
    defaultValues: { ...DEFAULT_VALUES, usuarioRegistroUUID: userUuid },
  })

  useEffect(() => {
    if (userUuid) setValue('usuarioRegistroUUID', userUuid)
  }, [userUuid, setValue])

  const watchedPacienteUUID = watch('pacienteUUID')
  const watchedIdExamen = watch('idExamen')
  const watchedFecha = watch('fechaResultado')

  const pacientes = useMemo<Paciente[]>(() => {
    const arr = Array.isArray(pacientesRaw) ? pacientesRaw : ((pacientesRaw as any)?.data ?? [])
    return Array.isArray(arr) ? arr : []
  }, [pacientesRaw])

  const examenesActivos = useMemo(
    () => (examenes || []).filter((e) => e.activo),
    [examenes]
  )

  const selectedPaciente = useMemo(
    () => pacientes.find((p) => getPacienteUUID(p) === watchedPacienteUUID),
    [pacientes, watchedPacienteUUID]
  )

  const selectedExamen = useMemo(
    () => examenesActivos.find((e) => e.id === watchedIdExamen),
    [examenesActivos, watchedIdExamen]
  )

  // Resultados del paciente seleccionado en el formulario
  const {
    data: resultados,
    isLoading: isLoadingResultados,
    isError: isErrorResultados,
  } = useGetResultadosByPacienteUUID(watchedPacienteUUID || null)

  const sortedResultados = useMemo(
    () =>
      [...(resultados || [])].sort(
        (a, b) =>
          new Date(b.fechaResultado).getTime() - new Date(a.fechaResultado).getTime()
      ),
    [resultados]
  )

  const handleSelectPaciente = (p: Paciente) => {
    setValue('pacienteUUID', getPacienteUUID(p))
    setOpenPaciente(false)
  }

  const onSubmit = (data: ResultadoExamenFormData) => {
    const fechaISO = data.fechaResultado.includes('T')
      ? data.fechaResultado
      : `${data.fechaResultado}T00:00:00`

    const payload: ResultadoExamenRequestDTO = {
      pacienteUUID: data.pacienteUUID.trim(),
      usuarioRegistroUUID: userUuid.trim(),
      idExamen: data.idExamen,
      valorObtenido: data.valorObtenido,
      observaciones: data.observaciones?.trim() || undefined,
      fechaResultado: fechaISO,
    }

    saveMutation.mutate(payload, {
      onSuccess: () =>
        reset({ ...DEFAULT_VALUES, usuarioRegistroUUID: userUuid }),
    })
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
      {/* ── Panel izquierdo: historial ── */}
      <Card className="lg:col-span-3">
        <div className="flex items-center justify-between gap-3 border-b p-4">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2 text-sm font-medium">
              <ClipboardList className="h-4 w-4 text-muted-foreground" />
              Historial de resultados
            </div>
            <div className="text-xs text-muted-foreground">
              {selectedPaciente
                ? `${selectedPaciente.folio} — ${selectedPaciente.persona.nombre} ${selectedPaciente.persona.apellidoPaterno}`
                : 'Selecciona un paciente en el formulario para ver sus resultados.'}
            </div>
          </div>
          {watchedPacienteUUID && (
            <Badge variant="secondary" className="font-mono">
              {sortedResultados.length}
            </Badge>
          )}
        </div>

        <div className="p-4">
          {!watchedPacienteUUID ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-center text-sm text-muted-foreground">
              <ClipboardList className="h-8 w-8 opacity-25" />
              <span>Elige un paciente en el formulario para ver su historial.</span>
            </div>
          ) : isLoadingResultados ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Spinner className="h-4 w-4" />
              Cargando resultados…
            </div>
          ) : isErrorResultados ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" strokeWidth={1.75} />
              <AlertDescription>No se pudieron cargar los resultados.</AlertDescription>
            </Alert>
          ) : (
            <>
              {selectedPaciente?.persona.sexo && (
                <p className="mb-3 text-xs text-muted-foreground">
                  Rangos de referencia aplicados:{' '}
                  <span className="font-medium">
                    {selectedPaciente.persona.sexo === 'M' ? 'Hombres ♂' : 'Mujeres ♀'}
                  </span>
                </p>
              )}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Examen</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedResultados.map((r) => {
                    const status = getRangeStatus(
                      r,
                      selectedPaciente?.persona.sexo as 'M' | 'F' | undefined
                    )
                    return (
                      <TableRow key={r.id}>
                        <TableCell className="font-mono text-xs">
                          {String(r.fechaResultado || '').slice(0, 10)}
                        </TableCell>
                        <TableCell className="text-sm">
                          {r.examen?.nombreExamen || `#${r.idExamen}`}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {r.valorObtenido}
                          {r.examen?.unidad && (
                            <span className="ml-1 text-xs text-muted-foreground">
                              {r.examen.unidad}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <RangeIndicator status={status} />
                        </TableCell>
                      </TableRow>
                    )
                  })}
                  {sortedResultados.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="py-8 text-center text-sm text-muted-foreground"
                      >
                        Sin resultados para este paciente
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </>
          )}
        </div>
      </Card>

      {/* ── Panel derecho: formulario ── */}
      <Card className="lg:col-span-2">
        <div className="border-b p-4">
          <div className="text-sm font-medium">Registrar resultado</div>
          <div className="text-xs text-muted-foreground">
            Captura el valor obtenido en el examen de laboratorio.
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 p-4">
          <input type="hidden" {...register('pacienteUUID')} />
          <input type="hidden" {...register('usuarioRegistroUUID')} />

          {/* Paciente */}
          <FormField label="Paciente" required error={errors.pacienteUUID?.message}>
            <Popover open={openPaciente} onOpenChange={setOpenPaciente}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  role="combobox"
                  aria-expanded={openPaciente}
                  className="w-full justify-between"
                  disabled={isLoadingPacientes}
                >
                  {watchedPacienteUUID
                    ? (() => {
                        const p = pacientes.find(
                          (x) => getPacienteUUID(x) === watchedPacienteUUID
                        )
                        return p
                          ? `${p.folio} — ${p.persona.nombre} ${p.persona.apellidoPaterno}`
                          : 'Paciente seleccionado'
                      })()
                    : isLoadingPacientes
                      ? 'Cargando…'
                      : 'Buscar paciente…'}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Buscar por folio o nombre…" />
                  <CommandList>
                    <CommandEmpty>No se encontró el paciente.</CommandEmpty>
                    <CommandGroup>
                      {pacientes.map((p) => (
                        <CommandItem
                          key={getPacienteUUID(p)}
                          value={`${p.folio} ${p.persona.nombre} ${p.persona.apellidoPaterno} ${p.persona.apellidoMaterno ?? ''}`}
                          onSelect={() => handleSelectPaciente(p)}
                        >
                          <Check
                            className={cn(
                              'mr-2 h-4 w-4 shrink-0',
                              watchedPacienteUUID === getPacienteUUID(p)
                                ? 'opacity-100'
                                : 'opacity-0'
                            )}
                          />
                          {p.folio} — {p.persona.nombre} {p.persona.apellidoPaterno}
                          {p.persona.apellidoMaterno ? ` ${p.persona.apellidoMaterno}` : ''}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </FormField>

          {/* Examen */}
          <FormField label="Examen" required error={errors.idExamen?.message}>
            <Select
              value={watchedIdExamen ? String(watchedIdExamen) : ''}
              onValueChange={(v) => setValue('idExamen', Number(v))}
              disabled={isLoadingExamenes}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={isLoadingExamenes ? 'Cargando…' : 'Seleccione un examen'}
                />
              </SelectTrigger>
              <SelectContent>
                {examenesActivos.map((e) => (
                  <SelectItem key={e.id} value={String(e.id)}>
                    {e.nombreExamen}
                    {e.unidad ? ` (${e.unidad})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          {/* Valor obtenido */}
          <FormField label="Valor obtenido" required error={errors.valorObtenido?.message}>
            <div className="relative">
              <Input
                type="number"
                step="any"
                placeholder="0.00"
                className={selectedExamen?.unidad ? 'pr-14' : undefined}
                {...register('valorObtenido', { valueAsNumber: true })}
              />
              {selectedExamen?.unidad && (
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  {selectedExamen.unidad}
                </span>
              )}
            </div>
            {selectedExamen && (
              <div className="space-y-0.5 text-xs text-muted-foreground">
                {selectedExamen.valorMinMujeres != null &&
                  selectedExamen.valorMaxMujeres != null && (
                    <p>
                      ♀ Ref: {selectedExamen.valorMinMujeres} –{' '}
                      {selectedExamen.valorMaxMujeres}
                    </p>
                  )}
                {selectedExamen.valorMinHombres != null &&
                  selectedExamen.valorMaxHombres != null && (
                    <p>
                      ♂ Ref: {selectedExamen.valorMinHombres} –{' '}
                      {selectedExamen.valorMaxHombres}
                    </p>
                  )}
              </div>
            )}
          </FormField>

          {/* Fecha */}
          <FormField label="Fecha del resultado" required error={errors.fechaResultado?.message}>
            <input type="hidden" {...register('fechaResultado')} />
            <DatePicker
              value={watchedFecha}
              onChange={(v) => setValue('fechaResultado', v)}
            />
          </FormField>

          {/* Observaciones */}
          <FormField label="Observaciones" error={errors.observaciones?.message}>
            <Textarea
              placeholder="Notas adicionales…"
              rows={2}
              className="resize-none"
              {...register('observaciones')}
            />
          </FormField>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() =>
                reset({ ...DEFAULT_VALUES, usuarioRegistroUUID: userUuid })
              }
              disabled={saveMutation.isPending}
            >
              Limpiar
            </Button>
            <Button type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? (
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
      </Card>
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
    <div className="space-y-1.5">
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
