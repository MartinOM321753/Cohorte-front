import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { X, Plus } from 'lucide-react'

interface Props {
  valores: string[]
  onChange: (valores: string[]) => void
  etiqueta: string
  ayuda?: string
  placeholder?: string
  /** Compara en forma canónica para no admitir dos entradas que son la misma. */
  normalizar?: (v: string) => string
}

/**
 * Editor de una lista corta de textos como fichas: escribir y pulsar Enter añade,
 * la equis quita.
 *
 * Existe porque este patrón ya estaba copiado en cuatro formularios de la
 * pantalla de tipos de estudio, y los alias habrían sido la quinta y la sexta.
 */
export function ListaChipsEditable({
  valores,
  onChange,
  etiqueta,
  ayuda,
  placeholder,
  normalizar,
}: Props) {
  const [entrada, setEntrada] = useState('')

  const clave = (v: string) => (normalizar ? normalizar(v) : v.toLowerCase())

  const agregar = () => {
    const v = entrada.trim()
    if (!v) return
    // Se compara por la forma canónica, no por el texto: si no, "Sistolica" y
    // "SISTOLICA" entrarían las dos y el backend rechazaría el guardado entero.
    if (valores.some((x) => clave(x) === clave(v))) { setEntrada(''); return }
    onChange([...valores, v])
    setEntrada('')
  }

  return (
    <div className="space-y-1.5">
      <p className="text-[11px] font-medium text-muted-foreground">{etiqueta}</p>
      {ayuda && <p className="text-[10px] leading-snug text-muted-foreground">{ayuda}</p>}

      {valores.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {valores.map((v, i) => (
            <span
              key={`${v}-${i}`}
              className="inline-flex items-center gap-1 rounded-full border bg-muted/50 px-2 py-0.5 text-[11px]"
            >
              <span className="font-mono">{v}</span>
              <button
                type="button"
                className="text-muted-foreground hover:text-destructive"
                onClick={() => onChange(valores.filter((_, j) => j !== i))}
                title={`Quitar ${v}`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="flex gap-1.5">
        <Input
          value={entrada}
          onChange={(e) => setEntrada(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); agregar() }
          }}
          placeholder={placeholder}
          className="h-7 text-[12px]"
        />
        <Button type="button" size="sm" variant="outline" className="h-7 px-2" onClick={agregar}>
          <Plus className="h-3 w-3" />
        </Button>
      </div>
    </div>
  )
}
