import React, { useState, useMemo } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Spinner } from '@/components/ui/spinner'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertCircle,
  Pencil,
  Plus,
  Power,
  PowerOff,
  Printer,
  Star,
} from 'lucide-react'
import {
  useGetConfiguracionesEtiqueta,
  useCreateConfiguracionEtiqueta,
  useUpdateConfiguracionEtiqueta,
  useToggleConfiguracionEtiqueta,
  useSetPredeterminada,
} from '../hooks/useEtiquetas'
import type {
  ConfiguracionEtiquetaResponse,
  ConfiguracionEtiquetaRequest,
  TipoCodigo,
  DisposicionEtiqueta,
} from '@/types/api'

const TIPOS_CODIGO: { value: TipoCodigo; label: string }[] = [
  { value: 'DATAMATRIX', label: 'DataMatrix' },
  { value: 'CODE_128', label: 'Code 128' },
  { value: 'QR_CODE', label: 'QR Code' },
]

const DISPOSICIONES: { value: DisposicionEtiqueta; label: string; desc: string }[] = [
  { value: 'NOMBRE_CODIGO_ETIQUETA', label: 'Nombre - Codigo - Etiqueta', desc: 'Nombre arriba, codigo al centro, etiqueta abajo' },
  { value: 'CODIGO_NOMBRE_ETIQUETA', label: 'Codigo - Nombre - Etiqueta', desc: 'Codigo arriba, nombre y etiqueta abajo' },
  { value: 'CODIGO_ETIQUETA', label: 'Codigo - Etiqueta', desc: 'Solo codigo y etiqueta (sin nombre)' },
  { value: 'NOMBRE_ETIQUETA_CODIGO', label: 'Nombre - Etiqueta - Codigo', desc: 'Nombre y etiqueta arriba, codigo abajo' },
]

const DEFAULT_FORM: ConfiguracionEtiquetaRequest = {
  nombre: '',
  predeterminada: false,
  anchoMm: 0,
  altoMm: 0,
  dpi: 0,
  etiquetasPorFila: 0,
  margenIzquierdoMm: 0,
  margenSuperiorMm: 0,
  tipoCodigo: 'DATAMATRIX',
  moduloCodigo: 0,
  tamanoFuenteNombre: 0,
  tamanoFuenteEtiqueta: 0,
  espaciadoNombre: 0,
  espaciadoCodigo: 0,
  espaciadoEtiqueta: 0,
  mostrarNombre: true,
  mostrarCodigo: true,
  mostrarEtiqueta: true,
  disposicion: 'NOMBRE_CODIGO_ETIQUETA',
  filasPorPagina: 10,
  espacioHorizontalMm: 3.0,
  espacioVerticalMm: 2.0,
  margenPaginaSuperiorMm: 12.7,
  margenPaginaIzquierdoMm: 4.8,
}

function getOrdenElementos(disposicion: DisposicionEtiqueta): ('NOMBRE' | 'CODIGO' | 'ETIQUETA')[] {
  switch (disposicion) {
    case 'NOMBRE_CODIGO_ETIQUETA': return ['NOMBRE', 'CODIGO', 'ETIQUETA']
    case 'CODIGO_NOMBRE_ETIQUETA': return ['CODIGO', 'NOMBRE', 'ETIQUETA']
    case 'CODIGO_ETIQUETA': return ['CODIGO', 'ETIQUETA']
    case 'NOMBRE_ETIQUETA_CODIGO': return ['NOMBRE', 'ETIQUETA', 'CODIGO']
    default: return ['NOMBRE', 'CODIGO', 'ETIQUETA']
  }
}

