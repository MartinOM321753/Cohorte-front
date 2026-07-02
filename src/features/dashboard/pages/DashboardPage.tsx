import { useMemo, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { CitaIlamyEventForm } from "@/features/citas/components/CitaIlamyEventForm";
import { CalendarDays, FlaskConical, Stethoscope } from "lucide-react";

import {
  useDashboardStats,
  useAgendaHoy,
  useExamenesCalidad,
  useBiobancoOcupacion,
  useBiobancoOcupacionCajas,
} from "../hooks/useDashboard";

import {
  FeatureKPI,
  SupportKPI,
  MiniStatStrip,
  SomatometriaGlobalCharts,
  ExamenesGlobalCharts,
  ExamenesCalidadDonut,
  BiobancoCapacity,
  AgendaHoyPanel,
} from "../components/DashboardCharts";

// ─────────────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { data: stats, isLoading: stL } = useDashboardStats();
  const { data: agenda = [], isLoading: agL } = useAgendaHoy();
  const { data: calidad } = useExamenesCalidad();
  const { data: biobanco = [] } = useBiobancoOcupacion();
  const { data: cajas = [] } = useBiobancoOcupacionCajas();

  // Formulario de edición de cita desde la agenda
  const [editingCitaUuid, setEditingCitaUuid] = useState<string | null>(null);
  const editingCitaEvent = useMemo(() => {
    if (!editingCitaUuid) return null;
    const cita = agenda.find((c) => c.uuid === editingCitaUuid);
    if (!cita) return null;

    // Reconstruir la fecha+hora local desde horaInicio (el endpoint solo devuelve "HH:mm")
    const [h, m] = cita.horaInicio.split(":").map(Number);
    const startDate = new Date();
    startDate.setHours(h, m, 0, 0);
    const tzOffset = startDate.getTimezoneOffset() * 60000;
    const startAtLocal = new Date(startDate.getTime() - tzOffset)
      .toISOString()
      .slice(0, 16);

    return {
      id: cita.uuid,
      title: cita.paciente.nombreCompleto,
      start: null as any,
      end: null as any,
      data: {
        cita: {
          uuid: cita.uuid,
          estadoCita: cita.estadoCita,
          colorHex: cita.colorHex,
          observaciones: cita.observaciones,
          duracionMinutos: cita.duracionMinutos,
          startAtLocal,
          paciente: { nombreCompleto: cita.paciente.nombreCompleto },
        },
      },
    };
  }, [editingCitaUuid, agenda]);

  return (
    <div className="flex flex-col gap-5">
      {/* ── Header ── */}
      <PageHeader
        title="Panel general"
        // subtitle="Resumen operativo · UMAE Siglo XXI"
      />

      {/* ── Fila 1: FeatureKPI + 3 SupportKPI — ancho completo ── */}
      <div className="grid grid-cols-1 gap-3 min-[400px]:grid-cols-2 sm:gap-4 sm:grid-cols-4">
        <FeatureKPI stats={stats} isLoading={stL} />
        <SupportKPI
          label="Citas del mes"
          value={stats?.citasMes}
          icon={CalendarDays}
          isLoading={stL}
          delta={
            (stats?.citasSinActualizar ?? 0) > 0
              ? `${stats!.citasSinActualizar} sin actualizar`
              : undefined
          }
          deltaVariant={
            (stats?.citasSinActualizar ?? 0) > 0 ? "warning" : undefined
          }
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

      {/* ── Fila 2: Mini-stat strip — ancho completo ── */}
      <MiniStatStrip stats={stats} isLoading={stL} />

      {/* ── Fila 3+: gráficas + agenda lateral ── */}
      <div className="grid gap-4 lg:gap-5 lg:grid-cols-[1fr_300px] items-start">
        {/* ══ Columna principal: gráficas ══ */}
        <div className="flex flex-col gap-5">
          {/* Somatometría — ancho completo */}
          <SomatometriaGlobalCharts />

          {/* Exámenes + Calidad + Biobanco — 3 columnas iguales */}
          <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
            <ExamenesGlobalCharts />
            <ExamenesCalidadDonut data={calidad} />
          </div>
          <BiobancoCapacity refrigeradores={biobanco} cajas={cajas} />
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
  );
}
