import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ChevronLeft, ChevronRight, Search } from 'lucide-react'
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

const PAGE_SIZE = 20

export function BitacoraPermisosTab() {
  const [page, setPage] = useState(0)
  const [uuidFilter, setUuidFilter] = useState('')
  const [searchInput, setSearchInput] = useState('')

  const { data, isLoading } = useBitacoraPermisos({
    uuid: uuidFilter || undefined,
    page,
    size: PAGE_SIZE,
  })

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setUuidFilter(searchInput.trim())
    setPage(0)
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Filtrar por UUID de usuario..."
            className="pl-9 h-9 text-[13px]"
          />
        </div>
        <Button type="submit" variant="outline" size="sm" className="h-9">
          Filtrar
        </Button>
        {uuidFilter && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-9"
            onClick={() => { setUuidFilter(''); setSearchInput(''); setPage(0) }}
          >
            Limpiar
          </Button>
        )}
      </form>

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
                  <TableHead className="w-[180px]">Accion</TableHead>
                  <TableHead>Detalle</TableHead>
                  <TableHead className="w-[120px]">Usuario afectado</TableHead>
                  <TableHead className="w-[120px]">Realizado por</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.content.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground text-[13px] py-8">
                      Sin registros en la bitacora.
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
                      <TableCell className="text-[11px] font-mono text-muted-foreground">
                        {entry.usuarioAfectadoUuid?.slice(0, 8) ?? '—'}
                      </TableCell>
                      <TableCell className="text-[11px] font-mono text-muted-foreground">
                        {entry.realizadoPorUuid.slice(0, 8)}
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
              {data.totalElements} registro{data.totalElements !== 1 ? 's' : ''} · Pagina {data.number + 1} de {Math.max(data.totalPages, 1)}
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