function renderSingleLabel(
  form: ConfiguracionEtiquetaRequest,
  xOffset: number,
  scale: number,
  labelW: number,
  _labelH: number,
  idx: number,
) {
  const marginLeft = (form.margenIzquierdoMm || 0) * scale
  const marginTop = (form.margenSuperiorMm || 0) * scale
  const usableW = labelW - marginLeft * 2

  const fontNombre = (form.tamanoFuenteNombre || 14) * scale * 0.06
  const fontEtiqueta = (form.tamanoFuenteEtiqueta || 14) * scale * 0.06
  const moduloCodigo = form.moduloCodigo || 4
  const codeHeight = form.tipoCodigo === 'CODE_128'
    ? moduloCodigo * scale * 0.8
    : moduloCodigo * scale * 1.2
  const gapNombre = (form.espaciadoNombre || 0) * scale * 0.12
  const gapCodigo = (form.espaciadoCodigo || 0) * scale * 0.12
  const gapEtiqueta = (form.espaciadoEtiqueta || 0) * scale * 0.12

  const orden = getOrdenElementos(form.disposicion)
  const elements: React.ReactNode[] = []
  let y = marginTop

  for (const elem of orden) {
    if (elem === 'NOMBRE' && form.mostrarNombre) {
      elements.push(
        <text
          key={`n-${idx}-${y}`}
          x={xOffset + marginLeft + usableW / 2}
          y={y + fontNombre}
          textAnchor="middle"
          fontSize={fontNombre}
          fill="var(--foreground, #333)"
          fontFamily="monospace"
        >
          Juan Perez Lopez
        </text>
      )
      y += fontNombre + gapNombre
    } else if (elem === 'CODIGO' && form.mostrarCodigo) {
      const codeW = form.tipoCodigo === 'CODE_128' ? usableW * 0.85 : codeHeight
      const cx = xOffset + marginLeft + (usableW - codeW) / 2

      if (form.tipoCodigo === 'CODE_128') {
        const barCount = 20
        elements.push(
          <g key={`c-${idx}-${y}`}>
            {Array.from({ length: barCount }).map((_, i) => (
              <rect
                key={i}
                x={cx + i * (codeW / barCount)}
                y={y}
                width={codeW / (barCount * 2)}
                height={codeHeight}
                fill="var(--foreground, #333)"
              />
            ))}
          </g>
        )
      } else if (form.tipoCodigo === 'QR_CODE') {
        const qrSize = codeHeight
        const qrX = xOffset + marginLeft + (usableW - qrSize) / 2
        const cellSize = qrSize / 7
        elements.push(
          <g key={`c-${idx}-${y}`}>
            <rect x={qrX} y={y} width={qrSize} height={qrSize} fill="none" stroke="var(--foreground, #333)" strokeWidth="0.5" />
            {[0, 1, 2, 3, 4, 5, 6].map(row =>
              [0, 1, 2, 3, 4, 5, 6].map(col => (
                ((row < 3 && col < 3) || (row < 3 && col > 3) || (row > 3 && col < 3) || (row === 3 && col === 3)) &&
                <rect key={`${row}-${col}`} x={qrX + col * cellSize} y={y + row * cellSize} width={cellSize} height={cellSize} fill="var(--foreground, #333)" />
              ))
            )}
          </g>
        )
      } else {
        const dmSize = codeHeight
        const dmX = xOffset + marginLeft + (usableW - dmSize) / 2
        const cellSize = dmSize / 8
        elements.push(
          <g key={`c-${idx}-${y}`}>
            <rect x={dmX} y={y} width={dmSize} height={dmSize} fill="none" stroke="var(--foreground, #333)" strokeWidth="0.5" />
            {[0, 1, 2, 3, 4, 5, 6, 7].map(row =>
              [0, 1, 2, 3, 4, 5, 6, 7].map(col => (
                ((row + col) % 2 === 0 || row === 0 || col === 0) &&
                <rect key={`${row}-${col}`} x={dmX + col * cellSize} y={y + row * cellSize} width={cellSize} height={cellSize} fill="var(--foreground, #333)" opacity="0.7" />
              ))
            )}
          </g>
        )
      }
      y += codeHeight + gapCodigo
    } else if (elem === 'ETIQUETA' && form.mostrarEtiqueta) {
      elements.push(
        <text
          key={`e-${idx}-${y}`}
          x={xOffset + marginLeft + usableW / 2}
          y={y + fontEtiqueta}
          textAnchor="middle"
          fontSize={fontEtiqueta}
          fill="var(--foreground, #333)"
          fontFamily="monospace"
        >
          S/C-012600001/F4-L1
        </text>
      )
      y += fontEtiqueta + gapEtiqueta
    }
  }

  return elements
}

