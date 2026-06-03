import { useMemo, useState } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { CitaIlamyEventForm } from '@/features/citas/components/CitaIlamyEventForm'
import { CalendarDays, FlaskConical, Stethoscope } from 'lucide-react'

import {
  useDashboardStats,
  useAgendaHoy,
  useExamenesCalidad,
  useBiobancoOcupacion,
} from '../hooks/useDashboard'

import {
  FeatureKPI,
  SupportKPI,
  MiniStatStrip,
  SomatometriaGlobalCharts,
  ExamenesGlobalCharts,
  ExamenesCalidadDonut,
  BiobancoCapacity,
  AgendaHoyPanel,
} from '../components/DashboardCharts'

// ─────────────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { data: stats, isLoading: stL } = useDashboardStats()
  const { data: agenda = [], isLoading: agL } = useAgendaHoy()
  const { data: calidad }                     = useExamenesCalidad()
  const { data: biobanco = [] }               = useBiobancoOcupacion()

  // Formulario de edición de cita desde la agenda
  const [editingCitaUuid, setEditingCitaUuid] = useState<string | null>(null)
  const editingCitaEvent = useMemo(() => {
    if (!editingCitaUuid) return null
    const cita = agenda.find((c) => c.uuid === editingCitaUuid)
    if (!cita) return null
    return {
      id:    cita.uuid,
      title: cita.paciente.nombreCompleto,
      start: null as any,
      end:   null as any,
      data: {
        cita: {
          uuid:          cita.uuid,
          estadoCita:    cita.estadoCita,
          colorHex:      cita.colorHex,
          observaciones: cita.observaciones,
          paciente:      { nombreCompleto: cita.paciente.nombreCompleto },
        },
      },
    }
  }, [editingCitaUuid, agenda])

  return (
    <div className="flex flex-col gap-5">
      {/* ── Header ── */}
      <PageHeader
        title="Panel general"
        subtitle="Resumen operativo · UMAE Siglo XXI"
      />

      {/* ── Layout: contenido principal + agenda lateral ── */}
      <div className="grid gap-5 xl:grid-cols-[1fr_300px] items-start">

        {/* ══ Columna principal ══ */}
        <div className="flex flex-col gap-5">

          {/* Fila 1: FeatureKPI + 3 SupportKPI */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {/* FeatureKPI ocupa 1 columna con altura fija igual a los SupportKPI */}
            <FeatureKPI stats={stats} isLoading={stL} />

            <SupportKPI
              label="Citas del mes"
              value={stats?.citasMes}
              icon={CalendarDays}
              isLoading={stL}
              delta={
                (stats?.citasSinActualizar ?? 0) > 0
                  ? `${stats!.citasSinActualizar} sin actualizar hoy`
                  : undefined
              }
              deltaVariant={(stats?.citasSinActualizar ?? 0) > 0 ? 'warning' : undefined}
            />
            <SupportKPI
              label="Estudios con resultado"
              value={stats?.estudiosConResultadosMes}
              icon={Stethoscope}
              isLoading={stL}
            />
            <SupportKPI
              label="Exámenes este mes"
              value={stats?.examenesLabMes}
              icon={FlaskConical}
              isLoading={stL}
            />
          </div>

          {/* Fila 2: Mini-stat strip */}
          <MiniStatStrip stats={stats} isLoading={stL} />

          {/* Fila 3: Somatometría + Donut calidad */}
          <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
            <SomatometriaGlobalCharts />
            <ExamenesCalidadDonut data={calidad} />
          </div>

          {/* Fila 4: Exámenes barras + Biobanco */}
          <div className="grid gap-4 md:grid-cols-2">
            <ExamenesGlobalCharts />
            <BiobancoCapacity data={biobanco} />
          </div>
        </div>

        {/* ══ Agenda lateral sticky ══ */}
        <AgendaHoyPanel
          data={agenda}
          isLoading={agL}
          onCitaClick={setEditingCitaUuid}
        />
      </div>

      {/* Modal de edición de cita */}
      <CitaIlamyEventForm
        open={editingCitaEvent !== null}
        selectedEvent={editingCitaEvent as any}
        onClose={() => setEditingCitaUuid(null)}
      />
    </div>
  )
}
