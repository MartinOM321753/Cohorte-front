import { useMemo, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { CitaIlamyEventForm } from "@/features/citas/components/CitaIlamyEventForm";
import { CalendarDays, FlaskConical, Stethoscope } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";

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
  const hasPermiso = useAuthStore((s) => s.hasPermiso);
  const puedeKPI = hasPermiso("DASHBOARD_KPI_VER");
  const puedeSomatometria = hasPermiso("DASHBOARD_SOMATOMETRIA_VER");
  const puedeExamenes = hasPermiso("DASHBOARD_EXAMENES_VER");
  const puedeBiobanco = hasPermiso("DASHBOARD_BIOBANCO_VER");
  const puedeAgenda = hasPermiso("DASHBOARD_AGENDA_VER");

  const { data: stats, isLoading: stL } = useDashboardStats({ enabled: puedeKPI });
  const { data: agenda = [], isLoading: agL } = useAgendaHoy({ enabled: puedeAgenda });
  const { data: calidad } = useExamenesCalidad({ enabled: puedeExamenes });
  const { data: biobanco = [] } = useBiobancoOcupacion({ enabled: puedeBiobanco });
  const { data: cajas = [] } = useBiobancoOcupacionCajas({ enabled: puedeBiobanco });

  const [editingCitaUuid, setEditingCitaUuid] = useState<string | null>(null);
  const editingCitaEvent = useMemo(() => {
    if (!editingCitaUuid) return null;
    const cita = agenda.find((c) => c.uuid === editingCitaUuid);
    if (!cita) return null;

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

  const showSideAgenda = puedeAgenda;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Panel general" />

      {puedeKPI && (
        <>
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

          <MiniStatStrip stats={stats} isLoading={stL} />
        </>
      )}

      <div className={`grid gap-4 lg:gap-5 items-start ${showSideAgenda ? 'lg:grid-cols-[1fr_300px]' : 'lg:grid-cols-1'}`}>
        <div className="flex flex-col gap-5">
          {puedeSomatometria && <SomatometriaGlobalCharts />}

          {puedeExamenes && (
            <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
              <ExamenesGlobalCharts />
              <ExamenesCalidadDonut data={calidad} />
            </div>
          )}

          {puedeBiobanco && <BiobancoCapacity refrigeradores={biobanco} cajas={cajas} />}
        </div>

        {showSideAgenda && (
          <AgendaHoyPanel
            data={agenda}
            isLoading={agL}
            onCitaClick={setEditingCitaUuid}
          />
        )}
      </div>

      <CitaIlamyEventForm
        open={editingCitaEvent !== null}
        selectedEvent={editingCitaEvent as any}
        onClose={() => setEditingCitaUuid(null)}
      />
    </div>
  );
}
