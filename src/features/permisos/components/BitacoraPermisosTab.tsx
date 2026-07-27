import { useState, useMemo } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Check, ChevronLeft, ChevronRight, ChevronsUpDown, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useQuery } from '@tanstack/react-query'
import api from '@/lib/axiosInstance'
import { useBitacoraPermisos } from '../hooks/usePermisos'
import { humanizarTextoConCodigos } from '@/config/permisoLabels'
import { formatDateTime } from '@/lib/utils'

const ACCION_STYLES: Record<string, string> = {
  ROL_ASIGNADO: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  ROL_REMOVIDO: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  PERMISO_CONCEDIDO: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  PERMISO_RESTRINGIDO: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  PERMISO_INDIVIDUAL_REVOCADO: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
  PERMISOS_ROL_ACTUALIZADOS: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
}

interface UserRow {
  uuid: string
  username: string
  persona: {
    nombre: string
    apellidoPaterno: string
    apellidoMaterno: string
  } | null
}

function useUsuariosSimple() {
  return useQuery({
    queryKey: ['permisos', 'usuarios-list'],
    queryFn: async () => {
      const res = await api.get<{ data: UserRow[] }>('/users')
      return res.data.data
    },
  })
}

function buildNombreCompleto(u: UserRow): string {
  if (!u.persona) return u.username
  return [u.persona.nombre, u.persona.apellidoPaterno, u.persona.apellidoMaterno]
    .filter(Boolean).join(' ') || u.username
}

const PAGE_SIZE = 20

export function BitacoraPermisosTab() {
  const [page, setPage] = useState(0)
  const [uuidFilter, setUuidFilter] = useState('')
  const [comboOpen, setComboOpen] = useState(false)

  const { data: users } = useUsuariosSimple()
  const { data, isLoading } = useBitacoraPermisos({
    uuid: uuidFilter || undefined,
    page,
    size: PAGE_SIZE,
  })

  const selectedUser = useMemo(
    () => (users ?? []).find((u) => u.uuid === uuidFilter),
    [users, uuidFilter],
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Popover open={comboOpen} onOpenChange={setComboOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={comboOpen}
              className="w-[320px] justify-between h-9 text-[13px] font-normal"
            >
              <span className="truncate">
                {selectedUser
                  ? `${buildNombreCompleto(selectedUser)} (${selectedUser.username})`
                  : 'Filtrar por usuario...'}
              </span>
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[320px] p-0" align="start">
            <Command>
              <CommandInput placeholder="Buscar usuario..." className="text-[13px]" />
              <CommandList>
                <CommandEmpty className="text-[13px] py-4 text-center">
                  Sin resultados.
                </CommandEmpty>
                <CommandGroup>
                  {(users ?? []).map((u) => {
                    const label = buildNombreCompleto(u)
                    return (
                      <CommandItem
                        key={u.uuid}
                        value={`${label} ${u.username}`}
                        onSelect={() => {
                          setUuidFilter(u.uuid === uuidFilter ? '' : u.uuid)
                          setPage(0)
                          setComboOpen(false)
                        }}
                        className="text-[13px]"
                      >
                        <Check
                          className={cn('mr-2 h-4 w-4', uuidFilter === u.uuid ? 'opacity-100' : 'opacity-0')}
                        />
                        <div className="flex flex-col min-w-0">
                          <span className="truncate">{label}</span>
                          <span className="text-[11px] text-muted-foreground">{u.username}</span>
                        </div>
                      </CommandItem>
                    )
                  })}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {uuidFilter && (
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={() => { setUuidFilter(''); setPage(0) }}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {isLoading && (
        <div className="flex justify-center py-12"><Spinner className="h-6 w-6" /></div>
      )}

      {data && (
        <>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[170px]">Fecha</TableHead>
                  <TableHead className="w-[180px]">Acción</TableHead>
                  <TableHead>Detalle</TableHead>
                  <TableHead className="w-[160px]">Usuario afectado</TableHead>
                  <TableHead className="w-[160px]">Realizado por</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.content.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground text-[13px] py-8">
                      Sin registros en la bitácora.
                    </TableCell>
                  </TableRow>
                ) : (
                  data.content.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="text-[12px] text-muted-foreground whitespace-nowrap">
                        {formatDateTime(entry.timestamp)}
                      </TableCell>
                      <TableCell>
                        <Badge className={(ACCION_STYLES[entry.accion] ?? 'bg-muted text-muted-foreground') + ' text-[10px]'}>
                          {entry.accion.replace(/_/g, ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-[12px] max-w-[300px] truncate" title={entry.detalle}>
                        {humanizarTextoConCodigos(entry.detalle)}
                      </TableCell>
                      <TableCell className="text-[12px] text-muted-foreground max-w-[160px] truncate" title={entry.usuarioAfectadoNombre ?? undefined}>
                        {entry.usuarioAfectadoNombre ?? '—'}
                      </TableCell>
                      <TableCell className="text-[12px] text-muted-foreground max-w-[160px] truncate" title={entry.realizadoPorNombre ?? undefined}>
                        {entry.realizadoPorNombre ?? entry.realizadoPorUuid}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between text-[12px] text-muted-foreground">
            <span>
              {data.totalElements} registro{data.totalElements !== 1 ? 's' : ''} · Página {data.number + 1} de {Math.max(data.totalPages, 1)}
            </span>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                disabled={data.first}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                disabled={data.last}
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
