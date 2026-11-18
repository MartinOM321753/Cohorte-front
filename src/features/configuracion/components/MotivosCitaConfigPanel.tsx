import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { GripVertical, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { CLAVE_MOTIVOS, MOTIVOS_CITA_DEFAULT } from '@/features/citas/constants/motivosCita'
import { useGetConfiguracionClave, useSetConfiguracionClave } from '../hooks/useConfiguracionClave'

export default function MotivosCitaConfigPanel() {
  const { data: raw, isLoading } = useGetConfiguracionClave(CLAVE_MOTIVOS)
  const setConfig = useSetConfiguracionClave()

  const [motivos, setMotivos] = useState<string[]>([])
  const [nuevo, setNuevo] = useState('')
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as string[]
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMotivos(parsed)
          return
        }
      } catch { /* ignore */ }
    }
    setMotivos([...MOTIVOS_CITA_DEFAULT])
  }, [raw])

  function handleAdd() {
    const val = nuevo.trim()
    if (!val) return
    if (motivos.some((m) => m.toLowerCase() === val.toLowerCase())) {
      toast.warning('Ese motivo ya existe')
      return
    }
    setMotivos((prev) => [...prev, val])
    setNuevo('')
    setDirty(true)
  }

  function handleRemove(idx: number) {
    setMotivos((prev) => prev.filter((_, i) => i !== idx))
    setDirty(true)
  }

  function handleSave() {
    if (motivos.length === 0) {
      toast.warning('Debe haber al menos un motivo')
      return
    }
    setConfig.mutate(
      { clave: CLAVE_MOTIVOS, valor: JSON.stringify(motivos) },
      {
        onSuccess: () => {
          toast.success('Motivos de cita guardados')
          setDirty(false)
        },
      },
    )
  }

  function handleReset() {
    setMotivos([...MOTIVOS_CITA_DEFAULT])
    setDirty(true)
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-[15px]">Motivos de Cita</CardTitle>
            <CardDescription className="text-[13px]">
              Opciones predefinidas que aparecen al agendar o editar una cita.
            </CardDescription>
          </div>
          {dirty && (
            <Badge variant="outline" className="text-[11px] text-amber-600 border-amber-300">
              Sin guardar
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-6">
            <Spinner className="h-5 w-5" />
          </div>
        ) : (
          <>
            {/* Lista de motivos */}
            <div className="space-y-1.5">
              {motivos.map((m, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 rounded-md border border-[var(--border)] px-3 py-2 text-[13px] text-[var(--imss-ink-900)] hover:bg-[var(--imss-ink-50)]"
                >
                  <GripVertical className="h-3.5 w-3.5 flex-shrink-0 text-[var(--imss-ink-300)]" strokeWidth={1.75} />
                  <span className="flex-1">{m}</span>
                  <button
                    type="button"
                    onClick={() => handleRemove(idx)}
                    className="flex h-6 w-6 items-center justify-center rounded text-[var(--imss-ink-400)] hover:bg-red-50 hover:text-red-600"
                    title="Eliminar"
                  >
                    <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                  </button>
                </div>
              ))}
              {motivos.length === 0 && (
                <p className="py-4 text-center text-[13px] text-[var(--imss-ink-300)]">
                  Sin motivos configurados
                </p>
              )}
            </div>

            {/* Agregar motivo */}
            <div className="flex items-center gap-2">
              <Input
                value={nuevo}
                onChange={(e) => setNuevo(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAdd())}
                placeholder="Nuevo motivo…"
                className="h-9 flex-1 text-[13px]"
                maxLength={100}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAdd}
                disabled={!nuevo.trim()}
                className="h-9 gap-1 text-[13px]"
              >
                <Plus className="h-3.5 w-3.5" strokeWidth={1.75} />
                Agregar
              </Button>
            </div>

            {/* Acciones */}
            <div className="flex items-center justify-between pt-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleReset}
                className="text-[12px] text-[var(--imss-ink-400)] hover:text-[var(--imss-ink-700)]"
              >
                Restaurar predeterminados
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleSave}
                disabled={!dirty || setConfig.isPending}
                className="bg-[var(--imss-green-500)] text-white hover:bg-[var(--imss-green-700)] text-[13px]"
              >
                {setConfig.isPending ? 'Guardando…' : 'Guardar motivos'}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
