import { useState } from 'react'
import { format } from 'date-fns'
import { PageHeader } from '@/components/layout/PageHeader'
import { BitacoraFiltros } from '../components/BitacoraFiltros'
import { BitacoraAccionesTable } from '../components/BitacoraAccionesTable'
import { useGetBitacoraAcciones } from '../hooks/useGetBitacoraAcciones'
import type { FiltrosAcciones, TipoAccion } from '../types/bitacora.types'

const PAGE_SIZE = 20

const defaultFiltros: FiltrosAcciones = {
  desde: null,
  hasta: null,
  usuarioUuid: null,
  tipoAccion: '',
  entidad: null,
  page: 0,
  size: PAGE_SIZE,
}

function toISODate(d: Date | undefined): string | null {
  if (!d) return null
  return format(d, 'yyyy-MM-dd')
}

export default function BitacoraAccionesPage() {
  const [filtros, setFiltros] = useState<FiltrosAcciones>(defaultFiltros)
  const { data, isLoading } = useGetBitacoraAcciones(filtros)

  function handleApply(f: {
    desde: Date | undefined
    hasta: Date | undefined
    usuarioUuid: string
    tipoAccion: TipoAccion | ''
    entidad: string
  }) {
    setFiltros({
      desde: toISODate(f.desde),
      hasta: toISODate(f.hasta),
      usuarioUuid: f.usuarioUuid || null,
      tipoAccion: f.tipoAccion,
      entidad: f.entidad || null,
      page: 0,
      size: PAGE_SIZE,
    })
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader
        title="Bitácora de Acciones"
        subtitle="Registro de operaciones de escritura realizadas en el sistema (crear, actualizar, eliminar)"
      />
      <BitacoraFiltros
        tipo="acciones"
        onApply={handleApply}
        onReset={() => setFiltros(defaultFiltros)}
      />
      <BitacoraAccionesTable
        data={data}
        isLoading={isLoading}
        page={filtros.page}
        onPageChange={(p) => setFiltros((prev) => ({ ...prev, page: p }))}
      />
    </div>
  )
}
