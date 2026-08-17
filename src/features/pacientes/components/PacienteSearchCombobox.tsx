import { useEffect, useState } from 'react'
import { Check, ChevronsUpDown, Loader2, Search, UserX } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { useDebounce } from '@/hooks/useDebounce'
import { buscarPacientes } from '../api/pacientes.api'
import { getPacienteBasicoByUUID } from '../api/pacientes.api'
import type { Paciente } from '@/types/api'

interface PacienteSearchComboboxProps {
  value?: string | null
  onChange: (uuid: string) => void
  onSelectPaciente?: (paciente: Paciente) => void
  placeholder?: string
  disabled?: boolean
  incluirJerarquia?: boolean
  /** Ofrece también los de solo consulta, marcados. Para paneles de historial, no de alta. */
  incluirSoloConsulta?: boolean
  modal?: boolean
  className?: string
  /** 'default' = botón combobox clásico; 'search' = input tipo barra de búsqueda */
  variant?: 'default' | 'search'
}

function getUUID(p: Paciente): string {
  return p.uuid || ''
}

function getLabel(p: Paciente): string {
  const nombre = [
    p.persona?.nombre,
    p.persona?.segundoNombre,
    p.persona?.apellidoPaterno,
    p.persona?.apellidoMaterno,
  ]
    .filter(Boolean)
    .join(' ')
  return `${p.folio} — ${nombre}`.trim()
}

export function PacienteSearchCombobox({
  value,
  onChange,
  onSelectPaciente,
  placeholder = 'Buscar participante…',
  disabled = false,
  incluirJerarquia = true,
  incluirSoloConsulta = false,
  modal = false,
  className,
  variant = 'default',
}: PacienteSearchComboboxProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 350)
  const [results, setResults] = useState<Paciente[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setLoading(true)
    buscarPacientes({
      q: debouncedSearch || undefined,
      incluirJerarquia,
      incluirSoloConsulta,
    })
      .then((data) => {
        if (!cancelled) setResults(data.content)
      })
      .catch(() => {
        if (!cancelled) setResults([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [open, debouncedSearch, incluirJerarquia, incluirSoloConsulta])

  useEffect(() => {
    if (!value) {
      setSelectedLabel(null)
      return
    }
    const found = results.find((p) => getUUID(p) === value)
    if (found) {
      setSelectedLabel(getLabel(found))
      return
    }
    if (selectedLabel) return
    let cancelled = false
    // Endpoint «básico»: solo la identidad. El de expediente responde 404 para los
    // de solo consulta y el desplegable acabaría mostrando el UUID crudo.
    getPacienteBasicoByUUID(value)
      .then((p) => {
        if (!cancelled) setSelectedLabel(getLabel(p))
      })
      .catch(() => {
        if (!cancelled) setSelectedLabel(value)
      })
    return () => { cancelled = true }
  }, [value, results])

  const displayText = value ? (selectedLabel ?? 'Cargando…') : placeholder
  const isSearch = variant === 'search'

  return (
    <Popover open={open} onOpenChange={setOpen} modal={modal}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            'w-full justify-between h-9 text-[13px]',
            isSearch && 'pl-9 font-normal',
            !value && 'text-muted-foreground',
            className,
          )}
        >
          {isSearch && (
            <Search className="absolute left-3 h-4 w-4 text-muted-foreground" />
          )}
          <span className="truncate">{displayText}</span>
          {!isSearch && (
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Buscar por folio, nombre o CURP..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList className="max-h-64">
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-6 text-[12px] text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Buscando…
              </div>
            ) : results.length === 0 ? (
              <CommandEmpty>No se encontró el participante.</CommandEmpty>
            ) : (
              <CommandGroup>
                {results.map((p) => {
                  const uuid = getUUID(p)
                  const label = getLabel(p)
                  return (
                    <CommandItem
                      key={uuid}
                      value={uuid}
                      onSelect={() => {
                        onChange(uuid)
                        onSelectPaciente?.(p)
                        setSelectedLabel(label)
                        setOpen(false)
                      }}
                      className={cn(!p.activo && 'opacity-60')}
                    >
                      <Check
                        className={cn(
                          'mr-2 h-4 w-4 shrink-0',
                          value === uuid ? 'opacity-100' : 'opacity-0'
                        )}
                      />
                      {!p.activo && (
                        <UserX className="mr-1.5 h-3 w-3 shrink-0 text-muted-foreground" />
                      )}
                      <span className="truncate text-[13px]">{label}</span>
                      {p.soloConsulta && (
                        <span className="ml-auto shrink-0 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                          solo consulta
                        </span>
                      )}
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
