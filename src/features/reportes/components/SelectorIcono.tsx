import { useDeferredValue, useEffect, useMemo, useState } from 'react'

import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

import { caracterDeIcono, cargarIconos, type IconoCatalogo } from '../lib/catalogoIconos'

/**
 * Cuántos se pintan de golpe.
 *
 * El catálogo tiene más de cuatro mil; dibujarlos todos deja el diálogo pegado
 * varios segundos al abrirlo. Con doscientos se llena la rejilla de sobra, y quien
 * busca algo concreto escribe en vez de desplazarse hasta el final.
 */
const TOPE = 200

interface Props {
  abierto: boolean
  /** El código que está puesto ahora, para marcarlo. */
  codigoActual?: string
  onCerrar: () => void
  onElegir: (icono: IconoCatalogo) => void
}

/**
 * El catálogo de iconos, con buscador.
 *
 * <p>Los nombres vienen en inglés porque son los de la tipografía, y traducirlos
 * sería inventarse una capa que luego hay que mantener a mano con cada versión.
 * A cambio, la búsqueda tolera los guiones bajos —`local_hospital` se encuentra
 * escribiendo «local hospital»—, que es donde tropieza quien no los conoce.</p>
 */
export function SelectorIcono({ abierto, codigoActual, onCerrar, onElegir }: Props) {
  const [busqueda, setBusqueda] = useState('')
  const [todos, setTodos] = useState<IconoCatalogo[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Diferido: al teclear rápido, filtrar cuatro mil entradas en cada pulsación se
  // nota en el campo de texto.
  const consulta = useDeferredValue(busqueda)

  // El catálogo se pide la primera vez que se abre, no al montar el editor: son
  // ochenta kilobytes que la mayoría de las sesiones no llega a necesitar.
  useEffect(() => {
    if (!abierto || todos) return
    let vivo = true
    cargarIconos()
      .then((lista) => { if (vivo) setTodos(lista) })
      .catch((e) => { if (vivo) setError(e.message) })
    return () => { vivo = false }
  }, [abierto, todos])

  const resultados = useMemo(() => {
    if (!todos) return { lista: [] as IconoCatalogo[], total: 0 }
    const texto = consulta.trim().toLowerCase().replace(/\s+/g, '_')
    if (!texto) return { lista: todos.slice(0, TOPE), total: todos.length }

    const coinciden = todos.filter((i) => i.nombre.includes(texto))
    return { lista: coinciden.slice(0, TOPE), total: coinciden.length }
  }, [consulta, todos])

  return (
    <Dialog open={abierto} onOpenChange={(a) => !a && onCerrar()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Elegir un icono</DialogTitle>
          <DialogDescription>
            {todos ? `${todos.length} iconos. ` : ''}
            Los nombres están en inglés, como en la tipografía.
          </DialogDescription>
        </DialogHeader>

        <Input
          autoFocus
          className="h-9 text-[13px]"
          placeholder="Buscar: hospital, person, calendar, science…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />

        <div className="max-h-[55vh] overflow-auto">
          {error ? (
            <p className="py-10 text-center text-[13px] text-destructive">{error}</p>
          ) : !todos ? (
            <p className="py-10 text-center text-[13px] text-muted-foreground">
              Cargando el catálogo…
            </p>
          ) : resultados.lista.length === 0 ? (
            <p className="py-10 text-center text-[13px] text-muted-foreground">
              Ningún icono se llama «{busqueda}».
            </p>
          ) : (
            <>
              <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-8">
                {resultados.lista.map((icono) => {
                  const puesto = codigoActual === icono.codigo
                  return (
                    <button
                      // Por nombre y no por código: 216 códigos están compartidos
                      // por varios nombres —son alias del mismo glifo—, y con la
                      // clave repetida React reaprovechaba tarjetas al filtrar, así
                      // que la búsqueda mostraba iconos que no había pedido nadie.
                      key={icono.nombre}
                      type="button"
                      title={icono.nombre}
                      onClick={() => { onElegir(icono); onCerrar() }}
                      className={cn(
                        'flex aspect-square flex-col items-center justify-center gap-0.5 rounded-md border p-1 hover:bg-[var(--muted)]',
                        puesto && 'ring-2 ring-[var(--ring)]',
                      )}
                    >
                      <span style={{ fontFamily: 'IconosReporte', fontSize: '22px', lineHeight: 1 }}>
                        {caracterDeIcono(icono.codigo)}
                      </span>
                      <span className="w-full truncate text-[9px] leading-tight text-muted-foreground">
                        {icono.nombre}
                      </span>
                    </button>
                  )
                })}
              </div>

              {resultados.total > resultados.lista.length && (
                <p className="pt-3 text-center text-[12px] text-muted-foreground">
                  Se muestran {resultados.lista.length} de {resultados.total}. Afina la
                  búsqueda para ver el resto.
                </p>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCerrar}>Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
