import { useCallback, useEffect, useMemo, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { ReactNode } from 'react'
import { AlertCircle, Check, ChevronsUpDown, ClipboardList, Info, Paperclip, Pencil, Plus, Trash2 } from 'lucide-react'

import { useAuthStore } from '@/stores/authStore'
import { DocumentosDialog } from '@/features/documentos/components/DocumentosDialog'
import {
  EstudioMedicoRequestDTO,
  ParametroEstudio,
  ResultadoEstudioRequestDTO,
} from '@/types/api'
import {
  useCreateEstudio,
  useDeleteEstudio,
  useGetEstudiosByPaciente,
  useGetEstudioById,
  useGetParametrosByTipo,
  useGetTiposEstudio,
  useUpdateEstudio,
} from '../hooks/useEstudios'
import { PacienteSearchCombobox } from '@/features/pacientes/components/PacienteSearchCombobox'
import { useGetConfiguracionHorarioActiva } from '@/features/configuracion/hooks/useHorarios'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { DateTimePicker, ultimoMomentoValido } from '@/components/ui/date-time-picker'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Spinner } from '@/components/ui/spinner'
import { Switch } from '@/components/ui/switch'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { cn } from '@/lib/utils'

// ──────────────────────────────────────────────────────────
// Local types
// ──────────────────────────────────────────────────────────
type ModoCaptura = 'NORMAL' | 'GRUPOS'

interface GrupoCaptura {
  /** Internal code sent to backend, e.g. "GRUPO_1" */
  grupoCodigo: string
  /** User-visible label, editable */
  grupoEtiqueta: string
  orden: number
  /** Values keyed by parametro.id */
  valores: Record<number, string | number | boolean>
}

// ──────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────
/** Formats a YYYY-MM-DDTHH:mm string as DD-MM-YYYY HH:mm for display */
function formatFechaDisplay(fecha: string | undefined | null): string {
  const s = String(fecha ?? '')
  if (!s || s.length < 10) return '—'
  const datePart = s.slice(0, 10)
  const [y, m, d] = datePart.split('-')
  const timePart = s.length >= 16 ? s.slice(11, 16) : ''
  return timePart ? `${d}-${m}-${y} ${timePart}` : `${d}-${m}-${y}`
}

/** Current local date+time as YYYY-MM-DDTHH:mm */
function nowString(): string {
  const d = new Date()
  const y = d.getFullYear()
  const mo = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const h = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  return `${y}-${mo}-${day}T${h}:${mi}`
}

