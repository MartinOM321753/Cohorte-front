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
  Ruler,
  Star,
} from 'lucide-react'
import { CalibracionDialog, type ResultadoVernier } from '@/components/print/CalibracionDialog'
import type { ResultadoCalibracion } from '@/components/print/HojaCalibracion'
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
  TipoMedio,
  TamanoHoja,
} from '@/types/api'
import { calcularCierre, PRESETS_HOJA } from './presetsHoja'

const TIPOS_CODIGO: { value: TipoCodigo; label: string }[] = [
  { value: 'DATAMATRIX', label: 'DataMatrix' },
  { value: 'CODE_128', label: 'Code 128' },
  { value: 'QR_CODE', label: 'QR Code' },
]

const DISPOSICIONES: { value: DisposicionEtiqueta; label: string; desc: string }[] = [
  { value: 'NOMBRE_CODIGO_ETIQUETA', label: 'Nombre - Código - Etiqueta', desc: 'Nombre arriba, código al centro, etiqueta abajo' },
  { value: 'CODIGO_NOMBRE_ETIQUETA', label: 'Código - Nombre - Etiqueta', desc: 'Código arriba, nombre y etiqueta abajo' },
  { value: 'CODIGO_ETIQUETA', label: 'Código - Etiqueta', desc: 'Solo código y etiqueta (sin nombre)' },
  { value: 'NOMBRE_ETIQUETA_CODIGO', label: 'Nombre - Etiqueta - Código', desc: 'Nombre y etiqueta arriba, código abajo' },
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
  anchoBarraCodigo: 2,
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
  tipoMedio: 'HOJA_AVERY',
  tamanoHoja: 'CARTA',
  // Cero significa "dedúcelo de tamaño + separación": una configuración nueva se
  // comporta como antes hasta que se capture el paso real de la hoja.
  pasoHorizontalMm: 0,
  pasoVerticalMm: 0,
  margenDerechoMm: 0,
  margenInferiorMm: 0,
  ajusteXMm: 0,
  ajusteYMm: 0,
  carrilesRollo: 0,
  anchoCabezalMm: 104.0,
  offsetLhXDots: 0,
  offsetLhYDots: 0,
}

/**
 * Pasa una configuración guardada al formulario que se manda al backend.
 *
 * Se centraliza porque el formulario tiene que llevar todos los campos: los que
 * no viaje se guardan con su valor por omisión y se pierde lo que hubiera. Ya
 * pasó con la sección de página, y volvería a pasar con el paso y la calibración.
 */
