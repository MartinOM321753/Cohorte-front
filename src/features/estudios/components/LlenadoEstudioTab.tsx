import { useEffect, useMemo, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { ReactNode } from 'react'
import { AlertCircle, Check, ChevronsUpDown, ClipboardList, Paperclip, Pencil } from 'lucide-react'

import { useAuthStore } from '@/stores/authStore'
import { DocumentosDialog } from '@/features/documentos/components/DocumentosDialog'
import {
  EstudioMedicoRequestDTO,
  ParametroEstudio,
  Paciente,
  ResultadoEstudioRequestDTO,
} from '@/types/api'
import {
  useCreateEstudio,
  useGetEstudiosByPaciente,
  useGetEstudioById,
  useGetParametrosByTipo,
  useGetTiposEstudio,
  useUpdateEstudio,
} from '../hooks/useEstudios'
import { useGetPacientes } from '@/features/pacientes/hooks/useGetPacientes'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { DatePicker } from '@/components/ui/date-time-picker'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Spinner } from '@/components/ui/spinner'
import { Switch } from '@/components/ui/switch'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

// ──────────────────────────────────────────────────────────
// Dynamic schema builder
// ──────────────────────────────────────────────────────────
function buildResultadosSchema(parametros: ParametroEstudio[]) {
  const fields: Record<string, z.ZodTypeAny> = {
    pacienteUUID: z.string().min(1, 'Seleccione un paciente'),
    idTipoEstudio: z.number().min(1, 'Seleccione una plantilla'),
    fechaEstudio: z.string().min(1, 'La fecha es requerida'),
    observaciones: z.string().optional(),
  }
  for (const p of parametros) {
    if (p.tipo === 'NUMERICO') {
      fields[`param_${p.id}`] = z.preprocess(
        (v) => (v === '' || v === null || v === undefined ? undefined : Number(v)),
        z.number({ required_error: 'Requerido', invalid_type_error: 'Ingrese un número' }).finite('Ingrese un número válido')
      )
    } else if (p.tipo === 'TEXTO') {
      fields[`param_${p.id}`] = z.string().min(1, 'Requerido')
    } else {
      // BOOLEANO: false es un valor válido, no requiere validación especial
      fields[`param_${p.id}`] = z.boolean().default(false)
    }
  }
  return z.object(fields)
}

type LlenadoForm = Record<string, unknown>