// ──────────────────────────────────────────────────────────
// Dynamic schema builder
// ──────────────────────────────────────────────────────────
function buildResultadosSchema(parametros: ParametroEstudio[]) {
  const fields: Record<string, z.ZodTypeAny> = {
    pacienteUUID: z.string().min(1, 'Seleccione un participante'),
    idTipoEstudio: z.number().min(1, 'Seleccione una plantilla'),
    fechaEstudio: z.string()
      .min(1, 'La fecha y hora son requeridas')
      .refine((v) => {
        if (!v) return false
        return v <= nowString()
      }, 'No se permiten fechas u horas futuras'),
    observaciones: z.string().optional(),
  }
  for (const p of parametros) {
    if (p.tipo === 'NUMERICO') {
      fields[`param_${p.id}`] = z.preprocess(
        (v) => (v === '' || v === null || v === undefined ? undefined : Number(v)),
        z.number({ required_error: 'Requerido', invalid_type_error: 'Ingrese un número' }).finite('Ingrese un número válido')
      )
    } else if (p.tipo === 'BOOLEANO') {
      // false es un valor válido, por eso lleva default en vez de ser requerido
      fields[`param_${p.id}`] = z.boolean().default(false)
    } else {
      // TEXTO y TEXTO_OPCIONES se capturan como texto y son obligatorios.
      // El booleano queda reservado al tipo BOOLEANO explícito: si mañana se
      // añade un tipo nuevo, cae aquí y se ve como "Requerido", en lugar de
      // convertirse en booleano por accidente.
      fields[`param_${p.id}`] = z.string().min(1, 'Requerido')
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
  const puedeCrear = useAuthStore((s) => s.hasPermiso('ESTUDIOS_CREAR'))
  const puedeEditar = useAuthStore((s) => s.hasPermiso('ESTUDIOS_EDITAR'))
  const isAdmin  = useAuthStore((s) => s.hasPermiso('ESTUDIOS_ELIMINAR'))
  const canUploadEstudio = useAuthStore((s) => s.hasPermiso('DOCUMENTOS_SUBIR'))
  const { data: horarioActivo } = useGetConfiguracionHorarioActiva()

  // Valor inicial de la fecha: el reloj no sirve tal cual fuera del horario de
  // atención, porque esa hora no figura en el selector y el error solo salta al
  // enviar. Ver ultimoMomentoValido().
  const fechaPorDefecto = useCallback(() => ultimoMomentoValido(horarioActivo), [horarioActivo])

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

  const [openTipo, setOpenTipo] = useState(false)
  const [selectedPacienteUUID, setSelectedPacienteUUID] = useState('')
  const [selectedTipoId, setSelectedTipoId] = useState<number>(0)
  const [editingEstudioId, setEditingEstudioId] = useState<number | null>(null)
  const [docEstudioId, setDocEstudioId] = useState<number | null>(null)

  // ── Grupo mode state ──────────────────────────────────
  const [modoCaptura, setModoCaptura] = useState<ModoCaptura>('NORMAL')
  const [grupos, setGrupos] = useState<GrupoCaptura[]>([])
  const [gruposError, setGruposError] = useState<string | null>(null)

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
  const deleteMutation = useDeleteEstudio()

  const parametrosList: ParametroEstudio[] = parametros ?? []

  // In GRUPOS mode we don't use Zod for param fields — skip them in the schema to avoid blocking submit
  const schema = useMemo(
    () => buildResultadosSchema(modoCaptura === 'GRUPOS' ? [] : parametrosList),
    [parametrosList, modoCaptura]
  )

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
      fechaEstudio: fechaPorDefecto(),
      observaciones: '',
    },
  })

  const watchedFecha = watch('fechaEstudio') as string

  const tiposActivos = useMemo(() => (tipos || []).filter((t) => t.activo), [tipos])

  // When editing a study whose tipo is inactive, include it in the selector
  const tiposParaSelector = useMemo(() => {
    if (!editingEstudioId || selectedTipoId === 0) return tiposActivos
    const yaIncluido = tiposActivos.some((t) => t.id === selectedTipoId)
    if (yaIncluido) return tiposActivos
    const tipoDelEstudio = estudioEditar?.tipoEstudio
    if (tipoDelEstudio) {
      return [...tiposActivos, { ...tipoDelEstudio, activo: false }]
    }
    return tiposActivos
  }, [tiposActivos, editingEstudioId, selectedTipoId, estudioEditar])

  const [selectedPacienteNombre, setSelectedPacienteNombre] = useState('')
  const [selectedPacienteSexo, setSelectedPacienteSexo] = useState<'M' | 'F' | undefined>(undefined)

  // ── Pre-populate base fields when editing ──────────────
  useEffect(() => {
    if (!estudioEditar || !editingEstudioId) return
    setValue('pacienteUUID', estudioEditar.paciente?.uuid ?? '')
    setSelectedPacienteUUID(estudioEditar.paciente?.uuid ?? '')
    setSelectedPacienteSexo(estudioEditar.paciente?.sexo === 'M' ? 'M' : estudioEditar.paciente?.sexo === 'F' ? 'F' : undefined)
    const tipoId = estudioEditar.tipoEstudio?.id ?? 0
    setValue('idTipoEstudio', tipoId)
    setSelectedTipoId(tipoId)
    setValue('fechaEstudio', String(estudioEditar.fechaEstudio ?? '').slice(0, 16))
    setValue('observaciones', estudioEditar.observaciones ?? '')
  }, [estudioEditar, editingEstudioId, setValue])

  // ── Pre-populate result values when editing (normal mode) ──
  useEffect(() => {
    if (!estudioEditar || !parametrosList.length || !editingEstudioId) return

    const resultados = estudioEditar.resultados ?? []
    const conGrupo = resultados.filter((r) => r.grupoCodigo && r.grupoCodigo !== 'ROOT')

    if (conGrupo.length > 0) {
      // ── Group mode: reconstruct grupos from resultados ──
      setModoCaptura('GRUPOS')
      const gruposMap = new Map<string, GrupoCaptura>()

      for (const resultado of conGrupo) {
        const codigo = resultado.grupoCodigo!
        if (!gruposMap.has(codigo)) {
          gruposMap.set(codigo, {
            grupoCodigo: codigo,
            grupoEtiqueta: resultado.grupoEtiqueta ?? codigo,
            orden: resultado.orden ?? gruposMap.size + 1,
            valores: {},
          })
        }
        const param = parametrosList.find((p) => p.nombre === resultado.parametro)
        if (!param) continue
        const grupo = gruposMap.get(codigo)!
        const val =
          param.tipo === 'NUMERICO'
            ? (resultado.valorNumerico ?? '')
            : param.tipo === 'BOOLEANO'
              ? (resultado.valorBooleano ?? false)
              : (resultado.valorTexto ?? '')
        grupo.valores[param.id] = val
      }

      setGrupos([...gruposMap.values()].sort((a, b) => a.orden - b.orden))
    } else {
      // ── Normal mode: fill react-hook-form fields ──
      setModoCaptura('NORMAL')
      for (const resultado of resultados) {
        const param = parametrosList.find((p) => p.nombre === resultado.parametro)
        if (!param) continue
        if (param.tipo === 'NUMERICO') setValue(`param_${param.id}`, resultado.valorNumerico ?? '')
        else if (param.tipo === 'BOOLEANO') setValue(`param_${param.id}`, resultado.valorBooleano ?? false)
        else setValue(`param_${param.id}`, resultado.valorTexto ?? '')
      }
    }
  }, [estudioEditar, parametrosList, editingEstudioId, setValue])

  // ── Grupo management helpers ───────────────────────────
  function addGrupo() {
    setGrupos((prev) => {
      const n = prev.length + 1
      return [
        ...prev,
        { grupoCodigo: `GRUPO_${n}`, grupoEtiqueta: `Grupo ${n}`, orden: n, valores: {} },
      ]
    })
  }

  function removeGrupo(index: number) {
    setGrupos((prev) =>
      prev
        .filter((_, i) => i !== index)
        .map((g, i) => ({ ...g, orden: i + 1, grupoCodigo: `GRUPO_${i + 1}` }))
    )
  }

  function setGrupoEtiqueta(index: number, etiqueta: string) {
    setGrupos((prev) => prev.map((g, i) => (i === index ? { ...g, grupoEtiqueta: etiqueta } : g)))
  }

  function setGrupoValor(grupoIndex: number, parametroId: number, valor: string | number | boolean) {
    setGrupos((prev) =>
      prev.map((g, i) =>
        i === grupoIndex ? { ...g, valores: { ...g.valores, [parametroId]: valor } } : g
      )
    )
  }


  // ── Build resultados payload ───────────────────────────
  function buildResultados(data: LlenadoForm): ResultadoEstudioRequestDTO[] {
    if (modoCaptura === 'NORMAL') {
      return parametrosList
        .map((p) => {
          const val = data[`param_${p.id}`]
          if (val === undefined || val === null || val === '') return null
          return {
            idParametro: p.id,
            valorNumerico: p.tipo === 'NUMERICO' ? Number(val) : undefined,
            // TEXTO_OPCIONES viaja como texto, igual que TEXTO
            valorTexto: p.tipo === 'TEXTO' || p.tipo === 'TEXTO_OPCIONES' ? String(val) : undefined,
            valorBooleano: p.tipo === 'BOOLEANO' ? Boolean(val) : undefined,
          }
        })
        .filter(Boolean) as ResultadoEstudioRequestDTO[]
    }

    // GRUPOS
    return grupos.flatMap((grupo) =>
      parametrosList
        .map((p) => {
          const val = grupo.valores[p.id]
          if (val === undefined || val === null || val === '') return null
          return {
            idParametro: p.id,
            valorNumerico: p.tipo === 'NUMERICO' ? Number(val) : undefined,
            // TEXTO_OPCIONES viaja como texto, igual que TEXTO
            valorTexto: p.tipo === 'TEXTO' || p.tipo === 'TEXTO_OPCIONES' ? String(val) : undefined,
            valorBooleano: p.tipo === 'BOOLEANO' ? Boolean(val) : undefined,
            grupoCodigo: grupo.grupoCodigo,
            grupoEtiqueta: grupo.grupoEtiqueta,
            orden: grupo.orden,
          }
        })
        .filter(Boolean) as ResultadoEstudioRequestDTO[]
    )
  }

  // ── Reset ──────────────────────────────────────────────
  /** Reset form but keep the selected patient. */
  function resetForm() {
    reset({
      pacienteUUID: selectedPacienteUUID,
      idTipoEstudio: 0,
      fechaEstudio: fechaPorDefecto(),
      observaciones: '',
    })
    setSelectedTipoId(0)
    setEditingEstudioId(null)
    setModoCaptura('NORMAL')
    setGrupos([])
    setGruposError(null)
  }

  function cambiarParticipante() {
    resetForm()
    setSelectedPacienteUUID('')
    setSelectedPacienteNombre('')
    setSelectedPacienteSexo(undefined)
    reset({ pacienteUUID: '', idTipoEstudio: 0, fechaEstudio: fechaPorDefecto(), observaciones: '' })
  }

  /**
   * Post-submit reset — keeps the selected patient so the user can keep
   * registering studies for the same person without searching again.
   */
  function resetFormAfterSubmit() {
    reset({
      pacienteUUID: selectedPacienteUUID,   // ← keep patient
      idTipoEstudio: 0,
      fechaEstudio: fechaPorDefecto(),
      observaciones: '',
    })
    setSelectedTipoId(0)
    setEditingEstudioId(null)
    setModoCaptura('NORMAL')
    setGrupos([])
    setGruposError(null)
  }

  // ── Submit ─────────────────────────────────────────────
  function onSubmit(data: LlenadoForm) {
    // Validate grupos mode
    if (modoCaptura === 'GRUPOS') {
      if (grupos.length === 0) {
        setGruposError('Agregue al menos un grupo.')
        return
      }
      // Un grupo es el mismo conjunto de parámetros repetido, así que rigen las
      // mismas reglas que en modo normal: todo obligatorio salvo BOOLEANO, donde
      // false es un valor válido y por eso nunca está "sin capturar".
      for (const g of grupos) {
        const faltante = parametrosList.find((p) => {
          if (p.tipo === 'BOOLEANO') return false
          const v = g.valores[p.id]
          return v === undefined || v === null || String(v).trim() === ''
        })
        if (faltante) {
          const etiqueta = g.grupoEtiqueta?.trim() || g.grupoCodigo
          setGruposError(`Falta capturar "${faltante.nombre}" en el grupo "${etiqueta}".`)
          return
        }
      }
      setGruposError(null)
    }

    const resultados = buildResultados(data)

    if (resultados.length === 0) {
      setGruposError('Ingrese al menos un resultado antes de guardar.')
      return
    }

    const payload: EstudioMedicoRequestDTO = {
      pacienteUUID: selectedPacienteUUID,
      usuarioRealizaUUID: userUuid,
      idTipoEstudio: Number(data.idTipoEstudio),
      fechaEstudio: data.fechaEstudio as string,
      observaciones: (data.observaciones as string)?.trim() || undefined,
      resultados,
    }

    if (editingEstudioId) {
      updateMutation.mutate(payload, { onSuccess: resetFormAfterSubmit })
    } else {
      createMutation.mutate(payload, { onSuccess: resetFormAfterSubmit })
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  const showForm = puedeCrear || (puedeEditar && !!editingEstudioId)

  return (
    <div className="space-y-4">
      {!showForm && (
        <div className="flex items-center gap-2 max-w-md">
          <PacienteSearchCombobox
            value={selectedPacienteUUID || null}
            onChange={(uuid) => setSelectedPacienteUUID(uuid)}
            onSelectPaciente={(p) => {
              const nombre = [p.persona?.nombre, p.persona?.segundoNombre, p.persona?.apellidoPaterno, p.persona?.apellidoMaterno]
                .filter(Boolean).join(' ')
              setSelectedPacienteNombre(nombre)
              setSelectedPacienteSexo(p.persona?.sexo)
            }}
            placeholder="Buscar participante por folio, nombre o CURP…"
            variant="search"
            className="flex-1"
          />
          {selectedPacienteUUID && (
            <Button type="button" variant="outline" size="sm" className="shrink-0 text-xs" onClick={cambiarParticipante}>
              Cambiar
            </Button>
          )}
        </div>
      )}

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
      <Card className={showForm ? 'lg:col-span-3' : 'lg:col-span-5'}>
        <div className="flex items-center justify-between gap-3 border-b p-4">
          <div className="space-y-0.5">
            <div className="text-sm font-medium">Historial del participante</div>
            <div className="text-xs text-muted-foreground">
              {selectedPacienteUUID
                ? `Estudios de ${selectedPacienteNombre || '…'}`
                : 'Seleccione un participante para ver su historial.'}
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
              Busca un participante para ver su historial.
            </div>
          ) : isLoadingHistorial ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Spinner /> Cargando historial…
            </div>
          ) : (historial ?? []).length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Sin estudios registrados para este participante.
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
                      {formatFechaDisplay(String(e.fechaEstudio))}
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
                        {puedeEditar && (
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
                        )}
                        {isAdmin && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive hover:text-destructive"
                                disabled={deleteMutation.isPending}
                                title="Eliminar estudio"
                              >
                                <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>¿Eliminar este estudio?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Se eliminarán todos sus resultados y documentos adjuntos. Esta acción no se puede deshacer.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteMutation.mutate(e.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Eliminar
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
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
      {(puedeCrear || (puedeEditar && editingEstudioId)) && <Card className="lg:col-span-2">
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
          <FormField label="Participante" required error={errors.pacienteUUID?.message as string}>
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <PacienteSearchCombobox
                  value={selectedPacienteUUID}
                  onChange={(uuid) => {
                    setSelectedPacienteUUID(uuid)
                    setValue('pacienteUUID', uuid)
                  }}
                  onSelectPaciente={(p) => {
                    const nombre = [p.persona?.nombre, p.persona?.segundoNombre, p.persona?.apellidoPaterno, p.persona?.apellidoMaterno]
                      .filter(Boolean).join(' ')
                    setSelectedPacienteNombre(nombre)
                    setSelectedPacienteSexo(p.persona?.sexo)
                  }}
                  disabled={!!editingEstudioId}
                />
              </div>
              {selectedPacienteUUID && !editingEstudioId && (
                <Button type="button" variant="outline" size="sm" className="shrink-0 text-xs" onClick={cambiarParticipante}>
                  Cambiar
                </Button>
              )}
            </div>
          </FormField>

          {/* Plantilla — combobox con búsqueda */}
          <FormField
            label="Plantilla (tipo de estudio)"
            required
            error={errors.idTipoEstudio?.message as string}
          >
            <Popover open={openTipo} onOpenChange={setOpenTipo}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  role="combobox"
                  aria-expanded={openTipo}
                  className="w-full justify-between text-sm"
                  disabled={isLoadingTipos || !!editingEstudioId}
                >
                  <span className="truncate">
                    {selectedTipoId > 0
                      ? tiposParaSelector.find((t) => t.id === selectedTipoId)?.nombre ?? '…'
                      : isLoadingTipos
                        ? 'Cargando…'
                        : 'Buscar plantilla…'}
                  </span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Buscar plantilla…" />
                  <CommandList>
                    <CommandEmpty>No se encontró la plantilla.</CommandEmpty>
                    <CommandGroup>
                      {tiposParaSelector.map((t) => (
                        <CommandItem
                          key={t.id}
                          value={t.nombre}
                          onSelect={() => {
                            setSelectedTipoId(t.id)
                            setValue('idTipoEstudio', t.id)
                            setEditingEstudioId(null)
                            const modo = (t.tipoCapturaDefecto as ModoCaptura) || 'NORMAL'
                            setModoCaptura(modo)
                            setGrupos(modo === 'GRUPOS'
                              ? [{ grupoCodigo: 'GRUPO_1', grupoEtiqueta: 'Grupo 1', orden: 1, valores: {} }]
                              : [])
                            setGruposError(null)
                            setOpenTipo(false)
                          }}
                        >
                          <Check
                            className={cn(
                              'mr-2 h-4 w-4 shrink-0',
                              selectedTipoId === t.id ? 'opacity-100' : 'opacity-0'
                            )}
                          />
                          {t.nombre}
                          {!t.activo && (
                            <span className="ml-2 text-[11px] text-muted-foreground">(deshabilitado)</span>
                          )}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </FormField>

          {/* Descripción de la plantilla */}
          {selectedTipoId > 0 && (() => {
            const tipoDesc = tiposParaSelector.find((t) => t.id === selectedTipoId)?.descripcion
            if (!tipoDesc) return null
            return (
              <div className="flex items-start gap-2 rounded-md border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" strokeWidth={1.75} />
                <span>{tipoDesc}</span>
              </div>
            )
          })()}

          {/* Fecha */}
          <FormField label="Fecha y hora del estudio" required error={errors.fechaEstudio?.message as string}>
            <input type="hidden" {...register('fechaEstudio')} />
            <DateTimePicker
              value={watchedFecha}
              onChange={(v) => setValue('fechaEstudio', v, { shouldValidate: true })}
              placeholder="Selecciona fecha y hora"
              timeStepMinutes={1}
              maxDateTime={new Date()}
              minHour={horarioActivo?.horaInicio ?? 8}
              maxHour={(horarioActivo?.horaFin ?? 17) - 1}
              disabledDaysOfWeek={disabledDaysOfWeek}
            />
          </FormField>

          {/* Dynamic parameters section */}
          {selectedTipoId > 0 && (
            <>
              <Separator />

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
                  {/* Mode indicator (locked to tipo's default) */}
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Resultados</Label>
                    <Badge variant="outline" className="text-[10px]">
                      {modoCaptura === 'GRUPOS' ? 'Por grupos' : 'Normal'}
                    </Badge>
                  </div>

                  {/* ── NORMAL MODE ── */}
                  {modoCaptura === 'NORMAL' && (
                    <div className="space-y-3">
                      {parametrosList.map((p) => (
                        <ParametroInput
                          key={p.id}
                          parametro={p}
                          sexo={selectedPacienteSexo}
                          register={register}
                          control={control}
                          error={errors[`param_${p.id}`]?.message as string | undefined}
                        />
                      ))}
                    </div>
                  )}

                  {/* ── GRUPOS MODE ── */}
                  {modoCaptura === 'GRUPOS' && (
                    <div className="space-y-3">
                      {grupos.map((grupo, idx) => (
                        <Card key={grupo.grupoCodigo} className="p-3 space-y-3">
                          {/* Group header */}
                          <div className="flex items-center gap-2">
                            <Input
                              value={grupo.grupoEtiqueta}
                              onChange={(e) => setGrupoEtiqueta(idx, e.target.value)}
                              maxLength={100}
                              className="h-7 text-sm font-medium"
                              placeholder="Nombre del grupo"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 shrink-0"
                              title="Eliminar grupo"
                              onClick={() => removeGrupo(idx)}
                              disabled={grupos.length === 1}
                            >
                              <Trash2 className="h-3.5 w-3.5 text-destructive" strokeWidth={1.75} />
                            </Button>
                          </div>
                          <Separator />
                          {/* Parameters for this group */}
                          <div className="space-y-3">
                            {parametrosList.map((p) => (
                              <ParametroInput
                                key={p.id}
                                parametro={p}
                                sexo={selectedPacienteSexo}
                                standaloneValue={grupo.valores[p.id]}
                                onStandaloneChange={(val) => setGrupoValor(idx, p.id, val)}
                              />
                            ))}
                          </div>
                        </Card>
                      ))}

                      {/* Grupos error */}
                      {gruposError && (
                        <p className="flex items-center gap-1.5 text-xs text-destructive">
                          <AlertCircle className="size-3.5 shrink-0" />
                          {gruposError}
                        </p>
                      )}

                      {/* Add group button */}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addGrupo}
                        className="w-full"
                      >
                        <Plus className="mr-1 h-4 w-4" />
                        Agregar grupo
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* Observaciones */}
          <FormField label="Observaciones" error={errors.observaciones?.message as string}>
            <Textarea placeholder="Notas clínicas relevantes…" rows={2} maxLength={500} {...register('observaciones')} />
            {(watch('observaciones') as string)?.length > 400 && (
              <p className="text-[11px] text-muted-foreground text-right">
                {(watch('observaciones') as string).length}/500
              </p>
            )}
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
      </Card>}
    </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────
// Dynamic parameter input
// Supports two modes:
//   - Form mode (react-hook-form): pass register + control
//   - Standalone mode (local state / grupos): pass standaloneValue + onStandaloneChange
// ──────────────────────────────────────────────────────────
function ParametroInput({
  parametro,
  sexo,
  register,
  control,
  error,
  standaloneValue,
  onStandaloneChange,
}: {
  parametro: ParametroEstudio
  /** Sexo del paciente — determina qué rango de referencia (hombres/mujeres) aplicar */
  sexo?: 'M' | 'F'
  // Form mode props
  register?: any
  control?: any
  error?: string
  // Standalone mode props
  standaloneValue?: string | number | boolean
  onStandaloneChange?: (val: string | number | boolean) => void
}) {
  const fieldName = `param_${parametro.id}`
  const label = parametro.unidad
    ? `${parametro.nombre} (${parametro.unidad})`
    : parametro.nombre
  const isStandalone = onStandaloneChange !== undefined

  // Rango de referencia según sexo del paciente (por defecto, mujeres, si no se conoce el sexo)
  const min = sexo === 'M' ? parametro.valorMinHombres : parametro.valorMinMujeres
  const max = sexo === 'M' ? parametro.valorMaxHombres : parametro.valorMaxMujeres

  // Out-of-range warning for NUMERICO params with defined reference range
  const rangeWarning = (() => {
    if (parametro.tipo !== 'NUMERICO') return null
    if (min == null && max == null) return null
    const raw = isStandalone ? standaloneValue : undefined   // form mode: no live access here
    const num = raw !== undefined && raw !== '' ? Number(raw) : NaN
    if (Number.isNaN(num)) return null
    if (min != null && num < min) return `Valor por debajo del mínimo de referencia (${min})`
    if (max != null && num > max) return `Valor supera el máximo de referencia (${max})`
    return null
  })()

  // Reference range label shown as hint
  const rangeHint = (() => {
    if (parametro.tipo !== 'NUMERICO') return null
    if (min == null && max == null) return null
    if (min != null && max != null) return `Ref: ${min} – ${max}${parametro.unidad ? ' ' + parametro.unidad : ''}`
    if (min != null) return `Ref: ≥ ${min}${parametro.unidad ? ' ' + parametro.unidad : ''}`
    return `Ref: ≤ ${max}${parametro.unidad ? ' ' + parametro.unidad : ''}`
  })()

  return (
    <FormField label={label} error={error} hint={rangeHint ?? undefined}>
      {parametro.tipo === 'NUMERICO' ? (
        isStandalone ? (
          <Input
            type="number"
            step="any"
            placeholder="0"
            value={standaloneValue as number | string ?? ''}
            onChange={(e) => onStandaloneChange!(e.target.value)}
          />
        ) : (
          <Input
            type="number"
            step="any"
            placeholder="0"
            {...register(fieldName)}
          />
        )
      ) : parametro.tipo === 'TEXTO' ? (
        isStandalone ? (
          <Input
            type="text"
            placeholder="Ingrese valor…"
            maxLength={255}
            value={standaloneValue as string ?? ''}
            onChange={(e) => onStandaloneChange!(e.target.value)}
          />
        ) : (
          <Input type="text" placeholder="Ingrese valor…" maxLength={255} {...register(fieldName)} />
        )
      ) : parametro.tipo === 'TEXTO_OPCIONES' ? (
        // Selección de opción predefinida
        isStandalone ? (
          <Select
            value={String(standaloneValue ?? '')}
            onValueChange={(v) => onStandaloneChange!(v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Seleccione una opción…" />
            </SelectTrigger>
            <SelectContent>
              {(parametro.opciones ?? []).map((op) => (
                <SelectItem key={op} value={op}>{op}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Controller
            name={fieldName}
            control={control}
            render={({ field }) => (
              <Select value={field.value ?? ''} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione una opción…" />
                </SelectTrigger>
                <SelectContent>
                  {(parametro.opciones ?? []).map((op) => (
                    <SelectItem key={op} value={op}>{op}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        )
      ) : (
        // BOOLEANO
        <div className="flex items-center gap-2 pt-1">
          {isStandalone ? (
            <Switch
              checked={Boolean(standaloneValue)}
              onCheckedChange={(checked) => onStandaloneChange!(checked)}
            />
          ) : (
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
          )}
          <span className="text-sm text-muted-foreground">
            {isStandalone ? (standaloneValue ? 'Sí' : 'No') : 'Sí / No'}
          </span>
        </div>
      )}
      {rangeWarning && (
        <p className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
          <AlertCircle className="size-3.5 shrink-0" />
          {rangeWarning}
        </p>
      )}
    </FormField>
  )
}

function FormField({
  label,
  required,
  error,
  hint,
  children,
}: {
  label: string
  required?: boolean
  error?: string
  hint?: string
  children: ReactNode
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-sm">
          {label}
          {required && <span className="ml-1 text-destructive">*</span>}
        </Label>
        {hint && (
          <span className="text-[11px] text-muted-foreground font-mono">{hint}</span>
        )}
      </div>
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
