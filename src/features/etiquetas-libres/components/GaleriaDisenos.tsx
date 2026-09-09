import { Check, Printer } from 'lucide-react'

import { Button } from '@/components/ui/button'
import type { MedirTexto } from '@/components/print/layoutCuadricula'
import type { ConfiguracionEtiquetaResponse } from '@/types/api'

import type { TablaEtiquetas } from '../api/etiquetasLibres.api'
import type { DisenoEtiqueta } from '../disenoEtiqueta'
import { esElMismoDiseno, presetsPara } from '../presetsDiseno'
import { CasillaCuadricula } from './CasillaCuadricula'

/** Aumento de la miniatura. La etiqueta real es demasiado chica para decidir con ella. */
const ZOOM = 2.2

/**
 * Diseños de partida para elegir.
 *
 * Cada tarjeta es la etiqueta de verdad —mismo motor, mismos datos de la primera
 * fila— nada más que ampliada. Dibujar cajas de muestra sería más simple, pero
 * entonces habría que creerse que el resultado se parecerá a eso; así lo que se
 * elige es exactamente lo que se va a imprimir, incluido el caso en que un valor
 * no quepa.
 *
 * Dos caminos por tarjeta, porque son dos intenciones distintas: **Usar** lleva
 * el diseño al ajuste de arriba para retocarlo, e **Imprimir** salta directo a la
 * hoja sin pasar por ahí. Quien ya vio en la miniatura lo que quería no tiene por
 * qué asomarse al diseñador.
 */
export function GaleriaDisenos({
  tabla,
  configuracion,
  diseno,
  onElegir,
  onImprimir,
  medir,
}: {
  tabla: TablaEtiquetas
  configuracion: ConfiguracionEtiquetaResponse
  diseno: DisenoEtiqueta
  onElegir: (d: DisenoEtiqueta) => void
  onImprimir: (d: DisenoEtiqueta) => void
  medir: MedirTexto
}) {
  const presets = presetsPara(tabla, configuracion)
  if (presets.length === 0) return null

  return (
    <div className="space-y-2">
      <p className="text-[11px] text-muted-foreground">
        Para las {tabla.encabezados.length} columnas de este archivo, con los datos de la primera
        fila. <strong>Usar</strong> lo lleva al ajuste de arriba; <strong>Imprimir</strong> va
        directo a la hoja.
      </p>

      <div className="flex flex-wrap gap-2.5">
        {presets.map((preset) => {
          const elegido = esElMismoDiseno(diseno, preset.diseno)

          return (
            <div
              key={preset.id}
              className={`flex flex-col gap-1.5 rounded-md border p-2 transition-colors ${
                elegido
                  ? 'border-[var(--imss-green-500)] bg-[var(--imss-green-50)]'
                  : 'hover:border-[var(--imss-green-500)]/50'
              }`}
            >
              {/* La miniatura también aplica el diseño: es el blanco grande y
                  obvio, y no obliga a apuntar al botón chico de abajo. */}
              <button
                type="button"
                onClick={() => onElegir(preset.diseno)}
                aria-pressed={elegido}
                title={`Usar «${preset.nombre}»: ${preset.descripcion}`}
                className="cursor-pointer rounded-sm p-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--imss-green-500)]"
                style={{
                  overflow: 'hidden',
                  width: `calc(${configuracion.anchoMm}mm * ${ZOOM})`,
                  height: `calc(${configuracion.altoMm}mm * ${ZOOM})`,
                }}
              >
                {/* La etiqueta real, ampliada. El recorte de la casilla se
                    conserva: si algo no cabe aquí, tampoco va a caber en el papel. */}
                <div
                  className="casilla"
                  style={{
                    position: 'relative',
                    width: `${configuracion.anchoMm}mm`,
                    height: `${configuracion.altoMm}mm`,
                    transform: `scale(${ZOOM})`,
                    transformOrigin: 'top left',
                    border: '1px solid #e5e7eb',
                  }}
                >
                  <CasillaCuadricula
                    tabla={tabla}
                    indiceFila={0}
                    configuracion={configuracion}
                    diseno={preset.diseno}
                    medir={medir}
                  />
                </div>
              </button>

              <div className="max-w-[15rem] space-y-0.5">
                <p className="flex items-center gap-1 text-[12px] font-medium">
                  {elegido && <Check className="h-3 w-3 shrink-0 text-[var(--imss-green-500)]" />}
                  {preset.nombre}
                </p>
                <p className="text-[10px] leading-tight text-muted-foreground">
                  {preset.descripcion}
                </p>
              </div>

              <div className="flex items-center gap-1.5">
                <Button
                  type="button"
                  variant={elegido ? 'default' : 'outline'}
                  size="sm"
                  className="h-7 flex-1 text-[11px]"
                  onClick={() => onElegir(preset.diseno)}
                >
                  {elegido ? 'En uso' : 'Usar'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 gap-1 text-[11px]"
                  onClick={() => onImprimir(preset.diseno)}
                  title="Aplica este diseño y abre la hoja para imprimir"
                >
                  <Printer className="h-3 w-3" />
                  Imprimir
                </Button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
