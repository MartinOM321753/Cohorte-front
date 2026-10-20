import { useState } from 'react'
import { AlertTriangle, Ban, Check, CircleHelp, Loader2 } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { PacienteSearchCombobox } from '@/features/pacientes/components/PacienteSearchCombobox'
import { cn } from '@/lib/utils'
import { useAbrirCuestionario, useTiposParaParticipante } from '../hooks/useCuestionarios'
import type { TipoParaParticipante } from '../api/cuestionarios.types'

/**
 * Abrir un cuestionario para contestarlo en la aplicación.
 *
 * <h3>Se muestran todos los instrumentos, no solo los que aplican</h3>
 *
 * Podría parecer más limpio listar únicamente los que le tocan al participante. Sería
 * peor: cuando el capturista no encuentra el que esperaba, lo que necesita saber es
 * <em>por qué</em> falta, y el motivo casi siempre es un dato del expediente —sexo o fecha
 * de nacimiento sin capturar— que él mismo puede arreglar. Una lista corta sin
 * explicación convierte eso en un misterio.
 *
 * <h3>Tres estados, no dos</h3>
 *
 * Un instrumento puede **aplicar**, **no aplicar** o **no poderse determinar**. El tercero
 * no bloquea: el hueco es de nuestra base, no del participante, así que se puede abrir
 * igual y queda marcado para que alguien complete el expediente. Bloquearlo dejaría a esa
 * persona sin poder contestar nada por un dato que nadie capturó.
 */
interface Props {
  onCerrar: () => void
  onAbierto: (idCuestionario: number) => void
}

export function AbrirCuestionarioDialog({ onCerrar, onAbierto }: Props) {
  const [uuid, setUuid] = useState<string | null>(null)
  const [idTipo, setIdTipo] = useState<number | null>(null)

  const { data: tipos = [], isLoading } = useTiposParaParticipante(uuid)
  const abrir = useAbrirCuestionario()

  const elegido = tipos.find((t) => t.idTipoCuestionario === idTipo) ?? null
  const edad = tipos.find((t) => t.edad != null)?.edad ?? null

  async function confirmar() {
    if (!uuid || !elegido) return
    const creado = await abrir.mutateAsync({
      idTipo: elegido.idTipoCuestionario, uuid, origen: 'APLICACION',
    })
    onAbierto(creado.id)
  }

  return (
    <Dialog open onOpenChange={(a) => { if (!a) onCerrar() }}>
      <DialogContent className="@container sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Abrir un cuestionario</DialogTitle>
          <DialogDescription>
            Elija al participante y el sistema le dirá qué instrumentos le corresponden
            según su sexo y su edad.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Participante</Label>
            <PacienteSearchCombobox
              value={uuid}
              onChange={(nuevo) => { setUuid(nuevo); setIdTipo(null) }}
              // Un participante inactivo puede tener una hoja de papel pendiente de
              // capturar: excluirlo dejaria ese cuestionario sin forma de registrarse.
              incluirInactivos
              modal
            />
          </div>

          {uuid && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Cuestionario</Label>
                {edad != null && (
                  <span className="text-xs text-muted-foreground">
                    {edad} años cumplidos
                  </span>
                )}
              </div>

              {isLoading ? (
                <div className="space-y-2">
                  {[0, 1, 2].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
                </div>
              ) : tipos.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No hay cuestionarios activos en el catálogo.
                </p>
              ) : (
                <div className="space-y-2">
                  {tipos.map((t) => (
                    <OpcionInstrumento
                      key={t.idTipoCuestionario}
                      tipo={t}
                      elegido={idTipo === t.idTipoCuestionario}
                      onElegir={() => setIdTipo(t.idTipoCuestionario)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCerrar}>Cancelar</Button>
          <Button
            disabled={!uuid || !elegido || !sePuedeAbrir(elegido) || abrir.isPending}
            onClick={confirmar}
          >
            {abrir.isPending && <Loader2 className="mr-1.5 size-4 animate-spin" />}
            Abrir cuestionario
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** Solo lo que claramente no aplica queda fuera; lo indeterminado se puede abrir. */
function sePuedeAbrir(t: TipoParaParticipante): boolean {
  return !t.yaRegistrado && (t.aplica || t.indeterminado)
}

function OpcionInstrumento({ tipo, elegido, onElegir }: {
  tipo: TipoParaParticipante
  elegido: boolean
  onElegir: () => void
}) {
  const disponible = sePuedeAbrir(tipo)

  return (
    <button
      type="button"
      disabled={!disponible}
      onClick={onElegir}
      className={cn(
        'flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors',
        disponible ? 'hover:bg-accent/50' : 'cursor-not-allowed opacity-60',
        elegido && 'border-primary bg-accent',
      )}
    >
      <Icono tipo={tipo} />

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="font-mono text-xs text-muted-foreground">{tipo.clave}</span>
          <span className="text-sm font-medium">{tipo.nombre}</span>
          <span className="text-xs text-muted-foreground">v{tipo.version}</span>
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">{tipo.publico}</p>

        {tipo.yaRegistrado && (
          <p className="mt-1 text-xs text-muted-foreground">
            El participante ya tiene este cuestionario registrado.
          </p>
        )}
        {!tipo.yaRegistrado && tipo.motivo && (
          <p className={cn('mt-1 text-xs',
            tipo.indeterminado ? 'text-amber-700 dark:text-amber-400' : 'text-muted-foreground')}>
            {tipo.indeterminado
              ? `Se puede abrir, pero quedará señalado: ${tipo.motivo}.`
              : `No le corresponde: ${tipo.motivo}.`}
          </p>
        )}
      </div>

      {tipo.yaRegistrado && <Badge variant="secondary" className="shrink-0">Ya registrado</Badge>}
    </button>
  )
}

function Icono({ tipo }: { tipo: TipoParaParticipante }) {
  if (tipo.yaRegistrado) return <Check className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
  if (tipo.indeterminado) return <CircleHelp className="mt-0.5 size-4 shrink-0 text-amber-600" />
  if (!tipo.aplica) return <Ban className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
  return <Check className="mt-0.5 size-4 shrink-0 text-emerald-600" />
}

/** Aviso reutilizable para un cuestionario ya guardado que quedó fuera de criterio. */
export function AvisoFueraDeCriterio({ motivo }: { motivo: string | null }) {
  if (!motivo) return null
  return (
    <div className="flex items-start gap-2 rounded-md border border-amber-400/60 bg-amber-50/60 px-3 py-2 text-xs text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
      <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
      <span>
        <strong>Fuera del público del instrumento:</strong> {motivo}. Se conserva tal cual —
        la hoja existe y alguien la contestó —, pero conviene revisar si la aplicación fue
        correcta.
      </span>
    </div>
  )
}