function configAFormulario(config: ConfiguracionEtiquetaResponse): ConfiguracionEtiquetaRequest {
  return {
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
    anchoBarraCodigo: config.anchoBarraCodigo ?? 2,
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
    tipoMedio: config.tipoMedio ?? 'HOJA_AVERY',
    tamanoHoja: config.tamanoHoja ?? 'CARTA',
    pasoHorizontalMm: config.pasoHorizontalMm ?? 0,
    pasoVerticalMm: config.pasoVerticalMm ?? 0,
    margenDerechoMm: config.margenDerechoMm ?? 0,
    margenInferiorMm: config.margenInferiorMm ?? 0,
    ajusteXMm: config.ajusteXMm ?? 0,
    ajusteYMm: config.ajusteYMm ?? 0,
    carrilesRollo: config.carrilesRollo ?? 0,
    anchoCabezalMm: config.anchoCabezalMm ?? 104.0,
    offsetLhXDots: config.offsetLhXDots ?? 0,
    offsetLhYDots: config.offsetLhYDots ?? 0,
  }
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
  const [calibrando, setCalibrando] = useState<ConfiguracionEtiquetaResponse | null>(null)

  /**
   * Guarda la corrección medida en el papel. Solo toca el paso y los ajustes:
   * el resto de la configuración viaja tal como estaba, porque el formulario
   * completo es lo que el backend espera y lo que no se manda se pierde.
   */
  function aplicarCalibracion(config: ConfiguracionEtiquetaResponse, r: ResultadoCalibracion) {
    updateMutation.mutate(
      {
        id: config.id,
        dto: {
          ...configAFormulario(config),
          pasoHorizontalMm: Number(r.pasoHorizontalMm.toFixed(2)),
          pasoVerticalMm: Number(r.pasoVerticalMm.toFixed(2)),
          ajusteXMm: Number(r.ajusteXMm.toFixed(2)),
          ajusteYMm: Number(r.ajusteYMm.toFixed(2)),
        },
      },
      { onSuccess: () => setCalibrando(null) },
    )
  }

  /**
   * Guarda el paso leído en la hoja vernier. A diferencia de la calibración, aquí
   * el paso no se deduce de una medición sino que el operador eligió la fila que
   * coincide con los troqueles, así que se toma tal cual.
   */
  function aplicarVernier(config: ConfiguracionEtiquetaResponse, r: ResultadoVernier) {
    updateMutation.mutate(
      {
        id: config.id,
        dto: {
          ...configAFormulario(config),
          pasoHorizontalMm: Number(r.pasoHorizontalMm.toFixed(2)),
          ajusteXMm: Number(r.ajusteXMm.toFixed(2)),
        },
      },
      { onSuccess: () => setCalibrando(null) },
    )
  }

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
    setForm(configAFormulario(config))
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
      setFormError('Debe definir el tamaño del módulo del código')
      return
    }
    if (!form.tamanoFuenteNombre && form.mostrarNombre) {
      setFormError('Debe definir el tamaño de fuente del nombre')
      return
    }
    if (!form.tamanoFuenteEtiqueta && form.mostrarEtiqueta) {
      setFormError('Debe definir el tamaño de fuente de la etiqueta')
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

  const esHoja = (form.tipoMedio ?? 'HOJA_AVERY') === 'HOJA_AVERY'

  /**
   * Vuelca un modelo del catálogo sobre el formulario.
   *
   * Solo toca la geometría: el código, las fuentes y la disposición son
   * decisiones del usuario que no dependen de qué hoja se compró, y pisarlas
   * obligaría a recapturarlas cada vez que se corrige el acomodo.
   */
  function aplicarPreset(id: string) {
    const p = PRESETS_HOJA.find((x) => x.id === id)
    if (!p) return
    setForm((prev) => ({
      ...prev,
      tipoMedio: 'HOJA_AVERY',
      tamanoHoja: p.tamanoHoja,
      anchoMm: p.anchoMm,
      altoMm: p.altoMm,
      etiquetasPorFila: p.columnas,
      filasPorPagina: p.filas,
      margenPaginaIzquierdoMm: p.margenPaginaIzquierdoMm,
      margenPaginaSuperiorMm: p.margenPaginaSuperiorMm,
      pasoHorizontalMm: p.pasoHorizontalMm,
      pasoVerticalMm: p.pasoVerticalMm,
      // El preset describe la hoja de fábrica; cualquier corrección medida
      // contra la impresora deja de ser válida y se reinicia.
      ajusteXMm: 0,
      ajusteYMm: 0,
      nombre: prev.nombre.trim() ? prev.nombre : p.nombre,
    }))
    setFormError('')
  }

  /** Sobrantes de la hoja con los valores capturados; sirve de comprobación. */
  const cierre = useMemo(() => {
    if (!esHoja || !form.anchoMm || !form.altoMm) return null
    const pasoH = form.pasoHorizontalMm || form.anchoMm + form.espacioHorizontalMm
    const pasoV = form.pasoVerticalMm || form.altoMm + form.espacioVerticalMm
    return calcularCierre(
      form.tamanoHoja ?? 'CARTA',
      form.anchoMm, form.altoMm,
      form.etiquetasPorFila, form.filasPorPagina,
      form.margenPaginaIzquierdoMm, form.margenPaginaSuperiorMm,
      pasoH, pasoV,
    )
  }, [esHoja, form])

  function renderRow(config: ConfiguracionEtiquetaResponse, dimmed = false) {
    const tipoLabel = TIPOS_CODIGO.find((t) => t.value === config.tipoCodigo)?.label ?? config.tipoCodigo
    const visibles: string[] = []
    if (config.mostrarNombre) visibles.push('Nombre')
    if (config.mostrarCodigo) visibles.push('Código')
    if (config.mostrarEtiqueta) visibles.push('Etiqueta')

    return (
      <TableRow key={config.id} className={dimmed ? 'opacity-60' : ''}>
        <TableCell className="font-medium">
          <div className="flex flex-wrap items-center gap-2">
            {config.nombre}
            <Badge variant="outline" className="px-1.5 py-0 text-[10px] font-normal">
              {config.tipoMedio === 'ROLLO_ZEBRA'
                ? `Rollo · ${config.carrilesRolloEfectivo || config.carrilesRollo || 1} carril(es)`
                : `Hoja · ${config.etiquetasPorFila}×${config.filasPorPagina}`}
            </Badge>
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
            {puedeEditar && config.activo && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCalibrando(config)}
                title="Calibrar contra la impresora"
                className="text-muted-foreground hover:text-sky-600"
              >
                <Ruler className="h-4 w-4" />
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
              Configuración de Etiquetas
            </CardTitle>
            <CardDescription>
              Define los tamaños de etiqueta y la disposición de la información para la impresión de muestras.
            </CardDescription>
          </div>
          {puedeEditar && (
            <Button size="sm" onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Nueva configuración
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
                <TableHead className="text-center">Tamaño</TableHead>
                <TableHead className="text-center">Código</TableHead>
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
                    No hay configuraciones de etiqueta. Cree la primera para empezar a imprimir.
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
            <DialogTitle>{editTarget ? 'Editar configuración' : 'Nueva configuración de etiqueta'}</DialogTitle>
            <DialogDescription>
              {editTarget
                ? `Modifica los parametros de "${editTarget.nombre}".`
                : 'Define los parámetros de tamaño, código y disposición para un nuevo tipo de etiqueta.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Vista previa arriba, ancho completo */}
            <LabelPreview form={form} />

            <Separator />

            {/* Nombre */}
            <div className="space-y-1">
              <Label htmlFor="cfg-nombre">Nombre de la configuración</Label>
              <Input
                id="cfg-nombre"
                placeholder="Ej. Etiqueta 33x22mm"
                value={form.nombre}
                maxLength={100}
                onChange={(e) => updateField('nombre', e.target.value)}
              />
            </div>

            <Separator />

            {/* Perfil: decide qué campos de acomodo tienen sentido. Antes una
                misma configuración servía a la hoja y al rollo, y campos como
                "etiquetas por fila" significaban dos cosas a la vez. */}
            <div className="grid grid-cols-1 gap-3 @sm:grid-cols-2">
              <div className="space-y-1">
                <Label className="text-xs">Tipo de medio</Label>
                <Select
                  value={form.tipoMedio ?? 'HOJA_AVERY'}
                  onValueChange={(v) => updateField('tipoMedio', v as TipoMedio)}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="HOJA_AVERY">Hoja de etiquetas (navegador)</SelectItem>
                    <SelectItem value="ROLLO_ZEBRA">Rollo Zebra (ZPL)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {esHoja && (
                <div className="space-y-1">
                  <Label className="text-xs">Partir de una hoja del catálogo</Label>
                  <Select value="" onValueChange={aplicarPreset}>
                    <SelectTrigger><SelectValue placeholder="Elegir modelo…" /></SelectTrigger>
                    <SelectContent>
                      {PRESETS_HOJA.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          <div>
                            <div>{p.nombre}</div>
                            <div className="text-[11px] text-muted-foreground">{p.equivalencias}</div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-muted-foreground">
                    Rellena tamaño, cuadrícula, paso y márgenes. Lo del código y las fuentes no se
                    toca.
                  </p>
                </div>
              )}
            </div>

            <Separator />

            {/* Dimensiones */}
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Dimensiones</p>
            <div className="grid grid-cols-1 gap-3 @sm:grid-cols-2 @md:grid-cols-4">
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
            </div>

            {/* Márgenes internos de la etiqueta: delimitan el área donde cabe el
                contenido. El derecho e inferior en cero se resuelven solos —el
                derecho toma el izquierdo y el inferior queda a cero— que es como
                se venía calculando antes de que estos campos existieran. */}
            <div className="grid grid-cols-2 gap-3 @md:grid-cols-4">
              <div className="space-y-1">
                <Label htmlFor="cfg-margen-izq">Margen izquierdo (mm)</Label>
                <NumInput id="cfg-margen-izq" value={form.margenIzquierdoMm} placeholder="2.5" step="0.1" min="0" max="20" onChange={(v) => updateField('margenIzquierdoMm', v)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="cfg-margen-der">Margen derecho (mm)</Label>
                <NumInput id="cfg-margen-der" value={form.margenDerechoMm ?? 0} placeholder="0" step="0.1" min="0" max="20" onChange={(v) => updateField('margenDerechoMm', v)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="cfg-margen-sup">Margen superior (mm)</Label>
                <NumInput id="cfg-margen-sup" value={form.margenSuperiorMm} placeholder="2" step="0.1" min="0" max="20" onChange={(v) => updateField('margenSuperiorMm', v)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="cfg-margen-inf">Margen inferior (mm)</Label>
                <NumInput id="cfg-margen-inf" value={form.margenInferiorMm ?? 0} placeholder="0" step="0.1" min="0" max="20" onChange={(v) => updateField('margenInferiorMm', v)} />
              </div>
            </div>

            <Separator />

            {/* Código de barras */}
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Código de barras</p>
            <div className="grid grid-cols-1 gap-3 @sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Tipo de código</Label>
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
                <Label htmlFor="cfg-modulo">Tamaño del módulo</Label>
                {/* El QR se imprime con ^BQN,2,<módulo> y esa magnificación solo
                    llega a 10; los demás códigos admiten el tope general. */}
                <NumInput
                  id="cfg-modulo"
                  value={form.moduloCodigo}
                  placeholder="6"
                  min="1"
                  max={form.tipoCodigo === 'QR_CODE' ? '10' : '60'}
                  onChange={(v) => updateField('moduloCodigo', v)}
                />
                <p className="text-[11px] text-muted-foreground">
                  {form.tipoCodigo === 'CODE_128' ? (
                    <>
                      En Code 128 este valor es la <strong>altura</strong> de las barras: a{' '}
                      {form.dpi || 203} dpi mide{' '}
                      {((form.moduloCodigo || 0) * 10 * 25.4 / (form.dpi || 203)).toFixed(1)} mm.
                      Máximo 60.
                    </>
                  ) : (
                    <>
                      Dots por módulo. A {form.dpi || 203} dpi, cada módulo mide{' '}
                      {((form.moduloCodigo || 0) * 25.4 / (form.dpi || 203)).toFixed(2)} mm.
                      {form.tipoCodigo === 'QR_CODE' ? ' Máximo 10 para QR.' : ' Máximo 60.'}
                    </>
                  )}
                </p>
              </div>

              {/* El ancho de barra es ^BY en ZPL: solo interviene en los códigos
                  lineales, en DataMatrix y QR el tamaño va en el módulo. */}
              {form.tipoCodigo === 'CODE_128' && (
                <div className="space-y-1">
                  <Label htmlFor="cfg-ancho-barra">Ancho de barra</Label>
                  <NumInput
                    id="cfg-ancho-barra"
                    value={form.anchoBarraCodigo}
                    placeholder="2"
                    min="1"
                    max="10"
                    onChange={(v) => updateField('anchoBarraCodigo', v)}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Dots de la barra angosta; es lo que ensancha el código. A{' '}
                    {form.dpi || 203} dpi, un código de 12 caracteres ocupa{' '}
                    {((11 * 12 + 35) * (form.anchoBarraCodigo || 2) * 25.4 / (form.dpi || 203)).toFixed(1)} mm
                    de ancho, sobre {((form.anchoMm || 0) - 2 * (form.margenIzquierdoMm || 0)).toFixed(1)} mm
                    disponibles. Máximo 10.
                  </p>
                </div>
              )}
            </div>

            <Separator />

            {/* Tamanos de fuente */}
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Tamaño de fuentes</p>
            <div className="grid grid-cols-1 gap-3 @sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="cfg-font-nombre">Fuente nombre (px)</Label>
                <NumInput id="cfg-font-nombre" value={form.tamanoFuenteNombre} placeholder="16" min="8" max="72" onChange={(v) => updateField('tamanoFuenteNombre', v)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="cfg-font-etiqueta">Fuente etiqueta (px)</Label>
                <NumInput id="cfg-font-etiqueta" value={form.tamanoFuenteEtiqueta} placeholder="16" min="8" max="72" onChange={(v) => updateField('tamanoFuenteEtiqueta', v)} />
              </div>
            </div>

            <Separator />

            {/* Espaciado entre elementos */}
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Espaciado entre elementos (dots)</p>
            <div className="grid grid-cols-1 gap-3 @sm:grid-cols-3">
              <div className="space-y-1">
                <Label htmlFor="cfg-gap-nombre">Tras el nombre</Label>
                <NumInput id="cfg-gap-nombre" value={form.espaciadoNombre} placeholder="4" min="0" max="50" onChange={(v) => updateField('espaciadoNombre', v)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="cfg-gap-codigo">Tras el código</Label>
                <NumInput id="cfg-gap-codigo" value={form.espaciadoCodigo} placeholder="10" min="0" max="50" onChange={(v) => updateField('espaciadoCodigo', v)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="cfg-gap-etiqueta">Tras la etiqueta</Label>
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
                <span className="text-sm">Código de barras</span>
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
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Disposición (orden)</p>
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

            {esHoja ? (
              <>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Acomodo en la hoja
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    El <strong>paso</strong> es la distancia de un borde de etiqueta al mismo borde
                    de la siguiente, no el hueco entre ellas. Es el dato que trae la ficha del
                    fabricante y el único que posiciona bien la cuadrícula.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 @md:grid-cols-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Tamaño de hoja</Label>
                    <Select
                      value={form.tamanoHoja ?? 'CARTA'}
                      onValueChange={(v) => updateField('tamanoHoja', v as TamanoHoja)}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CARTA">Carta (215.9 × 279.4 mm)</SelectItem>
                        <SelectItem value="A4">A4 (210 × 297 mm)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Filas por página</Label>
                    <Input type="number" min={1} max={30} value={form.filasPorPagina} onChange={(e) => updateField('filasPorPagina', Number(e.target.value))} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Columnas</Label>
                    <Input type="number" min={1} max={12} value={form.etiquetasPorFila} onChange={(e) => updateField('etiquetasPorFila', Number(e.target.value))} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Paso horizontal (mm)</Label>
                    <Input type="number" min={0} max={250} step={0.01} value={form.pasoHorizontalMm ?? 0} onChange={(e) => updateField('pasoHorizontalMm', Number(e.target.value))} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Paso vertical (mm)</Label>
                    <Input type="number" min={0} max={250} step={0.01} value={form.pasoVerticalMm ?? 0} onChange={(e) => updateField('pasoVerticalMm', Number(e.target.value))} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Margen izq. página (mm)</Label>
                    <Input type="number" min={0} max={50} step={0.01} value={form.margenPaginaIzquierdoMm} onChange={(e) => updateField('margenPaginaIzquierdoMm', Number(e.target.value))} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Margen sup. página (mm)</Label>
                    <Input type="number" min={0} max={50} step={0.01} value={form.margenPaginaSuperiorMm} onChange={(e) => updateField('margenPaginaSuperiorMm', Number(e.target.value))} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Ajuste X (mm)</Label>
                    <Input type="number" min={-20} max={20} step={0.01} value={form.ajusteXMm ?? 0} onChange={(e) => updateField('ajusteXMm', Number(e.target.value))} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Ajuste Y (mm)</Label>
                    <Input type="number" min={-20} max={20} step={0.01} value={form.ajusteYMm ?? 0} onChange={(e) => updateField('ajusteYMm', Number(e.target.value))} />
                  </div>
                </div>

                {/* Comprobación al vuelo: una hoja se troquela simétrica, así que
                    los sobrantes tienen que coincidir con los márgenes. */}
                {cierre && (
                  <Alert variant={cierre.simetrico ? 'default' : 'destructive'}>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-[12px]">
                      Con estos valores sobran <strong>{cierre.margenDerechoMm} mm</strong> a la
                      derecha y <strong>{cierre.margenInferiorMm} mm</strong> abajo.{' '}
                      {cierre.simetrico
                        ? 'Coinciden con los márgenes capturados, que es lo que se espera de una hoja troquelada.'
                        : 'No coinciden con los márgenes capturados. Las hojas se troquelan simétricas, así que probablemente el paso o algún margen esté mal.'}
                    </AlertDescription>
                  </Alert>
                )}
              </>
            ) : (
              <>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Rollo y cabezal
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    La Zebra avanza el papel por filas completas: los carriles deciden cuántas
                    etiquetas se consumen en cada avance, sin importar cuántas se manden.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 @md:grid-cols-4">
                  <div className="space-y-1">
                    <Label className="text-xs">Carriles del rollo</Label>
                    <Input type="number" min={1} max={12} value={form.carrilesRollo || 1} onChange={(e) => updateField('carrilesRollo', Number(e.target.value))} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Cabezal (mm)</Label>
                    <Input type="number" min={10} max={300} step={0.1} value={form.anchoCabezalMm ?? 104} onChange={(e) => updateField('anchoCabezalMm', Number(e.target.value))} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Origen X (dots)</Label>
                    <Input type="number" min={-600} max={600} value={form.offsetLhXDots ?? 0} onChange={(e) => updateField('offsetLhXDots', Number(e.target.value))} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Origen Y (dots)</Label>
                    <Input type="number" min={-600} max={600} value={form.offsetLhYDots ?? 0} onChange={(e) => updateField('offsetLhYDots', Number(e.target.value))} />
                  </div>
                </div>

                <p className="text-[11px] text-muted-foreground">
                  El origen (<code>^LH</code>) corrige dónde empieza a imprimir la Zebra. Sin él, el
                  formato hereda el que la impresora tenga guardado de un trabajo anterior, y el
                  margen izquierdo sale distinto en cada máquina. A {form.dpi || 203} dpi, 1 mm son{' '}
                  {Math.round((form.dpi || 203) / 25.4)} dots.
                </p>
              </>
            )}

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

      {calibrando && (
        <CalibracionDialog
          configuracion={calibrando}
          open
          onClose={() => setCalibrando(null)}
          onAplicar={(r) => aplicarCalibracion(calibrando, r)}
          onAplicarVernier={(r) => aplicarVernier(calibrando, r)}
          guardando={updateMutation.isPending}
        />
      )}
    </Card>
  )
}