function LabelPreview({ form }: { form: ConfiguracionEtiquetaRequest }) {
  const count = form.etiquetasPorFila || 1
  const w = form.anchoMm || 30
  const h = form.altoMm || 20
  const gap = 1.5
  const scale = 8

  const labelW = w * scale
  const labelH = h * scale
  const gapPx = gap * scale
  const totalW = count * labelW + (count - 1) * gapPx
  const totalH = labelH

  const labels = useMemo(() => {
    const result: React.ReactNode[] = []
    for (let i = 0; i < count; i++) {
      const x = i * (labelW + gapPx)
      result.push(
        <g key={`label-${i}`}>
          <rect
            x={x}
            y={0}
            width={labelW}
            height={labelH}
            fill="var(--background, white)"
            stroke="var(--border, #ddd)"
            strokeWidth="1"
            rx="2"
          />
          {renderSingleLabel(form, x, scale, labelW, labelH, i)}
        </g>
      )
    }
    return result
  }, [
    form.anchoMm, form.altoMm, form.margenIzquierdoMm, form.margenSuperiorMm,
    form.tipoCodigo, form.moduloCodigo, form.tamanoFuenteNombre, form.tamanoFuenteEtiqueta,
    form.espaciadoNombre, form.espaciadoCodigo, form.espaciadoEtiqueta,
    form.mostrarNombre, form.mostrarCodigo, form.mostrarEtiqueta,
    form.disposicion, form.etiquetasPorFila,
    count, labelW, labelH, gapPx,
  ])

  return (
    <div className="w-full space-y-2">
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground text-center">
        Vista previa — {count} etiqueta{count > 1 ? 's' : ''} por fila
      </p>
      <div className="w-full rounded border border-border bg-muted/30 p-3 flex justify-center overflow-hidden">
        <svg
          className="block max-w-full h-auto"
          viewBox={`0 0 ${totalW} ${totalH}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ maxHeight: '180px' }}
        >
          {labels}
        </svg>
      </div>
      <p className="text-[10px] text-muted-foreground text-center">
        {w} x {h} mm &middot; {count} por fila
      </p>
    </div>
  )
}

function NumInput({
  id,
  value,
  placeholder,
  onChange,
  step,
  min,
  max,
}: {
  id: string
  value: number
  placeholder: string
  onChange: (v: number) => void
  step?: string
  min?: string
  max?: string
}) {
  return (
    <Input
      id={id}
      type="number"
      step={step}
      min={min}
      max={max}
      value={value || ''}
      placeholder={placeholder}
      onChange={(e) => {
        const raw = e.target.value
        if (raw === '') { onChange(0); return }
        const parsed = step ? parseFloat(raw) : parseInt(raw, 10)
        if (!isNaN(parsed)) onChange(parsed)
      }}
    />
  )
}

export default function EtiquetasConfigPanel() {
  const puedeEditar = useAuthStore((s) => s.hasPermiso('CONFIGURACION_EDITAR'))
  const { data: configuraciones = [], isLoading, isError } = useGetConfiguracionesEtiqueta()
  const createMutation = useCreateConfiguracionEtiqueta()
  const updateMutation = useUpdateConfiguracionEtiqueta()
  const toggleMutation = useToggleConfiguracionEtiqueta()
  const setPredMutation = useSetPredeterminada()

  const [openForm, setOpenForm] = useState(false)
  const [editTarget, setEditTarget] = useState<ConfiguracionEtiquetaResponse | null>(null)
  const [form, setForm] = useState<ConfiguracionEtiquetaRequest>({ ...DEFAULT_FORM })
  const [formError, setFormError] = useState('')

  const activas = configuraciones.filter((c) => c.activo)
  const inactivas = configuraciones.filter((c) => !c.activo)

  function openCreate() {
    setEditTarget(null)
    setForm({ ...DEFAULT_FORM })
    setFormError('')
    setOpenForm(true)
  }

  function openEdit(config: ConfiguracionEtiquetaResponse) {
    setEditTarget(config)
    setForm({
      nombre: config.nombre,
      predeterminada: config.predeterminada,
      anchoMm: config.anchoMm,
      altoMm: config.altoMm,
      dpi: config.dpi,
      etiquetasPorFila: config.etiquetasPorFila,
      margenIzquierdoMm: config.margenIzquierdoMm,
      margenSuperiorMm: config.margenSuperiorMm,
      tipoCodigo: config.tipoCodigo,
      moduloCodigo: config.moduloCodigo,
      tamanoFuenteNombre: config.tamanoFuenteNombre,
      tamanoFuenteEtiqueta: config.tamanoFuenteEtiqueta,
      espaciadoNombre: config.espaciadoNombre,
      espaciadoCodigo: config.espaciadoCodigo,
      espaciadoEtiqueta: config.espaciadoEtiqueta,
      mostrarNombre: config.mostrarNombre,
      mostrarCodigo: config.mostrarCodigo,
      mostrarEtiqueta: config.mostrarEtiqueta,
      disposicion: config.disposicion,
      filasPorPagina: config.filasPorPagina,
      espacioHorizontalMm: config.espacioHorizontalMm,
      espacioVerticalMm: config.espacioVerticalMm,
      margenPaginaSuperiorMm: config.margenPaginaSuperiorMm,
      margenPaginaIzquierdoMm: config.margenPaginaIzquierdoMm,
    })
    setFormError('')
    setOpenForm(true)
  }

  function handleSubmit() {
    if (!form.nombre.trim()) {
      setFormError('El nombre es obligatorio')
      return
    }
    if (!form.anchoMm || !form.altoMm) {
      setFormError('Debe definir el ancho y alto de la etiqueta')
      return
    }
    if (!form.dpi) {
      setFormError('Debe definir los DPI')
      return
    }
    if (!form.etiquetasPorFila) {
      setFormError('Debe definir las etiquetas por fila')
      return
    }
    if (!form.moduloCodigo) {
      setFormError('Debe definir el tamano del modulo del codigo')
      return
    }
    if (!form.tamanoFuenteNombre && form.mostrarNombre) {
      setFormError('Debe definir el tamano de fuente del nombre')
      return
    }
    if (!form.tamanoFuenteEtiqueta && form.mostrarEtiqueta) {
      setFormError('Debe definir el tamano de fuente de la etiqueta')
      return
    }
    if (!form.mostrarNombre && !form.mostrarCodigo && !form.mostrarEtiqueta) {
      setFormError('Debe seleccionar al menos un elemento a mostrar')
      return
    }
    setFormError('')

    if (editTarget) {
      updateMutation.mutate(
        { id: editTarget.id, dto: form },
        { onSuccess: () => setOpenForm(false), onError: (err: any) => setFormError(err?.response?.data?.message || 'Error al actualizar') }
      )
    } else {
      createMutation.mutate(form, {
        onSuccess: () => setOpenForm(false),
        onError: (err: any) => setFormError(err?.response?.data?.message || 'Error al crear'),
      })
    }
  }

  function updateField<K extends keyof ConfiguracionEtiquetaRequest>(key: K, value: ConfiguracionEtiquetaRequest[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
    setFormError('')
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  function renderRow(config: ConfiguracionEtiquetaResponse, dimmed = false) {
    const tipoLabel = TIPOS_CODIGO.find((t) => t.value === config.tipoCodigo)?.label ?? config.tipoCodigo
    const visibles: string[] = []
    if (config.mostrarNombre) visibles.push('Nombre')
    if (config.mostrarCodigo) visibles.push('Codigo')
    if (config.mostrarEtiqueta) visibles.push('Etiqueta')

    return (
      <TableRow key={config.id} className={dimmed ? 'opacity-60' : ''}>
        <TableCell className="font-medium">
          <div className="flex items-center gap-2">
            {config.nombre}
            {config.predeterminada && (
              <Badge variant="default" className="text-[10px] px-1.5 py-0">
                <Star className="h-3 w-3 mr-0.5" /> Predeterminada
              </Badge>
            )}
          </div>
        </TableCell>
        <TableCell className="text-center text-sm text-muted-foreground">
          {config.anchoMm} x {config.altoMm} mm
        </TableCell>
        <TableCell className="text-center text-sm text-muted-foreground">
          {tipoLabel}
        </TableCell>
        <TableCell className="hidden md:table-cell text-center text-sm text-muted-foreground">
          {visibles.join(', ')}
        </TableCell>
        <TableCell className="text-center">
          <Badge variant={config.activo ? 'default' : 'outline'} className="text-xs">
            {config.activo ? 'Activa' : 'Inactiva'}
          </Badge>
        </TableCell>
        <TableCell className="text-right">
          <div className="flex justify-end gap-1">
            {puedeEditar && !config.predeterminada && config.activo && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setPredMutation.mutate(config.id)}
                disabled={setPredMutation.isPending}
                title="Establecer como predeterminada"
                className="text-muted-foreground hover:text-amber-500"
              >
                <Star className="h-4 w-4" />
              </Button>
            )}
            {puedeEditar && (
              <Button variant="ghost" size="icon" onClick={() => openEdit(config)} title="Editar">
                <Pencil className="h-4 w-4" />
              </Button>
            )}
            {puedeEditar && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => toggleMutation.mutate(config.id)}
                disabled={toggleMutation.isPending}
                title={config.activo ? 'Desactivar' : 'Activar'}
                className={config.activo ? 'text-muted-foreground hover:text-destructive' : 'text-muted-foreground hover:text-green-600'}
              >
                {config.activo ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
              </Button>
            )}
          </div>
        </TableCell>
      </TableRow>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Printer className="h-5 w-5" />
              Configuracion de Etiquetas
            </CardTitle>
            <CardDescription>
              Define los tamanos de etiqueta y la disposicion de la informacion para la impresion de muestras.
            </CardDescription>
          </div>
          {puedeEditar && (
            <Button size="sm" onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Nueva configuracion
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {isLoading ? (
          <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
            <Spinner className="h-4 w-4" /> Cargando configuraciones...
          </div>
        ) : isError ? (
          <div className="p-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>No se pudieron cargar las configuraciones.</AlertDescription>
            </Alert>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead className="text-center">Tamano</TableHead>
                <TableHead className="text-center">Codigo</TableHead>
                <TableHead className="hidden md:table-cell text-center">Elementos</TableHead>
                <TableHead className="w-28 text-center">Estado</TableHead>
                <TableHead className="w-32 text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activas.map((c) => renderRow(c))}
              {inactivas.length > 0 && (
                <>
                  <TableRow>
                    <TableCell colSpan={6} className="bg-muted/30 py-1.5">
                      <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                        Inactivas ({inactivas.length})
                      </span>
                    </TableCell>
                  </TableRow>
                  {inactivas.map((c) => renderRow(c, true))}
                </>
              )}
              {configuraciones.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                    No hay configuraciones de etiqueta. Crea la primera para empezar a imprimir.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog open={openForm} onOpenChange={setOpenForm}>
        <DialogContent className="sm:max-w-2xl w-[95vw] max-h-[90vh] overflow-y-auto overflow-x-hidden">
          <DialogHeader>
            <DialogTitle>{editTarget ? 'Editar configuracion' : 'Nueva configuracion de etiqueta'}</DialogTitle>
            <DialogDescription>
              {editTarget
                ? `Modifica los parametros de "${editTarget.nombre}".`
                : 'Define los parametros de tamano, codigo y disposicion para un nuevo tipo de etiqueta.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Vista previa arriba, ancho completo */}
            <LabelPreview form={form} />

            <Separator />

            {/* Nombre */}
            <div className="space-y-1">
              <Label htmlFor="cfg-nombre">Nombre de la configuracion</Label>
              <Input
                id="cfg-nombre"
                placeholder="Ej. Etiqueta 33x22mm"
                value={form.nombre}
                maxLength={100}
                onChange={(e) => updateField('nombre', e.target.value)}
              />
            </div>

            <Separator />

            {/* Dimensiones */}
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Dimensiones</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4">
              <div className="space-y-1">
                <Label htmlFor="cfg-ancho">Ancho (mm)</Label>
                <NumInput id="cfg-ancho" value={form.anchoMm} placeholder="33" step="0.5" min="10" max="200" onChange={(v) => updateField('anchoMm', v)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="cfg-alto">Alto (mm)</Label>
                <NumInput id="cfg-alto" value={form.altoMm} placeholder="22" step="0.5" min="10" max="200" onChange={(v) => updateField('altoMm', v)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="cfg-dpi">DPI</Label>
                <NumInput id="cfg-dpi" value={form.dpi} placeholder="203" min="150" max="600" onChange={(v) => updateField('dpi', v)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="cfg-por-fila">Etiquetas/fila</Label>
                <NumInput id="cfg-por-fila" value={form.etiquetasPorFila} placeholder="3" min="1" max="12" onChange={(v) => updateField('etiquetasPorFila', v)} />
              </div>
            </div>

            {/* Margenes */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="cfg-margen-izq">Margen izquierdo (mm)</Label>
                <NumInput id="cfg-margen-izq" value={form.margenIzquierdoMm} placeholder="2.5" step="0.5" min="0" max="20" onChange={(v) => updateField('margenIzquierdoMm', v)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="cfg-margen-sup">Margen superior (mm)</Label>
                <NumInput id="cfg-margen-sup" value={form.margenSuperiorMm} placeholder="2" step="0.5" min="0" max="20" onChange={(v) => updateField('margenSuperiorMm', v)} />
              </div>
            </div>

            <Separator />

            {/* Codigo de barras */}
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Codigo de barras</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Tipo de codigo</Label>
                <Select value={form.tipoCodigo} onValueChange={(v) => updateField('tipoCodigo', v as TipoCodigo)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPOS_CODIGO.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="cfg-modulo">Tamano del modulo</Label>
                <NumInput id="cfg-modulo" value={form.moduloCodigo} placeholder="6" min="1" max="20" onChange={(v) => updateField('moduloCodigo', v)} />
              </div>
            </div>

            <Separator />

            {/* Tamanos de fuente */}
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Tamano de fuentes</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="cfg-font-nombre">Fuente del nombre (px)</Label>
                <NumInput id="cfg-font-nombre" value={form.tamanoFuenteNombre} placeholder="16" min="8" max="72" onChange={(v) => updateField('tamanoFuenteNombre', v)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="cfg-font-etiqueta">Fuente de la etiqueta (px)</Label>
                <NumInput id="cfg-font-etiqueta" value={form.tamanoFuenteEtiqueta} placeholder="16" min="8" max="72" onChange={(v) => updateField('tamanoFuenteEtiqueta', v)} />
              </div>
            </div>

            <Separator />

            {/* Espaciado entre elementos */}
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Espaciado entre elementos (dots)</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="space-y-1">
                <Label htmlFor="cfg-gap-nombre">Despues del nombre</Label>
                <NumInput id="cfg-gap-nombre" value={form.espaciadoNombre} placeholder="4" min="0" max="50" onChange={(v) => updateField('espaciadoNombre', v)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="cfg-gap-codigo">Despues del codigo</Label>
                <NumInput id="cfg-gap-codigo" value={form.espaciadoCodigo} placeholder="10" min="0" max="50" onChange={(v) => updateField('espaciadoCodigo', v)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="cfg-gap-etiqueta">Despues de la etiqueta</Label>
                <NumInput id="cfg-gap-etiqueta" value={form.espaciadoEtiqueta} placeholder="4" min="0" max="50" onChange={(v) => updateField('espaciadoEtiqueta', v)} />
              </div>
            </div>

            <Separator />

            {/* Elementos visibles */}
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Elementos visibles</p>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.mostrarNombre}
                  onChange={(e) => updateField('mostrarNombre', e.target.checked)}
                  className="h-4 w-4 rounded border-border"
                />
                <span className="text-sm">Nombre del paciente</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.mostrarCodigo}
                  onChange={(e) => updateField('mostrarCodigo', e.target.checked)}
                  className="h-4 w-4 rounded border-border"
                />
                <span className="text-sm">Codigo de barras</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.mostrarEtiqueta}
                  onChange={(e) => updateField('mostrarEtiqueta', e.target.checked)}
                  className="h-4 w-4 rounded border-border"
                />
                <span className="text-sm">Texto de etiqueta</span>
              </label>
            </div>

            <Separator />

            {/* Disposicion */}
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Disposicion (orden)</p>
            <div className="space-y-1">
              <Label>Orden de los elementos</Label>
              <Select value={form.disposicion} onValueChange={(v) => updateField('disposicion', v as DisposicionEtiqueta)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DISPOSICIONES.map((d) => (
                    <SelectItem key={d.value} value={d.value}>
                      <div>
                        <div>{d.label}</div>
                        <div className="text-xs text-muted-foreground">{d.desc}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Separator />

            <div className="space-y-1">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Configuración de página (impresora estándar)
              </Label>
              <p className="text-xs text-muted-foreground">
                Estos valores solo aplican al imprimir desde el navegador (hojas tipo Avery).
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Filas por página</Label>
                <Input type="number" min={1} max={30} value={form.filasPorPagina} onChange={(e) => updateField('filasPorPagina', Number(e.target.value))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Espacio horizontal (mm)</Label>
                <Input type="number" min={0} max={50} step={0.1} value={form.espacioHorizontalMm} onChange={(e) => updateField('espacioHorizontalMm', Number(e.target.value))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Espacio vertical (mm)</Label>
                <Input type="number" min={0} max={50} step={0.1} value={form.espacioVerticalMm} onChange={(e) => updateField('espacioVerticalMm', Number(e.target.value))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Margen superior página (mm)</Label>
                <Input type="number" min={0} max={50} step={0.1} value={form.margenPaginaSuperiorMm} onChange={(e) => updateField('margenPaginaSuperiorMm', Number(e.target.value))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Margen izquierdo página (mm)</Label>
                <Input type="number" min={0} max={50} step={0.1} value={form.margenPaginaIzquierdoMm} onChange={(e) => updateField('margenPaginaIzquierdoMm', Number(e.target.value))} />
              </div>
            </div>

            {formError && (
              <p className="flex items-center gap-1 text-xs text-destructive">
                <AlertCircle className="h-3 w-3" />
                {formError}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenForm(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={isPending}>
              {isPending ? 'Guardando...' : editTarget ? 'Actualizar' : 'Crear'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
