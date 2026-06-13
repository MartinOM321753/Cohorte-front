import { useEffect, useState } from 'react'
import { Loader2, Save } from 'lucide-react'

import type {
  MuestraDetalleDTO,
  EstudioMuestraResponse,
  ParametroEstudioMuestra,
  ResultadoEstudioMuestraRequestDTO,
} from '@/types/api'
import { useUpdateEstudioMuestra } from '../hooks/useEstudiosMuestra'
import { useAuthStore } from '@/stores/authStore'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

type ValorParametro = string | number | boolean | undefined

function ParametroField({
  parametro,
  valor,
  onChange,
}: {
  parametro: ParametroEstudioMuestra
  valor: ValorParametro
  onChange: (val: ValorParametro) => void
}) {
  const label = parametro.unidad
    ? `${parametro.nombre} (${parametro.unidad})`
    : parametro.nombre

  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      {parametro.tipo === 'NUMERICO' && (
        <Input
          type="number"
          step="any"
          placeholder="0"
          value={valor as string ?? ''}
          onChange={e => onChange(e.target.value)}
          className="h-9 text-sm"
        />
      )}
      {parametro.tipo === 'TEXTO' && (
        <Input
          type="text"
          placeholder="Ingrese valor…"
          value={valor as string ?? ''}
          onChange={e => onChange(e.target.value)}
          className="h-9 text-sm"
        />
      )}
      {parametro.tipo === 'TEXTO_OPCIONES' && (
        <Select value={String(valor ?? '')} onValueChange={v => onChange(v)}>
          <SelectTrigger className="h-9 text-sm">
            <SelectValue placeholder="Seleccione una opción…" />
          </SelectTrigger>
          <SelectContent>
            {(parametro.opciones ?? []).map(op => (
              <SelectItem key={op} value={op}>{op}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      {parametro.tipo === 'BOOLEANO' && (
        <div className="flex items-center gap-2 h-9">
          <Switch checked={Boolean(valor)} onCheckedChange={v => onChange(v)} />
          <span className="text-sm text-muted-foreground">{Boolean(valor) ? 'Sí' : 'No'}</span>
        </div>
      )}
    </div>
  )
}

interface Props {
  estudio: EstudioMuestraResponse
  muestra: MuestraDetalleDTO
  onSuccess: () => void
  onCancel: () => void
}

export function EdicionEstudioMuestraForm({ estudio, muestra, onSuccess, onCancel }: Props) {
  const { mutate: actualizarEstudio, isPending } = useUpdateEstudioMuestra(muestra.id)
  const user = useAuthStore(s => s.user)

  const parametros: ParametroEstudioMuestra[] = estudio.tipoEstudioMuestra?.parametros ?? []

  const [cantidadConsumida, setCantidadConsumida] = useState(
    estudio.cantidadConsumida != null ? String(estudio.cantidadConsumida) : ''
  )
  const [observaciones, setObservaciones] = useState(estudio.observaciones ?? '')
  const [valores, setValores] = useState<Record<number, ValorParametro>>({})
  const [error, setError] = useState('')

  const consumoAnterior = estudio.cantidadConsumida ?? 0
  const valorDisponible = (muestra.valor ?? 0) + consumoAnterior

  useEffect(() => {
    const init: Record<number, ValorParametro> = {}
    for (const p of parametros) {
      const existente = (estudio.resultados ?? []).find(r => r.idParametro === p.id)
      if (existente) {
        if (p.tipo === 'NUMERICO') init[p.id] = existente.valorNumerico != null ? String(existente.valorNumerico) : ''
        else if (p.tipo === 'TEXTO' || p.tipo === 'TEXTO_OPCIONES') init[p.id] = existente.valorTexto ?? ''
        else init[p.id] = existente.valorBooleano ?? false
      } else {
        if (p.tipo === 'NUMERICO') init[p.id] = ''
        else if (p.tipo === 'TEXTO' || p.tipo === 'TEXTO_OPCIONES') init[p.id] = ''
        else init[p.id] = false
      }
    }
    setValores(init)
  }, [estudio.id])

  function buildPayload(): ResultadoEstudioMuestraRequestDTO[] {
    return parametros
      .filter(p => {
        const v = valores[p.id]
        if (p.tipo === 'NUMERICO') return v !== '' && v !== undefined && v !== null
        if (p.tipo === 'TEXTO' || p.tipo === 'TEXTO_OPCIONES') return typeof v === 'string' && v.trim() !== ''
        return true
      })
      .map(p => {
        const v = valores[p.id]
        const dto: ResultadoEstudioMuestraRequestDTO = { idParametro: p.id }
        if (p.tipo === 'NUMERICO') dto.valorNumerico = Number(v)
        else if (p.tipo === 'TEXTO' || p.tipo === 'TEXTO_OPCIONES') dto.valorTexto = String(v)
        else dto.valorBooleano = Boolean(v)
        return dto
      })
  }

  function submit() {
    if (!user?.uuid) { setError('Usuario no autenticado'); return }
    if (cantidadConsumida === '' || Number(cantidadConsumida) <= 0) {
      setError('La cantidad consumida es requerida y debe ser mayor a 0'); return
    }
    const consumo = Number(cantidadConsumida)
    if (consumo > valorDisponible) {
      setError(`La cantidad consumida (${consumo}) excede el valor disponible (${valorDisponible} ${muestra.unidad})`); return
    }
    setError('')

    actualizarEstudio({
      id: estudio.id,
      data: {
        idTipoEstudioMuestra: estudio.tipoEstudioMuestra.id,
        usuarioRealizaUUID: user.uuid,
        fechaEstudio: estudio.fechaEstudio,
        observaciones: observaciones || undefined,
        cantidadConsumida: consumo,
        unidadConsumida: muestra.unidad ?? '',
        resultados: buildPayload(),
      },
    }, { onSuccess })
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-medium text-muted-foreground">Editar estudio</p>

      {/* Consumo */}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-xs">Cantidad consumida *</Label>
          <Input
            type="number"
            step="any"
            min="0"
            max={valorDisponible}
            value={cantidadConsumida}
            onChange={e => setCantidadConsumida(e.target.value)}
            placeholder="0"
            className="h-9 text-sm"
          />
          <p className="text-xs text-muted-foreground">
            Disponible: {valorDisponible} {muestra.unidad}
          </p>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Unidad</Label>
          <Input
            type="text"
            value={muestra.unidad ?? ''}
            disabled
            className="h-9 text-sm bg-muted/50"
          />
        </div>
      </div>

      {/* Resultados */}
      {parametros.length > 0 && (
        <>
          <Separator />
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Resultados</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {parametros.map(p => (
              <ParametroField
                key={p.id}
                parametro={p}
                valor={valores[p.id]}
                onChange={val => setValores(prev => ({ ...prev, [p.id]: val }))}
              />
            ))}
          </div>
        </>
      )}

      {/* Observaciones */}
      <div className="space-y-1">
        <Label className="text-xs">Observaciones</Label>
        <Textarea
          value={observaciones}
          onChange={e => setObservaciones(e.target.value)}
          placeholder="Notas adicionales…"
          rows={2}
          className="text-sm resize-none"
        />
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      <div className="flex gap-2">
        <Button onClick={submit} disabled={isPending} size="sm" className="gap-1 flex-1">
          {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          {isPending ? 'Guardando…' : 'Guardar cambios'}
        </Button>
        <Button onClick={onCancel} variant="outline" size="sm">
          Cancelar
        </Button>
      </div>
    </div>
  )
}
