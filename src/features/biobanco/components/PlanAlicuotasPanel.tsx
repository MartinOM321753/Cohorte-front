/**
 * PlanAlicuotasPanel
 *
 * Muestra cuántas alícuotas alcanzan con el volumen capturado y deja decidir
 * qué hacer con el sobrante.
 *
 * Antes de esto el sistema creaba siempre las alícuotas que el tubo definía,
 * hubiera volumen o no: de una extracción de 200 mL con un tubo de 5 × 50 salían
 * 5 alícuotas —250 mL— y una etiqueta impresa para un vial que nunca se llenó.
 *
 * El cálculo lo hace el servidor. Replicarlo aquí sería rápido y estaría mal:
 * un reparto redondeado en JavaScript puede sumar una diezmilésima de más y ser
 * rechazado por la validación, dejando al usuario ante una opción que esta misma
 * pantalla le ofreció.
 */
import { useEffect, useMemo, useState } from 'react'
import { AlertCircle, Beaker, Info, Loader2 } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import type { OpcionDistribucion, TuboMuestra, TuboMuestraResumen } from '@/types/api'

import { usePlanAlicuotas } from '../hooks/useBiobanco'

const CLAVE_PERSONALIZADO = '__PERSONALIZADO__'

interface Props {
  /** Tubo elegido; su receta define capacidad, unidad y si admite parciales. */
  tubo: TuboMuestra | TuboMuestraResumen | null
  /** Cantidad extraída, para una muestra que todavía no existe. */
  valor?: number | null
  /** Muestra padre ya registrada: planifica contra su volumen disponible. */
  idMuestra?: number | null
  /** Disponible actual de esa padre; solo para que la caché se refresque. */
  disponible?: number | null
  /** Se llama con el reparto elegido, o null si no hay lote que crear. */
  onPlanChange: (volumenes: number[] | null) => void
  /** Apaga el panel sin desmontarlo (p. ej. interruptor de generación en off). */
  disabled?: boolean
}

