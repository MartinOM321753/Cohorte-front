import { useState } from 'react'
import { format } from 'date-fns'
import { PageHeader } from '@/components/layout/PageHeader'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { BitacoraFiltros } from '../components/BitacoraFiltros'
import { BitacoraAccesosTable } from '../components/BitacoraAccesosTable'
import { BitacoraAccionesTable } from '../components/BitacoraAccionesTable'
import { useGetBitacoraAccesos } from '../hooks/useGetBitacoraAccesos'
import { useGetBitacoraAcciones } from '../hooks/useGetBitacoraAcciones'
import type { FiltrosAcceso, FiltrosAcciones, TipoEventoAcceso, TipoAccion } from '../types/bitacora.types'

const PAGE_SIZE = 20

// ── Estado inicial de filtros ─────────────────────────────────────────────────

const defaultFiltrosAcceso: FiltrosAcceso = {
  desde: null,
  hasta: null,
  usuarioUuid: null,
  tipoEvento: '',
  page: 0,
  size: PAGE_SIZE,
}

const defaultFiltrosAcciones: FiltrosAcciones = {
  desde: null,
  hasta: null,
  usuarioUuid: null,
  tipoAccion: '',
  entidad: null,
  page: 0,
  size: PAGE_SIZE,
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function toISODate(d: Date | undefined): string | null {
  if (!d) return null
  return format(d, 'yyyy-MM-dd')
}

// ── Página ────────────────────────────────────────────────────────────────────

export default function BitacoraPage() {
  // ── Accesos ──────────────────────────────────────────────────────────────────
  const [filtrosAcceso, setFiltrosAcceso] = useState<FiltrosAcceso>(defaultFiltrosAcceso)
  const { data: dataAccesos, isLoading: loadingAccesos } = useGetBitacoraAccesos(filtrosAcceso)

  // ── Acciones ─────────────────────────────────────────────────────────────────
  const [filtrosAcciones, setFiltrosAcciones] = useState<FiltrosAcciones>(defaultFiltrosAcciones)
  const { data: dataAcciones, isLoading: loadingAcciones } = useGetBitacoraAcciones(filtrosAcciones)

  // ── Handlers filtros accesos ─────────────────────────────────────────────────
  function handleApplyAccesos(f: {
    desde: Date | undefined
    hasta: Date | undefined
    usuarioUuid: string
    tipoEvento: TipoEventoAcceso | ''
  }) {
    setFiltrosAcceso({
      desde: toISODate(f.desde),
      hasta: toISODate(f.hasta),
      usuarioUuid: f.usuarioUuid || null,
      tipoEvento: f.tipoEvento,
      page: 0,
      size: PAGE_SIZE,
    })
  }

  function handleResetAccesos() {
    setFiltrosAcceso(defaultFiltrosAcceso)
  }

  function handlePageAccesos(p: number) {
    setFiltrosAcceso((prev) => ({ ...prev, page: p }))
  }

  // ── Handlers filtros acciones ────────────────────────────────────────────────
  function handleApplyAcciones(f: {
    desde: Date | undefined
    hasta: Date | undefined
    usuarioUuid: string
    tipoAccion: TipoAccion | ''
    entidad: string
  }) {
    setFiltrosAcciones({
      desde: toISODate(f.desde),
      hasta: toISODate(f.hasta),
      usuarioUuid: f.usuarioUuid || null,
      tipoAccion: f.tipoAccion,
      entidad: f.entidad || null,
      page: 0,
      size: PAGE_SIZE,
    })
  }

  function handleResetAcciones() {
    setFiltrosAcciones(defaultFiltrosAcciones)
  }

  function handlePageAcciones(p: number) {
    setFiltrosAcciones((prev) => ({ ...prev, page: p }))
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader
        title="Bitácora"
        subtitle="Registro de accesos y acciones realizadas en el sistema"
      />

      <Tabs defaultValue="accesos">
        <TabsList className="h-9">
          <TabsTrigger value="accesos" className="text-[13px]">
            Accesos
          </TabsTrigger>
          <TabsTrigger value="acciones" className="text-[13px]">
            Acciones
          </TabsTrigger>
        </TabsList>

        {/* ── Tab: Accesos ───────────────────────────────────────────────────── */}
        <TabsContent value="accesos" className="mt-4 flex flex-col gap-4">
          <BitacoraFiltros
            tipo="accesos"
            onApply={handleApplyAccesos}
            onReset={handleResetAccesos}
          />
          <BitacoraAccesosTable
            data={dataAccesos}
            isLoading={loadingAccesos}
            page={filtrosAcceso.page}
            onPageChange={handlePageAccesos}
          />
        </TabsContent>

        {/* ── Tab: Acciones ──────────────────────────────────────────────────── */}
        <TabsContent value="acciones" className="mt-4 flex flex-col gap-4">
          <BitacoraFiltros
            tipo="acciones"
            onApply={handleApplyAcciones}
            onReset={handleResetAcciones}
          />
          <BitacoraAccionesTable
            data={dataAcciones}
            isLoading={loadingAcciones}
            page={filtrosAcciones.page}
            onPageChange={handlePageAcciones}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
