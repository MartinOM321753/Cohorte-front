import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/layout/PageHeader'
import { RoleGuard } from '@/components/routes/RoleGuard'
import { useDashboardStats, useAgendaHoy, AgendaHoyItem } from '../hooks/useDashboard'
import { CalendarDays, TestTube2, UserRound, Clock, CalendarX } from 'lucide-react'
import type { ReactNode } from 'react'

// ── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  isLoading,
  icon,
  highlight,
  helper,
}: {
  label:     string
  value:     number
  isLoading: boolean
  icon:      ReactNode
  highlight?: boolean
  helper:    string
}) {
  return (
    <Card className="border border-border shadow-none">
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--imss-ink-500)]">
              {label}
            </div>
            <div className="mt-2">
              {isLoading ? (
                <Skeleton className="h-9 w-24" />
              ) : highlight ? (
                <div
                  className="text-[42px] leading-none text-foreground"
                  style={{ fontFamily: "'Fraunces', serif", fontStyle: 'italic', fontWeight: 500 }}
                >
                  {value}
                </div>
              ) : (
                <div className="tabular-nums text-[32px] font-semibold leading-none text-foreground">
                  {value}
                </div>
              )}
            </div>
            <div className="mt-2 text-[13px] text-muted-foreground">{helper}</div>
          </div>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[var(--imss-green-50)] text-[var(--primary)]">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ── Estado badge ──────────────────────────────────────────────────────────────

function EstadoBadge({ estado }: { estado: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    Programada:  { label: 'Programada',  cls: 'border-slate-300 text-slate-700 bg-slate-50' },
    Confirmada:  { label: 'Confirmada',  cls: 'border-green-400 text-green-700 bg-green-50' },
    Realizada:   { label: 'Realizada',   cls: 'border-blue-400  text-blue-700  bg-blue-50'  },
    No_Asistio:  { label: 'No asistió',  cls: 'border-red-300   text-red-600   bg-red-50'   },
  }
  const cfg = map[estado] ?? { label: estado, cls: 'border-border text-muted-foreground bg-muted/30' }
  return (
    <Badge variant="outline" className={`text-[11px] ${cfg.cls}`}>
      {cfg.label}
    </Badge>
  )
}

// ── Agenda item row ───────────────────────────────────────────────────────────

function AgendaRow({ cita }: { cita: AgendaHoyItem }) {
  const colorStripe = cita.colorHex ?? 'transparent'

  return (
    <div className="flex items-stretch gap-0 rounded-lg border border-border overflow-hidden">
      {/* Franja de color del evento */}
      <div className="w-1 shrink-0" style={{ backgroundColor: colorStripe }} />

      <div className="flex flex-1 items-center gap-4 px-4 py-3">
        {/* Hora — énfasis principal */}
        <div className="flex flex-col items-center shrink-0 min-w-[52px]">
          <span className="tabular-nums text-[22px] font-bold leading-none text-foreground">
            {cita.horaInicio}
          </span>
          <span className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-0.5">
            <Clock className="h-2.5 w-2.5" />
            {cita.horaFin}
          </span>
        </div>

        {/* Separador vertical */}
        <div className="w-px self-stretch bg-border" />

        {/* Paciente + duración */}
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-semibold leading-tight truncate">
            {cita.paciente.nombreCompleto || 'Sin nombre'}
          </p>
          <p className="text-[12px] text-muted-foreground mt-0.5">
            Folio: {cita.paciente.folio} · {cita.duracionMinutos} min
          </p>
          {cita.observaciones && (
            <p className="text-[11px] text-muted-foreground mt-1 truncate italic">
              {cita.observaciones}
            </p>
          )}
        </div>

        {/* Estado */}
        <EstadoBadge estado={cita.estadoCita} />
      </div>
    </div>
  )
}

// ── Dashboard page ─────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { data: stats, isLoading: loadingStats } = useDashboardStats()
  const { data: agenda = [], isLoading: loadingAgenda } = useAgendaHoy()

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Dashboard"
        subtitle="Resumen operativo del sistema."
      />

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <StatCard
          label="Pacientes activos"
          value={stats?.pacientesActivos ?? 0}
          isLoading={loadingStats}
          highlight
          helper="Pacientes en seguimiento activo."
          icon={<UserRound className="h-4 w-4" strokeWidth={1.75} />}
        />
        <StatCard
          label="Citas del mes"
          value={stats?.citasProgramadas ?? 0}
          isLoading={loadingStats}
          helper="Programadas o confirmadas en el mes actual."
          icon={<CalendarDays className="h-4 w-4" strokeWidth={1.75} />}
        />
        <RoleGuard allowedRoles={['LABORATORISTA', 'ADMINISTRADOR']}>
          <StatCard
            label="Muestras en biobanco"
            value={stats?.muestrasBiobanco ?? 0}
            isLoading={loadingStats}
            helper="Total registradas en almacenamiento."
            icon={<TestTube2 className="h-4 w-4" strokeWidth={1.75} />}
          />
        </RoleGuard>
      </div>

      {/* ── Agenda de hoy ── */}
      <Card className="border border-border shadow-none">
        <CardHeader className="px-6 pt-6 pb-4">
          <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-(--imss-ink-500)">
            Agenda de hoy
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-[14px] font-medium text-foreground">Citas clínicas</span>
            {!loadingAgenda && (
              <span className="text-[12px] text-muted-foreground">
                {agenda.length === 0
                  ? 'sin citas para hoy'
                  : `${agenda.length} cita${agenda.length !== 1 ? 's' : ''}`}
              </span>
            )}
          </div>
        </CardHeader>

        <CardContent className="px-6 pb-6">
          {loadingAgenda ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full rounded-lg" />
              ))}
            </div>
          ) : agenda.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-muted-foreground gap-2">
              <CalendarX className="h-8 w-8 opacity-40" />
              <p className="text-sm">No hay citas programadas para hoy.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {agenda.map((cita) => (
                <AgendaRow key={cita.uuid} cita={cita} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
