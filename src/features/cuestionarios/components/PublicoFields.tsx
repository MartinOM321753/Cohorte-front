import { Info } from 'lucide-react'

import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  ToggleGroup, ToggleGroupItem,
} from '@/components/ui/toggle-group'
import { DIRIGIDO_A_ETIQUETAS, type DirigidoA } from '../api/cuestionarios.types'

/**
 * A qué participantes va dirigido un instrumento.
 *
 * <h3>Una edad exacta no es un campo aparte</h3>
 *
 * El selector ofrece «cualquier edad», «rango» y «edad exacta», pero por debajo siempre
 * son los mismos dos números: una edad exacta es el mínimo y el máximo iguales. Un tercer
 * campo «edad exacta» habría sido dos formas de decir lo mismo, y alguien tendría que
 * decidir cuál manda el día que vengan las dos llenas.
 *
 * <h3>El rango abierto por un lado es el caso normal</h3>
 *
 * «De 45 años en adelante» es el criterio real del minimental y de la afluencia verbal.
 * Por eso dejar vacío un extremo significa «sin límite por ese lado» y no cero: obligar a
 * poner 130 como máximo sería inventar un tope que nadie estableció.
 */
export type ModoEdad = 'cualquiera' | 'rango' | 'exacta'

export function modoDesde(min: number | null | undefined, max: number | null | undefined): ModoEdad {
  if (min == null && max == null) return 'cualquiera'
  if (min != null && max != null && min === max) return 'exacta'
  return 'rango'
}

interface Props {
  permiteAutollenado: boolean
  onPermiteAutollenado: (valor: boolean) => void
  dirigidoA: DirigidoA
  edadMinima: number | null
  edadMaxima: number | null
  modo: ModoEdad
  onDirigidoA: (valor: DirigidoA) => void
  onModo: (modo: ModoEdad) => void
  onEdades: (min: number | null, max: number | null) => void
}

export function PublicoFields({
  permiteAutollenado, onPermiteAutollenado,
  dirigidoA, edadMinima, edadMaxima, modo, onDirigidoA, onModo, onEdades,
}: Props) {
  const rangoInvertido =
    modo === 'rango' && edadMinima != null && edadMaxima != null && edadMinima > edadMaxima

  function cambiarModo(nuevo: ModoEdad) {
    onModo(nuevo)
    // Al cambiar de modo se limpian los numeros que dejan de tener sentido, en lugar de
    // conservarlos ocultos: un maximo invisible que sigue aplicandose es la clase de
    // criterio que nadie entiende despues.
    if (nuevo === 'cualquiera') onEdades(null, null)
    else if (nuevo === 'exacta') onEdades(edadMinima ?? null, edadMinima ?? null)
  }

  return (
    <div className="space-y-4 rounded-lg border p-3">
      <div className="space-y-1.5">
        <Label htmlFor="dirigidoA">Dirigido a</Label>
        <Select value={dirigidoA} onValueChange={(v) => onDirigidoA(v as DirigidoA)}>
          <SelectTrigger id="dirigidoA"><SelectValue /></SelectTrigger>
          <SelectContent>
            {(Object.keys(DIRIGIDO_A_ETIQUETAS) as DirigidoA[]).map((d) => (
              <SelectItem key={d} value={d}>{DIRIGIDO_A_ETIQUETAS[d]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Edad</Label>
        <ToggleGroup
          type="single"
          value={modo}
          onValueChange={(v) => { if (v) cambiarModo(v as ModoEdad) }}
          className="justify-start"
        >
          <ToggleGroupItem value="cualquiera" className="text-xs">Cualquier edad</ToggleGroupItem>
          <ToggleGroupItem value="rango" className="text-xs">Rango</ToggleGroupItem>
          <ToggleGroupItem value="exacta" className="text-xs">Edad exacta</ToggleGroupItem>
        </ToggleGroup>

        {modo === 'rango' && (
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="edadMin" className="text-xs font-normal text-muted-foreground">
                Desde (años cumplidos)
              </Label>
              <Input
                id="edadMin"
                type="number"
                min={0}
                max={130}
                placeholder="Sin mínimo"
                value={edadMinima ?? ''}
                onChange={(e) => onEdades(aNumero(e.target.value), edadMaxima)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edadMax" className="text-xs font-normal text-muted-foreground">
                Hasta (inclusive)
              </Label>
              <Input
                id="edadMax"
                type="number"
                min={0}
                max={130}
                placeholder="Sin máximo"
                value={edadMaxima ?? ''}
                onChange={(e) => onEdades(edadMinima, aNumero(e.target.value))}
              />
            </div>
          </div>
        )}

        {modo === 'exacta' && (
          <div className="space-y-1.5">
            <Label htmlFor="edadExacta" className="text-xs font-normal text-muted-foreground">
              Años cumplidos
            </Label>
            <Input
              id="edadExacta"
              type="number"
              min={0}
              max={130}
              value={edadMinima ?? ''}
              onChange={(e) => {
                const n = aNumero(e.target.value)
                onEdades(n, n)
              }}
            />
          </div>
        )}

        {modo === 'rango' && (
          <p className="text-xs text-muted-foreground">
            Deje un extremo vacío para no poner límite por ese lado. El máximo es inclusivo.
          </p>
        )}
        {rangoInvertido && (
          <p className="text-xs text-destructive">
            La edad mínima no puede ser mayor que la máxima.
          </p>
        )}
      </div>

      <div className="space-y-2 border-t pt-3">
        <div className="flex items-start gap-2.5">
          <Checkbox
            id="autollenado"
            checked={permiteAutollenado}
            onCheckedChange={(v) => onPermiteAutollenado(v === true)}
          />
          <Label htmlFor="autollenado" className="cursor-pointer text-sm font-normal">
            El participante puede contestarlo desde su cuenta
            <span className="mt-1 block text-xs text-muted-foreground">
              Si no lo marca, el cuestionario solo aparece cuando el personal se lo asigna.
              <strong className="font-medium"> No lo marque en pruebas que un entrevistador
              debe aplicar</strong> — un minimental contestado a solas deja de medir lo que
              mide, y el resultado parece valido.
            </span>
          </Label>
        </div>
      </div>

      <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
        <Info className="mt-0.5 size-3.5 shrink-0" />
        La edad se compara con la que el participante tenía <strong>el día en que contestó</strong>,
        no con la de hoy. Así un cuestionario aplicado fuera de criterio sigue señalado aunque
        después cumpla años.
      </p>
    </div>
  )
}

function aNumero(texto: string): number | null {
  if (texto.trim() === '') return null
  const n = Number(texto)
  return Number.isFinite(n) ? n : null
}
