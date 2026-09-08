import { useState } from 'react'
import { Calculator, History, Pencil, Plus, ToggleLeft, ToggleRight, Trash2 } from 'lucide-react'

import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { useAuthStore } from '@/stores/authStore'
import { cn } from '@/lib/utils'

import { EditorFormula } from './EditorFormula'
import {
  useCrearFormula, useEliminarFormula, useFormulas, useGuardarFormula,
  useHistorialFormula, useToggleFormula,
} from '../hooks/useFormulas'
import type { FormulaReporte, FormulaReporteRequest } from '../formulas.types'

/**
 * El catálogo de fórmulas de la institución.
 *
 * Vive junto a las plantillas porque las arma la misma persona y en el mismo momento,
 * pero con su propio permiso: una fórmula la comparten todos los reportes que la usen,
 * así que equivocarse ahí no rompe un reporte sino todos los que dependan de ella.
 */
export function FormulasPanel() {
  const puedeEditar = useAuthStore((s) => s.hasPermiso('REPORTES_FORMULAS_EDITAR'))

  const [editando, setEditando] = useState<FormulaReporte | null>(null)
  const [editorAbierto, setEditorAbierto] = useState(false)
  const [porEliminar, setPorEliminar] = useState<FormulaReporte | null>(null)
  const [verHistorialDe, setVerHistorialDe] = useState<FormulaReporte | null>(null)

  const { data: formulas, isLoading } = useFormulas()
  const crear = useCrearFormula()
  const guardar = useGuardarFormula()
  const toggle = useToggleFormula()
  const eliminar = useEliminarFormula()
  const { data: historial } = useHistorialFormula(verHistorialDe?.id ?? null)

  function abrirNueva() {
    setEditando(null)
    setEditorAbierto(true)
  }

  function abrirEdicion(formula: FormulaReporte) {
    setEditando(formula)
    setEditorAbierto(true)
  }

  async function guardarDesdeElEditor(body: FormulaReporteRequest) {
    if (editando) await guardar.mutateAsync({ id: editando.id, body })
    else await crear.mutateAsync(body)
    setEditorAbierto(false)
  }

  return (
    <div className="rounded-lg border bg-background">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div>
          <h2 className="text-sm font-medium">Fórmulas</h2>
          <p className="text-[12px] text-muted-foreground">
            Cálculos con nombre que se pueden colocar en cualquier reporte.
          </p>
        </div>
        {puedeEditar && (
          <Button size="sm" onClick={abrirNueva} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            Nueva fórmula
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="p-6 text-[13px] text-muted-foreground">Cargando…</div>
      ) : !formulas?.length ? (
        <div className="flex flex-col items-center gap-2 p-10 text-center">
          <Calculator className="h-8 w-8 text-muted-foreground/40" strokeWidth={1.5} />
          <p className="text-[13px] text-muted-foreground">
            Todavía no hay fórmulas. Con una se puede calcular, por ejemplo, el índice de
            masa corporal a partir del peso y la estatura.
          </p>
          {puedeEditar && (
            <Button variant="outline" size="sm" onClick={abrirNueva}>
              Crear la primera
            </Button>
          )}
        </div>
      ) : (
        <div className="divide-y">
          {formulas.map((f) => (
            <div key={f.id} className="flex items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className={cn('truncate text-sm font-medium', !f.activo && 'text-muted-foreground')}>
                    {f.nombre}
                  </span>
                  {!f.activo && <Badge variant="secondary" className="text-[10px]">Retirada</Badge>}
                  {f.version > 1 && (
                    <Badge variant="outline" className="text-[10px]">versión {f.version}</Badge>
                  )}
                </div>
                <div className="truncate font-mono text-[12px] text-muted-foreground">
                  {f.expresion}
                  {f.unidadSalida ? ` → ${f.unidadSalida}` : ''}
                </div>
              </div>

              {f.version > 1 && (
                <Button
                  variant="ghost" size="icon" className="h-8 w-8"
                  onClick={() => setVerHistorialDe(f)}
                  aria-label={`Ver versiones anteriores de ${f.nombre}`}
                >
                  <History className="h-3.5 w-3.5" />
                </Button>
              )}

              {puedeEditar && (
                <>
                  <Button
                    variant="ghost" size="icon" className="h-8 w-8"
                    onClick={() => abrirEdicion(f)}
                    aria-label={`Editar ${f.nombre}`}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost" size="icon" className="h-8 w-8"
                    onClick={() => toggle.mutate(f.id)}
                    aria-label={f.activo ? `Retirar ${f.nombre} de uso` : `Poner ${f.nombre} en uso`}
                  >
                    {f.activo
                      ? <ToggleRight className="h-4 w-4" />
                      : <ToggleLeft className="h-4 w-4 text-muted-foreground" />}
                  </Button>
                  <Button
                    variant="ghost" size="icon" className="h-8 w-8"
                    onClick={() => setPorEliminar(f)}
                    aria-label={`Eliminar ${f.nombre}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      <EditorFormula
        abierto={editorAbierto}
        onCerrar={() => setEditorAbierto(false)}
        formula={editando}
        onGuardar={guardarDesdeElEditor}
        guardando={crear.isPending || guardar.isPending}
      />

      {/* Las versiones anteriores: con qué cálculo salieron los reportes de entonces. */}
      <Dialog open={verHistorialDe != null} onOpenChange={(o) => !o && setVerHistorialDe(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Versiones de «{verHistorialDe?.nombre}»</DialogTitle>
            <DialogDescription>
              Con qué cálculo salieron los reportes emitidos antes de cada cambio.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <div className="rounded-md border border-primary/40 p-2.5">
              <div className="flex items-center gap-2">
                <Badge className="text-[10px]">versión {verHistorialDe?.version} · en uso</Badge>
              </div>
              <p className="mt-1 font-mono text-[12px]">{verHistorialDe?.expresion}</p>
            </div>
            {historial?.map((h) => (
              <div key={h.version} className="rounded-md border p-2.5">
                <Badge variant="secondary" className="text-[10px]">versión {h.version}</Badge>
                <p className="mt-1 font-mono text-[12px] text-muted-foreground">{h.expresion}</p>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={porEliminar != null} onOpenChange={(o) => !o && setPorEliminar(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar «{porEliminar?.nombre}»?</AlertDialogTitle>
            <AlertDialogDescription>
              Los reportes que la usen dejarán de mostrar ese valor. Si solo desea que no se
              ofrezca al diseñar, conviene retirarla de uso en lugar de eliminarla: así se
              conserva con qué se calcularon los reportes ya emitidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (porEliminar) eliminar.mutate(porEliminar.id)
                setPorEliminar(null)
              }}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
