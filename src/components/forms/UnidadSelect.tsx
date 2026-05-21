import { useState } from 'react'
import { Check, ChevronsUpDown, Plus, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { useGetUnidadesActivas, useCreateUnidad } from '@/features/catalogos/hooks/useUnidades'

interface UnidadSelectProps {
  value: string
  onChange: (value: string) => void
  error?: string
  placeholder?: string
  disabled?: boolean
  /** Compact variant for inline forms (h-8, text-sm) */
  compact?: boolean
}

export function UnidadSelect({
  value,
  onChange,
  error,
  placeholder = 'Selecciona unidad...',
  disabled = false,
  compact = false,
}: UnidadSelectProps) {
  const [openCombo, setOpenCombo] = useState(false)
  const [openNew, setOpenNew] = useState(false)
  const [newNombre, setNewNombre] = useState('')
  const [newError, setNewError] = useState('')

  const { data: unidades = [], isLoading } = useGetUnidadesActivas()
  const createMutation = useCreateUnidad()

  const handleSelect = (nombre: string) => {
    onChange(nombre)
    setOpenCombo(false)
  }

  const handleCreate = async () => {
    const trimmed = newNombre.trim()
    if (!trimmed) { setNewError('El nombre es obligatorio'); return }
    if (trimmed.length > 30) { setNewError('Máximo 30 caracteres'); return }
    setNewError('')
    createMutation.mutate(
      { nombre: trimmed },
      {
        onSuccess: (created) => {
          onChange(created.nombre)
          setOpenNew(false)
          setNewNombre('')
        },
        onError: (err: any) => {
          const msg = err?.response?.data?.message || 'Error al crear la unidad'
          setNewError(msg)
        },
      }
    )
  }

  return (
    <>
      <div className="flex gap-1.5">
        <Popover open={openCombo} onOpenChange={setOpenCombo} modal={true}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={openCombo}
              disabled={disabled || isLoading}
              className={cn(
                'flex-1 justify-between font-normal',
                compact ? 'h-8 text-sm' : '',
                error ? 'border-destructive' : ''
              )}
            >
              <span className={cn(!value && 'text-muted-foreground')}>
                {value || placeholder}
              </span>
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-52 p-0">
            <Command filter={(val, search) =>
              val.toLowerCase().includes(search.toLowerCase()) ? 1 : 0
            }>
              <CommandInput placeholder="Buscar unidad..." />
              <CommandList>
                <CommandEmpty>
                  {isLoading ? 'Cargando…' : 'Sin resultados.'}
                </CommandEmpty>
                <CommandGroup>
                  {unidades.map((u) => (
                    <CommandItem
                      key={u.id}
                      value={u.nombre}
                      onSelect={() => handleSelect(u.nombre)}
                    >
                      <Check
                        className={cn(
                          'mr-2 h-4 w-4',
                          value === u.nombre ? 'opacity-100' : 'opacity-0'
                        )}
                      />
                      {u.nombre}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        <Button
          type="button"
          variant="outline"
          size="icon"
          disabled={disabled}
          onClick={() => { setNewNombre(''); setNewError(''); setOpenNew(true) }}
          title="Agregar nueva unidad"
          className={cn(compact ? 'h-8 w-8' : '')}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {error && (
        <p className="mt-1.5 flex items-center gap-1 text-xs text-destructive">
          <AlertCircle className="h-3 w-3" strokeWidth={1.75} />
          {error}
        </p>
      )}

      <Dialog open={openNew} onOpenChange={setOpenNew}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Nueva unidad de medida</DialogTitle>
            <DialogDescription>
              Ingresa el nombre de la nueva unidad. Quedará activa de inmediato.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="nueva-unidad">Nombre *</Label>
            <Input
              id="nueva-unidad"
              placeholder="Ej. mg/dL, UI/mL, %..."
              value={newNombre}
              maxLength={30}
              onChange={(e) => { setNewNombre(e.target.value); setNewError('') }}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              className={newError ? 'border-destructive' : ''}
            />
            {newError && (
              <p className="flex items-center gap-1 text-xs text-destructive">
                <AlertCircle className="h-3 w-3" strokeWidth={1.75} />
                {newError}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenNew(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Guardando...' : 'Crear y seleccionar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
