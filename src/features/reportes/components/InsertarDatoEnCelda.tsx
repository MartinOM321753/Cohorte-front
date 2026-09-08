import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Calculator, Database, Plus } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useAuthStore } from '@/stores/authStore'

import { EditorFormula } from './EditorFormula'
import { listarCampos } from '../api/reportes.api'
import { useCrearFormula } from '../hooks/useFormulas'
import type { CampoReporte } from '../types.api'
import type { FormulaReporteRequest } from '../formulas.types'

interface Props {
  /** Se llama con el marcador ya armado: `{{formula.3}}`. */
  onInsertar: (marcador: string) => void
  deshabilitado?: boolean
}

/**
 * Meter un dato dentro de una celda, en vez de encima de la tabla.
 *
 * <p>Un campo puesto como elemento suelto sobre la tabla se desfasa: la tabla crece
 * al añadirle una fila, el elemento no se entera y queda corrido. Dentro de la celda
 * el valor hereda el ancho de la columna, su alineación y su formato, y se mueve con
 * ella.</p>
 *
 * <p>Desde aquí también se crea una fórmula nueva sin salir del diseño. Tener que
 * cerrar la plantilla, ir al catálogo, crearla y volver a entrar rompe el trabajo
 * justo en el momento en que uno descubre que le falta el cálculo.</p>
 */
export function InsertarDatoEnCelda({ onInsertar, deshabilitado }: Props) {
  const puedeCrearFormulas = useAuthStore((s) => s.hasPermiso('REPORTES_FORMULAS_EDITAR'))

  const [abierto, setAbierto] = useState(false)
  const [editorFormula, setEditorFormula] = useState(false)

  const queryClient = useQueryClient()
  const crearFormula = useCrearFormula()

  const { data: campos } = useQuery({
    queryKey: ['camposReporte'],
    queryFn: listarCampos,
    enabled: abierto,
  })

  /** Solo valores: un bloque entero no cabe en una celda. */
  const insertables = useMemo(
    () => (campos ?? []).filter((c) => c.clase === 'CAMPO'),
    [campos])

  const { formulas, resto } = useMemo(() => {
    const formulas: CampoReporte[] = []
    const resto = new Map<string, CampoReporte[]>()
    for (const c of insertables) {
      if (c.grupo === 'Fórmulas') { formulas.push(c); continue }
      const clave = c.subgrupo ? `${c.grupo} · ${c.subgrupo}` : c.grupo
      if (!resto.has(clave)) resto.set(clave, [])
      resto.get(clave)!.push(c)
    }
    return { formulas, resto }
  }, [insertables])

  function insertar(clave: string) {
    onInsertar(`{{${clave}}}`)
    setAbierto(false)
  }

  async function guardarFormulaNueva(body: FormulaReporteRequest) {
    const creada = await crearFormula.mutateAsync(body)
    // El catálogo de campos acaba de cambiar: sin refrescarlo, la fórmula recién
    // creada no aparecería en esta misma lista.
    await queryClient.invalidateQueries({ queryKey: ['camposReporte'] })
    setEditorFormula(false)
    insertar(`formula.${creada.id}`)
  }

  return (
    <>
      <Popover open={abierto} onOpenChange={setAbierto}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 gap-1.5 px-2 text-[12px]"
            disabled={deshabilitado}
            title="Insertar un dato del participante o una fórmula en esta celda"
          >
            <Database className="h-3.5 w-3.5" strokeWidth={1.75} />
            Insertar dato
          </Button>
        </PopoverTrigger>

        <PopoverContent className="w-[400px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Buscar un dato o una fórmula…" />
            <CommandList className="max-h-[340px]">
              <CommandEmpty>No se encontró ningún dato con ese nombre.</CommandEmpty>

              {puedeCrearFormulas && (
                <>
                  <CommandGroup>
                    <CommandItem
                      value="crear una fórmula nueva"
                      onSelect={() => { setAbierto(false); setEditorFormula(true) }}
                      className="gap-2"
                    >
                      <Plus className="h-3.5 w-3.5" strokeWidth={2} />
                      <span>Crear una fórmula…</span>
                    </CommandItem>
                  </CommandGroup>
                  <CommandSeparator />
                </>
              )}

              {formulas.length > 0 && (
                <CommandGroup heading="Fórmulas">
                  {formulas.map((c) => (
                    <CommandItem
                      key={c.clave}
                      value={`fórmulas ${c.rotulo}`}
                      onSelect={() => insertar(c.clave)}
                      className="gap-2"
                    >
                      <Calculator className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
                                  strokeWidth={1.75} />
                      <span className="flex-1">{c.rotulo}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              {[...resto.entries()].map(([grupo, items]) => (
                <CommandGroup key={grupo} heading={grupo}>
                  {items.map((c) => (
                    <CommandItem
                      key={c.clave}
                      value={`${grupo} ${c.rotulo}`}
                      onSelect={() => insertar(c.clave)}
                    >
                      <span className="flex-1">{c.rotulo}</span>
                      {c.ayuda && (
                        <Badge variant="secondary" className="ml-2 shrink-0 text-[10px]">
                          nota
                        </Badge>
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Crear la fórmula sin salir del diseño: al guardarla queda puesta en la celda. */}
      <EditorFormula
        abierto={editorFormula}
        onCerrar={() => setEditorFormula(false)}
        formula={null}
        onGuardar={guardarFormulaNueva}
        guardando={crearFormula.isPending}
      />
    </>
  )
}