export function PlanAlicuotasPanel({
  tubo,
  valor,
  idMuestra,
  disponible,
  onPlanChange,
  disabled = false,
}: Props) {
  const [claveElegida, setClaveElegida] = useState<string>('SOLO_COMPLETAS')
  const [personalizados, setPersonalizados] = useState<number[]>([])

  const habilitado = !disabled && !!tubo && (tubo.numeroAlicuotas ?? 0) > 0
  const { data: plan, isFetching, error } = usePlanAlicuotas(
    { idTuboMuestra: tubo?.id ?? null, valor, idMuestra, disponible },
    { enabled: habilitado },
  )

  const unidad = plan?.unidad ?? tubo?.unidadVolumen ?? ''

  const opcionElegida: OpcionDistribucion | undefined = useMemo(
    () => plan?.opciones?.find((o) => o.clave === claveElegida),
    [plan, claveElegida],
  )

  // Al cambiar el plan (otro tubo, otra cantidad) se vuelve a la opción por
  // omisión: conservar una elección hecha sobre otro reparto crearía un lote
  // que el usuario no revisó.
  useEffect(() => {
    if (!plan) return
    setClaveElegida('SOLO_COMPLETAS')
    setPersonalizados(plan.opciones[0]?.volumenes ?? [])
  }, [plan])

  useEffect(() => {
    if (!habilitado || !plan) {
      onPlanChange(null)
      return
    }
    const volumenes = claveElegida === CLAVE_PERSONALIZADO
      ? personalizados
      : opcionElegida?.volumenes ?? []
    onPlanChange(volumenes.length > 0 ? volumenes : null)
    // onPlanChange viene del padre y cambia en cada render suyo; incluirlo aquí
    // dispararía un bucle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [habilitado, plan, claveElegida, personalizados, opcionElegida])

  if (!habilitado) return null

  if (isFetching && !plan) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-dashed px-3 py-2.5 text-xs text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Calculando el lote…
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
        <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span>{(error as any)?.response?.data?.message ?? 'No fue posible calcular el lote.'}</span>
      </div>
    )
  }

  if (!plan) return null

  const sumaPersonalizada = personalizados.reduce((acc, v) => acc + (Number.isFinite(v) ? v : 0), 0)
  const excedeDisponible = sumaPersonalizada - plan.valorDisponible > 1e-6
  const excedeCapacidad = personalizados.some((v) => v - plan.volumenAlicuota > 1e-6)
  const hayVacios = personalizados.some((v) => !Number.isFinite(v) || v <= 0)

  return (
    <div className="space-y-3 rounded-md border bg-muted/20 p-3">
      {/* Resumen ---------------------------------------------------------- */}
      <div className="flex items-start gap-2">
        <Beaker className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-xs font-medium">
            {plan.slotsOcupados > 0 ? 'Completar el lote' : 'Lote de alícuotas'}
          </p>
          <p
            className={cn(
              'text-xs',
              plan.alcanzaLoteCompleto ? 'text-muted-foreground' : 'text-amber-700 dark:text-amber-400',
            )}
          >
            {plan.mensaje}
          </p>
        </div>
        <Badge variant="outline" className="shrink-0 text-[10px]">
          {plan.slotsOcupados + plan.alicuotasCompletas}/{plan.numeroAlicuotasConfiguradas}
        </Badge>
      </div>

      {/* Reparto del remanente -------------------------------------------- */}
      {plan.opciones.length > 1 && (
        <>
          <Separator />
          <div className="space-y-2">
            <Label className="text-xs font-medium">
              Restan {fmt(plan.remanente)} {unidad}
            </Label>
            <RadioGroup value={claveElegida} onValueChange={setClaveElegida} className="gap-1.5">
              {plan.opciones.map((opcion, i) => (
                <label
                  key={opcion.clave}
                  htmlFor={`plan-${opcion.clave}`}
                  className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors hover:bg-muted/60"
                >
                  <RadioGroupItem value={opcion.clave} id={`plan-${opcion.clave}`} className="h-3.5 w-3.5" />
                  <span className="flex-1">{opcion.descripcion}</span>
                  {/* Solo cuando la opcion por omision crea algo: recomendarle
                      "no hacer nada" a quien acaba de pulsar «Completar lote»
                      no le ayuda a decidir. */}
                  {i === 0 && opcion.totalAlicuotas > 0 && (
                    <Badge variant="secondary" className="shrink-0 text-[10px]">
                      Recomendado
                    </Badge>
                  )}
                  <span className="shrink-0 text-muted-foreground">
                    {opcion.totalAlicuotas} alíc.
                  </span>
                </label>
              ))}

              <label
                htmlFor={`plan-${CLAVE_PERSONALIZADO}`}
                className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors hover:bg-muted/60"
              >
                <RadioGroupItem
                  value={CLAVE_PERSONALIZADO}
                  id={`plan-${CLAVE_PERSONALIZADO}`}
                  className="h-3.5 w-3.5"
                />
                <span className="flex-1">Personalizar los volúmenes</span>
              </label>
            </RadioGroup>
          </div>
        </>
      )}

      {/* Modo personalizado ----------------------------------------------- */}
      {claveElegida === CLAVE_PERSONALIZADO && (
        <div className="space-y-2 rounded-md border border-dashed p-2.5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] text-muted-foreground">
              Máximo {fmt(plan.volumenAlicuota)} {unidad} por alícuota,{' '}
              {plan.numeroAlicuotasConfiguradas} en total
            </p>
            <button
              type="button"
              className="text-[11px] text-primary underline-offset-2 hover:underline disabled:opacity-40"
              disabled={personalizados.length >= plan.numeroAlicuotasConfiguradas}
              onClick={() => setPersonalizados((prev) => [...prev, plan.volumenAlicuota])}
            >
              Agregar alícuota
            </button>
          </div>

          <div className="space-y-1.5">
            {personalizados.map((v, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="w-16 shrink-0 text-[11px] text-muted-foreground">
                  Alíc. {i + 1}
                </span>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  max={plan.volumenAlicuota}
                  value={Number.isFinite(v) ? v : ''}
                  onChange={(e) => {
                    const n = parseFloat(e.target.value)
                    setPersonalizados((prev) => prev.map((x, j) => (j === i ? n : x)))
                  }}
                  className="h-7 flex-1 text-xs"
                />
                <span className="w-10 shrink-0 text-[11px] text-muted-foreground">{unidad}</span>
                <button
                  type="button"
                  className="shrink-0 text-[11px] text-destructive underline-offset-2 hover:underline"
                  onClick={() => setPersonalizados((prev) => prev.filter((_, j) => j !== i))}
                >
                  Quitar
                </button>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between border-t pt-1.5 text-[11px]">
            <span className="text-muted-foreground">
              Suma {fmt(sumaPersonalizada)} de {fmt(plan.valorDisponible)} {unidad}
            </span>
            <span className="text-muted-foreground">
              Quedan {fmt(Math.max(0, plan.valorDisponible - sumaPersonalizada))} {unidad} en la padre
            </span>
          </div>

          {(excedeDisponible || excedeCapacidad || hayVacios) && (
            <p className="flex items-start gap-1 text-[11px] text-destructive">
              <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" strokeWidth={1.75} />
              {excedeDisponible
                ? 'El lote supera el volumen disponible de la muestra.'
                : excedeCapacidad
                  ? `Ninguna alícuota puede exceder ${fmt(plan.volumenAlicuota)} ${unidad}.`
                  : 'Todas las alícuotas deben tener un volumen mayor a 0.'}
            </p>
          )}
        </div>
      )}

      {/* Consecuencia ------------------------------------------------------ */}
      <div className="flex items-start gap-2 rounded-md bg-blue-500/10 px-2.5 py-2 text-[11px] text-blue-700 dark:text-blue-300">
        <Info className="mt-0.5 h-3 w-3 shrink-0" />
        <span>
          El volumen queda reservado en la muestra padre y se descuenta conforme cada alícuota
          recibe su posición en caja.
        </span>
      </div>
    </div>
  )
}

/** 250 en lugar de 250.0, 2.5 en lugar de 2.5000. */
function fmt(valor: number): string {
  if (!Number.isFinite(valor)) return '0'
  return String(parseFloat(valor.toFixed(4)))
}