// ──────────────────────────────────────────────────────────
// Main component
// ──────────────────────────────────────────────────────────
export function LlenadoEstudioTab() {
  const userUuid = useAuthStore((s) => s.user?.uuid) || ''
  const isAdmin  = useAuthStore((s) => s.hasRole('ADMINISTRADOR'))
  const canUploadEstudio = useAuthStore((s) => s.hasRole(['ADMINISTRADOR', 'MEDICO']))

  const [openPaciente, setOpenPaciente] = useState(false)
  const [selectedPacienteUUID, setSelectedPacienteUUID] = useState('')
  const [selectedTipoId, setSelectedTipoId] = useState<number>(0)
  const [editingEstudioId, setEditingEstudioId] = useState<number | null>(null)
  const [docEstudioId, setDocEstudioId] = useState<number | null>(null)

  const { data: pacientesRaw, isLoading: isLoadingPacientes } = useGetPacientes({ activos: true })
  const { data: tipos, isLoading: isLoadingTipos } = useGetTiposEstudio()
  const { data: parametros, isLoading: isLoadingParams } = useGetParametrosByTipo(
    selectedTipoId > 0 ? selectedTipoId : null
  )
  const { data: historial, isLoading: isLoadingHistorial } = useGetEstudiosByPaciente(
    selectedPacienteUUID || null
  )
  const { data: estudioEditar } = useGetEstudioById(editingEstudioId)

  const createMutation = useCreateEstudio()
  const updateMutation = useUpdateEstudio(editingEstudioId ?? 0)

  const parametrosList: ParametroEstudio[] = parametros ?? []
  const schema = useMemo(() => buildResultadosSchema(parametrosList), [parametrosList])

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    control,
    reset,
    formState: { errors },
  } = useForm<LlenadoForm>({
    resolver: zodResolver(schema) as any,
    defaultValues: {
      pacienteUUID: '',
      idTipoEstudio: 0,
      fechaEstudio: new Date().toISOString().slice(0, 10),
      observaciones: '',
    },
  })

  const watchedFecha = watch('fechaEstudio') as string

  const pacientes = useMemo(() => {
    const arr = Array.isArray(pacientesRaw) ? pacientesRaw : ((pacientesRaw as any)?.data ?? [])
    return Array.isArray(arr) ? (arr as Paciente[]) : []
  }, [pacientesRaw])

  const tiposActivos = useMemo(() => (tipos || []).filter((t) => t.activo), [tipos])

  // When editing a study whose tipo is inactive, include it in the selector
  const tiposParaSelector = useMemo(() => {
    if (!editingEstudioId || selectedTipoId === 0) return tiposActivos
    const yaIncluido = tiposActivos.some((t) => t.id === selectedTipoId)
    if (yaIncluido) return tiposActivos
    // Synthesize entry from the study detail we already have
    const tipoDelEstudio = estudioEditar?.tipoEstudio
    if (tipoDelEstudio) {
      return [...tiposActivos, { ...tipoDelEstudio, activo: false }]
    }
    return tiposActivos
  }, [tiposActivos, editingEstudioId, selectedTipoId, estudioEditar])

  const getPacienteUUID = (p: Paciente): string =>
    p.UUID || (p as unknown as { uuid?: string }).uuid || ''

  const selectedPaciente = useMemo(
    () => pacientes.find((p) => getPacienteUUID(p) === selectedPacienteUUID),
    [pacientes, selectedPacienteUUID]
  )

  // When editing, pre-populate form fields
  useEffect(() => {
    if (!estudioEditar || !editingEstudioId) return
    setValue('pacienteUUID', estudioEditar.paciente?.uuid ?? '')
    setSelectedPacienteUUID(estudioEditar.paciente?.uuid ?? '')
    const tipoId = estudioEditar.tipoEstudio?.id ?? 0
    setValue('idTipoEstudio', tipoId)
    setSelectedTipoId(tipoId)
    setValue('fechaEstudio', String(estudioEditar.fechaEstudio ?? '').slice(0, 10))
    setValue('observaciones', estudioEditar.observaciones ?? '')
  }, [estudioEditar, editingEstudioId, setValue])

  // Pre-fill result values when editing and params are loaded
  useEffect(() => {
    if (!estudioEditar || !parametrosList.length) return
    for (const resultado of estudioEditar.resultados ?? []) {
      const param = parametrosList.find((p) => p.nombre === resultado.parametro)
      if (!param) continue
      if (param.tipo === 'NUMERICO') setValue(`param_${param.id}`, resultado.valorNumerico ?? '')
      else if (param.tipo === 'TEXTO') setValue(`param_${param.id}`, resultado.valorTexto ?? '')
      else setValue(`param_${param.id}`, resultado.valorBooleano ?? false)
    }
  }, [estudioEditar, parametrosList, setValue])

  function buildResultados(data: LlenadoForm): ResultadoEstudioRequestDTO[] {
    return parametrosList.map((p) => {
      const val = data[`param_${p.id}`]
      return {
        idParametro: p.id,
        valorNumerico: p.tipo === 'NUMERICO' ? (val as number | undefined) : undefined,
        valorTexto: p.tipo === 'TEXTO' ? (val as string | undefined) : undefined,
        valorBooleano: p.tipo === 'BOOLEANO' ? ((val as boolean | undefined) ?? false) : undefined,
      }
    })
  }

  function resetForm() {
    reset({
      pacienteUUID: '',
      idTipoEstudio: 0,
      fechaEstudio: new Date().toISOString().slice(0, 10),
      observaciones: '',
    })
    setSelectedPacienteUUID('')
    setSelectedTipoId(0)
    setEditingEstudioId(null)
  }

  function onSubmit(data: LlenadoForm) {
    const payload: EstudioMedicoRequestDTO = {
      pacienteUUID: selectedPacienteUUID,
      usuarioRealizaUUID: userUuid,
      idTipoEstudio: Number(data.idTipoEstudio),
      fechaEstudio: data.fechaEstudio as string,
      observaciones: (data.observaciones as string)?.trim() || undefined,
      resultados: buildResultados(data),
    }

    if (editingEstudioId) {
      updateMutation.mutate(payload, { onSuccess: resetForm })
    } else {
      createMutation.mutate(payload, { onSuccess: resetForm })
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
      {/* Dialog documentos del historial */}
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

      {/* LEFT — patient study history */}
      <Card className="lg:col-span-3">
        <div className="flex items-center justify-between gap-3 border-b p-4">
          <div className="space-y-0.5">
            <div className="text-sm font-medium">Historial del paciente</div>
            <div className="text-xs text-muted-foreground">
              {selectedPacienteUUID
                ? `Estudios de ${selectedPaciente?.persona.nombre ?? '…'} ${selectedPaciente?.persona.apellidoPaterno ?? ''}`
                : 'Seleccione un paciente para ver su historial.'}
            </div>
          </div>
          {selectedPacienteUUID && (
            <Badge variant="secondary" className="font-mono">{(historial || []).length}</Badge>
          )}
        </div>

        <div className="p-4">
          {!selectedPacienteUUID ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center text-sm text-muted-foreground">
              <ClipboardList className="h-8 w-8 opacity-30" strokeWidth={1.25} />
              Selecciona un paciente en el formulario.
            </div>
          ) : isLoadingHistorial ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Spinner /> Cargando historial…
            </div>
          ) : (historial ?? []).length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Sin estudios registrados para este paciente.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Tipo de estudio</TableHead>
                  <TableHead>Médico</TableHead>
                  <TableHead className="w-16 text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(historial ?? []).map((e) => (
                  <TableRow
                    key={e.id}
                    className={cn(editingEstudioId === e.id && 'bg-muted/50')}
                  >
                    <TableCell className="font-mono text-xs">
                      {String(e.fechaEstudio ?? '').slice(0, 10)}
                    </TableCell>
                    <TableCell className="text-sm">{e.tipoEstudio}</TableCell>
                    <TableCell className="truncate text-xs text-muted-foreground max-w-[120px]">
                      {e.usuarioRealiza}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-0.5">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          title="Documentos adjuntos"
                          onClick={() => setDocEstudioId(e.id)}
                        >
                          <Paperclip className="h-3.5 w-3.5" strokeWidth={1.75} />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          title="Editar estudio"
                          onClick={() => {
                            setEditingEstudioId(e.id)
                            setSelectedTipoId(e.tipoEstudioid)
                            setValue('idTipoEstudio', e.tipoEstudioid)
                          }}
                        >
                          <Pencil className="h-3.5 w-3.5" strokeWidth={1.75} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </Card>

      {/* RIGHT — fill form */}
      <Card className="lg:col-span-2">
        <div className="border-b p-4">
          <div className="text-sm font-medium">
            {editingEstudioId ? 'Editar estudio' : 'Registrar estudio'}
          </div>
          <div className="text-xs text-muted-foreground">
            {editingEstudioId
              ? 'Modifica los resultados del estudio seleccionado.'
              : 'Selecciona la plantilla para cargar el formulario.'}
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-4 p-4">
          {/* Paciente */}
          <FormField label="Paciente" required error={errors.pacienteUUID?.message as string}>
            <Popover open={openPaciente} onOpenChange={setOpenPaciente}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  role="combobox"
                  aria-expanded={openPaciente}
                  className="w-full justify-between text-sm"
                  disabled={isLoadingPacientes}
                >
                  <span className="truncate">
                    {selectedPaciente
                      ? `${selectedPaciente.folio} — ${selectedPaciente.persona.nombre} ${selectedPaciente.persona.apellidoPaterno}`
                      : isLoadingPacientes
                        ? 'Cargando…'
                        : 'Buscar paciente…'}
                  </span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Buscar por folio o nombre…" />
                  <CommandList>
                    <CommandEmpty>No se encontró el paciente.</CommandEmpty>
                    <CommandGroup>
                      {pacientes.map((p) => {
                        const uuid = getPacienteUUID(p)
                        return (
                          <CommandItem
                            key={uuid}
                            value={`${p.folio} ${p.persona.nombre} ${p.persona.apellidoPaterno} ${p.persona.apellidoMaterno ?? ''}`}
                            onSelect={() => {
                              setSelectedPacienteUUID(uuid)
                              setValue('pacienteUUID', uuid)
                              setOpenPaciente(false)
                            }}
                          >
                            <Check
                              className={cn(
                                'mr-2 h-4 w-4 shrink-0',
                                selectedPacienteUUID === uuid ? 'opacity-100' : 'opacity-0'
                              )}
                            />
                            {p.folio} — {p.persona.nombre} {p.persona.apellidoPaterno}
                            {p.persona.apellidoMaterno ? ' ' + p.persona.apellidoMaterno : ''}
                          </CommandItem>
                        )
                      })}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </FormField>

          {/* Plantilla */}
          <FormField
            label="Plantilla (tipo de estudio)"
            required
            error={errors.idTipoEstudio?.message as string}
          >
            <Select
              value={selectedTipoId > 0 ? String(selectedTipoId) : ''}
              onValueChange={(v) => {
                const id = Number(v)
                setSelectedTipoId(id)
                setValue('idTipoEstudio', id)
                setEditingEstudioId(null)
              }}
              disabled={isLoadingTipos || !!editingEstudioId}
            >
              <SelectTrigger>
                <SelectValue placeholder={isLoadingTipos ? 'Cargando…' : 'Seleccione una plantilla'} />
              </SelectTrigger>
              <SelectContent>
                {tiposParaSelector.map((t) => (
                  <SelectItem key={t.id} value={String(t.id)}>
                    {t.nombre}{!t.activo ? ' (deshabilitado)' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          {/* Fecha */}
          <FormField label="Fecha del estudio" required error={errors.fechaEstudio?.message as string}>
            <input type="hidden" {...register('fechaEstudio')} />
            <DatePicker
              value={watchedFecha}
              onChange={(v) => setValue('fechaEstudio', v)}
            />
          </FormField>

          {/* Dynamic parameters */}
          {selectedTipoId > 0 && (
            <>
              <Separator />
              <div className="space-y-3">
                <Label className="text-sm">Resultados</Label>
                {isLoadingParams ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Spinner /> Cargando parámetros…
                  </div>
                ) : parametrosList.length === 0 ? (
                  <Alert>
                    <AlertCircle className="h-4 w-4" strokeWidth={1.75} />
                    <AlertDescription>
                      Esta plantilla no tiene parámetros definidos. Agrégalos en la pestaña Catálogos.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="space-y-3">
                    {parametrosList.map((p) => (
                      <ParametroInput
                        key={p.id}
                        parametro={p}
                        register={register}
                        control={control}
                        error={errors[`param_${p.id}`]?.message as string | undefined}
                      />
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {/* Observaciones */}
          <FormField label="Observaciones" error={errors.observaciones?.message as string}>
            <Textarea placeholder="Notas clínicas relevantes…" rows={2} {...register('observaciones')} />
          </FormField>

          <div className="flex items-center justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={resetForm} disabled={isPending}>
              {editingEstudioId ? 'Cancelar' : 'Limpiar'}
            </Button>
            <Button
              type="submit"
              disabled={isPending || (selectedTipoId > 0 && parametrosList.length === 0)}
            >
              {isPending ? (
                <><Spinner className="mr-2 h-4 w-4" /> Guardando…</>
              ) : editingEstudioId ? (
                'Actualizar'
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

// ──────────────────────────────────────────────────────────
// Dynamic parameter input
// ──────────────────────────────────────────────────────────
function ParametroInput({
  parametro,
  register,
  control,
  error,
}: {
  parametro: ParametroEstudio
  register: any
  control: any
  error?: string
}) {
  const fieldName = `param_${parametro.id}`
  const label = parametro.unidad
    ? `${parametro.nombre} (${parametro.unidad})`
    : parametro.nombre

  return (
    <FormField label={label} error={error}>
      {parametro.tipo === 'NUMERICO' ? (
        <Input
          type="number"
          step="any"
          placeholder="0"
          {...register(fieldName)}
        />
      ) : parametro.tipo === 'TEXTO' ? (
        <Input type="text" placeholder="Ingrese valor…" {...register(fieldName)} />
      ) : (
        <div className="flex items-center gap-2 pt-1">
          <Controller
            name={fieldName}
            control={control}
            render={({ field }) => (
              <Switch
                checked={field.value ?? false}
                onCheckedChange={field.onChange}
              />
            )}
          />
          <span className="text-sm text-muted-foreground">
            {register(fieldName).value ? 'Sí' : 'No'}
          </span>
        </div>
      )}
    </FormField>
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
