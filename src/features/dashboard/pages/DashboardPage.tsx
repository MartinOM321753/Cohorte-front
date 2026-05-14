import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { PageHeader } from '@/components/layout/PageHeader'
import { RoleGuard } from '@/components/routes/RoleGuard'
import { useDashboardStats } from '../hooks/useDashboard'
import { CalendarDays, Stethoscope, TestTube2, UserRound } from 'lucide-react'
import type { ReactNode } from 'react'

function StatCard({
  label,
  value,
  isLoading,
  icon,
  highlight,
  helper,
}: {
  label: string
  value: number
  isLoading: boolean
  icon: ReactNode
  highlight?: boolean
  helper: string
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
                <div className="tabular-nums text-[32px] font-semibold leading-none text-foreground">{value}</div>
              )}
            </div>
            <div className="mt-2 text-[13px] text-muted-foreground">{helper}</div>
          </div>
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[var(--imss-green-50)] text-[var(--primary)]">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function DashboardPage() {
  const { data: stats, isLoading } = useDashboardStats()

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Dashboard"
        subtitle="Resumen operativo del sistema."
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Pacientes activos"
          value={stats?.pacientesActivos || 0}
          isLoading={isLoading}
          highlight
          helper="Pacientes en seguimiento activo."
          icon={<UserRound className="h-4 w-4" strokeWidth={1.75} />}
        />
        <StatCard
          label="Citas programadas"
          value={stats?.citasProgramadas || 0}
          isLoading={isLoading}
          helper="Programadas para el periodo actual."
          icon={<CalendarDays className="h-4 w-4" strokeWidth={1.75} />}
        />
        <RoleGuard allowedRoles={['MEDICO', 'ADMINISTRADOR']}>
          <StatCard
            label="Estudios pendientes"
            value={stats?.estudiosPendientes || 0}
            isLoading={isLoading}
            helper="Pendientes de captura o validación."
            icon={<Stethoscope className="h-4 w-4" strokeWidth={1.75} />}
          />
        </RoleGuard>
        <RoleGuard allowedRoles={['LABORATORISTA', 'ADMINISTRADOR']}>
          <StatCard
            label="Muestras en biobanco"
            value={stats?.muestrasBiobanco || 0}
            isLoading={isLoading}
            helper="Registradas en almacenamiento."
            icon={<TestTube2 className="h-4 w-4" strokeWidth={1.75} />}
          />
        </RoleGuard>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[2fr_1fr]">
        <Card className="border border-border shadow-none">
          <CardHeader className="px-6 pt-6">
            <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--imss-ink-500)]">
              Agenda de hoy
            </div>
            <div className="mt-1 text-[14px] font-medium text-foreground">Citas clínicas</div>
          </CardHeader>
          <CardContent className="px-6 pb-6 text-sm text-muted-foreground">
            No hay información disponible en este momento.
          </CardContent>
        </Card>

        <Card className="border border-border shadow-none">
          <CardHeader className="px-6 pt-6">
            <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--imss-ink-500)]">
              Alertas del sistema
            </div>
            <div className="mt-1 text-[14px] font-medium text-foreground">Notificaciones</div>
          </CardHeader>
          <CardContent className="px-6 pb-6 text-sm text-muted-foreground">
            No hay alertas registradas.
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
