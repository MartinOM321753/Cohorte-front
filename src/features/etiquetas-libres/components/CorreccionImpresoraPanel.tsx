import { useEffect, useState } from 'react'
import { Ruler, RotateCcw } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

import {
  esNula,
  LIMITE_MM,
  normalizar,
  SIN_CORRECCION,
  type CorreccionImpresora,
} from '../correccionImpresora'

/**
 * Captura de la corrección de la impresora.
 *
 * Cerrada por omisión: la mayoría de las impresoras no la necesitan y no tiene
 * por qué estorbar. Cuando hay una activa se dice siempre, esté abierta o no,
 * porque una corrección olvidada mueve las etiquetas sin que nadie sepa por qué.
 */
export function CorreccionImpresoraPanel({
  correccion,
  onChange,
  columnas,
}: {
  correccion: CorreccionImpresora
  onChange: (c: CorreccionImpresora) => void
  /** Columnas de la hoja, para nombrar «la última» por su número. */
  columnas: number
}) {
  const [abierto, setAbierto] = useState(false)
  const activa = !esNula(correccion)

  return (
    <div className="rounded-md border border-dashed px-3 py-2">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 gap-1.5 px-2 text-[12px]"
          onClick={() => setAbierto((v) => !v)}
          aria-expanded={abierto}
        >
          <Ruler className="h-3.5 w-3.5" />
          Corregir el desfase de esta impresora
        </Button>

        {activa ? (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800">
            Activa: compensa {correccion.arribaMm} mm en la primera fila y {correccion.abajoMm} mm
            en la última (columna {columnas})
          </span>
        ) : (
          <span className="text-[11px] text-muted-foreground">Sin corrección</span>
        )}
      </div>

      {abierto && (
        <div className="mt-2 space-y-3 text-[12px]">
          <p className="max-w-[46rem] leading-snug text-muted-foreground">
            Use esto si la columna {columnas} sale más abajo que la columna 1 aunque la
            configuración esté bien. El sistema coloca todas las columnas a la misma altura; el
            desfase lo mete la impresora, casi siempre porque la hoja de etiquetas entra girada o
            se patina de un lado. Aquí se compensa: cada etiqueta se sube lo que la impresora la
            baja. Solo afecta a esta pantalla y se recuerda en esta computadora.
          </p>

          <ol className="max-w-[46rem] list-decimal space-y-0.5 pl-5 leading-snug text-muted-foreground">
            <li>Deje los dos valores en 0, abra la vista previa y active <strong>Marco de calibración</strong>.</li>
            <li>Imprima una hoja completa sobre hoja de etiquetas.</li>
            <li>
              En la <strong>primera fila</strong>, mida con regla cuántos milímetros más abajo queda
              el marco de la columna {columnas} respecto de su troquel que el de la columna 1.
            </li>
            <li>Haga lo mismo en la <strong>última fila</strong>.</li>
            <li>Escriba los dos valores e imprima otra hoja para confirmar.</li>
          </ol>

          <div className="flex flex-wrap items-end gap-4">
            <CampoMm
              id="correccion-arriba"
              rotulo={`Primera fila: la columna ${columnas} sale`}
              valor={correccion.arribaMm}
              onChange={(v) => onChange(normalizar({ ...correccion, arribaMm: v }))}
            />
            <CampoMm
              id="correccion-abajo"
              rotulo={`Última fila: la columna ${columnas} sale`}
              valor={correccion.abajoMm}
              onChange={(v) => onChange(normalizar({ ...correccion, abajoMm: v }))}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-[12px]"
              disabled={!activa}
              onClick={() => onChange(SIN_CORRECCION)}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Quitar corrección
            </Button>
          </div>

          <p className="text-[11px] text-muted-foreground">
            Valores positivos si sale más abajo, negativos si sale más arriba. Máximo ±{LIMITE_MM} mm:
            más que eso no es la impresora, es otra hoja u otra configuración.
          </p>
        </div>
      )}
    </div>
  )
}

/**
 * Campo de milímetros que deja escribir.
 *
 * Un `<input type="number">` controlado con el número ya normalizado se come lo
 * que se está tecleando: «-» o «1,» todavía no son números, se convierten en 0 y
 * el campo se reescribe a mitad de la edición. Aquí el texto se guarda tal cual y
 * solo se avisa hacia fuera cuando ya es un número. Acepta coma decimal, que es
 * como se escribe en México.
 */
function CampoMm({
  id,
  rotulo,
  valor,
  onChange,
}: {
  id: string
  rotulo: string
  valor: number
  onChange: (v: number) => void
}) {
  const [texto, setTexto] = useState(String(valor))

  // Si el valor cambia desde fuera —«Quitar corrección»—, el campo lo refleja.
  useEffect(() => {
    setTexto((t) => (Number(t.replace(',', '.')) === valor ? t : String(valor)))
  }, [valor])

  return (
    <div className="space-y-1">
      <Label htmlFor={id} className="text-[11px] text-muted-foreground">
        {rotulo}
      </Label>
      <div className="flex items-center gap-1.5">
        <Input
          id={id}
          type="text"
          inputMode="decimal"
          className="h-8 w-20 text-right font-mono text-[13px]"
          value={texto}
          onChange={(e) => {
            const t = e.target.value
            setTexto(t)
            const n = Number(t.replace(',', '.'))
            if (t.trim() !== '' && Number.isFinite(n)) onChange(n)
            else if (t.trim() === '') onChange(0)
          }}
          // Al salir se muestra lo que de verdad quedó, ya acotado.
          onBlur={() => setTexto(String(valor))}
        />
        <span className="text-[12px] text-muted-foreground">mm más abajo</span>
      </div>
    </div>
  )
}
