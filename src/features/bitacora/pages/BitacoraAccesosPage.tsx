import { useState } from 'react'
import { format } from 'date-fns'
import { PageHeader } from '@/components/layout/PageHeader'
import { BitacoraFiltros } from '../components/BitacoraFiltros'
import { BitacoraAccesosTable } from '../components/BitacoraAccesosTable'
import { useGetBitacoraAccesos } from '../hooks/useGetBitacoraAccesos'
import type { FiltrosAcceso, TipoEventoAcceso } from '../types/bitacora.types'

const PAGE_SIZE = 20

const defaultFiltros: FiltrosAcceso = {
  desde: null,
  hasta: null,
  usuarioUuid: null,
  tipoEvento: '',
  page: 0,
  size: PAGE_SIZE,
}

function toISODate(d: Date | undefined): string | null {
  if (!d) return null
  return format(d, 'yyyy-MM-dd')
}

export default function BitacoraAccesosPage() {
  const [filtros, setFiltros] = useState<FiltrosAcceso>(defaultFiltros)
  const { data, isLoading } = useGetBitacoraAccesos(filtros)

  function handleApply(f: {
    desde: Date | undefined
    hasta: Date | undefined
    usuarioUuid: string
    tipoEvento: TipoEventoAcceso | ''
  }) {
    setFiltros({
      desde: toISODate(f.desde),
      hasta: toISODate(f.hasta),
      usuarioUuid: f.usuarioUuid || null,
      tipoEvento: f.tipoEvento,
      page: 0,
      size: PAGE_SIZE,
    })
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader
        title="Bitácora de Accesos"
        subtitle="Registro de eventos de inicio de sesión, cierre y accesos fallidos"
      />
      <BitacoraFiltros
        tipo="accesos"
        onApply={handleApply}
        onReset={() => setFiltros(defaultFiltros)}
      />
      <BitacoraAccesosTable
        data={data}
        isLoading={isLoading}
        page={filtros.page}
        onPageChange={(p) => setFiltros((prev) => ({ ...prev, page: p }))}
      />
    </div>
  )
}
